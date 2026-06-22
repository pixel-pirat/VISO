"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { Users } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<Users className="w-7 h-7 text-violet-400" />}
      title="Friends"
      description="Find and manage your friends, send friend requests and see who is online."
    />
  );
}
