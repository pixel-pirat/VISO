import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// GET — rooms the user has watched, with playback progress
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const memberships = await prisma.roomMember.findMany({
    where:   { userId, deletedAt: null, isBanned: false },
    orderBy: { lastSeenAt: "desc" },
    take:    50,
    include: {
      room: {
        include: {
          host: { select: { id: true, name: true, username: true } },
          playbackState: {
            include: {
              roomContent: {
                include: {
                  content: { select: { title: true, thumbnailUrl: true, duration: true, type: true, url: true } },
                },
              },
            },
          },
          _count: { select: { members: { where: { deletedAt: null, isBanned: false } } } },
        },
      },
    },
  });

  // Filter out rooms with no playback history (never actually watched anything)
  const history = memberships.filter(
    m => m.room.playbackState && (m.room.playbackState.currentTime > 0 || m.room.status === "ENDED")
  );

  return NextResponse.json({ history });
}
