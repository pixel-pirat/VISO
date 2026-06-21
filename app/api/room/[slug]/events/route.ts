import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// In-process event subscriber map for playback sync, reactions, member presence
declare global {
  // eslint-disable-next-line no-var
  var _eventSubscribers: Map<string, Set<ReadableStreamDefaultController>>;
}
globalThis._eventSubscribers ??= new Map();

function getSubs(slug: string) {
  if (!globalThis._eventSubscribers.has(slug)) {
    globalThis._eventSubscribers.set(slug, new Set());
  }
  return globalThis._eventSubscribers.get(slug)!;
}

export function broadcastEvent(slug: string, data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of getSubs(slug)) {
    try { ctrl.enqueue(new TextEncoder().encode(payload)); } catch { /* disconnected */ }
  }
}

// ── GET — SSE event stream ────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { slug } = await params;

  // Current playback state for the new subscriber
  const room = await prisma.room.findFirst({
    where: { slug, deletedAt: null },
    include: {
      playbackState: {
        include: {
          roomContent: {
            include: { content: { select: { title: true, url: true, type: true, duration: true, thumbnailUrl: true } } },
          },
        },
      },
    },
  });

  let ctrl: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      getSubs(slug).add(ctrl);

      // Send current playback state immediately
      if (room?.playbackState) {
        const init = `data: ${JSON.stringify({ type: "playback_sync", playbackState: room.playbackState })}\n\n`;
        ctrl.enqueue(new TextEncoder().encode(init));
      }

      const ping = setInterval(() => {
        try { ctrl.enqueue(new TextEncoder().encode(": ping\n\n")); }
        catch { clearInterval(ping); }
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        getSubs(slug).delete(ctrl);
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

// ── POST — push a generic event (reactions, raise-hand, etc.) ─
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const body = await request.json();

  broadcastEvent(slug, { ...body, senderId: session.user.id });
  return NextResponse.json({ ok: true });
}
