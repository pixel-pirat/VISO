// Client-side TMDB helper — routes through /api/tmdb proxy

export const IMG = {
  poster:   (p: string | null, size = "w342") => p ? `https://image.tmdb.org/t/p/${size}${p}` : null,
  backdrop: (p: string | null, size = "w1280") => p ? `https://image.tmdb.org/t/p/${size}${p}` : null,
};

export async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL("/api/tmdb", window.location.origin);
  url.searchParams.set("path", path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB proxy error: ${res.status}`);
  return res.json();
}

export type MediaItem = {
  id: number;
  title?: string;       // movies
  name?: string;        // tv / anime
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  media_type?: string;
};

export type TMDBPage<T> = {
  results: T[]; page: number; total_pages: number; total_results: number;
};
