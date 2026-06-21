import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { broadcastEvent } from "../events/route";

// ── PATCH /api/room/[slug]/playback — host controls play/pause/seek ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const userId   = session.user.id;

  const room = await prisma.room.findFirst({
    where: { slug, deletedAt: null },
    include: { playbackState: true },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId !== userId) return NextResponse.json({ error: "Forbidden — host only" }, { status: 403 });

  const { isPlaying, currentTime, speed, roomContentId } = await request.json();

  const updated = await prisma.roomPlaybackState.upsert({
    where:  { roomId: room.id },
    update: {
      ...(isPlaying    !== undefined ? { isPlaying }    : {}),
      ...(currentTime  !== undefined ? { currentTime }  : {}),
      ...(speed        !== undefined ? { speed }        : {}),
      ...(roomContentId !== undefined ? { roomContentId } : {}),
      lastUpdatedTime: new Date(),
      updatedById:     userId,
    },
    create: {
      roomId:          room.id,
      isPlaying:       isPlaying    ?? false,
      currentTime:     currentTime  ?? 0,
      speed:           speed        ?? 1,
      roomContentId:   roomContentId ?? null,
      updatedById:     userId,
    },
    include: {
      roomContent: {
        include: { content: { select: { title: true, url: true, type: true, duration: true, thumbnailUrl: true } } },
      },
    },
  });

  // If content is now playing, mark it as PLAYING in RoomContent
  if (roomContentId && isPlaying) {
    await prisma.roomContent.updateMany({
      where:  { roomId: room.id, id: roomContentId },
      data:   { status: "PLAYING" },
    });
  }

  // Broadcast to all SSE subscribers
  broadcastEvent(slug, { type: "playback_sync", playbackState: updated });

  return NextResponse.json({ playbackState: updated });
}

// ── GET — current playback state ─────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const room = await prisma.room.findFirst({
    where: { slug, deletedAt: null },
    include: {
      playbackState: {
        include: {
          roomContent: {
            include: { content: { select: { title: true, url: true, type: true, duration: true, thumbnailUrl: true } } },
          },
        },
      },
      roomContents: {
        where: { deletedAt: null },
        include: { content: { select: { id: true, title: true, url: true, type: true, duration: true, thumbnailUrl: true } } },
        orderBy: { queueOrder: "asc" },
      },
    },
  });

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  return NextResponse.json({ playbackState: room.playbackState, queue: room.roomContents });
}
