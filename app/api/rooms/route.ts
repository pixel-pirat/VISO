import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { randomBytes } from "crypto";

// ── GET /api/rooms ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const sp = request.nextUrl.searchParams;
  const type    = sp.get("type")    ?? "all";
  const privacy = sp.get("privacy") ?? "all";
  const search  = sp.get("search")  ?? "";
  const take    = Math.min(Number(sp.get("take") ?? "20"), 50);
  const skip    = Number(sp.get("skip") ?? "0");

  let friendIds: string[] = [];
  if (type === "friends") {
    const friendships = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", deletedAt: null, OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    friendIds = friendships.map((f) => f.requesterId === userId ? f.addresseeId : f.requesterId);
  }

  // Auto-promote scheduled rooms whose time has come
  await prisma.room.updateMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() }, deletedAt: null },
    data:  { status: "LIVE" },
  });

  const baseWhere = {
    deletedAt: null,
    ...(search  ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { contentTitle: { contains: search, mode: "insensitive" as const } }] } : {}),
    ...(privacy === "public"   ? { visibility: "PUBLIC"  as const } : {}),
    ...(privacy === "private"  ? { visibility: "PRIVATE" as const } : {}),
    ...(type === "live"        ? { status: "LIVE" as const }        : {}),
    ...(type === "upcoming"    ? { status: "SCHEDULED" as const }   : {}),
    ...(type === "mine"        ? { hostId: userId }                 : {}),
    ...(type === "friends"     ? { hostId: { in: friendIds } }      : {}),
  };

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where: baseWhere,
      include: {
        host: { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { members: { where: { deletedAt: null, isBanned: false } } } },
        playbackState: {
          include: {
            roomContent: {
              include: { content: { select: { title: true, thumbnailUrl: true, duration: true, type: true } } },
            },
          },
        },
        members: { where: { userId, deletedAt: null }, select: { role: true }, take: 1 },
      },
      orderBy: [{ status: "asc" }, { members: { _count: "desc" } }, { createdAt: "desc" }],
      take,
      skip,
    }),
    prisma.room.count({ where: baseWhere }),
  ]);

  return NextResponse.json({ rooms, total, take, skip });
}

// ── POST /api/rooms ───────────────────────────────────────────
const createSchema = z.object({
  name:         z.string().min(1).max(80),
  contentTitle: z.string().max(120).optional(),
  description:  z.string().max(500).optional(),
  visibility:   z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  passcode:     z.string().min(4).max(20).optional().or(z.literal("")),
  // Accept any non-empty string — could be a relative /uploads/… path or a full URL
  coverUrl:     z.string().min(1).optional().or(z.literal("")),
  // URL of the uploaded video (stored in Content table after room creation)
  videoUrl:     z.string().min(1).optional().or(z.literal("")),
  scheduledAt:  z.string().datetime().optional(),
  commChat:     z.boolean().default(true),
  commAudio:    z.boolean().default(false),
  commVideo:    z.boolean().default(false),
});

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body   = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { name, contentTitle, description, visibility, passcode, coverUrl, videoUrl, scheduledAt, commChat, commAudio, commVideo } = parsed.data;

  // Determine initial status
  const schedDate = scheduledAt ? new Date(scheduledAt) : null;
  const status = !schedDate || schedDate <= new Date() ? "LIVE" : "SCHEDULED";

  let slug = slugify(name);
  const existing = await prisma.room.findFirst({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const inviteToken = randomBytes(12).toString("hex");

  // Create room
  const room = await prisma.room.create({
    data: {
      name,
      slug,
      contentTitle: contentTitle || null,
      description:  description  || null,
      hostId:       userId,
      visibility,
      passcode:     passcode  || null,
      coverUrl:     coverUrl  || null,
      scheduledAt:  schedDate,
      status,
      commChat,
      commAudio,
      commVideo,
      inviteToken,
      members: { create: { userId, role: "HOST" } },
    },
    include: {
      host: { select: { id: true, name: true, username: true } },
      _count: { select: { members: true } },
    },
  });

  // If a video was uploaded, create a Content record and queue it in the room
  if (videoUrl) {
    // Mux upload IDs are alphanumeric strings (not URLs yet).
    // The webhook will update the URL to the real HLS stream once transcoding is done.
    const isMuxId = !videoUrl.startsWith("http") && !videoUrl.startsWith("/") && !videoUrl.startsWith("data:");

    const content = await prisma.content.create({
      data: {
        title:        contentTitle || name,
        url:          videoUrl,
        // Always HLS — Mux transcodes everything to HLS regardless of input format
        type:         "HLS",
        thumbnailUrl: coverUrl || null,
        addedById:    userId,
        isPublic:     visibility === "PUBLIC",
      },
    });

    await prisma.roomContent.create({
      data: {
        roomId:     room.id,
        contentId:  content.id,
        queueOrder: 1,
        addedById:  userId,
        status:     isMuxId ? "QUEUED" : "QUEUED",
      },
    });
  }

  return NextResponse.json({ room, inviteToken }, { status: 201 });
}
