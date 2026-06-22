"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { Monitor } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<Monitor className="w-7 h-7 text-violet-400" />}
      title="TV Shows"
      description="Find rooms watching your favourite series, episode by episode."
    />
  );
}
