"use client";
import { DiscoverLayout } from "../_components/DiscoverLayout";

const SECTIONS = [
  { title: "Now Playing",  path: "/movie/now_playing" },
  { title: "Popular",      path: "/movie/popular" },
  { title: "Top Rated",    path: "/movie/top_rated" },
  { title: "Upcoming",     path: "/movie/upcoming" },
  { title: "Action",       path: "/discover/movie", params: { with_genres: "28",    sort_by: "popularity.desc" } },
  { title: "Comedy",       path: "/discover/movie", params: { with_genres: "35",    sort_by: "popularity.desc" } },
  { title: "Horror",       path: "/discover/movie", params: { with_genres: "27",    sort_by: "popularity.desc" } },
  { title: "Sci-Fi",       path: "/discover/movie", params: { with_genres: "878",   sort_by: "popularity.desc" } },
  { title: "Drama",        path: "/discover/movie", params: { with_genres: "18",    sort_by: "popularity.desc" } },
  { title: "Thriller",     path: "/discover/movie", params: { with_genres: "53",    sort_by: "popularity.desc" } },
];

export default function MoviesPage() {
  return (
    <DiscoverLayout
      pageTitle="Movies"
      heroPath="/movie/now_playing"
      sections={SECTIONS}
      searchPath="/search/movie"
    />
  );
}
