import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { AccessToken } from "livekit-server-sdk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const userId   = session.user.id;
  const user     = session.user;

  // Optional credentials for private rooms (body may be absent)
  const body = await req.json().catch(() => ({}));
  const passcodeInput = typeof body?.passcode    === "string" ? body.passcode    : "";
  const inviteInput   = typeof body?.inviteToken === "string" ? body.inviteToken : "";

  const room = await prisma.room.findFirst({
    where: { slug, deletedAt: null },
    // Secrets are globally omitted — opt back in to check them here
    omit: { passcode: false, inviteToken: false },
    include: { members: { where: { userId } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const existing = room.members[0];
  const isHost   = room.hostId === userId;

  if (existing?.isBanned) {
    return NextResponse.json({ error: "You are banned from this room" }, { status: 403 });
  }

  // ── Access control ──────────────────────────────────────────
  // Hosts and existing (admitted) members are always allowed. Everyone else
  // is allowed into PUBLIC rooms; PRIVATE/UNLISTED rooms require a valid
  // invite token or the room passcode.
  const isMember = existing ? !existing.deletedAt : false;
  let allowed = isHost || isMember || room.visibility === "PUBLIC";

  if (!allowed && room.inviteToken && inviteInput) {
    allowed = inviteInput === room.inviteToken;
  }
  if (!allowed && room.passcode && passcodeInput) {
    allowed = passcodeInput === room.passcode;
  }

  if (!allowed) {
    if (room.passcode) {
      return NextResponse.json(
        {
          error: passcodeInput ? "Incorrect passcode" : "This room requires a passcode",
          code:  "PASSCODE_REQUIRED",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "This room is private — you need an invite link from the host", code: "INVITE_REQUIRED" },
      { status: 403 }
    );
  }

  // Upsert membership
  const role = isHost ? "HOST" : (existing?.role ?? "VIEWER");

  if (!existing) {
    await prisma.roomMember.create({
      data: { roomId: room.id, userId, role },
    });
  } else {
    await prisma.roomMember.update({
      where: { id: existing.id },
      data:  { lastSeenAt: new Date(), deletedAt: null },
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
      // Hosts get the invite token so the in-room Invite button can share it
      inviteToken:  isHost ? room.inviteToken : null,
    },
    role,
  });
}
