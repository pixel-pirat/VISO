import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getNotificationSubscribers } from "@/lib/notify";

// Allow SSE connections to stay open for up to 60s on Vercel Pro
export const maxDuration = 60;

// GET /api/notifications/stream — live unread-count + notification push.
// Sends the current unread count immediately, then pushes updates whenever
// a new notification is created or notifications are marked read elsewhere.
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false, deletedAt: null },
  });

  let ctrl: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      getNotificationSubscribers(userId).add(ctrl);

      const init = `data: ${JSON.stringify({ type: "init", unreadCount })}\n\n`;
      ctrl.enqueue(new TextEncoder().encode(init));

      const ping = setInterval(() => {
        try { ctrl.enqueue(new TextEncoder().encode(": ping\n\n")); }
        catch { clearInterval(ping); }
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        getNotificationSubscribers(userId).delete(ctrl);
        try { ctrl.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
