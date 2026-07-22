import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAsset, playbackUrlFor } from "@/lib/livepeer";

// GET /api/livepeer/status/[assetId] — polled by VideoPlayer while a video
// is transcoding. Also self-heals the Content row's placeholder URL once
// the asset is ready, the same update the webhook makes — so playback
// stays correct even if the webhook is never configured or a delivery
// is missed.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.LIVEPEER_API_KEY) {
      return NextResponse.json({ error: "Livepeer not configured" }, { status: 503 });
    }

    const { assetId } = await params;
    const asset = await getAsset(assetId);

    if (asset.status.phase === "ready") {
      const url          = playbackUrlFor(asset);
      const thumbnailUrl = `https://livepeercdn.studio/asset/${asset.playbackId}/thumbnail.png`;
      const duration      = Math.round(asset.videoSpec?.duration ?? 0);

      await prisma.content.updateMany({
        where: { url: assetId },
        data:  { url, thumbnailUrl, duration: duration || null, type: "HLS" },
      });

      return NextResponse.json({ status: "ready", url, thumbnailUrl, duration });
    }

    // Map Livepeer's phases onto the same status strings the player already
    // knows how to show a message for.
    const status =
      asset.status.phase === "processing" ? "preparing" :
      asset.status.phase === "failed"     ? "failed" :
      "waiting";

    return NextResponse.json({ status });
  } catch (err: unknown) {
    console.error("[livepeer/status]", err);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
