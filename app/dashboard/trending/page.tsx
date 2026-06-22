"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { TrendingUp } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<TrendingUp className="w-7 h-7 text-violet-400" />}
      title="Trending"
      description="Discover the hottest rooms and most-watched content right now."
    />
  );
}
