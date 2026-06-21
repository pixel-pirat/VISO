import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [
    liveRooms,
    continueWatching,
    trending,
    notifications,
    onlineFriends,
    friendsActivity,
  ] = await Promise.all([

    // ── Live Rooms: public rooms with active playback, ordered by member count ──
    prisma.room.findMany({
      where: {
        deletedAt: null,
        visibility: "PUBLIC",
        playbackState: { isPlaying: true },
      },
      include: {
        host: { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { members: { where: { deletedAt: null, isBanned: false } } } },
        playbackState: {
          include: {
            roomContent: {
              include: { content: { select: { title: true, thumbnailUrl: true, duration: true } } },
            },
          },
        },
      },
      orderBy: { members: { _count: "desc" } },
      take: 6,
    }),

    // ── Continue Watching: rooms the user is a member of with in-progress playback ──
    prisma.roomMember.findMany({
      where: {
        userId,
        deletedAt: null,
        isBanned: false,
        room: {
          deletedAt: null,
          playbackState: {
            currentTime: { gt: 0 },
          },
        },
      },
      include: {
        room: {
          include: {
            playbackState: {
              include: {
                roomContent: {
                  include: { content: { select: { title: true, thumbnailUrl: true, duration: true } } },
                },
              },
            },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 6,
    }),

    // ── Trending: public rooms ordered by member count (with or without active playback) ──
    prisma.room.findMany({
      where: { deletedAt: null, visibility: "PUBLIC" },
      include: {
        _count: { select: { members: { where: { deletedAt: null, isBanned: false } } } },
        playbackState: {
          include: {
            roomContent: {
              include: { content: { select: { title: true, thumbnailUrl: true } } },
            },
          },
        },
      },
      orderBy: { members: { _count: "desc" } },
      take: 8,
    }),

    // ── Notifications: latest 10 undeleted ──
    prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // ── Online Friends: accepted friendships where the other user is ONLINE ──
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        deletedAt: null,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, username: true, image: true, status: true } },
        addressee: { select: { id: true, name: true, username: true, image: true, status: true } },
      },
      take: 20,
    }),

    // ── Friends Activity: recent room joins by accepted friends ──
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        deletedAt: null,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: {
          select: {
            id: true, name: true, username: true, image: true,
            memberships: {
              where: { deletedAt: null, isBanned: false },
              include: {
                room: {
                  select: {
                    id: true, name: true,
                    playbackState: {
                      include: {
                        roomContent: {
                          include: { content: { select: { title: true } } },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { joinedAt: "desc" },
              take: 1,
            },
          },
        },
        addressee: {
          select: {
            id: true, name: true, username: true, image: true,
            memberships: {
              where: { deletedAt: null, isBanned: false },
              include: {
                room: {
                  select: {
                    id: true, name: true,
                    playbackState: {
                      include: {
                        roomContent: {
                          include: { content: { select: { title: true } } },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { joinedAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  return NextResponse.json({
    liveRooms,
    continueWatching,
    trending,
    notifications,
    onlineFriends,
    friendsActivity,
  });
}
