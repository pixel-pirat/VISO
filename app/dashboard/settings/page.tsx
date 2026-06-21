import { ComingSoonPage } from "../_components/ComingSoon";
import { Settings } from "lucide-react";

export default function Page() {
  return (
    <ComingSoonPage
      icon={Settings}
      title="Settings"
      description="Manage your account, notifications, privacy and appearance."
    />
  );
}
