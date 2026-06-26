import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/tmdb?path=/trending/movie/week&page=1
// Proxies any TMDB endpoint — keeps the token server-side
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp   = request.nextUrl.searchParams;
  const path = sp.get("path");
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  // Forward all other params to TMDB
  const tmdbUrl = new URL(`https://api.themoviedb.org/3${path}`);
  sp.forEach((v, k) => { if (k !== "path") tmdbUrl.searchParams.set(k, v); });

  const res = await fetch(tmdbUrl.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 },
  });

  const data = await res.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
