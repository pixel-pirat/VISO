import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const VIDEO_EXTS = ["mkv","avi","mov","wmv","mp4","webm","ogg","mpeg","3gp","m4v","ts","flv","m2ts"];
const VIDEO_TYPES = [
  "video/mp4","video/webm","video/ogg","video/quicktime",
  "video/x-matroska","video/x-msvideo","video/x-ms-wmv",
  "video/mpeg","video/3gpp","application/octet-stream",
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = request.headers.get("content-type") ?? "";

    // ── JSON body → video upload URL request (no file sent to server) ────
    if (contentType.includes("application/json")) {
      const body     = await request.json();
      const filename = (body.filename as string) ?? "";
      const fileType = (body.fileType as string) ?? "";
      const ext      = filename.split(".").pop()?.toLowerCase() ?? "";

      const isVideo  = VIDEO_TYPES.includes(fileType) || VIDEO_EXTS.includes(ext);
      if (!isVideo) {
        return NextResponse.json({ error: "Not a supported video format." }, { status: 415 });
      }

      const muxTokenId     = process.env.MUX_TOKEN_ID;
      const muxTokenSecret = process.env.MUX_TOKEN_SECRET;
      if (!muxTokenId || !muxTokenSecret) {
        return NextResponse.json(
          { error: "Video upload is not configured — MUX_TOKEN_ID and MUX_TOKEN_SECRET are missing." },
          { status: 503 }
        );
      }

      const { default: Mux } = await import("@mux/mux-node");
      const mux    = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });
      const origin = request.headers.get("origin") ?? "https://viso-theatre.vercel.app";

      const upload = await mux.video.uploads.create({
        cors_origin: origin,
        new_asset_settings: {
          playback_policy: ["public"],
          // "smart" picks the fastest encoder for the input — much quicker than "baseline"
          encoding_tier:   "smart",
          mp4_support:     "capped-1080p",
        },
      });

      return NextResponse.json({
        type:      "video",
        mux:       true,
        uploadId:  upload.id,
        uploadUrl: upload.url,
        url:       upload.id,  // placeholder until webhook fires
      });
    }

    // ── FormData body → image upload ──────────────────────────────
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext     = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = ALLOWED_IMAGE.includes(file.type) ||
                    ["jpg","jpeg","png","webp","gif"].includes(ext);

    if (!isImage) {
      // If someone accidentally sends a video via FormData, give a clear message
      return NextResponse.json(
        { error: "Videos must be uploaded using the video upload flow, not FormData." },
        { status: 415 }
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large (max 10 MB)" }, { status: 413 });
    }

    const buffer  = Buffer.from(await file.arrayBuffer());
    const mime    = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    return NextResponse.json({ url: dataUrl, type: "image" });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[/api/rooms/upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
