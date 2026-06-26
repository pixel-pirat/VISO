"use client";
import { DiscoverLayout } from "../_components/DiscoverLayout";

const SECTIONS = [
  { title: "Airing Today",    path: "/tv/airing_today" },
  { title: "On The Air",      path: "/tv/on_the_air" },
  { title: "Popular",         path: "/tv/popular" },
  { title: "Top Rated",       path: "/tv/top_rated" },
  { title: "Drama",           path: "/discover/tv", params: { with_genres: "18",   sort_by: "popularity.desc" } },
  { title: "Crime",           path: "/discover/tv", params: { with_genres: "80",   sort_by: "popularity.desc" } },
  { title: "Sci-Fi & Fantasy",path: "/discover/tv", params: { with_genres: "10765",sort_by: "popularity.desc" } },
  { title: "Comedy",          path: "/discover/tv", params: { with_genres: "35",   sort_by: "popularity.desc" } },
  { title: "Action & Adventure", path: "/discover/tv", params: { with_genres: "10759", sort_by: "popularity.desc" } },
  { title: "Mystery",         path: "/discover/tv", params: { with_genres: "9648", sort_by: "popularity.desc" } },
];

export default function TVShowsPage() {
  return (
    <DiscoverLayout
      pageTitle="TV Shows"
      heroPath="/tv/popular"
      sections={SECTIONS}
      searchPath="/search/tv"
    />
  );
}
