import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// In-process SSE subscriber map: roomSlug → Set<controller>
// In production use Redis pub/sub; for local dev this works fine within a single process.
declare global {
  // eslint-disable-next-line no-var
  var _chatSubscribers: Map<string, Set<ReadableStreamDefaultController>>;
}
globalThis._chatSubscribers ??= new Map();

function getSubscribers(slug: string) {
  if (!globalThis._chatSubscribers.has(slug)) {
    globalThis._chatSubscribers.set(slug, new Set());
  }
  return globalThis._chatSubscribers.get(slug)!;
}

function broadcast(slug: string, data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of getSubscribers(slug)) {
    try { ctrl.enqueue(new TextEncoder().encode(payload)); } catch { /* client disconnected */ }
  }
}

// ── GET — SSE stream ──────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { slug } = await params;

  // Send last 50 messages on connect
  const history = await prisma.message.findMany({
    where: {
      room: { slug, deletedAt: null },
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
      getSubscribers(slug).add(ctrl);

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
        getSubscribers(slug).delete(ctrl);
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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { text, type = "TEXT" } = await request.json();

  if (!text?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const room = await prisma.room.findFirst({ where: { slug, deletedAt: null } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      roomId:   room.id,
      senderId: session.user.id,
      text:     text.trim(),
      type:     type as "TEXT" | "SYSTEM" | "EMOJI" | "CONTENT_SHARE",
    },
    include: { sender: { select: { id: true, name: true, username: true, image: true } } },
  });

  broadcast(slug, { type: "message", message });

  return NextResponse.json({ message }, { status: 201 });
}
