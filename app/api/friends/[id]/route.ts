import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// PATCH /api/friends/[id] — accept or decline a request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action } = await request.json(); // "accept" | "decline"
  const userId = session.user.id;

  const friendship = await prisma.friendship.findFirst({
    where: { id, deletedAt: null },
  });
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the addressee can accept/decline
  if (friendship.addresseeId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = action === "accept" ? "ACCEPTED" : "DECLINED";
  const updated = await prisma.friendship.update({
    where: { id },
    data:  { status },
  });

  return NextResponse.json({ friendship: updated });
}

// DELETE /api/friends/[id] — remove friend or cancel request
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const friendship = await prisma.friendship.findFirst({
    where: { id, deletedAt: null },
  });
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Either party can remove
  if (friendship.requesterId !== userId && friendship.addresseeId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.friendship.update({
    where: { id },
    data:  { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
