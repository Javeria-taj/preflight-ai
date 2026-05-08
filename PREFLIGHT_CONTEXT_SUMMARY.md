# Preflight — Complete Chat Context Summary
**Date:** May 8, 2026
**Hackathon:** NMIT Hacks 2026 · AI & ML Track · 48 hours (May 8–10)
**Team:** 2 people — Rafi (backend) + teammate (frontend)

---

## 1. Who Rafi Is

- **At his startup:** Frontend engineer + UI/UX designer. Owns the full product experience — design system, component architecture, interaction design, visual quality.
- **At hackathons:** Backend engineer. Builds server, API, data pipeline, AI integrations.
- **Personal projects:** Full effort, no half-measures.
- **Deepest interest:** Optimized system design — every decision is intentional, not a default.
- **Setup:** Antigravity (primary IDE) + terminal on Windows. Claude Code installed via npm (v2.1.131, confirmed working).

---

## 2. Claude Code Setup

### What was done
- Installed Claude Code globally via npm: `npm install -g @anthropic-ai/claude-code`
- Confirmed working: `claude doctor` shows v2.1.131, auto-updates enabled, search OK
- Runs natively on Windows — no WSL or Docker needed for this project
- Desktop app also configured

### Two CLAUDE.md files created
These are the mechanism for persistent memory in Claude Code. Both files saved to Google Drive and available as downloads.

**File 1 — Global config** → `C:\Users\DELL\.claude\CLAUDE.md`
Covers: Rafi's identity (startup frontend + hackathon backend), full stack, UI/UX principles, backend principles, system design defaults, anti-patterns, code style, how Claude should respond.

**File 2 — Project config** → `<repo-root>/CLAUDE.md`
Covers: Preflight product definition, detection engine, API contract, MongoDB models, demo scenario, env vars, hackathon context. This is what makes Claude Code context-aware for Preflight specifically.

### Key insight on Claude Code memory
Claude Code has no memory between sessions on its own. The CLAUDE.md files ARE the memory. Drop them in place and every session starts fully briefed. You can also say "add this to the CLAUDE.md" during a session to update it.

---

## 3. The Hackathon Context

- **Event:** NMIT Hacks 2026
- **Track:** AI & ML
- **Status:** Cleared online screening — selected and competing
- **Duration:** 48 hours, May 8–10, 2026
- **Goal:** Maximum impact + win

### Sponsors (relevant to product decisions)
| Sponsor | How we use it |
|---|---|
| GitHub (title) | Core — GitHub Action is the entire product distribution |
| Google Cloud | Hosting context |
| Gemini API | LLM reasoning layer — replaces Claude in the stack |
| MongoDB | Community threat intelligence database |
| Render | FastAPI deployment hosting |
| ElevenLabs | Tier 2 — voice alerts (post Tier 1) |
| Snowflake | Tier 2 — analytics pipeline (post Tier 1) |
| Solana | Tier 3 — stretch, immutable audit log |
| Vultr | Not used (Render chosen instead) |
| Backboard.io | Not integrated |
| Yellow Hills AI | Not integrated |

### Tier 1 (locked — build this first, solidly)
1. GitHub Action (TypeScript)
2. Preflight Analysis API — FastAPI on Render
3. Gemini AI — LLM reasoning layer
4. MongoDB Atlas — community threat intelligence
5. Web Dashboard — Next.js (4 pages)

---

## 4. The Real Incident — The Product Anchor

**March 31, 2026 — 00:21 UTC**
A North Korean state actor (Sapphire Sleet) hijacked the `axios` npm maintainer account and published malicious versions of axios — one of npm's most downloaded packages (70M+ weekly downloads). The RAT payload was live for 3 hours. `npm audit` missed it. Snyk missed it. Dependabot missed it. Because the package was legitimately signed and had no CVE.

**This is the anchor for every demo, pitch, and slide.**

---

## 5. What Preflight IS

Preflight is a **behavioral pre-execution interceptor** that lives natively in the GitHub PR lifecycle. It detects novel malicious npm packages through code analysis and AI reasoning — not CVE lookups — and gets smarter with every scan through community threat intelligence.

**Three components:**

### Component 1 — GitHub Action (the actual product)
- One line of YAML added to an existing workflow file
- GitHub fetches it from our repo via HTTPS + SHA pinning
- No download, no install, no sign-up, no CLI
- Triggers automatically on every PR that changes `package-lock.json`

```yaml
- name: Preflight Supply Chain Scan
  uses: preflight-ai/preflight@v1
  with:
    lockfile: package-lock.json
```

### Component 2 — Cloud Analysis API (invisible to user)
- FastAPI service deployed on Render
- Called automatically by the GitHub Action
- Users never interact with it directly
- URL: `https://preflight-api.onrender.com`

### Component 3 — Website (discovery + community intelligence)
- `preflight.dev` — public, no account required
- Landing page, /demo, /dashboard, /scans/:id, /packages/:name
- No login, no payment

**The complete user journey:** A developer opens a PR bumping axios. Preflight triggers. 30 seconds later a comment appears: BLOCK — 94% confidence. PR status check turns red. Developer reads Gemini's explanation. Does not merge. Avoided a RAT. Never opened a terminal. Never visited the site. Never signed up. That's the product.

---

## 6. What Preflight Is NOT

Agreed as product boundaries — never build or promise these:

**By distribution:**
- NOT an npm package (logical contradiction — protects npm by living outside it)
- NOT a CLI tool
- NOT a browser extension, desktop app, or VS Code plugin

**By what it scans:**
- NOT a CVE scanner (that's the whole point — CVE tools missed the axios attack)
- NOT a source code scanner (only looks at pre/postinstall hooks)
- NOT a secrets scanner
- NOT a license checker
- NOT a transitive dependency scanner (direct deps changed in PR only)
- NOT a Python/Ruby/Go/Rust tool (npm only, deliberate)

**By what it does after detection:**
- NOT an auto-fixer (blocks and explains; human decides)
- NOT an incident response tool (pre-execution only)
- NOT a real-time production monitor

**By execution:**
- NOT a sandbox that runs postinstall scripts (reads and analyses, never executes)

**By business model:**
- NOT a SaaS (no accounts, no login, no pricing tiers, free forever)
- NOT an enterprise security platform (that's Socket.dev)

**By data:**
- NOT storing source code, package-lock contents, or credentials
- NOT a CVE database

**The boundary in one sentence:**
> Preflight does exactly one thing: intercept npm dependency changes on GitHub pull requests, analyse the behaviour of the new code before it runs, and post a plain-English verdict powered by Gemini AI — before a single line of malicious code ever executes on anyone's machine.

---

## 7. Detection Engine — 4 Signal Layers

Every PR analysis runs these four signals. All results are stored in MongoDB and synthesised by Gemini.

### Signal 1 — Script Diff Analysis
- Fetches both package tarballs from npm registry
- Extracts `pre/postinstall/install` scripts from `package.json`
- Diffs scripts between old and new version
- **Flags:** New hook added (HIGH), existing hook modified (MEDIUM), hook removed (LOW/log)
- **Output:** `{ flagged, new_hooks, changed_hooks, reason }`

### Signal 2 — AST Behavioral Scan
- Parses postinstall/preinstall scripts with `acorn` (JS AST parser)
- Walks AST nodes for dangerous patterns
- **Flags:** `eval()`, `new Function()`, `process.spawn`, `exec`, `execSync`, `require('http')`, `require('https')`, `require('fs')` with writes, base64/hex strings >50 chars, `require(variable)`
- **Output:** `{ flagged, patterns, severity, reason }`

### Signal 3 — Maintainer Signal Scoring
- Hits npm registry API: `https://registry.npmjs.org/{package}`
- Extracts: maintainer list, last publish dates, signing key fingerprint
- Compares signing key fingerprint between old and new version
- **Flags:** Key fingerprint changed (CRITICAL), 90+ days inactive then sudden push (HIGH), new maintainer added (HIGH), package age <30 days with high downloads (MEDIUM)
- **Output:** `{ flagged, risk_score (0-100), key_changed, inactive_days, reason }`

### Signal 4 — Gemini AI Reasoning
- Input: combined outputs of signals 1, 2, 3
- Model: `gemini-2.5-flash` (primary), `gemini-2.5-pro` (BLOCK verdicts)
- **Verdict logic:** BLOCK ≥0.85 confidence + 2+ signals flagged; WARN ≥0.60 + 1+ flagged; PASS otherwise
- **Output:** `{ verdict, confidence, summary, attack_pattern }`

### Fail-safe Rules (override Gemini)
- 3+ signals flagged → always BLOCK
- Key fingerprint changed + new network call → always BLOCK
- Gemini unreachable → rule-based fallback verdict
- Analysis API unreachable → WARN (fail open, never silent block)

---

## 8. Complete API Contract

**Base URL:** `https://preflight-api.onrender.com`

### POST /analyze
```json
// Request
{
  "package_name": "axios",
  "old_version": "1.7.9",
  "new_version": "1.7.10",
  "repo": "org/repo-name",
  "pr_number": 42
}

// Response
{
  "scan_id": "64a7f3e2b1c4d5e6f7a8b9c0",
  "verdict": "BLOCK",
  "confidence": 0.94,
  "duration_ms": 2840,
  "signals": {
    "script_diff":   { "flagged": true, "new_hooks": ["postinstall"], "changed_hooks": [], "reason": "..." },
    "ast_scan":      { "flagged": true, "patterns": ["outbound_https","process_spawn"], "severity": "high", "reason": "..." },
    "maintainer":    { "flagged": true, "risk_score": 92, "key_changed": true, "inactive_days": 238, "reason": "..." },
    "llm_reasoning": { "verdict": "BLOCK", "confidence": 0.94, "summary": "...", "attack_pattern": "npm_account_hijack_rat_deployment" }
  }
}
```

### GET /health
```json
{ "status": "ok", "checks": { "mongodb": "connected", "npm_registry": "reachable", "gemini_api": "reachable" }, "version": "1.0.0" }
```

### GET /scans?page=1&limit=20
Returns paginated recent scans across all repos (community feed).

### GET /scans/:scan_id
Full scan object with all signal details.

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
```

### GET /packages/top-threats?limit=10
Top packages by community threat score.

---

## 9. MongoDB Data Models

**Database:** `preflight_db`

### Collection: scans
```
_id, package_name, old_version, new_version,
verdict ("PASS"|"WARN"|"BLOCK"), confidence (0.0-1.0),
repo (optional), pr_number (optional),
signals { script_diff, ast_scan, maintainer, llm_reasoning },
duration_ms, scanned_at [indexed desc], created_at

Indexes: scanned_at desc · package_name+new_version · verdict
```

### Collection: packages
```
_id, package_name [unique], total_scans,
block_count, warn_count, pass_count,
community_threat_score [indexed desc],
last_flagged_at, flagged_versions[], safe_versions[] (capped 20),
updated_at
```

### Community threat score formula
```
score = (block_count * 100 + warn_count * 40) / total_scans
Capped at 100. Minimum 5 scans before score shown publicly.
```

---

## 10. GitHub PR Comment Format

```markdown
## 🔴 Preflight: BLOCK — Dependency Update Intercepted

**`axios`** `1.7.9 → 1.7.10` · Confidence: **94%** · 2.84s

> This matches the pattern of a supply chain hijack. New postinstall hook
> with outbound network call combined with signing key rotation after 8
> months of inactivity is high-confidence malicious activity.

| Signal      | Status     | Detail                                      |
|-------------|------------|---------------------------------------------|
| Script diff | 🚨 Flagged | New postinstall hook added                  |
| AST scan    | 🚨 Flagged | Outbound HTTPS + process.spawn detected     |
| Maintainer  | 🚨 Flagged | Signing key changed, 238 days inactive      |
| Gemini AI   | 🚨 Flagged | npm account hijack + RAT deployment pattern |

Attack pattern: npm_account_hijack_rat_deployment

❌ Do NOT merge · 🔍 Review manually · 📢 Report to npm security

[Preflight](https://preflight.dev) · [View full analysis →](https://preflight.dev/scans/64a7...)
```

---

## 11. Frontend Design Spec

### Aesthetic: Neo-Brutalist Terminal
Security tool for developers. Not a SaaS. War room aesthetic. High contrast. Raw. Hard corners. No soft shadows. No gradients. Flat surfaces.

### Design Tokens
```css
--bg-primary:     #0A0A0A   /* main background */
--bg-surface:     #111111   /* card backgrounds */
--bg-elevated:    #1A1A1A   /* hover, active */
--border:         #2A2A2A   /* default borders */
--border-strong:  #404040   /* focus, emphasis */
--text-primary:   #F0F0F0   /* headings, main text */
--text-secondary: #888888   /* labels, metadata */
--text-muted:     #555555   /* placeholders */
--accent-pass:    #00FF88   /* PASS — terminal green */
--accent-warn:    #FFB800   /* WARN — amber */
--accent-block:   #FF3B30   /* BLOCK — alert red */
--accent-blue:    #4A9EFF   /* links, interactive */

--font-mono:    'JetBrains Mono', monospace   /* verdicts, IDs, code */
--font-sans:    'Inter', sans-serif            /* body, UI */
--font-display: 'Space Grotesk', sans-serif   /* headings, logo */
```

### Pages (4 total)

**/ Landing**
- Hero: "The axios attack lasted 3 hours." / "70M weekly downloads. Zero tools caught it." / "Preflight would have blocked it in 30 seconds."
- CTA: "See it live" → /demo
- Install snippet with copy button
- Live community stats (3 counters, polling every 10s)
- 4-signal grid

**/ dashboard**
- 70% live scan feed / 30% sidebar
- ScanCard: collapsed 72px, click to expand → shows signal pills + confidence bar
- New cards slide in at top in real time
- Sidebar: Top Threats, Today's Stats, Try demo link

**/ demo** ← Most important for hackathon
- Pre-filled locked form: axios 1.7.9 → 1.7.10 + label "The exact attack from March 31, 2026"
- "Run Preflight analysis" button
- 4 SignalRows animate in sequentially (150ms stagger): pending → analyzing → flagged
- Verdict card drops: BLOCK, 94%, Gemini summary, attack pattern
- PR comment preview below
- No GitHub account required

**/ scans/:id**
- Full drill-down. PR comments link here. Shareable.
- Verdict header + Gemini summary + confidence bar
- 4 expandable signal cards with full detail including actual script code block

### Component Library
| Component | Props | Notes |
|---|---|---|
| VerdictBadge | verdict | Monospace, all-caps, 1px border, bg tint per verdict |
| ScanCard | scan object | 72px collapsed, click to expand, hover border-strong |
| SignalPill | name, flagged | Green dot (clear) / red dot (flagged) |
| ConfidenceBar | confidence 0-1 | 4px height, color changes by threshold |
| InstallSnippet | code, language | Dark block, copy button, language tag |
| StatCounter | value, label | Large mono number, count-up animation |
| SignalRow | name, status, reason | pending→analyzing→flagged/clear states |
| LivePulse | — | CSS only, green pulse dot, 2s loop |

---

## 12. Tech Stack — Final Locked

| Layer | Technology | Sponsor |
|---|---|---|
| Action runtime | GitHub Actions (TypeScript) | GitHub ✓ |
| Analysis API | Python FastAPI | — |
| API hosting | Render | Render ✓ |
| LLM reasoning | Gemini 2.5 Flash + Pro | Google Cloud + Gemini ✓ |
| Database | MongoDB Atlas | MongoDB ✓ |
| Frontend | Next.js (App Router) | — |
| Frontend hosting | Vercel (free) | — |
| AST parsing | acorn | — |
| npm data | npm Registry REST API | — |
| GitHub data | GitHub REST API | GitHub ✓ |
| Demo registry | Verdaccio (local) | — |

---

## 13. Repo Structure

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
│   └── package.json
│
├── preflight-api/                 # FastAPI analysis service (Python)
│   ├── app/
│   │   ├── main.py                # App init, lifespan, /health
│   │   ├── config/settings.py     # pydantic-settings
│   │   ├── routers/
│   │   │   ├── analyze.py         # POST /analyze
│   │   │   ├── scans.py           # GET /scans, GET /scans/:id
│   │   │   └── packages.py        # GET /packages routes
│   │   ├── services/
│   │   │   ├── script_diff.py     # Signal 1
│   │   │   ├── ast_scanner.py     # Signal 2
│   │   │   ├── maintainer.py      # Signal 3
│   │   │   └── gemini.py          # Signal 4 — Gemini API
│   │   ├── db/
│   │   │   ├── client.py          # MongoDB Atlas connection
│   │   │   ├── scans.py           # Scans collection ops
│   │   │   └── packages.py        # Packages collection ops
│   │   ├── schemas/analysis.py    # Pydantic models
│   │   └── errors.py
│   ├── requirements.txt
│   └── render.yaml
│
├── preflight-web/                 # Next.js dashboard (frontend owns)
│   ├── app/
│   │   ├── page.tsx               # /
│   │   ├── dashboard/page.tsx     # /dashboard
│   │   ├── demo/page.tsx          # /demo
│   │   └── scans/[id]/page.tsx    # /scans/:id
│   ├── components/                # All 8 components listed above
│   └── lib/api.ts                 # API client
│
├── demo/                          # Verdaccio + mock malicious package
│   ├── verdaccio/config.yaml
│   └── mock-axios-malicious/      # Fake axios 1.7.10 for live demo
│
├── CLAUDE.md                      # Preflight project context for Claude Code
└── README.md
```

---

## 14. Environment Variables

### preflight-action
```
PREFLIGHT_API_URL=https://preflight-api.onrender.com
GITHUB_TOKEN=   # auto-injected by GitHub Actions
```

### preflight-api
```
GEMINI_API_KEY=
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=preflight_db
NPM_REGISTRY_URL=https://registry.npmjs.org
ANALYSIS_TIMEOUT_MS=45000
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
```

### preflight-web
```
NEXT_PUBLIC_API_URL=https://preflight-api.onrender.com
NEXT_PUBLIC_POLL_INTERVAL_MS=10000
```

---

## 15. 48-Hour Build Order

### Hours 0–8 | Foundation
- Monorepo scaffold: `preflight-action/`, `preflight-api/`, `preflight-web/`
- MongoDB Atlas free tier setup + connection verified
- Gemini API key obtained and tested
- FastAPI skeleton: `/health` endpoint returning all 3 checks
- GitHub Action scaffold: reads action inputs, calls API, returns output
- Verdaccio local mock registry running
- Frontend: tokens file + Next.js project scaffold

### Hours 8–20 | Core Engine
- Signal 1: Script diff — fetch tarballs, extract hooks, diff
- Signal 2: AST scan — acorn parser, flag dangerous patterns
- Signal 3: Maintainer scoring — npm registry API, key fingerprint compare
- Full `/analyze` endpoint wiring all 3 signals
- Frontend: VerdictBadge, ScanCard, SignalPill, ConfidenceBar components
- Frontend: /demo page skeleton

### Hours 20–32 | Gemini + Integration
- Signal 4: Gemini API — synthesise signals into verdict
- MongoDB write on every scan (scans + packages collections)
- GitHub Action: post PR comment (formatted), set status check
- Frontend: /demo page fully animated (4 signal rows + verdict card)
- Frontend: /dashboard live feed pulling from GET /scans

### Hours 32–42 | Demo + Polish
- Mock axios 1.7.10 malicious package published to Verdaccio
- End-to-end demo loop working: real PR → action triggers → BLOCK verdict → PR comment
- Deploy FastAPI to Render
- Deploy Next.js to Vercel
- /scans/:id page complete
- Landing page complete

### Hours 42–48 | Buffer + Presentation
- Freeze code
- Practice 3-minute pitch
- Test demo reliability (run it 10 times, no failures)

---

## 16. The 3-Minute Pitch Script

**[0:00–0:30] The incident**
"On March 31st, 2026, a North Korean state actor hijacked the axios npm account. 70 million weekly downloads. The malicious package was live for 3 hours. npm audit missed it. Snyk missed it. Dependabot missed it. Because the package was legitimately signed and had no CVE."

**[0:30–0:50] The gap**
"Every existing tool is reactive. They check against known bad packages. Preflight is proactive. It reasons about unknown bad packages — the ones nobody has seen yet."

**[0:50–1:30] The demo**
"Here's Preflight catching the exact axios attack, live."
→ Open /demo, click Run Preflight analysis
→ 4 signals animate in with results
→ Verdict drops: BLOCK — 94% confidence
→ Show the PR comment preview
"One line of YAML. That's the entire install. It would have blocked this."

**[1:30–2:00] The platform angle**
"But Preflight isn't just a tool — it's community threat intelligence. Every scan stored in MongoDB. The more repos use it, the smarter it gets for everyone."
→ Switch to /dashboard, show live feed

**[2:00–2:30] The stack**
"GitHub Action — native to the surface. Gemini 2.5 — explains why, not just what. MongoDB Atlas — the community brain. Render — live in production. Open source. MIT. One line to install."

**[2:30–3:00] The close**
"The axios attack cost teams hours of incident response. Preflight catches it in 30 seconds, before the code ever runs, for free, forever. One line in your workflow. Zero compromised dependencies."

---

## 17. Key Decisions Made in This Chat

| Decision | What was decided | Why |
|---|---|---|
| LLM layer | Gemini 2.5 (not Claude) | Google Cloud + Gemini are both sponsors |
| Distribution | GitHub Action only | Can't use npm for a tool that protects npm |
| Scope | npm only, direct deps only | Focus beats breadth; transitive = too slow |
| Database | MongoDB Atlas | Community threat intelligence = network effect |
| Hosting | Render for API, Vercel for frontend | Free tiers, fast deploy, no Docker needed |
| Docker/WSL | Skip entirely | Not needed; native Windows works |
| Auto-fix | Never | Human makes final call, always |
| CVE scanning | Never | That's the solved problem we're not solving |
| Execution | Never run scripts | Read-only analysis only, never sandbox |
| Business model | Free + open source + MIT | Maximum adoption, judge-friendly story |

---

## 18. Files Created This Session

| File | Location | Purpose |
|---|---|---|
| `CLAUDE_GLOBAL.md` | `C:\Users\DELL\.claude\CLAUDE.md` | Rafi's global Claude Code identity |
| `CLAUDE_PREFLIGHT.md` | `<repo-root>/CLAUDE.md` | Preflight project context for Claude Code |
| `Preflight — Complete Product Spec v1.2` | Google Drive | Full product spec for both teammates |
| `PREFLIGHT_CONTEXT_SUMMARY.md` | Google Drive + download | This file |

---

## 19. What Comes Next (not yet done)

- [ ] Create GitHub repo: `preflight-ai/preflight`
- [ ] Scaffold monorepo structure
- [ ] Set up MongoDB Atlas free cluster
- [ ] Get Gemini API key
- [ ] Build `action.yml` and TypeScript action entrypoint
- [ ] Build FastAPI skeleton with `/health`
- [ ] Share Drive spec doc with frontend teammate
- [ ] Teammate starts on: tokens file → VerdictBadge → ScanCard → /demo page
- [ ] Set up Verdaccio locally
- [ ] Publish mock axios 1.7.10 malicious package to Verdaccio

---

*Generated: May 8, 2026 · NMIT Hacks 2026 prep session*
