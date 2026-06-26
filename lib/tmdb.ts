// TMDB API client — server-side only (uses TMDB_READ_TOKEN)
// For client-side use /api/tmdb proxy instead.

const BASE = "https://api.themoviedb.org/3";
const TOKEN = process.env.TMDB_READ_TOKEN!;

export const IMG = {
  poster:    (path: string | null, size: "w185"|"w342"|"w500"|"original" = "w342") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
  backdrop:  (path: string | null, size: "w780"|"w1280"|"original" = "w1280") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
  profile:   (path: string | null) =>
    path ? `https://image.tmdb.org/t/p/w185${path}` : null,
};

async function tmdb<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    next: { revalidate: 3600 }, // cache for 1 hour
  });

  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────

export type TMDBMovie = {
  id: number; title: string; overview: string;
  poster_path: string | null; backdrop_path: string | null;
  release_date: string; vote_average: number; vote_count: number;
  genre_ids: number[]; popularity: number; adult: boolean;
  original_language: string;
};

export type TMDBShow = {
  id: number; name: string; overview: string;
  poster_path: string | null; backdrop_path: string | null;
  first_air_date: string; vote_average: number; vote_count: number;
  genre_ids: number[]; popularity: number;
};

export type TMDBResult<T> = {
  results: T[]; page: number; total_pages: number; total_results: number;
};

export type TMDBVideo = {
  id: string; key: string; site: string; type: string; official: boolean; published_at: string;
};

export type TMDBGenre = { id: number; name: string };

// ── Endpoints ─────────────────────────────────────────────────

export const tmdbApi = {
  // Movies
  trendingMovies:   (page = "1") => tmdb<TMDBResult<TMDBMovie>>("/trending/movie/week", { page }),
  popularMovies:    (page = "1") => tmdb<TMDBResult<TMDBMovie>>("/movie/popular",        { page }),
  topRatedMovies:   (page = "1") => tmdb<TMDBResult<TMDBMovie>>("/movie/top_rated",      { page }),
  nowPlaying:       (page = "1") => tmdb<TMDBResult<TMDBMovie>>("/movie/now_playing",    { page }),
  upcomingMovies:   (page = "1") => tmdb<TMDBResult<TMDBMovie>>("/movie/upcoming",       { page }),
  movieDetails:     (id: string) => tmdb<TMDBMovie & { genres: TMDBGenre[]; runtime: number; tagline: string }>(`/movie/${id}`),
  movieVideos:      (id: string) => tmdb<{ results: TMDBVideo[] }>(`/movie/${id}/videos`),
  movieCredits:     (id: string) => tmdb<{ cast: { id: number; name: string; character: string; profile_path: string|null }[] }>(`/movie/${id}/credits`),
  similarMovies:    (id: string) => tmdb<TMDBResult<TMDBMovie>>(`/movie/${id}/similar`),
  searchMovies:     (q: string, page = "1") => tmdb<TMDBResult<TMDBMovie>>("/search/movie", { query: q, page }),

  // TV Shows
  trendingShows:    (page = "1") => tmdb<TMDBResult<TMDBShow>>("/trending/tv/week",   { page }),
  popularShows:     (page = "1") => tmdb<TMDBResult<TMDBShow>>("/tv/popular",          { page }),
  topRatedShows:    (page = "1") => tmdb<TMDBResult<TMDBShow>>("/tv/top_rated",        { page }),
  airingToday:      (page = "1") => tmdb<TMDBResult<TMDBShow>>("/tv/airing_today",     { page }),
  showDetails:      (id: string) => tmdb<TMDBShow & { genres: TMDBGenre[]; episode_run_time: number[]; tagline: string; status: string }>(`/tv/${id}`),
  showVideos:       (id: string) => tmdb<{ results: TMDBVideo[] }>(`/tv/${id}/videos`),
  searchShows:      (q: string, page = "1") => tmdb<TMDBResult<TMDBShow>>("/search/tv", { query: q, page }),

  // Anime (TV shows with genre 16 = Animation, origin_country=JP)
  popularAnime:     (page = "1") => tmdb<TMDBResult<TMDBShow>>("/discover/tv", {
    with_genres: "16", with_origin_country: "JP", sort_by: "popularity.desc", page,
  }),
  topRatedAnime:    (page = "1") => tmdb<TMDBResult<TMDBShow>>("/discover/tv", {
    with_genres: "16", with_origin_country: "JP", sort_by: "vote_average.desc",
    "vote_count.gte": "200", page,
  }),

  // Genres
  movieGenres:      () => tmdb<{ genres: TMDBGenre[] }>("/genre/movie/list"),
  tvGenres:         () => tmdb<{ genres: TMDBGenre[] }>("/genre/tv/list"),

  // Discover with filters
  discoverMovies:   (params: Record<string, string>) => tmdb<TMDBResult<TMDBMovie>>("/discover/movie", params),
  discoverShows:    (params: Record<string, string>) => tmdb<TMDBResult<TMDBShow>>("/discover/tv",     params),

  // Multi search
  search:           (q: string, page = "1") => tmdb<TMDBResult<TMDBMovie | TMDBShow>>("/search/multi", { query: q, page }),
};
