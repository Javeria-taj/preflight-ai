from datetime import datetime, timezone
from bson import ObjectId
from app.db.client import get_db

DEMO_SCAN_ID = "64a7f3e2b1c4d5e6f7a8b9c0"

_DEMO_SCAN = {
    "_id": ObjectId(DEMO_SCAN_ID),
    "package_name": "axios",
    "old_version": "1.7.9",
    "new_version": "1.7.10",
    "verdict": "BLOCK",
    "confidence": 0.94,
    "repo": None,
    "pr_number": None,
    "is_demo": True,
    "signals": {
        "script_diff": {
            "flagged": True,
            "new_hooks": ["postinstall"],
            "changed_hooks": [],
            "reason": "New postinstall hook added in 1.7.10",
        },
        "ast_scan": {
            "flagged": True,
            "patterns": ["outbound_http", "process_env_exfiltration"],
            "severity": "high",
            "reason": "Postinstall opens outbound HTTP connection exfiltrating process.env",
        },
        "maintainer": {
            "flagged": True,
            "risk_score": 92,
            "key_changed": True,
            "inactive_days": 238,
            "reason": "Provenance attestation removed after 8 months of inactivity",
        },
        "llm_reasoning": {
            "verdict": "BLOCK",
            "confidence": 0.94,
            "summary": (
                "Pattern matches known supply chain attack: new postinstall hook with "
                "outbound network call combined with provenance removal after inactivity "
                "is high-confidence malicious."
            ),
            "attack_pattern": "npm_account_hijack_rat_deployment",
        },
    },
    "duration_ms": 2840,
    # scanned_at = now so TTL index (30d) never expires this during the hackathon
    "scanned_at": datetime.now(timezone.utc),
    "created_at": datetime.now(timezone.utc),
}


async def seed_demo_data() -> None:
    db = get_db()
    existing = await db.scans.find_one({"_id": ObjectId(DEMO_SCAN_ID)})
    if not existing:
        await db.scans.insert_one(_DEMO_SCAN)


def _serialize(doc: dict) -> dict:
    doc["scan_id"] = str(doc.pop("_id"))
    for field in ("scanned_at", "created_at"):
        if field in doc and isinstance(doc[field], datetime):
            doc[field] = doc[field].isoformat()
    return doc


async def insert_scan(scan_doc: dict) -> str:
    db = get_db()
    result = await db.scans.insert_one(scan_doc)
    return str(result.inserted_id)


async def get_scan(scan_id: str) -> dict | None:
    db = get_db()
    if not ObjectId.is_valid(scan_id):
        return None
    doc = await db.scans.find_one({"_id": ObjectId(scan_id)})
    return _serialize(doc) if doc else None


async def list_scans(page: int = 1, limit: int = 20) -> list[dict]:
    db = get_db()
    skip = (page - 1) * limit
    cursor = db.scans.find(
        {"is_demo": {"$ne": True}},
        sort=[("scanned_at", -1)],
        skip=skip,
        limit=limit,
    )
    docs = await cursor.to_list(length=limit)
    return [_serialize(d) for d in docs]
