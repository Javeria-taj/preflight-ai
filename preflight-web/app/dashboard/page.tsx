"use client";
import React, { useState, useEffect } from "react";
import { LivePulse } from "@/components/LivePulse";
import { ScanCard } from "@/components/ScanCard";
import { SCAN_FEED, TOP_THREATS } from "@/lib/data";
import Link from "next/link";

function Histogram({ data }: { data: any[] }) {
  return (
    <>
      <div className="histo">
        {data.map((d, i) => (
          <div key={i}
               className={`bar ${d.type}`}
               style={{ height: `${d.h}%` }}
               title={`${d.type} · ${d.count}`} />
        ))}
      </div>
      <div className="histo-legend">
        <span className="swatch"><i style={{background:'var(--accent-pass)'}}></i> PASS 92.4%</span>
        <span className="swatch"><i style={{background:'var(--accent-warn)'}}></i> WARN 6.8%</span>
        <span className="swatch"><i style={{background:'var(--accent-block)'}}></i> BLOCK 0.8%</span>
      </div>
    </>
  );
}

function genHisto() {
  const out = [];
  for (let i = 0; i < 36; i++) {
    const r = Math.random();
    if (r < 0.05) out.push({ type: 'block', h: 30 + Math.random() * 50, count: 1 });
    else if (r < 0.15) out.push({ type: 'warn', h: 25 + Math.random() * 50, count: 2 });
    else out.push({ type: '', h: 30 + Math.random() * 65, count: 12 });
  }
  return out;
}

export default function DashboardPage() {
  const [feed, setFeed] = useState(SCAN_FEED);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [newId, setNewId] = useState<string | null>(null);
  const [histo, setHisto] = useState<any[]>([]);
  const [counter, setCounter] = useState(142039);

  useEffect(() => {
    setHisto(genHisto());
    let i = 0;
    const fakeNew = [
      { id: `scn_n${Math.random().toString(36).slice(2,8)}`, verdict: 'PASS', package: 'next', from: '14.2.3', to: '14.2.4',
        repo: 'orbit/marketing-site', pr: 99, time: 'just now', confidence: 0.14, duration: 1380,
        signals: [{name:'Script Diff',flagged:false},{name:'AST Scan',flagged:false},{name:'Maintainer',flagged:false},{name:'Gemini AI',flagged:false}],
        summary: 'Routine release.' },
      { id: `scn_n${Math.random().toString(36).slice(2,8)}`, verdict: 'WARN', package: 'sharp', from: '0.33.2', to: '0.33.3',
        repo: 'media/img-pipeline', pr: 56, time: 'just now', confidence: 0.62, duration: 2010,
        signals: [{name:'Script Diff',flagged:true},{name:'AST Scan',flagged:false},{name:'Maintainer',flagged:false},{name:'Gemini AI',flagged:true}],
        summary: 'Native binary download URL changed. Worth review.' },
      { id: `scn_n${Math.random().toString(36).slice(2,8)}`, verdict: 'PASS', package: 'tailwindcss', from: '3.4.3', to: '3.4.4',
        repo: 'acme-corp/dashboard', pr: 2902, time: 'just now', confidence: 0.06, duration: 980,
        signals: [{name:'Script Diff',flagged:false},{name:'AST Scan',flagged:false},{name:'Maintainer',flagged:false},{name:'Gemini AI',flagged:false}],
        summary: 'Patch only.' },
    ];
    const t = setInterval(() => {
      const incoming = fakeNew[i % fakeNew.length];
      const id = `scn_n${Math.random().toString(36).slice(2,8)}`;
      const next = { ...incoming, id };
      setFeed(prev => [next, ...prev].slice(0, 12));
      setNewId(id);
      setCounter(c => c + Math.floor(2 + Math.random() * 6));
      setTimeout(() => setNewId(null), 600);
      i++;
    }, 7500);
    return () => clearInterval(t);
  }, []);

  const filtered = filter === 'all' ? feed : feed.filter(s => s.verdict === filter.toUpperCase());
  const counts: Record<string, number> = { all: feed.length, BLOCK: feed.filter(s=>s.verdict==='BLOCK').length,
                   WARN: feed.filter(s=>s.verdict==='WARN').length,
                   PASS: feed.filter(s=>s.verdict==='PASS').length };

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1>Live community feed</h1>
            <div className="sub">
              <div style={{display:'flex', alignItems:'center', gap: 6}}><LivePulse /><span style={{ color: 'var(--accent-pass)' }}>STREAMING</span></div>
              <span>{counter.toLocaleString()} total scans · last 24h</span>
              <span>updates every 7.5s</span>
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
          {filtered.map((scan: any) => (
            <ScanCard
              key={scan.id}
              scan={scan}
              expanded={expandedId === scan.id}
              onToggle={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
              isNew={newId === scan.id}
            />
          ))}
        </div>
      </div>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="panel">
          <div className="panel-head"><span><span className="acc">●</span> TOP THREATS</span><span>last 24h</span></div>
          <div className="panel-body tight">
            {TOP_THREATS.map(t => (
              <div className="threat-row" key={t.rank}>
                <span className="rank">#{String(t.rank).padStart(2,'0')}</span>
                <div>
                  <div className="pkg">{t.pkg}</div>
                  <div className="ver-tiny">{t.ver}</div>
                </div>
                <div className="score-bar"><div className="fill" style={{ width: `${t.score}%` }}></div></div>
                <span className="score">{t.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span><span className="acc">●</span> VERDICT DISTRIBUTION</span><span>last 36h</span></div>
          <Histogram data={histo} />
        </div>

        <div className="panel">
          <div className="panel-head"><span><span className="acc">●</span> TODAY'S STATS</span><span>2026-05-08</span></div>
          <div className="stats-mini">
            <div className="stat-mini"><div className="v">12,847</div><div className="l">SCANS</div></div>
            <div className="stat-mini"><div className="v">47</div><div className="l">BLOCKED</div></div>
            <div className="stat-mini"><div className="v">312</div><div className="l">REPOS</div></div>
            <div className="stat-mini"><div className="v">2.7s</div><div className="l">P50 LATENCY</div></div>
          </div>
        </div>

        <div className="demo-cta">
          <span className="demo-tag">▶ TRY IT</span>
          <h3>Run the axios <span style={{ color: 'var(--accent-block)' }}>attack</span> live</h3>
          <p>The exact 1.7.9 → 1.7.10 hijack from March 31, 2026. See Preflight catch it in 2.84 seconds.</p>
          <Link className="btn primary full" href="/demo">
            Open demo →
          </Link>
        </div>
      </aside>
    </div>
  );
}
