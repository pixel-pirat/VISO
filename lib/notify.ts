// Realtime notification delivery — same pattern as lib/room-events.ts.
// Each instance keeps a local per-user registry of open SSE connections;
// broadcasting goes through Redis pub/sub so a notification created on one
// serverless instance reaches a connection held open on another.

import { getSubscriber, publish, isRedisConfigured } from "./redis";
import { prisma } from "./prisma";
import type { NotificationType } from "@/app/generated/prisma";

const NOTIF_PREFIX = "viso:notif:";

declare global {
  // eslint-disable-next-line no-var
  var _notifSubscribers: Map<string, Set<ReadableStreamDefaultController>>;
  // eslint-disable-next-line no-var
  var _notifyRedisWired: boolean | undefined;
}

globalThis._notifSubscribers ??= new Map();

function getFrom(userId: string) {
  if (!globalThis._notifSubscribers.has(userId)) globalThis._notifSubscribers.set(userId, new Set());
  return globalThis._notifSubscribers.get(userId)!;
}

function deliverLocal(userId: string, data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of getFrom(userId)) {
    try { ctrl.enqueue(new TextEncoder().encode(payload)); } catch { /* client disconnected */ }
  }
}

function ensureRedisWired() {
  if (globalThis._notifyRedisWired) return;
  const sub = getSubscriber();
  if (!sub) return;

  sub.psubscribe("viso:notif:*").catch((err) =>
    console.error("[notify] psubscribe failed:", err)
  );

  sub.on("pmessage", (_pattern, channel, message) => {
    if (!channel.startsWith(NOTIF_PREFIX)) return; // not ours — room-events handles its own prefixes
    try {
      deliverLocal(channel.slice(NOTIF_PREFIX.length), JSON.parse(message));
    } catch { /* ignore malformed payloads */ }
  });

  globalThis._notifyRedisWired = true;
}

ensureRedisWired();

export function getNotificationSubscribers(userId: string) {
  return getFrom(userId);
}

// See lib/room-events.ts for why this is either-or rather than both —
// with Redis configured, the publish loops back to this same instance too.
export async function broadcastNotification(userId: string, data: object) {
  if (!isRedisConfigured()) { deliverLocal(userId, data); return; }
  await publish(`${NOTIF_PREFIX}${userId}`, data);
}

async function unreadCountFor(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false, deletedAt: null } });
}

// Creates a notification row and pushes it to the recipient's live stream
// in one call — the one place new notifications should be created, so
// realtime delivery isn't something every call site has to remember.
export async function sendNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  payload?: object;
}) {
  const notification = await prisma.notification.create({ data: params });
  const unreadCount = await unreadCountFor(params.userId);
  await broadcastNotification(params.userId, { type: "notification", notification, unreadCount });
  return notification;
}

// Call after marking notifications read so the sender's own badge (and any
// other open tab/device) drops to the new count immediately.
export async function publishUnreadCount(userId: string) {
  const unreadCount = await unreadCountFor(userId);
  await broadcastNotification(userId, { type: "read", unreadCount });
}
