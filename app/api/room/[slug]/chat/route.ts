import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { getRoomAccess } from "@/lib/room-access";
import { getChatSubscribers, broadcastChat } from "@/lib/room-events";

// Allow SSE connections to stay open for up to 60s on Vercel Pro
export const maxDuration = 60;

// ── GET — SSE stream ──────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { slug } = await params;

  const { room, canRead } = await getRoomAccess(slug, session.user.id);
  if (!room)    return new Response("Room not found", { status: 404 });
  if (!canRead) return new Response("Forbidden", { status: 403 });

  // Send last 50 messages on connect
  const history = await prisma.message.findMany({
    where: {
      roomId: room.id,
      deletedAt: null,
    },
    include: { sender: { select: { id: true, name: true, username: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let ctrl: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      getChatSubscribers(slug).add(ctrl);

      // Send history immediately
      const init = `data: ${JSON.stringify({ type: "history", messages: history.reverse() })}\n\n`;
      ctrl.enqueue(new TextEncoder().encode(init));

      // Keep-alive ping every 25 s
      const ping = setInterval(() => {
        try { ctrl.enqueue(new TextEncoder().encode(": ping\n\n")); }
        catch { clearInterval(ping); }
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        getChatSubscribers(slug).delete(ctrl);
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

// ── POST — send message ───────────────────────────────────────
// SYSTEM / CONTENT_SHARE are server-generated only — clients can't send them.
const messageSchema = z.object({
  text: z.string().trim().min(1, "Empty message").max(2000),
  type: z.enum(["TEXT", "EMOJI"]).default("TEXT"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message", issues: parsed.error.issues }, { status: 400 });
  }

  const { room, canPost } = await getRoomAccess(slug, session.user.id);
  if (!room)    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!canPost) return NextResponse.json({ error: "You must join this room to chat" }, { status: 403 });
  if (!room.commChat) return NextResponse.json({ error: "Chat is disabled in this room" }, { status: 403 });

  const message = await prisma.message.create({
    data: {
      roomId:   room.id,
      senderId: session.user.id,
      text:     parsed.data.text,
      type:     parsed.data.type,
    },
    include: { sender: { select: { id: true, name: true, username: true, image: true } } },
  });

  broadcastChat(slug, { type: "message", message });

  return NextResponse.json({ message }, { status: 201 });
}
