"use client";
import { DiscoverLayout } from "../_components/DiscoverLayout";

const SECTIONS = [
  { title: "Trending Movies This Week",  path: "/trending/movie/week" },
  { title: "Trending TV This Week",      path: "/trending/tv/week" },
  { title: "Trending Movies Today",      path: "/trending/movie/day" },
  { title: "Trending TV Today",          path: "/trending/tv/day" },
];

export default function TrendingPage() {
  return (
    <DiscoverLayout
      pageTitle="Trending"
      heroPath="/trending/all/week"
      sections={SECTIONS}
      searchPath="/search/multi"
    />
  );
}
