import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

// ── GET /api/rooms/[slug] ─────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const userId = session.user.id;

  const room = await prisma.room.findFirst({
    where: { slug, deletedAt: null },
    include: {
      host: {
        select: { id: true, name: true, username: true, image: true, status: true },
      },
      members: {
        where: { deletedAt: null, isBanned: false },
        include: {
          user: { select: { id: true, name: true, username: true, image: true, status: true } },
        },
        orderBy: { joinedAt: "asc" },
        take: 30,
      },
      _count: {
        select: { members: { where: { deletedAt: null, isBanned: false } } },
      },
      messages: {
        where: { deletedAt: null },
        include: {
          sender: { select: { id: true, name: true, username: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      roomContents: {
        where: { deletedAt: null },
        include: {
          content: {
            select: { id: true, title: true, url: true, type: true, thumbnailUrl: true, duration: true },
          },
        },
        orderBy: { queueOrder: "asc" },
        take: 10,
      },
      playbackState: {
        include: {
          roomContent: {
            include: {
              content: { select: { title: true, thumbnailUrl: true, duration: true, type: true } },
            },
          },
        },
      },
    },
  });

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  // Determine the current user's membership & role
  const myMembership = room.members.find((m) => m.userId === userId);

  return NextResponse.json({ room, myMembership: myMembership ?? null });
}

// ── PATCH /api/rooms/[slug] — host-only edit ──────────────────
const editSchema = z.object({
  name:         z.string().min(1).max(80).optional(),
  contentTitle: z.string().max(120).optional().or(z.literal("")),
  description:  z.string().max(500).optional().or(z.literal("")),
  visibility:   z.enum(["PUBLIC", "PRIVATE"]).optional(),
  passcode:     z.string().min(4).max(20).optional().or(z.literal("")),
  coverUrl:     z.string().min(1).optional().or(z.literal("")),
  scheduledAt:  z.string().datetime().optional().or(z.literal("")),
  commChat:     z.boolean().optional(),
  commAudio:    z.boolean().optional(),
  commVideo:    z.boolean().optional(),
  status:       z.enum(["SCHEDULED", "LIVE", "ENDED"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const userId = session.user.id;

  const room = await prisma.room.findFirst({ where: { slug, deletedAt: null } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body   = await request.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { name, contentTitle, description, visibility, passcode, coverUrl, scheduledAt, commChat, commAudio, commVideo, status } = parsed.data;

  const schedDate = scheduledAt ? new Date(scheduledAt) : scheduledAt === "" ? null : undefined;

  const updated = await prisma.room.update({
    where: { id: room.id },
    data: {
      ...(name         !== undefined ? { name }                                  : {}),
      ...(contentTitle !== undefined ? { contentTitle: contentTitle || null }    : {}),
      ...(description  !== undefined ? { description:  description  || null }    : {}),
      ...(visibility   !== undefined ? { visibility }                            : {}),
      ...(passcode     !== undefined ? { passcode: passcode || null }            : {}),
      ...(coverUrl     !== undefined ? { coverUrl: coverUrl || null }            : {}),
      ...(schedDate    !== undefined ? { scheduledAt: schedDate }                : {}),
      ...(commChat     !== undefined ? { commChat }                              : {}),
      ...(commAudio    !== undefined ? { commAudio }                             : {}),
      ...(commVideo    !== undefined ? { commVideo }                             : {}),
      ...(status       !== undefined ? { status }                                : {}),
    },
    include: {
      host: { select: { id: true, name: true, username: true } },
    },
  });

  return NextResponse.json({ room: updated });
}

// ── DELETE /api/rooms/[slug] — host-only soft delete ──────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const userId = session.user.id;

  const room = await prisma.room.findFirst({ where: { slug, deletedAt: null } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.room.update({
    where: { id: room.id },
    data:  { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
