import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { getRoomAccess } from "@/lib/room-access";
import { getEventSubscribers, broadcastEvent } from "@/lib/room-events";

// Allow SSE connections to stay open for up to 60s on Vercel Pro
export const maxDuration = 60;

// ── GET — SSE event stream ────────────────────────────────────
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

  // Current playback state for the new subscriber
  const playbackState = await prisma.roomPlaybackState.findUnique({
    where: { roomId: room.id },
    include: {
      roomContent: {
        include: { content: { select: { title: true, url: true, type: true, duration: true, thumbnailUrl: true } } },
      },
    },
  });

  let ctrl: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      getEventSubscribers(slug).add(ctrl);

      // Send current playback state immediately
      if (playbackState) {
        const init = `data: ${JSON.stringify({ type: "playback_sync", playbackState })}\n\n`;
        ctrl.enqueue(new TextEncoder().encode(init));
      }

      const ping = setInterval(() => {
        try { ctrl.enqueue(new TextEncoder().encode(": ping\n\n")); }
        catch { clearInterval(ping); }
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        getEventSubscribers(slug).delete(ctrl);
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

// ── POST — push a client event (reactions, raise-hand) ────────
// Only whitelisted event types are relayed; playback_sync is broadcast
// exclusively by the server-side playback route, so clients can't forge it.
const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reaction"),   emoji: z.string().min(1).max(16) }),
  z.object({ type: z.literal("raise_hand"), raised: z.boolean() }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event", issues: parsed.error.issues }, { status: 400 });
  }

  const { room, canPost } = await getRoomAccess(slug, session.user.id);
  if (!room)    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!canPost) return NextResponse.json({ error: "You must join this room first" }, { status: 403 });

  after(() => broadcastEvent(slug, { ...parsed.data, senderId: session.user.id }));
  return NextResponse.json({ ok: true });
}
