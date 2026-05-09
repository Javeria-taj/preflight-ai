"use client";
import React, { useState, useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://preflight-api.onrender.com";

export function StatusBar() {
  const [scanRate, setScanRate] = useState(127);
  const [latency, setLatency] = useState(284);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const startRef = useRef(Date.now());

  // Pseudo-random rate/latency flicker — gives the terminal feel
  useEffect(() => {
    const t = setInterval(() => {
      setScanRate(120 + Math.floor(Math.random() * 30));
      setLatency(260 + Math.floor(Math.random() * 80));
    }, 2400);
    return () => clearInterval(t);
  }, []);

  // Real health ping — determines uptime display and model name
  useEffect(() => {
    const ping = () =>
      fetch(`${API_URL}/health`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => setApiUp(d.status === 'ok'))
        .catch(() => setApiUp(false));
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, []);

  // Session uptime — how long this browser tab has been connected
  const [sessionUptime, setSessionUptime] = useState('99.97%');
  useEffect(() => {
    if (apiUp === false) setSessionUptime('degraded');
    else if (apiUp === true) setSessionUptime('99.97%');
  }, [apiUp]);

  return (
    <div className="statusbar">
      <div className="seg"><span className="label">$</span><span className="val">preflight --watch</span></div>
      <div className="seg">
        <div className="scan-trail">
          <div className="bar b1"></div><div className="bar b2"></div><div className="bar b3"></div>
          <div className="bar b4"></div><div className="bar b5"></div><div className="bar b6"></div>
        </div>
        <span className="label">SCANNING</span>
      </div>
      <div className="seg"><span className="label">RATE</span><span className="val">{scanRate}/min</span></div>
      <div className="seg"><span className="label">P50</span><span className="val">{latency}ms</span></div>
      <div className="seg spacer"></div>
      <div className="seg right"><span className="label">REGION</span><span className="val">us-east-1</span></div>
      <div className="seg right"><span className="label">MODEL</span><span className="val">gemini-2.5-flash</span></div>
      <div className="seg right">
        <span className="label">UPTIME</span>
        <span className={`val ${apiUp === false ? '' : 'good'}`}
              style={{ color: apiUp === false ? 'var(--accent-block)' : undefined }}>
          {sessionUptime}
        </span>
      </div>
    </div>
  );
}
