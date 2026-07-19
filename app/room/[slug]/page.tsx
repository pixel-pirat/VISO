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
  inviteToken?: string | null;
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
  const [needPasscode,  setNeedPasscode]  = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  const join = useCallback(async (passcode?: string) => {
    if (!params.slug || !session) return;
    setLoading(true);
    setError(null);
    try {
      // Invite links look like /room/<slug>?invite=<token>
      const invite = new URLSearchParams(window.location.search).get("invite");
      const res  = await fetch(`/api/room/${params.slug}/join`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ inviteToken: invite ?? undefined, passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "PASSCODE_REQUIRED") {
          setNeedPasscode(true);
          // Only surface "incorrect passcode" after an actual attempt
          if (passcode) setError(data.error ?? "Incorrect passcode");
        } else {
          setError(data.error ?? "Failed to join room.");
        }
        return;
      }
      setNeedPasscode(false);
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

  if (needPasscode && !joinData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0f] gap-4">
        <p className="text-white font-bold font-sans">This room requires a passcode</p>
        <form
          className="flex flex-col items-center gap-3"
          onSubmit={(e) => { e.preventDefault(); if (passcodeInput.trim()) join(passcodeInput.trim()); }}
        >
          <input
            type="password"
            autoFocus
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Enter passcode"
            className="w-64 px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white font-sans placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
          />
          {error && <p className="text-xs text-red-400 font-sans">{error}</p>}
          <button
            type="submit"
            disabled={!passcodeInput.trim()}
            className="w-64 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg text-sm font-semibold text-white font-sans transition-colors"
          >
            Join room
          </button>
        </form>
        <button onClick={() => router.push("/dashboard/rooms")}
          className="text-sm text-violet-400 hover:text-violet-300 font-sans transition-colors">
          ← Back to Rooms
        </button>
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
