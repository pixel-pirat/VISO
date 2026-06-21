import { ComingSoonPage } from "../_components/ComingSoon";
import { Clock } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={Clock}
      title="History"
      description="A record of every room you have joined and content you have watched."
    />
  );
}
