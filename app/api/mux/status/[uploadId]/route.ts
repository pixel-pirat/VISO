import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const muxTokenId     = process.env.MUX_TOKEN_ID;
    const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
    if (!muxTokenId || !muxTokenSecret) {
      return NextResponse.json({ error: "Mux not configured" }, { status: 503 });
    }

    const { uploadId } = await params;
    const { default: Mux } = await import("@mux/mux-node");
    const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });

    const upload = await mux.video.uploads.retrieve(uploadId);

    if (upload.status === "asset_created" && upload.asset_id) {
      const asset      = await mux.video.assets.retrieve(upload.asset_id);
      const playbackId = asset.playback_ids?.[0]?.id;

      if (asset.status === "ready" && playbackId) {
        return NextResponse.json({
          status:       "ready",
          playbackId,
          url:          `https://stream.mux.com/${playbackId}.m3u8`,
          thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
          duration:     Math.round(asset.duration ?? 0),
        });
      }
      return NextResponse.json({ status: asset.status ?? "preparing" });
    }

    return NextResponse.json({ status: upload.status ?? "waiting" });
  } catch (err: unknown) {
    console.error("[mux/status]", err);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
