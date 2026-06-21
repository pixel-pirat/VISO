"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./_components/Sidebar";
import { Topbar } from "./_components/Topbar";
import { MainFeed } from "./_components/MainFeed";
import { RightPanel } from "./_components/RightPanel";
import type { DashboardData } from "./_types/dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  // Fetch dashboard data once we have a session
  useEffect(() => {
    if (!session) return;
    setDataLoading(true);
    fetch("/api/dashboard/data")
      .then((r) => r.json())
      .then((data) => setDashData(data))
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [session]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111113]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
          <p className="text-sm text-neutral-500 font-sans">Loading…</p>
        </div>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={user} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          user={user}
          unreadCount={dashData?.notifications.filter((n) => !n.isRead).length ?? 0}
        />
        <div className="flex flex-1 min-h-0">
          <MainFeed
            user={user}
            data={dashData}
            loading={dataLoading}
            onRefresh={() => {
              fetch("/api/dashboard/data")
                .then((r) => r.json())
                .then(setDashData)
                .catch(console.error);
            }}
          />
          <RightPanel
            notifications={dashData?.notifications ?? []}
            onlineFriends={dashData?.onlineFriends ?? []}
            currentUserId={user.id}
            onNotificationsRead={() => {
              // optimistic update + server sync
              setDashData((prev) =>
                prev ? { ...prev, notifications: prev.notifications.map((n) => ({ ...n, isRead: true })) } : prev
              );
              fetch("/api/notifications/read", { method: "PATCH" }).catch(console.error);
            }}
          />
        </div>
      </div>
    </div>
  );
}
