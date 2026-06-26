import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// GET /api/users/search?q=... — search users by name or username
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q      = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const userId = session.user.id;

  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      id: { not: userId }, // exclude self
      OR: [
        { name:     { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { email:    { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true, image: true, status: true },
    take: 20,
  });

  // Also fetch existing friendship statuses for these users so the UI can show buttons
  const friendships = await prisma.friendship.findMany({
    where: {
      deletedAt: null,
      OR: [
        { requesterId: userId, addresseeId: { in: users.map((u) => u.id) } },
        { addresseeId: userId, requesterId: { in: users.map((u) => u.id) } },
      ],
    },
    select: { id: true, requesterId: true, addresseeId: true, status: true },
  });

  const usersWithStatus = users.map((u) => {
    const fs = friendships.find(
      (f) => f.requesterId === u.id || f.addresseeId === u.id
    );
    return { ...u, friendshipId: fs?.id ?? null, friendshipStatus: fs?.status ?? null };
  });

  return NextResponse.json({ users: usersWithStatus });
}
