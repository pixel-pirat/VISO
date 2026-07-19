import { prisma } from "./prisma";

// Resolves what a user may do in a room identified by slug.
// - read: view chat / event streams (members, hosts, or anyone for PUBLIC rooms)
// - post: send messages / events (members and hosts only — joining a room
//   creates a membership, so active participants always have one)
// Banned members can do neither.
export async function getRoomAccess(slug: string, userId: string) {
  const room = await prisma.room.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId, deletedAt: null }, take: 1 } },
  });

  if (!room) return { room: null, member: null, isHost: false, canRead: false, canPost: false };

  const member = room.members[0] ?? null;
  const isHost = room.hostId === userId;
  const banned = member?.isBanned ?? false;

  const canPost = !banned && (isHost || Boolean(member));
  const canRead = canPost || (!banned && room.visibility === "PUBLIC");

  return { room, member, isHost, canRead, canPost };
}
