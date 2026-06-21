import { ComingSoonPage } from "../_components/ComingSoon";
import { BookMarked } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={BookMarked}
      title="Watchlist"
      description="Save rooms and content you want to watch later."
    />
  );
}
