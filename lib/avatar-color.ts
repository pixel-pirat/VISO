// Deterministic hash → gradient mapping for room/content thumbnails and user
// avatars, used anywhere an id needs a stable placeholder color. Single
// shared source so the same id always resolves to the same gradient
// everywhere in the app — previously every screen reimplemented this with
// its own (differently sized) gradient list, so the same room or user could
// show a different color depending on which page you were looking at it from.

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

const ROOM_GRADIENTS = [
  "from-violet-900 to-indigo-950",
  "from-purple-900 to-violet-950",
  "from-indigo-900 to-blue-950",
  "from-blue-900 to-sky-950",
  "from-teal-900 to-emerald-950",
  "from-rose-900 to-pink-950",
  "from-orange-900 to-amber-950",
  "from-fuchsia-900 to-purple-950",
];

const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-rose-500",
  "from-pink-500 to-fuchsia-500",
];

export function pickRoomGradient(seed: string): string {
  return ROOM_GRADIENTS[hashSeed(seed) % ROOM_GRADIENTS.length];
}

export function pickAvatarGradient(seed: string): string {
  return AVATAR_GRADIENTS[hashSeed(seed) % AVATAR_GRADIENTS.length];
}
