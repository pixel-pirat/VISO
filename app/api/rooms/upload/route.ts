import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import Mux from "@mux/mux-node";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = [
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-matroska",          // .mkv
  "video/x-msvideo",           // .avi
  "video/x-ms-wmv",            // .wmv
  "video/mpeg",                // .mpeg
  "video/3gpp",                // .3gp
  "application/octet-stream",  // catch-all for renamed files
];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const mux = new Mux({
  tokenId:     process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext     = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isVideo = ALLOWED_VIDEO.includes(file.type) || ["mkv","avi","mov","wmv","mp4","webm","ogg","mpeg","3gp","m4v"].includes(ext);
  const isImage = ALLOWED_IMAGE.includes(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported file type. Supported: images, MP4, MKV, AVI, MOV, WebM." }, { status: 415 });
  }

  // ── Images — store locally (small files, instant) ──────────────
  if (isImage) {
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large (max 10 MB)" }, { status: 413 });
    }
    const filename = `${randomBytes(16).toString("hex")}.${ext || "jpg"}`;
    const dir      = join(process.cwd(), "public", "uploads", "rooms");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/rooms/${filename}`, type: "image" });
  }

  // ── Videos — create a Mux direct upload URL ────────────────────
  // The browser will PUT the file directly to Mux, completely bypassing
  // Vercel's 4.5 MB body limit. Mux accepts ANY format including MKV.
  const origin = request.headers.get("origin") ?? "https://viso-theatre.vercel.app";

  const upload = await mux.video.uploads.create({
    cors_origin: origin,
    new_asset_settings: {
      playback_policy:  ["public"],
      encoding_tier:    "baseline",
      mp4_support:      "capped-1080p",
    },
  });

  // Return the Mux upload URL and upload ID.
  // The client PUTs the file to uploadUrl, then polls /api/mux/status/[uploadId]
  // until Mux finishes transcoding and the playbackId is ready.
  return NextResponse.json({
    type:       "video",
    mux:        true,
    uploadId:   upload.id,
    uploadUrl:  upload.url,
    // Placeholder URL — will be replaced by the webhook once transcoding finishes
    url:        upload.id,
  });
}
