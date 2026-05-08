"use client";
import React, { useState, useEffect } from "react";

export function StatusBar() {
  const [scanRate, setScanRate] = useState(127);
  const [latency, setLatency] = useState(284);
  useEffect(() => {
    const t = setInterval(() => {
      setScanRate(120 + Math.floor(Math.random() * 30));
      setLatency(260 + Math.floor(Math.random() * 80));
    }, 2400);
    return () => clearInterval(t);
  }, []);
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
      <div className="seg right"><span className="label">UPTIME</span><span className="val good">99.97%</span></div>
    </div>
  );
}
