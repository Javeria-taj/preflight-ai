import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 14 }}>
              <span className="logo-mark" style={{width:28, height:28}}>P</span>
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>Preflight</span>
            </div>
            <p style={{ color: 'var(--text-muted)', maxWidth: '38ch', lineHeight: 1.7 }}>
              Behavioral pre-execution interceptor for the npm supply chain. Lives in your PR. Free forever, MIT.
            </p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <ul><li><Link href="/demo">Demo</Link></li><li><Link href="/dashboard">Live feed</Link></li><li><Link href="/scans/scn_a1f7e2">Scan example</Link></li></ul>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <ul><li><a>Documentation</a></li><li><a>API reference</a></li><li><a>Threat database</a></li></ul>
          </div>
          <div className="footer-col">
            <h5>About</h5>
            <ul><li><a>The axios incident</a></li><li><a>Methodology</a></li><li><a>GitHub</a></li></ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>preflight.dev · MIT · sha=4f2a91c · built for NMIT Hacks 2026</span>
          <span className="text-muted">no accounts · no tracking · no telemetry</span>
        </div>
      </div>
    </footer>
  );
}
