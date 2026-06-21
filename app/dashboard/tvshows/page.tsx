import { ComingSoonPage } from "../_components/ComingSoon";
import { Monitor } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={Monitor}
      title="TV Shows"
      description="Find rooms watching your favourite series — episode by episode."
    />
  );
}
