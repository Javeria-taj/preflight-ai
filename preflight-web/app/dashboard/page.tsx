"use client";
import React, { useState, useEffect, useRef } from "react";
import { LivePulse } from "@/components/LivePulse";
import { ScanCard } from "@/components/ScanCard";
import { getScans, getTopThreats, getAdvisoryFeed, normalizeScan, PackageThreatResponse } from "@/lib/api";
import Link from "next/link";

// ── P50 latency computed from actual feed durations ──────────────────────
function computeP50(feed: any[]): string {
  const durations = feed.map(s => s.duration ?? s.duration_ms).filter((d): d is number => typeof d === 'number' && d > 0);
  if (!durations.length) return '—';
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)];
  return `${(p50 / 1000).toFixed(1)}s`;
}

// ── Live histogram computed from actual feed data ─────────────────────────
function LiveHistogram({ feed }: { feed: any[] }) {
  // Build 36 time buckets from feed, padded with baseline
  const blocks = Array.from({ length: 36 }, (_, i) => {
    const scan = feed[i];
    // Use a deterministic pseudo-random value (based on index) to avoid hydration mismatch
    if (!scan) return { type: '', h: 20 + Math.abs(Math.sin(i * 12.5)) * 25 };
    const v = scan.verdict?.toLowerCase();
    return { type: v === 'block' ? 'block' : v === 'warn' ? 'warn' : '', h: 30 + (scan.confidence ?? 0.5) * 55 };
  });
  const pass = feed.filter((s: any) => s.verdict === 'PASS').length;
  const warn = feed.filter((s: any) => s.verdict === 'WARN').length;
  const block = feed.filter((s: any) => s.verdict === 'BLOCK').length;
  const total = feed.length || 1;
  return (
    <>
      <div className="histo">
        {blocks.map((d, i) => (
          <div key={i} className={`bar ${d.type}`} style={{ height: `${d.h}%` }} />
        ))}
      </div>
      <div className="histo-legend">
        <span className="swatch"><i style={{background:'var(--accent-pass)'}}></i> PASS {Math.round(pass/total*100)}%</span>
        <span className="swatch"><i style={{background:'var(--accent-warn)'}}></i> WARN {Math.round(warn/total*100)}%</span>
        <span className="swatch"><i style={{background:'var(--accent-block)'}}></i> BLOCK {Math.round(block/total*100)}%</span>
      </div>
    </>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 52, height: 22, background: 'var(--bg-elevated)', borderRadius: 2, animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
      <div style={{ flex: 1, height: 14, background: 'var(--bg-elevated)', borderRadius: 2, animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
      <div style={{ width: 60, height: 14, background: 'var(--bg-elevated)', borderRadius: 2, animation: 'skeletonPulse 1.4s ease-in-out infinite' }} />
    </div>
  );
}

export default function DashboardPage() {
  const [feed, setFeed] = useState<any[]>([]);
  const [advisoryFeed, setAdvisoryFeed] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [topThreats, setTopThreats] = useState<PackageThreatResponse[] | null>(null);
  const [threatsLoading, setThreatsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [newId, setNewId] = useState<string | null>(null);
  const [apiState, setApiState] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const retryCount = useRef(0);

  const combinedFeed = React.useMemo(() =>
    [...feed, ...advisoryFeed].sort((a, b) =>
      new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
    ), [feed, advisoryFeed]);

  const fetchLiveFeed = async () => {
    try {
      const data = await getScans(1, 20);
      if (data.scans && data.scans.length > 0) {
        const normalized = data.scans.map(normalizeScan);
        setFeed(normalized);
        setApiState('live');
        retryCount.current = 0;
        const newest = normalized[0];
        if (newest) {
          setNewId(newest.id);
          setTimeout(() => setNewId(null), 600);
        }
      } else {
        setFeed([]);
        setApiState('live');
      }
    } catch {
      retryCount.current++;
      setApiState(retryCount.current > 1 ? 'reconnecting' : 'connecting');
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveFeed();
    // Live top threats
    getTopThreats(5)
      .then(data => { setTopThreats(data); setThreatsLoading(false); })
      .catch(() => { setTopThreats(null); setThreatsLoading(false); });
    // Fetch advisories once — GitHub rate limit 60/hr, advisories update daily
    getAdvisoryFeed().then(setAdvisoryFeed).catch(() => {});
    // Poll backend scans every 10s
    const pollMs = parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? '10000');
    const interval = setInterval(fetchLiveFeed, pollMs);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' ? combinedFeed : combinedFeed.filter((s: any) => s.verdict === filter.toUpperCase());
  const counts: Record<string, number> = {
    all: combinedFeed.length,
    BLOCK: combinedFeed.filter((s: any) => s.verdict === 'BLOCK').length,
    WARN: combinedFeed.filter((s: any) => s.verdict === 'WARN').length,
    PASS: combinedFeed.filter((s: any) => s.verdict === 'PASS').length,
  };

  const statusColor = apiState === 'live' ? 'var(--accent-pass)' : apiState === 'reconnecting' ? 'var(--accent-block)' : 'var(--accent-warn)';
  const statusLabel = apiState === 'live' ? 'LIVE' : apiState === 'reconnecting' ? 'RECONNECTING…' : 'CONNECTING…';
  const showWarmupHint = apiState !== 'live';

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1>Live community feed</h1>
            <div className="sub">
              <div style={{display:'flex', alignItems:'center', gap: 6}}><LivePulse /><span style={{ color: statusColor }}>{statusLabel}</span></div>
              <span>{combinedFeed.length.toLocaleString()} entries · last 24h</span>
              <span>updates every 10s</span>
              {showWarmupHint && <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>api warming up · may take ~30s on first load</span>}
            </div>
          </div>
          <Link className="btn ghost" href="/">↩ back to landing</Link>
        </div>
        <div className="filter-row">
          {[['all','All'],['BLOCK','Block'],['WARN','Warn'],['PASS','Pass']].map(([id,lbl]) => (
            <button key={id} className={`filter-pill ${filter===id?'active':''}`} onClick={()=>setFilter(id)}>
              <span className={`verdict-dot ${id==='all'?'pass':id.toLowerCase()}`} style={{ width:6, height:6, display:'inline-block', background: id==='all' ? 'var(--text-secondary)' : id==='BLOCK'?'var(--accent-block)':id==='WARN'?'var(--accent-warn)':'var(--accent-pass)' }}></span>
              <span>{lbl}</span><span className="ct">{counts[id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN FEED */}
      <div>
        <div className="feed-head">
          <h2><strong>SCAN FEED</strong> · showing {filtered.length} of {feed.length}</h2>
          <div className="live-meta"><LivePulse /><span>auto-refreshing</span></div>
        </div>
        <div className="scan-feed">
          {feedLoading && feed.length === 0 ? (
            [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
          ) : (
            filtered.map((scan: any) => (
              <ScanCard
                key={scan.id}
                scan={scan}
                expanded={expandedId === scan.id}
                onToggle={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
                isNew={newId === scan.id}
              />
            ))
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="panel">
          <div className="panel-head"><span><span className="acc">●</span> TOP THREATS</span><span>live · community</span></div>
          <div className="panel-body tight">
            {threatsLoading ? (
              [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
            ) : topThreats && topThreats.length > 0 ? (
              topThreats.map((t, rank) => (
                <div className="threat-row" key={t.package_name}>
                  <span className="rank">#{String(rank+1).padStart(2,'0')}</span>
                  <div>
                    <div className="pkg">{t.package_name}</div>
                    <div className="ver-tiny">{t.flagged_versions[0] ?? 'multiple'}</div>
                  </div>
                  <div className="score-bar"><div className="fill" style={{ width: `${t.community_threat_score ?? 50}%` }}></div></div>
                  <span className="score">{t.community_threat_score ?? '—'}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
                no threats scored yet<br/>5+ scans needed per package
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span><span className="acc">●</span> VERDICT DISTRIBUTION</span><span>current feed</span></div>
          <LiveHistogram feed={combinedFeed} />
        </div>

        <div className="panel">
          <div className="panel-head"><span><span className="acc">●</span> TODAY'S STATS</span><span>{new Date().toISOString().slice(0,10)}</span></div>
          <div className="stats-mini">
            <div className="stat-mini"><div className="v">{combinedFeed.length}</div><div className="l">IN FEED</div></div>
            <div className="stat-mini"><div className="v">{counts.BLOCK}</div><div className="l">BLOCKED</div></div>
            <div className="stat-mini"><div className="v">{feed.length}</div><div className="l">SCANS</div></div>
            <div className="stat-mini"><div className="v">{computeP50(feed)}</div><div className="l">P50 LATENCY</div></div>
          </div>
        </div>

        <div className="demo-cta">
          <span className="demo-tag">▶ TRY IT</span>
          <h3>Run the axios <span className="glitch-attack" data-text="attack">attack</span> live</h3>
          <p>The exact 1.7.9 → 1.7.10 hijack from March 31, 2026. See Preflight catch it in 2.84 seconds.</p>
          <Link className="btn primary full" href="/demo">
            Open demo →
          </Link>
        </div>
      </aside>
    </div>
  );
}

