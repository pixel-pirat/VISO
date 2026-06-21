import { ComingSoonPage } from "../_components/ComingSoon";
import { HelpCircle } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={HelpCircle}
      title="Support"
      description="Get help, report issues or browse the knowledge base."
    />
  );
}
