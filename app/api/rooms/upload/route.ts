import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

// POST /api/rooms/upload — upload cover image or video
// Returns { url: "/uploads/rooms/<filename>" }
// Files are stored in public/uploads/rooms/ for local dev.
// In production swap this out for S3 / Cloudflare R2.

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/ogg"];
const MAX_IMAGE_BYTES = 5  * 1024 * 1024;  // 5 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const isImage = ALLOWED_IMAGE.includes(file.type);
  const isVideo = ALLOWED_VIDEO.includes(file.type);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File too large (max ${maxBytes / 1024 / 1024} MB)` }, { status: 413 });
  }

  const ext      = file.name.split(".").pop() ?? (isImage ? "jpg" : "mp4");
  const filename = `${randomBytes(16).toString("hex")}.${ext}`;
  const dir      = join(process.cwd(), "public", "uploads", "rooms");
  const filepath = join(dir, filename);

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return NextResponse.json({ url: `/uploads/rooms/${filename}`, type: isImage ? "image" : "video" });
}
