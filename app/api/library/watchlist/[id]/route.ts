import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// DELETE — remove an item from watchlist
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.watchlist.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.watchlist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
