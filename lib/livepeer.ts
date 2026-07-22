// Livepeer Studio API client — open-source video infrastructure, used here
// as a drop-in replacement for Mux (direct upload → transcode → HLS
// playback). Server-side only (uses LIVEPEER_API_KEY); no SDK dependency,
// just the documented REST API, same pattern as lib/tmdb.ts.

import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://livepeer.studio/api";

function authHeaders() {
  const key = process.env.LIVEPEER_API_KEY;
  if (!key) throw new Error("LIVEPEER_API_KEY is not set");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export type LivepeerAsset = {
  id: string;
  playbackId: string;
  playbackUrl?: string;
  status: {
    phase: "uploading" | "waiting" | "processing" | "ready" | "failed" | "deleting" | "deleted";
    updatedAt: number;
    progress?: number;
    errorMessage?: string;
  };
  videoSpec?: { duration?: number };
};

// POST /api/asset/request-upload — returns a direct PUT upload URL plus the
// asset record, created up front (unlike Mux, where the asset only exists
// after the upload completes).
export async function createUpload(name: string): Promise<{
  uploadUrl: string;
  assetId: string;
  playbackId: string;
}> {
  const res = await fetch(`${BASE}/asset/request-upload`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Livepeer request-upload ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { uploadUrl: data.url, assetId: data.asset.id, playbackId: data.asset.playbackId };
}

// GET /api/asset/{id} — current transcode status + playback info once ready.
export async function getAsset(assetId: string): Promise<LivepeerAsset> {
  const res = await fetch(`${BASE}/asset/${assetId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Livepeer get-asset ${res.status}: ${await res.text()}`);
  return res.json();
}

// HLS playback URL — prefer the API's own playbackUrl field (Livepeer can
// change CDN domains without breaking this), falling back to the
// documented URL pattern if a given response doesn't include it.
export function playbackUrlFor(asset: Pick<LivepeerAsset, "playbackId" | "playbackUrl">): string {
  return asset.playbackUrl ?? `https://livepeercdn.studio/hls/${asset.playbackId}/index.m3u8`;
}

// Verifies the "Livepeer-Signature: t=<timestamp>,v1=<hmac>" header.
// Best-effort: the webhook is a latency optimization on top of the status
// polling in /api/livepeer/status, which is what actually keeps playback
// correct — so a verification failure here should reject the webhook, not
// break anything else.
export function verifyWebhookSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
