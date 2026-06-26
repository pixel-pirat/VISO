import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// GET — content uploaded/added by the current user
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const content = await prisma.content.findMany({
    where:   { addedById: userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      roomContents: {
        where:   { deletedAt: null },
        include: { room: { select: { id: true, name: true, slug: true, status: true } } },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({ content });
}
