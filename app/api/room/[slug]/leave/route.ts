import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const userId   = session.user.id;

  const room = await prisma.room.findFirst({ where: { slug, deletedAt: null } });
  if (!room) return NextResponse.json({ ok: true }); // idempotent

  await prisma.roomMember.updateMany({
    where: { roomId: room.id, userId, deletedAt: null },
    data:  { lastSeenAt: new Date() },
  });

  // Mark user back to OFFLINE
  await prisma.user.update({ where: { id: userId }, data: { status: "OFFLINE" } });

  return NextResponse.json({ ok: true });
}
