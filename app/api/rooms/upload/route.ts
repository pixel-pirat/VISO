import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = [
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-matroska",         // .mkv
  "video/x-msvideo",          // .avi
  "video/x-ms-wmv",           // .wmv
  "video/mpeg",
  "video/3gpp",
  "application/octet-stream", // renamed files
];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext     = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isVideo = ALLOWED_VIDEO.includes(file.type) ||
                    ["mkv","avi","mov","wmv","mp4","webm","ogg","mpeg","3gp","m4v"].includes(ext);
    const isImage = ALLOWED_IMAGE.includes(file.type) ||
                    ["jpg","jpeg","png","webp","gif"].includes(ext);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Unsupported file type. Supported: images (JPG/PNG/WEBP) and video (MP4/MKV/AVI/MOV/WebM)." },
        { status: 415 }
      );
    }

    // ── Images ── convert to base64 data URL so it works on Vercel
    // (Vercel's filesystem is read-only; we can't write to public/)
    if (isImage) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Image too large (max 10 MB)" }, { status: 413 });
      }
      const buffer  = Buffer.from(await file.arrayBuffer());
      const mime    = file.type || "image/jpeg";
      const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ url: dataUrl, type: "image" });
    }

    // ── Videos ── create a Mux direct upload URL ──────────────────
    // Lazily import so a missing env var doesn't crash unrelated routes
    const muxTokenId     = process.env.MUX_TOKEN_ID;
    const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!muxTokenId || !muxTokenSecret) {
      return NextResponse.json(
        { error: "Video upload is not configured. Please add MUX_TOKEN_ID and MUX_TOKEN_SECRET to your environment variables." },
        { status: 503 }
      );
    }

    const { default: Mux } = await import("@mux/mux-node");
    const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });

    const origin = request.headers.get("origin") ?? "https://viso-theatre.vercel.app";

    const upload = await mux.video.uploads.create({
      cors_origin: origin,
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier:   "baseline",
        mp4_support:     "capped-1080p",
      },
    });

    return NextResponse.json({
      type:      "video",
      mux:       true,
      uploadId:  upload.id,
      uploadUrl: upload.url,
      url:       upload.id, // placeholder — replaced by webhook when ready
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[/api/rooms/upload]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
