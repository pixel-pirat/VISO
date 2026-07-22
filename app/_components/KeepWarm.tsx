"use client";

import { useEffect } from "react";

// Neon's serverless compute suspends after a few minutes idle, and waking
// it back up costs a multi-second "cold start" on whatever request happens
// to hit it next (measured ~3.2s cold vs ~250ms warm). Pinging a trivial
// DB-touching endpoint periodically while the app is open keeps the
// compute warm so real requests don't pay that penalty.
//
// 4 minutes is comfortably under Neon's idle window without spamming the
// database — going much more frequent (e.g. every few seconds) wouldn't
// keep it "more" awake, just waste requests.
const PING_INTERVAL_MS = 4 * 60 * 1000;

export function KeepWarm() {
  useEffect(() => {
    const ping = () => { fetch("/api/health", { cache: "no-store" }).catch(() => {}); };
    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
