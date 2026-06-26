import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

// GET — list the user's watchlist
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.watchlist.findMany({
    where:   { userId: session.user.id },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({ items });
}

const addSchema = z.object({
  tmdbId:    z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  title:     z.string().min(1).max(255),
  posterPath: z.string().optional().nullable(),
});

// POST — add an item
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const { tmdbId, mediaType, title, posterPath } = parsed.data;

  const item = await prisma.watchlist.upsert({
    where:  { userId_tmdbId_mediaType: { userId: session.user.id, tmdbId, mediaType } },
    update: { title, posterPath: posterPath ?? null },
    create: { userId: session.user.id, tmdbId, mediaType, title, posterPath: posterPath ?? null },
  });

  return NextResponse.json({ item }, { status: 201 });
}
