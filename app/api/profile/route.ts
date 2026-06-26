import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

// GET /api/profile — current user's full profile + stats
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [user, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, username: true,
        displayName: true, avatarUrl: true, image: true,
        status: true, createdAt: true,
        _count: {
          select: {
            hostedRooms: { where: { deletedAt: null } },
            memberships:  { where: { deletedAt: null, isBanned: false } },
            sentFriendships:     { where: { status: "ACCEPTED", deletedAt: null } },
            receivedFriendships: { where: { status: "ACCEPTED", deletedAt: null } },
          },
        },
      },
    }),
    prisma.roomMember.count({
      where: { userId, deletedAt: null, isBanned: false },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const friendCount = (user._count.sentFriendships ?? 0) + (user._count.receivedFriendships ?? 0);

  return NextResponse.json({
    user,
    stats: {
      roomsHosted:  user._count.hostedRooms,
      roomsJoined:  stats,
      friends:      friendCount,
    },
  });
}

// PATCH /api/profile — update editable fields
const updateSchema = z.object({
  name:        z.string().min(1).max(80).optional(),
  username:    z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores").optional(),
  displayName: z.string().max(80).optional().or(z.literal("")),
  avatarUrl:   z.string().min(1).optional().or(z.literal("")),
});

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body   = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { name, username, displayName, avatarUrl } = parsed.data;

  // Check username uniqueness if changing
  if (username) {
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: userId }, deletedAt: null },
    });
    if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name        !== undefined ? { name }                               : {}),
      ...(username    !== undefined ? { username }                           : {}),
      ...(displayName !== undefined ? { displayName: displayName || null }   : {}),
      ...(avatarUrl   !== undefined ? { avatarUrl:   avatarUrl   || null }   : {}),
    },
    select: {
      id: true, name: true, email: true, username: true,
      displayName: true, avatarUrl: true, image: true, status: true,
    },
  });

  return NextResponse.json({ user: updated });
}
