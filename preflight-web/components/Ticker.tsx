import React from "react";
import { LivePulse } from "./LivePulse";
import { TICKER_FEED } from "../lib/data";

export function Ticker() {
  const items = [...TICKER_FEED, ...TICKER_FEED];
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
