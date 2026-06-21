import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/mux/webhook
// Mux sends events here. We listen for video.asset.ready to update
// the Content record with the real playback ID and duration.
// In Mux dashboard → Settings → Webhooks, add:
//   https://viso-theatre.vercel.app/api/mux/webhook
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, data } = body;

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
