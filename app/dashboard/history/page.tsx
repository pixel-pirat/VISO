"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { Clock } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<Clock className="w-7 h-7 text-violet-400" />}
      title="History"
      description="A record of every room you have joined and content you have watched."
    />
  );
}
