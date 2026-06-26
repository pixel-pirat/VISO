import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// GET /api/friends — list all friendships for current user
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [accepted, pending] = await Promise.all([
    // Accepted friends
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        deletedAt: null,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, username: true, image: true, status: true } },
        addressee: { select: { id: true, name: true, username: true, image: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // Pending requests (incoming + outgoing)
    prisma.friendship.findMany({
      where: {
        status: "PENDING",
        deletedAt: null,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, username: true, image: true, status: true } },
        addressee: { select: { id: true, name: true, username: true, image: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ accepted, pending, currentUserId: userId });
}

// POST /api/friends — send a friend request
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requesterId = session.user.id;

  const { addresseeId } = await request.json();
  if (!addresseeId) return NextResponse.json({ error: "addresseeId required" }, { status: 400 });
  if (addresseeId === requesterId) return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });

  // Check if friendship already exists
  const existing = await prisma.friendship.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "Friendship already exists", status: existing.status }, { status: 409 });

  const friendship = await prisma.friendship.create({
    data: { requesterId, addresseeId, status: "PENDING" },
    include: {
      addressee: { select: { id: true, name: true, username: true, image: true } },
    },
  });

  // Create a notification for the addressee
  await prisma.notification.create({
    data: {
      userId:  addresseeId,
      title:   "Friend Request",
      message: `${session.user.name ?? "Someone"} sent you a friend request`,
      type:    "FRIEND_REQUEST",
      payload: { friendshipId: friendship.id, requesterId },
    },
  });

  return NextResponse.json({ friendship }, { status: 201 });
}
