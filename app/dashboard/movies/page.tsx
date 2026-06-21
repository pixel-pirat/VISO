import { ComingSoonPage } from "../_components/ComingSoon";
import { Film } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={Film}
      title="Movies"
      description="Browse movie watch parties and find a room streaming your favourite film."
    />
  );
}
