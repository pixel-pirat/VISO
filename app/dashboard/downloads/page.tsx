"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { Download } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<Download className="w-7 h-7 text-violet-400" />}
      title="Downloads"
      description="Offline viewing downloads will appear here once the feature launches."
    />
  );
}
