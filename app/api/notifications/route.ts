import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// GET /api/notifications — full notification list for the current user
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const take = Math.min(Number(request.nextUrl.searchParams.get("take") ?? "50"), 100);

  const notifications = await prisma.notification.findMany({
    where:   { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ notifications });
}
