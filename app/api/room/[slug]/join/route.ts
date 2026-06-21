import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { AccessToken } from "livekit-server-sdk";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const userId   = session.user.id;
  const user     = session.user;

  const room = await prisma.room.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  // Upsert membership
  const existing = room.members[0];
  const isHost   = room.hostId === userId;
  const role     = isHost ? "HOST" : (existing?.role ?? "VIEWER");

  if (!existing) {
    await prisma.roomMember.create({
      data: { roomId: room.id, userId, role },
    });
  } else {
    await prisma.roomMember.update({
      where: { id: existing.id },
      data:  { lastSeenAt: new Date() },
    });
  }

  // Mark user ONLINE
  await prisma.user.update({ where: { id: userId }, data: { status: "ONLINE" } });

  // Issue LiveKit token — room name is the room slug, participant identity is userId
  const apiKey    = process.env.LIVEKIT_API_KEY    ?? "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET ?? "devsecret";

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name:     (user as { name?: string | null }).name ?? userId,
    ttl:      "4h",
  });

  at.addGrant({
    roomJoin:       true,
    room:           slug,
    canPublish:     room.commAudio || room.commVideo,
    canSubscribe:   true,
    canPublishData: true,       // data channel — used for reactions/raise-hand
  });

  const token = await at.toJwt();

  return NextResponse.json({
    token,
    livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL ?? "wss://viso-62lqe2hf.livekit.cloud",
    room: {
      id:           room.id,
      name:         room.name,
      slug:         room.slug,
      contentTitle: room.contentTitle,
      coverUrl:     room.coverUrl,
      visibility:   room.visibility,
      commChat:     room.commChat,
      commAudio:    room.commAudio,
      commVideo:    room.commVideo,
      hostId:       room.hostId,
      status:       room.status,
    },
    role,
  });
}
