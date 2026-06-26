"use client";
import { DiscoverLayout } from "../_components/DiscoverLayout";

// Anime = TV shows with genre 16 (Animation) + origin country JP
const A = { with_genres: "16", with_origin_country: "JP" };

const SECTIONS = [
  { title: "Most Popular",   path: "/discover/tv", params: { ...A, sort_by: "popularity.desc" } },
  { title: "Top Rated",      path: "/discover/tv", params: { ...A, sort_by: "vote_average.desc", "vote_count.gte": "200" } },
  { title: "Currently Airing", path: "/discover/tv", params: { ...A, sort_by: "popularity.desc", with_status: "0" } },
  { title: "Action Anime",   path: "/discover/tv", params: { ...A, with_genres: "16,10759", sort_by: "popularity.desc" } },
  { title: "Romance Anime",  path: "/discover/tv", params: { ...A, with_genres: "16,10749", sort_by: "popularity.desc" } },
  { title: "Fantasy Anime",  path: "/discover/tv", params: { ...A, with_genres: "16,10765", sort_by: "popularity.desc" } },
  { title: "Comedy Anime",   path: "/discover/tv", params: { ...A, with_genres: "16,35",    sort_by: "popularity.desc" } },
];

export default function AnimePage() {
  return (
    <DiscoverLayout
      pageTitle="Anime"
      heroPath="/discover/tv"
      heroParams={{ ...A, sort_by: "popularity.desc" }}
      sections={SECTIONS}
      searchPath="/search/tv"
    />
  );
}
