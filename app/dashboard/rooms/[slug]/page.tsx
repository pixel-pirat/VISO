"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { Sidebar } from "../../_components/Sidebar";
import { Topbar } from "../../_components/Topbar";
import { RoomDetail } from "./_components/RoomDetail";
import { EditRoomModal } from "./_components/EditRoomModal";
import type { RoomDetailData } from "./_types";

export default function RoomDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { data: session, isPending } = authClient.useSession();

  const [room, setRoom]           = useState<RoomDetailData | null>(null);
  const [myRole, setMyRole]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [showEdit, setShowEdit]   = useState(false);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  const fetchRoom = useCallback(async () => {
    if (!params.slug) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/rooms/${params.slug}`);
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      setRoom(data.room);
      setMyRole(data.myMembership?.role ?? null);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    if (session) fetchRoom();
  }, [session, fetchRoom]);

  const handleDelete = async () => {
    if (!room || !confirm("Delete this room? This cannot be undone.")) return;
    const res = await fetch(`/api/rooms/${room.slug}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/rooms");
  };

  if (isPending || (!room && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111113]">
        <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111113]">
        <div className="text-center">
          <p className="text-white font-bold font-sans text-lg mb-2">Room not found</p>
          <button onClick={() => router.push("/dashboard/rooms")}
            className="text-sm text-violet-400 hover:text-violet-300 font-sans transition-colors">
            ← Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  const { user } = session;
  const isHost = room?.hostId === user.id;

  return (
    <div className="flex h-screen bg-[#111113] text-neutral-200 overflow-hidden">
      <Sidebar user={user} />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={user} unreadCount={0} onCreateRoom={() => router.push("/dashboard/rooms")} />

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {room && (
            <RoomDetail
              room={room}
              myRole={myRole}
              isHost={isHost}
              currentUserId={user.id}
              onEdit={() => setShowEdit(true)}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {showEdit && room && (
        <EditRoomModal
          room={room}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setRoom(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
