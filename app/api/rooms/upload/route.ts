import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUpload } from "@/lib/livepeer";

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

      if (!process.env.LIVEPEER_API_KEY) {
        return NextResponse.json(
          { error: "Video upload is not configured — LIVEPEER_API_KEY is missing." },
          { status: 503 }
        );
      }

      const upload = await createUpload(filename || "room-upload");

      return NextResponse.json({
        type:      "video",
        uploadId:  upload.assetId,
        uploadUrl: upload.uploadUrl,
        url:       upload.assetId,  // placeholder until transcoding finishes
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
