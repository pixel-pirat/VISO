// In-process SSE subscriber registries: roomSlug → Set<controller>.
// Shared by the chat and events routes; lives outside route files because
// route modules may only export HTTP handlers and route config.
// NOTE: works within a single process — on serverless, cross-instance
// delivery needs Redis pub/sub or similar.

declare global {
  // eslint-disable-next-line no-var
  var _chatSubscribers: Map<string, Set<ReadableStreamDefaultController>>;
  // eslint-disable-next-line no-var
  var _eventSubscribers: Map<string, Set<ReadableStreamDefaultController>>;
}

globalThis._chatSubscribers ??= new Map();
globalThis._eventSubscribers ??= new Map();

function getFrom(map: Map<string, Set<ReadableStreamDefaultController>>, slug: string) {
  if (!map.has(slug)) map.set(slug, new Set());
  return map.get(slug)!;
}

function broadcastTo(map: Map<string, Set<ReadableStreamDefaultController>>, slug: string, data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of getFrom(map, slug)) {
    try { ctrl.enqueue(new TextEncoder().encode(payload)); } catch { /* client disconnected */ }
  }
}

export const getChatSubscribers  = (slug: string) => getFrom(globalThis._chatSubscribers, slug);
export const getEventSubscribers = (slug: string) => getFrom(globalThis._eventSubscribers, slug);

export const broadcastChat  = (slug: string, data: object) => broadcastTo(globalThis._chatSubscribers, slug, data);
export const broadcastEvent = (slug: string, data: object) => broadcastTo(globalThis._eventSubscribers, slug, data);
