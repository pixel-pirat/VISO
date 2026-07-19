import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Mux from "@mux/mux-node";

// POST /api/mux/webhook
// Mux sends events here. We listen for video.asset.ready to update
// the Content record with the real playback ID and duration.
// In Mux dashboard → Settings → Webhooks, add:
//   https://viso-theatre.vercel.app/api/mux/webhook
// and copy the signing secret into the MUX_WEBHOOK_SECRET env var —
// requests are rejected until it is set.
export async function POST(request: NextRequest) {
  const secret = process.env.MUX_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[mux/webhook] MUX_WEBHOOK_SECRET is not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Verify the signature against the raw body before trusting anything in it
  const rawBody = await request.text();
  try {
    const mux = new Mux({
      tokenId:       process.env.MUX_TOKEN_ID,
      tokenSecret:   process.env.MUX_TOKEN_SECRET,
      webhookSecret: secret,
    });
    await mux.webhooks.verifySignature(
      rawBody,
      { "mux-signature": request.headers.get("mux-signature") ?? "" },
      secret
    );
  } catch (err) {
    console.warn("[mux/webhook] signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { type, data } = JSON.parse(rawBody);

  if (type === "video.asset.ready") {
    const uploadId:   string = data.upload_id;
    const playbackId: string = data.playback_ids?.[0]?.id;
    const duration:   number = Math.round(data.duration ?? 0);

    if (uploadId && playbackId) {
      // Find the Content row that was created with this uploadId as the URL,
      // then update it with the real Mux stream URL and duration.
      await prisma.content.updateMany({
        where: { url: uploadId },
        data:  {
          url:      `https://stream.mux.com/${playbackId}.m3u8`,
          thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
          duration: duration || null,
          type:     "HLS",
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
