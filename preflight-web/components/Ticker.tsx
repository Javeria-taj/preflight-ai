"use client";
import React, { useState, useEffect } from "react";
import { LivePulse } from "./LivePulse";
import { TICKER_FEED } from "../lib/data";
import { getScans } from "../lib/api";

export function Ticker() {
  const [items, setItems] = useState(
    [...TICKER_FEED, ...TICKER_FEED].map(it => ({
      v: it.v, pkg: it.pkg, repo: it.repo, t: it.t
    }))
  );

  useEffect(() => {
    getScans(1, 10).then(data => {
      if (data.scans && data.scans.length > 0) {
        const live = data.scans.map(s => ({
          v: s.verdict,
          pkg: `${s.package_name}@${s.new_version}`,
          repo: s.repo ?? 'community',
          t: new Date(s.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        const doubled = [...live, ...live];
        setItems(doubled);
      }
    }).catch(() => {}); // silently keep static data
  }, []);

  return (
    <div className="ticker">
      <div className="ticker-label">
        <LivePulse />LIVE INTERCEPTS
      </div>
      <div className="ticker-track">
        {items.map((it, i) => (
          <div key={i} className="ticker-item">
            <span className={`verdict-dot ${it.v.toLowerCase()}`} style={{ width:6, height:6, display:'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>{it.t}</span>
            <strong>{it.v}</strong>
            <span>{it.pkg}</span>
            <span style={{ color: 'var(--text-muted)' }}>· {it.repo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
