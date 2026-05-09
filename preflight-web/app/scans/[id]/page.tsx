"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { SCAN_DETAIL_AXIOS, DEMO_SCAN_ID } from "@/lib/data";
import { getScan, normalizeScan, ScanDetail } from "@/lib/api";
import Link from "next/link";

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [rawScan, setRawScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // For the demo scan ID, skip API call — use static data which includes iocs + kill-chain
    if (!id || id === DEMO_SCAN_ID) { setLoading(false); return; }
    getScan(id)
      .then(data => { setRawScan(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  // Use static data for demo scan, or normalize live data for real scans
  const isDemo = !id || id === DEMO_SCAN_ID || !rawScan;
  const s: any = isDemo ? SCAN_DETAIL_AXIOS : {
    ...normalizeScan(rawScan!),
    scannedAt: rawScan!.scanned_at,
    attackPattern: rawScan!.signals.llm_reasoning.attack_pattern,
    model: 'gemini-2.5-pro',
    iocs: [],
    signals: SCAN_DETAIL_AXIOS.signals.map((sig: any, i: number) => {
      const rawSigs = [rawScan!.signals.script_diff, rawScan!.signals.ast_scan, rawScan!.signals.maintainer, rawScan!.signals.llm_reasoning] as any[];
      return { ...sig, flagged: i < 3 ? rawSigs[i].flagged : rawScan!.signals.llm_reasoning.verdict !== 'PASS' };
    }),
  };

  const [openIdx, setOpenIdx] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (loading) return (
    <div className="scan-detail">
      {/* Full skeleton layout — preserves height, no layout shift */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ width: 120, height: 12, background: 'var(--bg-surface)', animation: 'skeletonPulse 1.4s ease-in-out infinite', borderRadius: 2 }} />
        <div style={{ width: 200, height: 12, background: 'var(--bg-surface)', animation: 'skeletonPulse 1.4s ease-in-out infinite', borderRadius: 2 }} />
      </div>
      <div style={{ border: '1px solid var(--border)', padding: 24, background: 'var(--bg-surface)', marginBottom: 16 }}>
        <div style={{ width: '40%', height: 32, background: 'var(--bg-elevated)', animation: 'skeletonPulse 1.4s ease-in-out infinite', borderRadius: 2, marginBottom: 12 }} />
        <div style={{ width: '60%', height: 18, background: 'var(--bg-elevated)', animation: 'skeletonPulse 1.4s ease-in-out infinite', borderRadius: 2, marginBottom: 8 }} />
        <div style={{ width: '80%', height: 12, background: 'var(--bg-elevated)', animation: 'skeletonPulse 1.4s ease-in-out infinite', borderRadius: 2 }} />
      </div>
      <div style={{ border: '1px solid var(--border)', padding: 24, background: 'var(--bg-surface)', marginBottom: 16 }}>
        <div style={{ width: '30%', height: 12, background: 'var(--bg-elevated)', animation: 'skeletonPulse 1.4s ease-in-out infinite', borderRadius: 2, marginBottom: 16 }} />
        {[1,2,3,4].map(i => <div key={i} style={{ height: 52, background: 'var(--bg-elevated)', animation: 'skeletonPulse 1.4s ease-in-out infinite', borderRadius: 2, marginBottom: 8 }} />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="scan-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'var(--font-mono)', color: 'var(--accent-block)', fontSize: 13 }}>
      ✕ scan not found · <Link href="/dashboard" style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>← back to feed</Link>
    </div>
  );

  return (
    <div className="scan-detail">
      {showToast && <div className="toast">Link copied to clipboard</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)' }}>← back to feed</Link>
        <span>scan_id <span style={{ color: 'var(--text-primary)' }}>{s.id}</span></span>
      </div>

      {/* HEADER */}
      <div className="scan-detail-head">
        <div className="meta">
          <div className="meta-row"><VerdictBadge verdict={s.verdict} /><span style={{fontFamily:'var(--font-mono)', fontSize: 12, color: 'var(--accent-block)'}}>● 4 / 4 signals flagged</span></div>
          <div className="pkg">
            <span className="name">{s.package}</span>
            {s.from ? <span style={{color:'var(--text-secondary)'}}>{s.from}</span> : <span style={{color:'var(--text-muted)'}}>[new dependency]</span>}
            <span style={{color:'var(--text-muted)'}}>→</span>
            <span style={{color:'var(--accent-block)'}}>{s.to}</span>
          </div>
          <div className="id-row">
            {s.repo && <span><span className="key">repo</span> {s.repo}</span>}
            {s.pr && <span><span className="key">pr</span> #{s.pr}</span>}
            <span><span className="key">scanned</span> {s.scannedAt}</span>
            <span><span className="key">duration</span> {s.duration ?? s.duration_ms ?? '—'}ms</span>
            {s.model && <span><span className="key">model</span> {s.model}</span>}
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 8 }}>
            <div style={{ flex: 1, maxWidth: 360 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                <span>CONFIDENCE</span><span style={{ color: 'var(--accent-block)', fontWeight: 700 }}>{Math.round(s.confidence * 100)}%</span>
              </div>
              <ConfidenceBar confidence={s.confidence} animate={false} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <button className="btn ghost" onClick={handleShare}>↗ share</button>
          <Link className="btn primary" href="/demo">↺ rerun</Link>
        </div>
      </div>

      {/* AI SUMMARY */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: 32 }}>
        <div className="eyebrow">gemini summary · synthesised from 4 signals</div>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--text-primary)', maxWidth: '78ch' }}>
          {s.summary}
        </p>
        <div style={{ marginTop: 22, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ padding: '10px 16px', border: '1px solid var(--accent-block)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <span className="glitch-attack" data-text="attack">attack</span><span style={{ color: 'var(--accent-block)' }}>_pattern: </span>
            <strong style={{ color: 'var(--accent-block)' }}>{s.attackPattern}</strong>
          </div>
        </div>
      </div>

      {/* KILL CHAIN */}
      <div className="kill-timeline">
        <div className="label-col">
          <h4>● KILL CHAIN</h4>
          <p>The exact sequence Preflight observed, in order. Total elapsed: <span style={{color:'var(--text-primary)', fontFamily: 'var(--font-mono)'}}>2.84s</span>.</p>
        </div>
        <div className="kill-list">
          {[
            { ts: '+0.04s', name: 'Lockfile delta', desc: '1 package changed: axios 1.7.9 → 1.7.10', clear: true, pill: 'ok' },
            { ts: '+0.71s', name: 'New postinstall hook', desc: 'package.json gains "postinstall": "node ./_postinstall.js"', clear: false, pill: 'flag' },
            { ts: '+1.32s', name: 'Spawn + outbound HTTPS', desc: 'AST sees child_process.spawn → https.request to fresh domain', clear: false, pill: 'flag' },
            { ts: '+1.84s', name: 'Maintainer key rotated', desc: 'Signing key changed 6h before release · 238d inactive prior', clear: false, pill: 'flag' },
            { ts: '+2.71s', name: 'Gemini synthesis', desc: 'pattern=npm_account_hijack_rat_deployment, confidence=0.94', clear: false, pill: 'flag' },
            { ts: '+2.84s', name: 'Verdict written', desc: 'BLOCK published to MongoDB · PR comment posted · status check failed', clear: true, pill: 'done' },
          ].map((k, i) => (
            <div className={`kill-step ${k.clear ? 'clear' : ''}`} key={i}>
              <span className="ts">{k.ts}</span>
              <span className="marker"></span>
              <div className="body">
                <div className="name">{k.name}<span className="pill">{k.pill}</span></div>
                <div className="desc">{k.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIGNAL CARDS */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 14 }}>signals · click to expand</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {s.signals.map((sig: any, i: number) => (
            <div key={i} className={`signal-detail ${sig.flagged ? 'flagged' : 'clear'} ${openIdx === i ? 'open' : ''}`}>
              <div className="signal-detail-head" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
                <span className="num">{sig.num}</span>
                <span className="icon-box">{sig.icon}</span>
                <div>
                  <div className="name">{sig.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {sig.flagged ? '✕ FLAGGED' : '✓ CLEAR'} · {sig.kv[1]?.k}: {sig.kv[1]?.v}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {sig.flagged ? 'critical' : 'clean'}
                </span>
                <span className="chev">›</span>
              </div>
              {openIdx === i && (
                <div className="signal-detail-body">
                  <div className="kv-grid">
                    {sig.kv ? sig.kv.map((kv: any, j: number) => (
                      <div className="kv" key={j}>
                        <span className="k">{kv.k}</span>
                        <span className={`v ${kv.bad ? 'bad' : ''}`}>{kv.v}</span>
                      </div>
                    )) : (
                      <div className="kv">
                        <span className="k">STATUS</span>
                        <span className={`v ${sig.flagged ? 'bad' : ''}`}>{sig.flagged ? 'FLAGGED' : 'CLEAR'}</span>
                      </div>
                    )}
                  </div>
                  {sig.diff && (
                    <div className="diff-block">
                      <div className="diff-block-head">
                        <span>{sig.num === '01' ? 'package.json' : './_postinstall.js'} · diff</span>
                        <span style={{color: 'var(--accent-block)'}}>+{sig.diff.filter((d: any) => d.type==='add').length} added</span>
                      </div>
                      {sig.diff.map((d: any, k: number) => (
                        <div key={k} className={`diff-row ${d.type} ${d.flag ? 'flag' : ''}`}>
                          <span className="lineno">{d.n}</span>
                          <span className="sign">{d.sign}</span>
                          <span className="text">{d.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {sig.explanation && (
                    <div style={{ padding: '14px 16px', background: 'var(--bg-deep)', borderLeft: '3px solid var(--accent-block)', fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                        ── gemini explanation
                      </div>
                      {sig.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* IOCs — only rendered for demo scan which has rich static data */}
      {isDemo && s.iocs && s.iocs.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>indicators of compromise · {s.iocs.length} matches</div>
          <div className="ioc-list">
            {s.iocs.map((ioc: any, i: number) => (
              <div className="ioc-item" key={i}>
                <span className="ioc-type">{ioc.type}</span>
                <span className="ioc-val">{ioc.val}</span>
                <span className="ioc-conf">conf {ioc.conf}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PR COMMENT — only shown for demo scan; real scan comments live on GitHub */}
      {isDemo && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>posted to github pr #{s.pr ?? '—'}</div>
          <div className="pr-comment">
            <div className="pr-comment-head">
              <div className="gh-avatar">P</div>
              <span className="who">preflight-ai</span>
              <span>commented · {s.scannedAt}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--accent-block)', fontWeight: 700 }}>● {s.verdict}</span>
            </div>
            <div className="pr-comment-body">
              <h4>🔴 Preflight: {s.verdict} — Dependency Update Intercepted</h4>
              <div><strong style={{color:'var(--text-primary)'}}>{s.package}</strong> <span className="text-muted">{s.from ?? '[new]'} → {s.to}</span> · Confidence: <span style={{color:'var(--accent-block)', fontWeight: 700}}>{Math.round(s.confidence * 100)}%</span> · <span className="text-muted">{s.duration ?? '—'}ms</span></div>
              <div className="quote">
                {s.summary}
              </div>
              <div style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
                ❌ Do NOT merge · 🔍 Review manually · 📢 Report to npm security
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
