"use client";
import { ComingSoonPage } from "../_components/ComingSoon";
import { MessageSquare } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      iconElement={<MessageSquare className="w-7 h-7 text-violet-400" />}
      title="Chat"
      description="Direct messages and group chats with your friends will appear here."
    />
  );
}
