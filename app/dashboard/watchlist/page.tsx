"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { BookMarked } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<BookMarked className="w-7 h-7 text-violet-400" />}
      title="Watchlist"
      description="Save rooms and content you want to watch later."
    />
  );
}
