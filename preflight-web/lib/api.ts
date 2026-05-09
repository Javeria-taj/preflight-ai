const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://preflight-api.onrender.com';

// ─── TypeScript Types ───────────────────────────────────────────────────────

export type Verdict = 'PASS' | 'WARN' | 'BLOCK';

export interface AnalyzeRequest {
  package_name: string;
  old_version: string | null;
  new_version: string;
  repo?: string;
  pr_number?: number;
  demo?: boolean;
}

export interface ScriptDiffSignal {
  flagged: boolean;
  new_hooks: string[];
  changed_hooks: string[];
  reason: string;
}

export interface AstScanSignal {
  flagged: boolean;
  patterns: string[];
  severity: 'none' | 'medium' | 'high';
  reason: string;
}

export interface MaintainerSignal {
  flagged: boolean;
  risk_score: number;
  key_changed: boolean;
  inactive_days: number;
  reason: string;
}

export interface LlmReasoningSignal {
  verdict: Verdict;
  confidence: number;
  summary: string;
  attack_pattern: string | null;
}

export interface SignalsResponse {
  script_diff: ScriptDiffSignal;
  ast_scan: AstScanSignal;
  maintainer: MaintainerSignal;
  llm_reasoning: LlmReasoningSignal;
}

export interface AnalyzeResponse {
  scan_id: string;
  verdict: Verdict;
  confidence: number;
  duration_ms: number;
  signals: SignalsResponse;
}

export interface ScanDetail {
  scan_id: string;
  package_name: string;
  old_version: string | null;
  new_version: string;
  verdict: Verdict;
  confidence: number;
  duration_ms: number;
  scanned_at: string;
  created_at: string;
  repo: string | null;
  pr_number: number | null;
  is_demo: boolean;
  signals: SignalsResponse;
}

export interface ScansListResponse {
  scans: ScanDetail[];
  page: number;
  limit: number;
}

export interface PackageThreatResponse {
  package_name: string;
  total_scans: number;
  block_count: number;
  warn_count: number;
  pass_count: number;
  community_threat_score: number | null;
  last_flagged_at: string | null;
  flagged_versions: string[];
  safe_versions: string[];
  reason?: 'insufficient_data';
  minimum_scans?: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  checks: {
    mongodb: 'connected' | 'error';
    npm_registry: 'reachable' | 'error';
    gemini_api: 'reachable' | 'missing_key';
  };
  version: string;
}

// ─── Verdict Mappings ───────────────────────────────────────────────────────

export const VERDICT_COLOR: Record<Verdict, string> = {
  BLOCK: '#FF3B30',
  WARN:  '#FFB800',
  PASS:  '#00FF88',
};

export const VERDICT_EMOJI: Record<Verdict, string> = {
  BLOCK: '🔴',
  WARN:  '🟡',
  PASS:  '🟢',
};

// ─── Normalizers ────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function signalsToArray(signals: SignalsResponse) {
  return [
    { name: 'Script Diff', flagged: signals.script_diff.flagged },
    { name: 'AST Scan',    flagged: signals.ast_scan.flagged },
    { name: 'Maintainer',  flagged: signals.maintainer.flagged },
    { name: 'Gemini AI',   flagged: signals.llm_reasoning.verdict !== 'PASS' },
  ];
}

export function normalizeScan(raw: ScanDetail) {
  return {
    id:         raw.scan_id,
    package:    raw.package_name,
    from:       raw.old_version,
    to:         raw.new_version,
    verdict:    raw.verdict,
    confidence: raw.confidence,
    duration:   raw.duration_ms,
    time:       formatRelative(raw.scanned_at),
    scannedAt:  raw.scanned_at,
    repo:       raw.repo ?? '',
    pr:         raw.pr_number,
    summary:    raw.signals.llm_reasoning.summary,
    signals:    signalsToArray(raw.signals),
    // keep raw signals for detail page
    rawSignals: raw.signals,
    attackPattern: raw.signals.llm_reasoning.attack_pattern,
  };
}

// ─── API Fetch Methods ──────────────────────────────────────────────────────

export async function runAnalysis(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
  return res.json();
}

export async function getScans(page = 1, limit = 20): Promise<ScansListResponse> {
  const res = await fetch(`${API_URL}/scans?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch scans: ${res.status}`);
  return res.json();
}

export async function getScan(scanId: string): Promise<ScanDetail> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const res = await fetch(`${API_URL}/scans/${scanId}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.status === 404) throw new Error('Scan not found');
    if (!res.ok) throw new Error(`Failed to fetch scan: ${res.status}`);
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function getTopThreats(limit = 10): Promise<PackageThreatResponse[]> {
  // Use a 5s timeout so if the backend hangs, we quickly fall back to local mock data
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const res = await fetch(`${API_URL}/packages/top-threats?limit=${limit}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Failed to fetch threats: ${res.status}`);
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`);
  return res.json();
}
