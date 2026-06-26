import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX     = 5 * 1024 * 1024; // 5 MB

// POST /api/profile/avatar — upload a new avatar
// Returns { avatarUrl } as a base64 data URL (works on Vercel without S3)
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!ALLOWED.includes(file.type))
    return NextResponse.json({ error: "Only JPG, PNG, WEBP or GIF" }, { status: 415 });
  if (file.size > MAX)
    return NextResponse.json({ error: "Max 5 MB" }, { status: 413 });

  const buffer  = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { avatarUrl: dataUrl, image: dataUrl },
  });

  return NextResponse.json({ avatarUrl: dataUrl });
}
