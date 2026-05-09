The current application has a strong design foundation (Glassmorphism, stark monospace typography, glitch effects) but suffers from heavy reliance on static mock data and disjointed UI states when handling real API responses.

Phase 1: API & Data Normalization (The Foundation)
The frontend currently struggles because the backend uses snake_case while the frontend UI components expect camelCase.

1. Update lib/api.ts Data Normalizers

Action: Modify normalizeScan to defensively map all API fields to the exact shape expected by ScanCard and ScanDetailPage.

Fix flagged missing state: The API's LlmReasoningSignal does not return a flagged boolean. You must derive it: flagged: raw.signals.llm_reasoning.verdict !== 'PASS'.

Convert Signals to Array: UI components map over signals. Ensure signalsToArray correctly structures the 4 signals consistently.

2. Standardize Demo ID

Action: Update DEMO_SCAN_ID in lib/data.ts to the actual MongoDB hex string specified in the contract: 64a7f3e2b1c4d5e6f7a8b9c0.

Why: Clicking "View full scan" on the demo result must route to this exact ID so app/scans/[id]/page.tsx can differentiate between the rich pre-seeded demo and a standard live scan.

Phase 2: Flawless Dashboard Flow (app/dashboard/page.tsx)
The dashboard currently mixes a live feed with static sidebar data, creating a jarring UX.

1. Wire Up "Top Threats"

Action: Fetch getTopThreats(5) on mount. Replace the static TOP_THREATS map in the sidebar with live package data.

UI Polish: Add a skeleton loader for the threats panel. Handle the insufficient_data state gracefully (e.g., "Scanning for baseline...").

2. Live Verdict Distribution (Histogram)

Action: Remove genHisto() static generation.

Logic: Compute the histogram dynamically by reducing the feed array state. Since the feed updates every 10 seconds, the histogram will physically shift as new scans flow in, creating a true "Live Operations" feel.

3. Polling Reliability & Error Boundaries

Action: The current fetchLiveFeed falls back to static data silently if the API fails. Update this to show a degraded state in the LivePulse component (e.g., turn the dot yellow/red and change text from "LIVE" to "RECONNECTING...").

Phase 3: Dynamic Scan Detail Page (app/scans/[id]/page.tsx)
The detail page is currently hardcoded for the demo scan. Real API scans lack iocs, kill_chain, and model strings, which will cause the UI to crash or look broken.

1. Graceful Degradation for Real Scans

Action: Implement conditional rendering blocks.

Logic: * if (isDemo) -> Render the hardcoded KILL CHAIN and IOCs blocks.

if (!isDemo) -> Hide these sections entirely or replace them with a generic "Execution Trace" derived from the timestamp deltas.

2. Real-time Signal Diff Rendering

Action: Ensure the UI gracefully handles sig.diff being undefined. The real API does not currently send line-by-line diffs for script_diff or ast_scan. Hide the diff-block DOM elements safely to prevent blank gray boxes.

3. Skeleton Loading State

Action: Replace ◐ loading scan data… with a full-page layout skeleton. The header, AI Summary box, and Signal list should pulsate with a var(--bg-surface) background before the data snaps in. This prevents layout shifting (CLS) and feels instantly responsive.

Phase 4: Landing Page & Global Polish
Fix the copy and ensure global components feel deeply connected to the product's reality.

1. Fix the GitHub Action Configuration (app/page.tsx)

Action: The contract explicitly notes the YAML is wrong.

Fix: Change the INSTALL_YAML snippet in lib/data.ts.

Change uses: preflight-ai/action@v1 to uses: preflight-ai/preflight@v1.0.0

Change fail-on: BLOCK to fail_on_block: true.

Remove comment: true.

2. Live Global Ticker (app/layout.tsx / components/Ticker.tsx)

Action: Currently, Ticker uses static data. Inside Ticker.tsx, write a lightweight useEffect that calls getScans(1, 10) on mount and loops the package names and verdicts. It creates an immediate sense of scale across every page.

3. The Demo Execution Flow (app/demo/page.tsx)

Action: When a user clicks "Run Demo", actually call POST /analyze with { demo: true }.

UX: Tie the 2.7-second artificial API delay to the CSS animation sequence. Let the UI wait on the network tab. When the response hits, snap the verdict card onto the screen. This proves to technical users (who will open the dev tools) that the platform actually works via API.

Summary of the "10/10" UX Enhancements
To achieve true 10/10 perfection:

No Layout Shift: Reserve height for dynamic components (like the scan feed list).

Micro-interactions: Add Framer Motion (or CSS @starting-style) so that when a new scan hits the Dashboard, it slides down gracefully rather than instantly popping into existence.

Data Integrity: Never show a null or undefined string in the UI. If a PR number isn't present, hide the # symbol. If old_version is null, display [new dependency] instead of undefined -> 1.0.0.