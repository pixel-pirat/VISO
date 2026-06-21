import { ComingSoonPage } from "../_components/ComingSoon";
import { Users } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={Users}
      title="Friends"
      description="Find and manage your friends, send friend requests and see who's online."
    />
  );
}
