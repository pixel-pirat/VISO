"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { Film } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<Film className="w-7 h-7 text-violet-400" />}
      title="Movies"
      description="Browse movie watch parties and find a room streaming your favourite film."
    />
  );
}
