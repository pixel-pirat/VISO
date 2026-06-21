import { ComingSoonPage } from "../_components/ComingSoon";
import { MessageSquare } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={MessageSquare}
      title="Chat"
      description="Direct messages and group chats with your friends will appear here."
    />
  );
}
