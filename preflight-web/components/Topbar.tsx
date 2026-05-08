"use client";
import React, { useState, useEffect } from "react";
import { LivePulse } from "./LivePulse";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Topbar() {
  const [time, setTime] = useState('');
  const pathname = usePathname() || "";
  const active = pathname === '/' ? 'home' : pathname.startsWith('/dashboard') ? 'dashboard' : pathname.startsWith('/demo') ? 'demo' : pathname.startsWith('/scans') ? 'scan' : '';

  useEffect(() => {
    const upd = () => {
      const d = new Date();
      setTime(d.toUTCString().slice(17, 25));
    };
    upd();
    const t = setInterval(upd, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Link className="logo" href="/">
          <span className="logo-mark">P</span>
          <span>Preflight</span>
          <span className="ver">v0.4.1</span>
        </Link>
        <div className="nav-links">
          {[
            { id: 'home', label: '_INDEX', num: '01', href: '/' },
            { id: 'dashboard', label: '_FEED', num: '02', href: '/dashboard' },
            { id: 'demo', label: '_DEMO', num: '03', href: '/demo' },
            { id: 'scan', label: '_SCAN', num: '04', href: '/scans/scn_a1f7e2' },
          ].map(n => (
            <Link key={n.id} className={`nav-link ${active === n.id ? 'active' : ''}`} href={n.href}>
              <span className="nav-num">{n.num}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="topbar-right">
        <div className="status-dot"><LivePulse /><span>API · OK</span></div>
        <div className="utc-clock"><span className="lbl">UTC</span>{time}</div>
        <a className="gh-link" href="#" onClick={(e)=>e.preventDefault()}>
          <span>★</span><span>2.4k</span><span className="text-muted">github</span>
        </a>
      </div>
    </div>
  );
}
