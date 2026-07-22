import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAsset, playbackUrlFor, verifyWebhookSignature } from "@/lib/livepeer";

// POST /api/livepeer/webhook
// Livepeer Studio → Developers/Webhooks → create a webhook for asset
// events pointing here, and copy its signing secret into
// LIVEPEER_WEBHOOK_SECRET (also set it in Vercel). Requests are rejected
// until that's set.
//
// This is a latency optimization, not the source of truth: whichever asset
// id we can find in the payload is re-fetched from Livepeer directly
// (rather than trusting webhook body fields we can't fully verify the
// shape of), and the exact same update also happens via self-healing polling
// in /api/livepeer/status — so a missed or malformed webhook delivery never
// breaks playback, just delays the DB getting the final URL.
export async function POST(request: NextRequest) {
  const secret = process.env.LIVEPEER_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[livepeer/webhook] LIVEPEER_WEBHOOK_SECRET is not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("livepeer-signature"), secret)) {
    console.warn("[livepeer/webhook] signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  if (!event.startsWith("asset.")) return NextResponse.json({ ok: true }); // not ours

  const payload = (body.payload ?? body.object ?? body.asset ?? body) as Record<string, unknown>;
  const assetId = typeof payload.id === "string" ? payload.id : null;
  if (!assetId) return NextResponse.json({ ok: true });

  try {
    const asset = await getAsset(assetId);
    if (asset.status.phase === "ready") {
      const url          = playbackUrlFor(asset);
      const thumbnailUrl = `https://livepeercdn.studio/asset/${asset.playbackId}/thumbnail.png`;
      const duration      = Math.round(asset.videoSpec?.duration ?? 0);

      await prisma.content.updateMany({
        where: { url: assetId },
        data:  { url, thumbnailUrl, duration: duration || null, type: "HLS" },
      });
    }
  } catch (err) {
    // Non-fatal — the status-poll self-heal will pick this up
    console.error("[livepeer/webhook] failed to resolve asset:", err);
  }

  return NextResponse.json({ ok: true });
}
