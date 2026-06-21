"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { LiveRoom } from "./_components/LiveRoom";

export type RoomInfo = {
  id: string;
  name: string;
  slug: string;
  contentTitle: string | null;
  coverUrl: string | null;
  visibility: string;
  commChat: boolean;
  commAudio: boolean;
  commVideo: boolean;
  hostId: string;
  status: string;
};

export type JoinData = {
  token: string;
  livekitUrl: string;
  room: RoomInfo;
  role: string;
};

export default function LiveRoomPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { data: session, isPending } = authClient.useSession();

  const [joinData, setJoinData]   = useState<JoinData | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  const join = useCallback(async () => {
    if (!params.slug || !session) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/room/${params.slug}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to join room."); return; }
      setJoinData(data);
    } catch {
      setError("Could not connect to the room.");
    } finally {
      setLoading(false);
    }
  }, [params.slug, session]);

  useEffect(() => { if (session) join(); }, [session, join]);

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0f] gap-3">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-neutral-500 font-sans">Joining room…</p>
      </div>
    );
  }

  if (error || !joinData || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0f] gap-4">
        <p className="text-white font-bold font-sans">{error ?? "Room unavailable"}</p>
        <button onClick={() => router.push("/dashboard/rooms")}
          className="text-sm text-violet-400 hover:text-violet-300 font-sans transition-colors">
          ← Back to Rooms
        </button>
      </div>
    );
  }

  const { user } = session;

  return (
    <LiveRoom
      joinData={joinData}
      currentUser={{
        id:       user.id,
        name:     user.name ?? "User",
        username: (user as { username?: string }).username ?? null,
        image:    user.image ?? null,
      }}
      onLeave={async () => {
        await fetch(`/api/room/${params.slug}/leave`, { method: "POST" });
        router.push(`/dashboard/rooms/${params.slug}`);
      }}
    />
  );
}
