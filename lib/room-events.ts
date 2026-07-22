// SSE fan-out for room chat and room events (playback sync, reactions,
// raise-hand). Each serverless instance keeps its own local subscriber
// registry (an SSE connection can only ever be handled by the instance
// that's holding it open) — but broadcasting a message now goes through
// Redis pub/sub instead of writing directly into that local registry, so
// every instance holding a connection for a room hears about it, not just
// whichever instance happened to handle the POST.
//
// Falls back to same-instance-only delivery if REDIS_URL isn't configured
// (fine for local dev with a single process; delivery across instances in
// production requires Redis to be set).

import { getSubscriber, publish, isRedisConfigured } from "./redis";

const CHAT_PREFIX   = "viso:chat:";
const EVENTS_PREFIX = "viso:events:";

declare global {
  // eslint-disable-next-line no-var
  var _chatSubscribers: Map<string, Set<ReadableStreamDefaultController>>;
  // eslint-disable-next-line no-var
  var _eventSubscribers: Map<string, Set<ReadableStreamDefaultController>>;
  // eslint-disable-next-line no-var
  var _roomEventsRedisWired: boolean | undefined;
}

globalThis._chatSubscribers ??= new Map();
globalThis._eventSubscribers ??= new Map();

function getFrom(map: Map<string, Set<ReadableStreamDefaultController>>, slug: string) {
  if (!map.has(slug)) map.set(slug, new Set());
  return map.get(slug)!;
}

function deliverLocal(map: Map<string, Set<ReadableStreamDefaultController>>, slug: string, data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of getFrom(map, slug)) {
    try { ctrl.enqueue(new TextEncoder().encode(payload)); } catch { /* client disconnected */ }
  }
}

// Wire the shared Redis subscriber once per warm instance — demuxes
// incoming pub/sub messages to whichever local room registry they're for.
function ensureRedisWired() {
  if (globalThis._roomEventsRedisWired) return;
  const sub = getSubscriber();
  if (!sub) return; // no REDIS_URL — same-instance delivery only

  sub.psubscribe("viso:chat:*", "viso:events:*").catch((err) =>
    console.error("[room-events] psubscribe failed:", err)
  );

  sub.on("pmessage", (_pattern, channel, message) => {
    try {
      const data = JSON.parse(message);
      if (channel.startsWith(CHAT_PREFIX)) {
        deliverLocal(globalThis._chatSubscribers, channel.slice(CHAT_PREFIX.length), data);
      } else if (channel.startsWith(EVENTS_PREFIX)) {
        deliverLocal(globalThis._eventSubscribers, channel.slice(EVENTS_PREFIX.length), data);
      }
    } catch { /* ignore malformed payloads */ }
  });

  globalThis._roomEventsRedisWired = true;
}

ensureRedisWired();

export function getChatSubscribers(slug: string) {
  return getFrom(globalThis._chatSubscribers, slug);
}
export function getEventSubscribers(slug: string) {
  return getFrom(globalThis._eventSubscribers, slug);
}

// When Redis is configured, publishing is the ONLY delivery path — the
// publishing instance is itself psubscribed to this channel, so the
// message loops back and reaches its own local subscribers too. Delivering
// locally *and* publishing would double-send to anyone on the same
// instance as the sender. Without Redis configured there's no loopback, so
// same-process delivery is the fallback (fine for local dev).
export async function broadcastChat(slug: string, data: object) {
  if (!isRedisConfigured()) { deliverLocal(globalThis._chatSubscribers, slug, data); return; }
  await publish(`${CHAT_PREFIX}${slug}`, data);
}

export async function broadcastEvent(slug: string, data: object) {
  if (!isRedisConfigured()) { deliverLocal(globalThis._eventSubscribers, slug, data); return; }
  await publish(`${EVENTS_PREFIX}${slug}`, data);
}
