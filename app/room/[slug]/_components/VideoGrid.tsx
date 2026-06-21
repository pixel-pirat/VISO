"use client";

import { useRef, useEffect } from "react";
import { Mic, MicOff, MoreHorizontal } from "lucide-react";
import type { RoomParticipant } from "./LiveRoom";

const AVATAR_G = ["from-violet-500 to-fuchsia-500","from-blue-500 to-cyan-500","from-emerald-500 to-teal-500","from-orange-500 to-rose-500","from-pink-500 to-fuchsia-500"];
function ag(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_G[h % AVATAR_G.length];
}

function ParticipantTile({ participant, isHost }: { participant: RoomParticipant; isHost: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !participant.videoTrack) return;
    const stream = new MediaStream([participant.videoTrack]);
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => {});
    return () => { if (videoRef.current) videoRef.current.srcObject = null; };
  }, [participant.videoTrack]);

  const g = ag(participant.identity);

  return (
    <div className={`relative rounded-xl overflow-hidden bg-neutral-900 border transition-colors ${
      participant.isSpeaking
        ? "border-violet-500 shadow-lg shadow-violet-500/20"
        : "border-neutral-800"
    }`}>
      {/* video / avatar */}
      {!participant.isVideoOff && participant.videoTrack ? (
        <video ref={videoRef} className="w-full h-full object-cover" muted={participant.isLocal} playsInline autoPlay />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-linear-to-br ${g}`}>
          <span className="text-2xl font-extrabold text-white font-sans">
            {participant.name[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
      )}

      {/* speaking waveform overlay */}
      {participant.isSpeaking && (
        <div className="absolute bottom-8 left-2 flex items-end gap-0.5">
          {[3,5,7,5,3].map((h, i) => (
            <div key={i} className="w-0.5 bg-violet-400 rounded-full animate-pulse"
              style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {/* bottom bar */}
      <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-linear-to-t from-black/70 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {participant.isHost && (
            <span className="text-[8px] font-bold text-white bg-violet-500 px-1.5 py-0.5 rounded font-sans">Host</span>
          )}
          <span className="text-[10px] font-semibold text-white font-sans truncate">
            {participant.name}{participant.isLocal ? " (You)" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {participant.isMuted
            ? <MicOff className="w-3 h-3 text-red-400" />
            : <Mic    className="w-3 h-3 text-emerald-400" />}
          {isHost && !participant.isLocal && (
            <button className="w-4 h-4 flex items-center justify-center text-neutral-500 hover:text-white transition-colors">
              <MoreHorizontal className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface VideoGridProps {
  participants: RoomParticipant[];
  isHost:       boolean;
}

export function VideoGrid({ participants, isHost }: VideoGridProps) {
  const count = participants.length;

  // Decide grid columns based on count
  const cols = count <= 2 ? 2 : count <= 4 ? 4 : count <= 6 ? 3 : 4;

  return (
    <div className="w-full h-full p-2 overflow-hidden">
      {count === 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-xs text-neutral-600 font-sans">No participants yet</p>
        </div>
      ) : (
        <div
          className="grid gap-2 h-full"
          style={{ gridTemplateColumns: `repeat(${Math.min(cols, count)}, minmax(0, 1fr))` }}
        >
          {participants.map((p) => (
            <ParticipantTile key={p.identity} participant={p} isHost={isHost} />
          ))}
        </div>
      )}
    </div>
  );
}
