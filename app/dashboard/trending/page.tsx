import { ComingSoonPage } from "../_components/ComingSoon";
import { TrendingUp } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={TrendingUp}
      title="Trending"
      description="Discover the hottest rooms and most-watched content right now."
    />
  );
}
