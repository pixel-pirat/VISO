"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { Settings } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<Settings className="w-7 h-7 text-violet-400" />}
      title="Settings"
      description="Manage your account, notifications, privacy and appearance."
    />
  );
}
