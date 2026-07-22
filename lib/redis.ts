import Redis from "ioredis";

// Redis pub/sub is what makes realtime (chat, room events, notifications)
// actually work across Vercel's multiple serverless instances — without it,
// a broadcast only reaches whichever instance happens to be holding a given
// SSE connection, which is why messages/notifications felt "delayed" (they
// only appeared to the sender's own instance, or on next full page load).
//
// Two connections are required: ioredis puts a connection into subscriber
// mode as soon as SUBSCRIBE/PSUBSCRIBE is called, after which it can't run
// normal commands — so PUBLISH needs its own separate connection.

declare global {
  // eslint-disable-next-line no-var
  var _redisPub: Redis | undefined;
  // eslint-disable-next-line no-var
  var _redisSub: Redis | undefined;
}

function createClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });
  client.on("error", (err) => console.error("[redis] connection error:", err.message));
  return client;
}

// Cheap sync check — lets callers decide whether to rely on the Redis
// round-trip (including its self-delivery back to the publishing instance)
// or fall back to same-process delivery, without needing to await anything.
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export function getPublisher(): Redis | null {
  if (!globalThis._redisPub) globalThis._redisPub = createClient() ?? undefined;
  return globalThis._redisPub ?? null;
}

export function getSubscriber(): Redis | null {
  if (!globalThis._redisSub) globalThis._redisSub = createClient() ?? undefined;
  return globalThis._redisSub ?? null;
}

// Fire-and-forget publish — realtime is a nice-to-have layer on top of data
// that's already persisted to Postgres, so a Redis hiccup should never fail
// the underlying request.
export async function publish(channel: string, payload: unknown) {
  try {
    const pub = getPublisher();
    if (!pub) {
      console.warn(`[redis] REDIS_URL not set — skipping publish to ${channel}`);
      return;
    }
    await pub.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error(`[redis] publish to ${channel} failed:`, err);
  }
}
