import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { publishUnreadCount } from "@/lib/notify";

// PATCH /api/notifications/read  — mark all as read
// PATCH /api/notifications/read?id=<uuid> — mark one as read
export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { isRead: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, isRead: false, deletedAt: null },
      data: { isRead: true },
    });
  }

  // Push the new unread count so the badge drops live, including on other
  // open tabs/devices for this user.
  await publishUnreadCount(userId);

  return NextResponse.json({ ok: true });
}
