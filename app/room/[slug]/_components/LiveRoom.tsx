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
import { X } from "lucide-react";
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

// ── Polls & Q&A (session-scoped, synced over the LiveKit data channel) ──
export type PollState = {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;   // participant identity → option index
  open: boolean;
};

export type QAItem = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  answered: boolean;
};

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
  const [showReactionBar, setShowReactionBar] = useState(true);
  const reactionIdRef = useRef(0);

  /* ── Mobile-only overlay panels — participants / chat sheets ── */
  const [mobilePanel, setMobilePanel] = useState<"none" | "people" | "chat">("none");

  /* ── Polls & Q&A ── */
  const [poll,      setPoll]      = useState<PollState | null>(null);
  const [questions, setQuestions] = useState<QAItem[]>([]);
  const pollRef = useRef<PollState | null>(null);
  const qaRef   = useRef<QAItem[]>([]);
  useEffect(() => { pollRef.current = poll; },      [poll]);
  useEffect(() => { qaRef.current   = questions; }, [questions]);

  /* ── Invite link (copied-state feedback) ── */
  const [invited, setInvited] = useState(false);
  const copyInvite = useCallback(() => {
    const url = `${window.location.origin}/room/${roomInfo.slug}${
      roomInfo.inviteToken ? `?invite=${roomInfo.inviteToken}` : ""
    }`;
    navigator.clipboard?.writeText(url).then(() => {
      setInvited(true);
      setTimeout(() => setInvited(false), 2000);
    }).catch(() => {});
  }, [roomInfo.slug, roomInfo.inviteToken]);

  /* ── Ref to the video element (set by VideoPlayer via onVideoRef) ── */
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* ── LiveKit + playback sync via data channel ── */
  // Use a stable callback ref pattern so DataReceived never closes over stale state
  const isHostRef    = useRef(isHost);
  const hostIdRef    = useRef(roomInfo.hostId);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { hostIdRef.current = roomInfo.hostId; }, [roomInfo.hostId]);

  useEffect(() => {
    const lkRoom = new LKRoom({ adaptiveStream: true, dynacast: true });
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
      .on(RoomEvent.Connected,               () => { setLkConnected(true); refreshParticipants(); })
      .on(RoomEvent.Disconnected,            () => setLkConnected(false))
      .on(RoomEvent.ParticipantConnected,    () => refreshParticipants())
      .on(RoomEvent.ParticipantDisconnected, () => refreshParticipants())
      .on(RoomEvent.TrackSubscribed,         () => refreshParticipants())
      .on(RoomEvent.TrackUnsubscribed,       () => refreshParticipants())
      .on(RoomEvent.TrackMuted,              () => refreshParticipants())
      .on(RoomEvent.TrackUnmuted,            () => refreshParticipants())
      .on(RoomEvent.ActiveSpeakersChanged,   () => refreshParticipants())
      .on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));

          // ── Playback sync from host → all viewers ──────────────
          if (msg.type === "playback_sync") {
            const senderIsHost = participant?.identity === hostIdRef.current;
            if (senderIsHost && !isHostRef.current) {
              setPlaybackState((prev) => ({
                isPlaying:    msg.isPlaying   ?? prev?.isPlaying   ?? false,
                currentTime:  msg.currentTime ?? prev?.currentTime ?? 0,
                speed:        msg.speed       ?? prev?.speed       ?? 1,
                roomContent:  prev?.roomContent  ?? null,
                roomContentId: prev?.roomContentId,
              }));
            }
          }

          // ── Request sync — viewer asks host for current state ──
          if (msg.type === "request_sync" && isHostRef.current) {
            const v = videoRef.current;  // always fresh via onVideoRef callback
            lkRoom.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify({
                type:        "playback_sync",
                isPlaying:   !(v?.paused ?? true),
                currentTime: v?.currentTime ?? 0,
                speed:       v?.playbackRate ?? 1,
              })),
              { reliable: true }
            );
            // Also bring the late joiner up to speed on polls & Q&A
            lkRoom.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify({
                type: "room_state",
                poll: pollRef.current,
                questions: qaRef.current,
              })),
              { reliable: true }
            );
          }

          // ── Polls (poll_start/poll_end only honored from the host) ──
          const senderIsHost = participant?.identity === hostIdRef.current;
          if (msg.type === "poll_start" && senderIsHost && msg.poll) {
            setPoll({ id: msg.poll.id, question: msg.poll.question, options: msg.poll.options ?? [], votes: {}, open: true });
          }
          if (msg.type === "poll_end" && senderIsHost) {
            setPoll((p) => (p && p.id === msg.pollId ? { ...p, open: false } : p));
          }
          if (msg.type === "poll_vote" && participant) {
            setPoll((p) =>
              p && p.id === msg.pollId && p.open && typeof msg.option === "number"
                ? { ...p, votes: { ...p.votes, [participant.identity]: msg.option } }
                : p
            );
          }

          // ── Q&A ──
          if (msg.type === "qa_question" && participant && typeof msg.text === "string" && msg.text.trim()) {
            setQuestions((prev) =>
              prev.some((q) => q.id === msg.id)
                ? prev
                : [...prev, {
                    id: String(msg.id),
                    text: msg.text.slice(0, 300),
                    authorId: participant.identity,
                    authorName: participant.name ?? participant.identity,
                    answered: false,
                  }]
            );
          }
          if (msg.type === "qa_answered" && senderIsHost) {
            setQuestions((prev) => prev.map((q) => (q.id === msg.id ? { ...q, answered: true } : q)));
          }

          // ── Late-joiner snapshot from the host ──
          if (msg.type === "room_state" && senderIsHost && !isHostRef.current) {
            if (msg.poll) setPoll(msg.poll);
            if (Array.isArray(msg.questions) && msg.questions.length) setQuestions(msg.questions);
          }

          // ── Reactions ──────────────────────────────────────────
          if (msg.type === "reaction") {
            const id = ++reactionIdRef.current;
            setReactions((prev) => [...prev.slice(-10), { emoji: msg.emoji, senderId: msg.senderId ?? "", id }]);
            setReactionCounts((prev) => ({ ...prev, [msg.emoji]: (prev[msg.emoji] ?? 0) + 1 }));
          }
        } catch { /* ignore parse errors */ }
      });

    lkRoom.connect(livekitUrl, token, { autoSubscribe: true })
      .then(() => {
        // Once connected, non-hosts request sync from the host
        if (!isHost) {
          setTimeout(() => {
            lkRoom.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify({ type: "request_sync" })),
              { reliable: true }
            );
          }, 1000); // brief delay to ensure host has received the connection event
        }
      })
      .catch((err) => console.error("LiveKit connect error:", err));

    return () => { lkRoom.disconnect(); lkRoomRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, livekitUrl, roomInfo.hostId, isHost]);

  /* ── Host periodic sync tick — keeps viewers in sync while playing ── */
  useEffect(() => {
    if (!isHost) return;
    const interval = setInterval(() => {
      const lk = lkRoomRef.current;
      const v  = videoRef.current;
      if (!lk || !v) return;
      // Only broadcast if playing — when paused viewers are already at the right position
      if (!v.paused) {
        lk.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({
            type:        "playback_sync",
            isPlaying:   true,
            currentTime: v.currentTime,
            speed:       v.playbackRate,
          })),
          { reliable: false } // unreliable is fine for periodic ticks — lower overhead
        );
      }
    }, 2000); // sync every 2s while playing
    return () => clearInterval(interval);
  }, [isHost]);

  /* ── SSE: Chat stream (text messages only — reactions + playback use LiveKit) ── */
  useEffect(() => {
    const ctrl = new AbortController();
    const es   = new EventSource(`/api/room/${roomInfo.slug}/chat`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "history") setMessages(data.messages);
      // Dedupe against the optimistic copy sendChat already appended
      if (data.type === "message") {
        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      }
    };
    es.onerror = () => es.close();

    return () => { ctrl.abort(); es.close(); };
  }, [roomInfo.slug]);

  /* ── Fetch initial playback state + queue on join ── */
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
  // Appends an optimistic bubble immediately instead of waiting on the
  // round trip (DB write + realtime fan-out) — reconciled with the real
  // message once the POST resolves, removed if it fails.
  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");

    const tempId = `temp-${crypto.randomUUID()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      text,
      createdAt: new Date().toISOString(),
      sender: { id: currentUser.id, name: currentUser.name, username: currentUser.username, image: currentUser.image },
    }]);

    try {
      const res = await fetch(`/api/room/${roomInfo.slug}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("send failed");
      const data = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setChatInput(text);
    }
  }, [chatInput, roomInfo.slug, currentUser.id, currentUser.name, currentUser.username, currentUser.image]);

  /* ── Polls & Q&A actions (publish + apply locally — LiveKit doesn't echo
        your own data messages back to you) ── */
  const publishData = useCallback((data: object) => {
    lkRoomRef.current?.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(data)),
      { reliable: true }
    );
  }, []);

  const createPoll = useCallback((question: string, options: string[]) => {
    if (!isHost) return;
    const p: PollState = { id: crypto.randomUUID(), question, options, votes: {}, open: true };
    setPoll(p);
    publishData({ type: "poll_start", poll: { id: p.id, question, options } });
  }, [isHost, publishData]);

  const endPoll = useCallback(() => {
    if (!isHost || !pollRef.current) return;
    publishData({ type: "poll_end", pollId: pollRef.current.id });
    setPoll((p) => (p ? { ...p, open: false } : p));
  }, [isHost, publishData]);

  const votePoll = useCallback((option: number) => {
    const p = pollRef.current;
    if (!p || !p.open) return;
    setPoll((prev) => (prev ? { ...prev, votes: { ...prev.votes, [currentUser.id]: option } } : prev));
    publishData({ type: "poll_vote", pollId: p.id, option });
  }, [currentUser.id, publishData]);

  const askQuestion = useCallback((text: string) => {
    const trimmed = text.trim().slice(0, 300);
    if (!trimmed) return;
    const id = crypto.randomUUID();
    setQuestions((prev) => [...prev, {
      id, text: trimmed, authorId: currentUser.id,
      authorName: currentUser.name, answered: false,
    }]);
    publishData({ type: "qa_question", id, text: trimmed });
  }, [currentUser.id, currentUser.name, publishData]);

  const markAnswered = useCallback((id: string) => {
    if (!isHost) return;
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answered: true } : q)));
    publishData({ type: "qa_answered", id });
  }, [isHost, publishData]);

  /* ── Host playback control ── broadcasts via LiveKit data channel ── */
  const controlPlayback = useCallback((update: Partial<{ isPlaying: boolean; currentTime: number; speed: number; roomContentId: string }>) => {
    if (!isHost) return;

    const lk = lkRoomRef.current;
    if (lk) {
      lk.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "playback_sync", ...update })),
        { reliable: true }
      );
    }

    // Persist to DB for late joiners
    fetch(`/api/room/${roomInfo.slug}/playback`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(update),
    }).catch(console.error);
  }, [isHost, roomInfo.slug]);

  const chatPanelProps = {
    messages, input: chatInput, setInput: setChatInput, onSend: sendChat,
    participantCount: participants.length, activeTab, setActiveTab, roomInfo,
    currentUserId: currentUser.id, isHost, onReaction: sendReaction,
    onInvite: copyInvite, invited,
    poll, onCreatePoll: createPoll, onVotePoll: votePoll, onEndPoll: endPoll,
    questions, onAskQuestion: askQuestion, onMarkAnswered: markAnswered,
  };

  // Show the mobile filmstrip only when there's someone besides you on cam/in-room
  const showParticipantStrip = !theatreMode && participants.length > 1;

  return (
    <div className={`flex h-screen bg-[#0d0d0f] text-neutral-200 overflow-hidden ${theatreMode ? "theatre-mode" : ""}`}>

      {/* ── Left sidebar — desktop rail only ── */}
      <div className="hidden md:flex md:shrink-0 h-full">
        <RoomSidebar
          roomInfo={roomInfo}
          participants={participants}
          isHost={isHost}
          currentUserId={currentUser.id}
          lkConnected={lkConnected}
          onInvite={copyInvite}
          invited={invited}
        />
      </div>

      {/* ── Centre: video player + participant grid + controls ── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <RoomTopBar
          roomInfo={roomInfo}
          participantCount={participants.length}
          isHost={isHost}
          theatreMode={theatreMode}
          onToggleTheatre={() => setTheatreMode((v) => !v)}
          onLeave={onLeave}
          onInvite={copyInvite}
          invited={invited}
          onOpenPeople={() => setMobilePanel("people")}
          onOpenChat={() => setMobilePanel("chat")}
        />

        {/* main content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* video player — fills all available space on mobile; fixed 38% band on desktop */}
          <div className={`relative shrink-0 ${theatreMode ? "flex-1" : "flex-1 md:flex-none md:h-[38%]"}`}>
            <VideoPlayer
              playbackState={playbackState}
              queue={queue}
              isHost={isHost}
              onControl={controlPlayback}
              onVideoRef={(el) => { videoRef.current = el; }}
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

            {/* reaction bar (bottom of player) — toggled via the Reactions control */}
            {showReactionBar && (
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
              </div>
            )}
          </div>

          {/* participant video grid — full grid on desktop, compact filmstrip on mobile */}
          {!theatreMode && (
            <>
              <div className="hidden md:block md:flex-1 md:min-h-0 md:overflow-hidden">
                <VideoGrid participants={participants} isHost={isHost} mode="grid" />
              </div>
              {showParticipantStrip && (
                <div className="md:hidden shrink-0">
                  <VideoGrid participants={participants} isHost={isHost} mode="strip" />
                </div>
              )}
            </>
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
          reactionBarVisible={showReactionBar}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={toggleScreenShare}
          onRaiseHand={raiseHand}
          onOpenReactions={() => setShowReactionBar((v) => !v)}
          onLeave={onLeave}
        />
      </div>

      {/* ── Right: chat panel — desktop rail only ── */}
      <div className="hidden md:flex md:shrink-0 h-full">
        <ChatPanel {...chatPanelProps} />
      </div>

      {/* ── Mobile: participants sheet ── */}
      {mobilePanel === "people" && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobilePanel("none")} />
          <div className="relative bg-[#0a0a0c] border-t border-neutral-800/60 rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mt-3 shrink-0" />
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/60 shrink-0">
              <p className="text-sm font-bold text-white font-sans">Participants ({participants.length})</p>
              <button onClick={() => setMobilePanel("none")}
                className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <RoomSidebar
                variant="sheet"
                roomInfo={roomInfo}
                participants={participants}
                isHost={isHost}
                currentUserId={currentUser.id}
                lkConnected={lkConnected}
                onInvite={copyInvite}
                invited={invited}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: chat/polls/qa full-screen sheet ── */}
      {mobilePanel === "chat" && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          <ChatPanel {...chatPanelProps} mobile onClose={() => setMobilePanel("none")} />
        </div>
      )}

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
