import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId:     process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

// POST /api/mux/upload
// Returns a direct upload URL the browser uses to PUT the file straight to Mux.
// Accepts any video format (MKV, MP4, AVI, MOV, WebM, etc.)
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = request.headers.get("origin") ?? "https://viso-theatre.vercel.app";

  const upload = await mux.video.uploads.create({
    cors_origin: origin,
    new_asset_settings: {
      playback_policy:   ["public"],
      encoding_tier:     "baseline",   // fastest transcode
      mp4_support:       "capped-1080p",
    },
  });

  return NextResponse.json({
    uploadId:  upload.id,
    uploadUrl: upload.url,
  });
}
