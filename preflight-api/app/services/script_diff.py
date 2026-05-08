"""Signal 1: fetch tarballs, extract install hooks, diff between versions."""

import io
import json
import tarfile
from dataclasses import dataclass, field

import httpx

from app.config.settings import settings
from app.errors import PackageNotFoundError, RegistryTimeoutError

HOOK_KEYS = ("preinstall", "install", "postinstall")
_REGISTRY_TIMEOUT = 10.0


@dataclass
class ScriptDiffResult:
    flagged: bool
    new_hooks: list[str] = field(default_factory=list)
    changed_hooks: list[str] = field(default_factory=list)
    reason: str = ""
    # Hook content dict + tarball URL passed to Signal 2 to avoid re-fetching
    hooks_content: dict[str, str] = field(default_factory=dict)
    tarball_url: str | None = None


async def _fetch_tarball_url(package_name: str, version: str) -> tuple[str, str]:
    url = f"{settings.npm_registry_url}/{package_name}/{version}"
    async with httpx.AsyncClient(timeout=_REGISTRY_TIMEOUT) as client:
        try:
            r = await client.get(url)
        except httpx.TimeoutException:
            raise RegistryTimeoutError(f"Registry timed out for {package_name}@{version}")
    if r.status_code == 404:
        raise PackageNotFoundError(f"{package_name}@{version} not found")
    r.raise_for_status()
    data = r.json()
    tarball = data["dist"]["tarball"]
    # Return (tarball_url, dist_integrity) for caller
    return tarball, data.get("dist", {}).get("integrity", "")


async def _extract_hooks(package_name: str, version: str) -> tuple[dict[str, str], str]:
    tarball_url, _ = await _fetch_tarball_url(package_name, version)
    async with httpx.AsyncClient(timeout=_REGISTRY_TIMEOUT) as client:
        try:
            r = await client.get(tarball_url)
        except httpx.TimeoutException:
            raise RegistryTimeoutError(f"Tarball download timed out for {package_name}@{version}")
    r.raise_for_status()

    hooks: dict[str, str] = {}
    with tarfile.open(fileobj=io.BytesIO(r.content), mode="r:gz") as tar:
        for member in tar.getmembers():
            if member.name in ("package/package.json", "./package/package.json"):
                f = tar.extractfile(member)
                if f is None:
                    break
                pkg_data = json.loads(f.read().decode("utf-8"))
                scripts = pkg_data.get("scripts", {})
                for key in HOOK_KEYS:
                    if key in scripts:
                        hooks[key] = scripts[key]
                break
    return hooks, tarball_url


async def run(
    package_name: str, old_version: str | None, new_version: str
) -> ScriptDiffResult:
    new_hooks, new_tarball_url = await _extract_hooks(package_name, new_version)

    # New dependency — no old version to compare against
    if old_version is None:
        if new_hooks:
            hook_names = list(new_hooks.keys())
            return ScriptDiffResult(
                flagged=True,
                new_hooks=hook_names,
                reason=f"New dependency has install hooks: {', '.join(hook_names)}",
                hooks_content=new_hooks,
                tarball_url=new_tarball_url,
            )
        return ScriptDiffResult(
            flagged=False,
            reason="New dependency with no install hooks",
            hooks_content={},
            tarball_url=new_tarball_url,
        )

    old_hooks, _ = await _extract_hooks(package_name, old_version)

    added = [k for k in new_hooks if k not in old_hooks]
    changed = [k for k in new_hooks if k in old_hooks and new_hooks[k] != old_hooks[k]]

    if added or changed:
        parts = []
        if added:
            parts.append(f"New hooks: {', '.join(added)}")
        if changed:
            parts.append(f"Modified hooks: {', '.join(changed)}")
        return ScriptDiffResult(
            flagged=True,
            new_hooks=added,
            changed_hooks=changed,
            reason="; ".join(parts),
            hooks_content=new_hooks,
            tarball_url=new_tarball_url,
        )

    return ScriptDiffResult(
        flagged=False,
        reason="No install hook changes detected",
        hooks_content=new_hooks,
        tarball_url=new_tarball_url,
    )
