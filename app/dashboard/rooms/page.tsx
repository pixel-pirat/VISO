"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { Sidebar } from "../_components/Sidebar";
import { Topbar } from "../_components/Topbar";
import { RoomsContent } from "./_components/RoomsContent";
import { FiltersPanel } from "./_components/FiltersPanel";
import { CreateRoomModal } from "./_components/CreateRoomModal";

export type RoomFilters = {
  type: "all" | "live" | "upcoming" | "friends" | "mine";
  privacy: "all" | "public" | "private";
  search: string;
};

export default function RoomsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState<RoomFilters>({ type: "all", privacy: "all", search: "" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  const handleCreated = useCallback(() => {
    setShowCreate(false);
    setRefreshKey((k) => k + 1);
  }, []);

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
          unreadCount={0}
          onCreateRoom={() => setShowCreate(true)}
          searchValue={filters.search}
          onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
        />

        <div className="flex flex-1 min-h-0">
          {/* main content */}
          <RoomsContent
            user={user}
            filters={filters}
            refreshKey={refreshKey}
            onCreateRoom={() => setShowCreate(true)}
          />

          {/* right filters panel */}
          <FiltersPanel
            filters={filters}
            onChange={setFilters}
          />
        </div>
      </div>

      {/* create room modal */}
      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
