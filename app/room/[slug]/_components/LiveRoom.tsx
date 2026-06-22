"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room as LKRoom,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  Participant,
  LocalTrackPublication,
  RemoteTrackPublication,
} from "livekit-client";
import { RoomSidebar }   from "./RoomSidebar";
import { VideoGrid }     from "./VideoGrid";
import { VideoPlayer }   from "./VideoPlayer";
import { ChatPanel }     from "./ChatPanel";
import { ControlBar }    from "./ControlBar";
import { RoomTopBar }    from "./RoomTopBar";
import type { JoinData } from "../page";

export type ChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  sender: { id: string; name: string | null; username: string | null; image: string | null };
};

export type PlaybackState = {
  isPlaying:    boolean;
  currentTime:  number;
  speed:        number;
  roomContent:  { content: { title: string; url: string; type: string; duration: number | null; thumbnailUrl: string | null } } | null;
  roomContentId?: string | null;
};

export type QueueItem = {
  id: string;
  queueOrder: number;
  status: string;
  content: { id: string; title: string; url: string; type: string; duration: number | null; thumbnailUrl: string | null };
};

export type RoomParticipant = {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isLocal: boolean;
  isHost: boolean;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
};

export type Reaction = { emoji: string; senderId: string; id: number };

interface LiveRoomProps {
  joinData:    JoinData;
  currentUser: { id: string; name: string; username: string | null; image: string | null };
  onLeave:     () => void;
}

const EMOJI_LIST = ["❤️","😂","🔥","😮","👏"] as const;

/* ── Renders hidden <audio> elements for every remote participant ── */
function RemoteAudioRenderer({ participants }: { participants: RoomParticipant[] }) {
  return (
    <div className="hidden" aria-hidden="true">
      {participants
        .filter((p) => !p.isLocal && p.audioTrack)
        .map((p) => (
          <AudioElement key={p.identity} track={p.audioTrack!} />
        ))}
    </div>
  );
}

function AudioElement({ track }: { track: MediaStreamTrack }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const stream = new MediaStream([track]);
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {/* autoplay policy — user must interact first */});
    return () => { if (ref.current) ref.current.srcObject = null; };
  }, [track]);
  return <audio ref={ref} autoPlay playsInline />;
}

export function LiveRoom({ joinData, currentUser, onLeave }: LiveRoomProps) {
  const { token, livekitUrl, room: roomInfo, role } = joinData;
  const isHost = role === "HOST" || role === "CO_HOST";

  /* ── LiveKit room state ── */
  const lkRoomRef  = useRef<LKRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [lkConnected, setLkConnected]   = useState(false);

  /* ── UI state ── */
  const [activeTab,       setActiveTab]       = useState<"chat" | "polls" | "qa">("chat");
  const [theatreMode,     setTheatreMode]     = useState(false);
  const [isMuted,         setIsMuted]         = useState(true);
  const [isVideoOff,      setIsVideoOff]      = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised,      setHandRaised]      = useState(false);

  /* ── Chat ── */
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  /* ── Playback ── */
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [queue,         setQueue]         = useState<QueueItem[]>([]);

  /* ── Reactions ── */
  const [reactions,      setReactions]      = useState<Reaction[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
    "❤️": 0, "😂": 0, "🔥": 0, "😮": 0, "👏": 0,
  });
  const reactionIdRef = useRef(0);

  /* ── Connect LiveKit ── */
  useEffect(() => {
    const lkRoom = new LKRoom({
      adaptiveStream: true,
      dynacast:       true,
    });
    lkRoomRef.current = lkRoom;

    function buildParticipant(p: Participant, local: boolean): RoomParticipant {
      const vPub = p.getTrackPublications().find(
        (t) => t.kind === Track.Kind.Video && t.trackSid
      ) as LocalTrackPublication | RemoteTrackPublication | undefined;
      const aPub = p.getTrackPublications().find(
        (t) => t.kind === Track.Kind.Audio && t.trackSid
      ) as LocalTrackPublication | RemoteTrackPublication | undefined;

      return {
        identity:   p.identity,
        name:       p.name ?? p.identity,
        isSpeaking: p.isSpeaking,
        isMuted:    aPub?.isMuted ?? true,
        isVideoOff: !vPub || vPub.isMuted,
        isLocal:    local,
        isHost:     p.identity === roomInfo.hostId,
        videoTrack: vPub && "track" in vPub && vPub.track ? (vPub.track as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack : undefined,
        audioTrack: aPub && "track" in aPub && aPub.track ? (aPub.track as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack : undefined,
      };
    }

    function refreshParticipants() {
      const all: RoomParticipant[] = [];
      if (lkRoom.localParticipant) all.push(buildParticipant(lkRoom.localParticipant, true));
      lkRoom.remoteParticipants.forEach((rp) => all.push(buildParticipant(rp, false)));
      setParticipants(all);
    }

    lkRoom
      .on(RoomEvent.Connected,            ()  => { setLkConnected(true);  refreshParticipants(); })
      .on(RoomEvent.Disconnected,         ()  => setLkConnected(false))
      .on(RoomEvent.ParticipantConnected,  () => refreshParticipants())
      .on(RoomEvent.ParticipantDisconnected, () => refreshParticipants())
      .on(RoomEvent.TrackSubscribed,       () => refreshParticipants())
      .on(RoomEvent.TrackUnsubscribed,     () => refreshParticipants())
      .on(RoomEvent.TrackMuted,            () => refreshParticipants())
      .on(RoomEvent.TrackUnmuted,          () => refreshParticipants())
      .on(RoomEvent.ActiveSpeakersChanged, () => refreshParticipants())
      .on(RoomEvent.DataReceived, (payload) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg.type === "reaction") {
            const id = ++reactionIdRef.current;
            setReactions((prev) => [...prev.slice(-10), { emoji: msg.emoji, senderId: msg.senderId, id }]);
            setReactionCounts((prev) => ({ ...prev, [msg.emoji]: (prev[msg.emoji] ?? 0) + 1 }));
          }
        } catch { /* ignore */ }
      });

    lkRoom.connect(livekitUrl, token, { autoSubscribe: true })
      .catch((err) => console.error("LiveKit connect error:", err));

    return () => {
      lkRoom.disconnect();
      lkRoomRef.current = null;
    };
  }, [token, livekitUrl, roomInfo.hostId]);

  /* ── SSE: Chat stream ── */
  useEffect(() => {
    const ctrl = new AbortController();
    const es   = new EventSource(`/api/room/${roomInfo.slug}/chat`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "history")  setMessages(data.messages);
      if (data.type === "message")  setMessages((prev) => [...prev, data.message]);
    };
    es.onerror = () => es.close();

    return () => { ctrl.abort(); es.close(); };
  }, [roomInfo.slug]);

  /* ── SSE: Events stream (playback sync, reactions) ── */
  useEffect(() => {
    const es = new EventSource(`/api/room/${roomInfo.slug}/events`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "playback_sync") {
        setPlaybackState(data.playbackState);
      }
      if (data.type === "reaction" && data.senderId !== currentUser.id) {
        const id = ++reactionIdRef.current;
        setReactions((prev) => [...prev.slice(-10), { emoji: data.emoji, senderId: data.senderId, id }]);
        setReactionCounts((prev) => ({ ...prev, [data.emoji]: (prev[data.emoji] ?? 0) + 1 }));
      }
    };
    es.onerror = () => es.close();

    return () => es.close();
  }, [roomInfo.slug, currentUser.id]);

  /* ── Fetch initial playback state + queue ── */
  useEffect(() => {
    fetch(`/api/room/${roomInfo.slug}/playback`)
      .then((r) => r.json())
      .then((d) => {
        if (d.playbackState) setPlaybackState(d.playbackState);
        if (d.queue)         setQueue(d.queue);
      })
      .catch(console.error);
  }, [roomInfo.slug]);

  /* ── Local media controls ── */
  const toggleMic = useCallback(async () => {
    const lk = lkRoomRef.current;
    if (!lk) return;
    try {
      const enabled = await lk.localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!enabled);
    } catch (err) {
      console.error("Mic toggle failed:", err);
    }
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    const lk = lkRoomRef.current;
    if (!lk) return;
    try {
      const enabled = await lk.localParticipant.setCameraEnabled(isVideoOff);
      setIsVideoOff(!enabled);
    } catch (err) {
      console.error("Camera toggle failed:", err);
    }
  }, [isVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    const lk = lkRoomRef.current;
    if (!lk) return;
    try {
      const enabled = await lk.localParticipant.setScreenShareEnabled(!isScreenSharing);
      setIsScreenSharing(Boolean(enabled));
    } catch (err) {
      console.error("Screen share toggle failed:", err);
    }
  }, [isScreenSharing]);

  const raiseHand = useCallback(() => {
    const lk = lkRoomRef.current;
    const next = !handRaised;
    setHandRaised(next);
    lk?.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "raise_hand", raised: next }))
    );
    fetch(`/api/room/${roomInfo.slug}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "raise_hand", raised: next }),
    }).catch(() => {});
  }, [handRaised, roomInfo.slug]);

  /* ── Send reaction ── */
  const sendReaction = useCallback((emoji: string) => {
    const id = ++reactionIdRef.current;
    setReactions((prev) => [...prev.slice(-10), { emoji, senderId: currentUser.id, id }]);
    setReactionCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));

    // via LiveKit data channel (low latency)
    lkRoomRef.current?.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "reaction", emoji }))
    );
    // persist via SSE broadcast
    fetch(`/api/room/${roomInfo.slug}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "reaction", emoji }),
    }).catch(() => {});
  }, [currentUser.id, roomInfo.slug]);

  /* ── Send chat message ── */
  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    await fetch(`/api/room/${roomInfo.slug}/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text }),
    });
  }, [chatInput, roomInfo.slug]);

  /* ── Host playback control — returns Promise so player can await it ── */
  const controlPlayback = useCallback(async (update: Partial<{ isPlaying: boolean; currentTime: number; speed: number; roomContentId: string }>) => {
    if (!isHost) return;
    await fetch(`/api/room/${roomInfo.slug}/playback`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(update),
    });
  }, [isHost, roomInfo.slug]);

  return (
    <div className={`flex h-screen bg-[#0d0d0f] text-neutral-200 overflow-hidden ${theatreMode ? "theatre-mode" : ""}`}>

      {/* ── Left sidebar ── */}
      <RoomSidebar
        roomInfo={roomInfo}
        participants={participants}
        isHost={isHost}
        currentUserId={currentUser.id}
        lkConnected={lkConnected}
      />

      {/* ── Centre: video player + participant grid + controls ── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <RoomTopBar
          roomInfo={roomInfo}
          participantCount={participants.length}
          isHost={isHost}
          theatreMode={theatreMode}
          onToggleTheatre={() => setTheatreMode((v) => !v)}
          onLeave={onLeave}
        />

        {/* main content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* video player */}
          <div className={`relative flex-shrink-0 ${theatreMode ? "flex-1" : ""}`} style={{ height: theatreMode ? undefined : "38%" }}>
            <VideoPlayer
              playbackState={playbackState}
              queue={queue}
              isHost={isHost}
              onControl={controlPlayback}
            />

            {/* floating reactions */}
            <div className="absolute bottom-16 left-4 flex flex-col-reverse gap-1 pointer-events-none z-20">
              {reactions.slice(-6).map((r) => (
                <span key={r.id} className="text-2xl animate-bounce-up opacity-0"
                  style={{ animation: "floatUp 2s ease-out forwards" }}>
                  {r.emoji}
                </span>
              ))}
            </div>

            {/* reaction bar (bottom of player) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full z-10">
              {EMOJI_LIST.map((emoji) => (
                <button key={emoji} onClick={() => sendReaction(emoji)}
                  className="flex items-center gap-1 hover:scale-125 transition-transform">
                  <span className="text-base">{emoji}</span>
                  {(reactionCounts[emoji] ?? 0) > 0 && (
                    <span className="text-[9px] text-neutral-300 font-bold font-sans">{reactionCounts[emoji]}</span>
                  )}
                </button>
              ))}
              <button className="text-neutral-500 hover:text-white transition-colors text-lg ml-1">+</button>
            </div>
          </div>

          {/* participant video grid */}
          {!theatreMode && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <VideoGrid participants={participants} isHost={isHost} />
            </div>
          )}
        </div>

        {/* ── Control bar ── */}
        <ControlBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          handRaised={handRaised}
          isHost={isHost}
          commAudio={roomInfo.commAudio}
          commVideo={roomInfo.commVideo}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={toggleScreenShare}
          onRaiseHand={raiseHand}
          onOpenReactions={() => {/* handled inline */}}
          onLeave={onLeave}
        />
      </div>

      {/* ── Right: chat panel ── */}
      <ChatPanel
        messages={messages}
        input={chatInput}
        setInput={setChatInput}
        onSend={sendChat}
        participantCount={participants.length}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        roomInfo={roomInfo}
        currentUserId={currentUser.id}
      />

      <style jsx global>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-80px) scale(1.4); }
        }
      `}</style>

      {/* Hidden audio elements for remote participants — required for audio to play */}
      <RemoteAudioRenderer participants={participants} />
    </div>
  );
}
