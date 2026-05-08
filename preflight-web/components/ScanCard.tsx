"use client";
import React from "react";
import { VerdictBadge } from "./VerdictBadge";
import { SignalPill } from "./SignalPill";
import { ConfidenceBar } from "./ConfidenceBar";
import Link from "next/link";

export function ScanCard({ scan, expanded, onToggle, isNew }: any) {
  const verdictClass = `verdict-${scan.verdict.toLowerCase()}`;
  return (
    <div
      className={`scan-card ${verdictClass} ${expanded ? 'expanded' : ''} ${isNew ? 'new-arrival' : ''}`}
      onClick={onToggle}
    >
      <div className="scan-card-head">
        <VerdictBadge verdict={scan.verdict} />
        <div className="pkg-meta">
          <div className="pkg-name">
            {scan.package}<span className="ver"> @{scan.from}</span>
            <span className="arrow">→</span>
            <span className="new">{scan.to}</span>
          </div>
          <div className="repo-name">
            <span>{scan.repo}</span>
            {scan.pr && <span className="pr">#{scan.pr}</span>}
          </div>
        </div>
        <div className="signals-row" style={{ display: 'flex', justifySelf: 'end', gap: 6 }}>
          {scan.signals.map((s: any) => <SignalPill key={s.name} name={s.name.split(' ')[0]} flagged={s.flagged} />)}
        </div>
        <span className="confidence-pct">{Math.round(scan.confidence * 100)}%</span>
        <span className="timestamp">{scan.time}</span>
      </div>
      <div className="scan-card-conf">
        <span className="text-muted">conf</span>
        <div className="conf-wrap"><ConfidenceBar confidence={scan.confidence} animate={false} /></div>
        <span>{scan.duration}ms</span>
      </div>
      {expanded && (
        <div className="scan-card-expanded">
          <p>{scan.summary}</p>
          <div className="row">
            <Link className="btn ghost" href={`/scans/${scan.id}`} onClick={(e) => { e.stopPropagation(); }}>
              View full scan →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
