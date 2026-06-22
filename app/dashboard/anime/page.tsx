"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { Star } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<Star className="w-7 h-7 text-violet-400" />}
      title="Anime"
      description="Join anime watch parties and discover new series with the community."
    />
  );
}
