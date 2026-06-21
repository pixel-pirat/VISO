import { ComingSoonPage } from "../_components/ComingSoon";
import { Download } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={Download}
      title="Downloads"
      description="Offline viewing downloads will appear here once the feature launches."
    />
  );
}
