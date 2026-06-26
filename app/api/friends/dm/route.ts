import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { randomBytes } from "crypto";

// POST /api/friends/dm — get or create a private DM room for two users
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendId } = await request.json();
  if (!friendId) return NextResponse.json({ error: "friendId required" }, { status: 400 });

  const userId = session.user.id;

  // Deterministic slug: always sort the two IDs so both orderings produce the same slug
  const [a, b]  = [userId, friendId].sort();
  const dmSlug  = `dm-${a.slice(0, 8)}-${b.slice(0, 8)}`;

  // Find or create
  let room = await prisma.room.findFirst({ where: { slug: dmSlug, deletedAt: null } });

  if (!room) {
    room = await prisma.room.create({
      data: {
        name:       "Direct Message",
        slug:       dmSlug,
        hostId:     userId,
        visibility: "PRIVATE",
        status:     "LIVE",
        commChat:   true,
        inviteToken: randomBytes(12).toString("hex"),
        members: {
          create: [
            { userId, role: "HOST"   },
            { userId: friendId, role: "VIEWER" },
          ],
        },
      },
    });
  } else {
    // Ensure both users are members (idempotent)
    for (const uid of [userId, friendId]) {
      const existing = await prisma.roomMember.findFirst({
        where: { roomId: room.id, userId: uid, deletedAt: null },
      });
      if (!existing) {
        await prisma.roomMember.create({
          data: { roomId: room.id, userId: uid, role: "VIEWER" },
        });
      }
    }
  }

  return NextResponse.json({ slug: room.slug });
}
