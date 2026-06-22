"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { HelpCircle } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<HelpCircle className="w-7 h-7 text-violet-400" />}
      title="Support"
      description="Get help, report issues or browse the knowledge base."
    />
  );
}
