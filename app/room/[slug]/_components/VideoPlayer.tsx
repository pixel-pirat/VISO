"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Subtitles, Maximize2, MonitorPlay,
} from "lucide-react";
import type { PlaybackState, QueueItem } from "./LiveRoom";

function fmtTime(s: number) {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

// A Mux upload ID is a short alphanumeric string that hasn't yet been
// replaced by a real stream URL. Format: 26 chars, no slashes or dots.
function isMuxUploadId(url: string): boolean {
  return Boolean(url) &&
    !url.startsWith("http") &&
    !url.startsWith("/") &&
    !url.startsWith("data:") &&
    url.length > 10 &&
    /^[a-zA-Z0-9_-]+$/.test(url);
}

interface VideoPlayerProps {
  playbackState: PlaybackState | null;
  queue:         QueueItem[];
  isHost:        boolean;
  onControl:     (update: Partial<{ isPlaying: boolean; currentTime: number; speed: number; roomContentId: string }>) => void;
}

export function VideoPlayer({ playbackState, queue, isHost, onControl }: VideoPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const hlsRef      = useRef<unknown>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [muted,      setMuted]      = useState(false);
  const [localTime,  setLocalTime]  = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [showCtrl,   setShowCtrl]   = useState(true);
  const [loadErr,    setLoadErr]    = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [processing,  setProcessing]  = useState(false);
  const [pollStatus,  setPollStatus]  = useState("");

  // Pick content from playback state or first item in queue
  const rawContent = playbackState?.roomContent?.content ?? queue[0]?.content ?? null;

  // Use resolved URL if we have one (from polling), otherwise raw
  const contentUrl = resolvedUrl ?? rawContent?.url ?? null;
  const contentType = rawContent?.type ?? "HLS";

  const pending = Boolean(contentUrl && isMuxUploadId(contentUrl));
  const isHLS   = !pending && (contentUrl?.includes("stream.mux.com") || contentUrl?.endsWith(".m3u8") || contentType === "HLS");
  const isDirect = !pending && Boolean(contentUrl) && (isHLS || contentType === "MP4" || contentType === "DASH");

  /* ── Poll Mux status when URL is still an upload ID ── */
  useEffect(() => {
    if (!pending || !contentUrl) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    setProcessing(true);
    setPollStatus("Uploading to Mux…");

    const uploadId = contentUrl;

    const check = async () => {
      try {
        const res  = await fetch(`/api/mux/status/${uploadId}`);
        const data = await res.json();

        if (data.status === "ready" && data.url) {
          // Video is ready — update the resolved URL so the player loads it
          setResolvedUrl(data.url);
          setProcessing(false);
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        } else if (data.status === "preparing" || data.status === "asset_created") {
          setPollStatus("Transcoding… almost there");
        } else if (data.status === "waiting") {
          setPollStatus("Upload received, starting transcode…");
        } else {
          setPollStatus(`Processing (${data.status ?? "checking"})…`);
        }
      } catch {
        // Silently retry
      }
    };

    check(); // immediate first check
    pollRef.current = setInterval(check, 5000); // then every 5s

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [pending, contentUrl]);

  /* ── Load video when URL becomes available ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !contentUrl || pending) return;

    setLoadErr(false);

    // Destroy previous HLS instance
    const prev = hlsRef.current as { destroy?: () => void } | null;
    prev?.destroy?.();
    hlsRef.current = null;

    if (!isDirect) return;

    // Safari — native HLS
    if (isHLS && v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = contentUrl;
      return;
    }

    // Chrome/Firefox — hls.js
    if (isHLS) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) { setLoadErr(true); return; }
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(contentUrl);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal?: boolean }) => {
          if (data.fatal) setLoadErr(true);
        });
        hlsRef.current = hls;
      });
      return;
    }

    v.src = contentUrl;
  }, [contentUrl, isDirect, isHLS, pending]);

  /* ── Sync with server playback state ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playbackState || pending) return;
    const drift = Math.abs(v.currentTime - playbackState.currentTime);
    if (drift > 2) v.currentTime = playbackState.currentTime;
    if (playbackState.isPlaying && v.paused)   v.play().catch(() => {});
    if (!playbackState.isPlaying && !v.paused) v.pause();
    v.playbackRate = playbackState.speed ?? 1;
  }, [playbackState, pending]);

  /* ── Track time ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setLocalTime(v.currentTime);
    const onMeta = () => setDuration(v.duration || 0);
    v.addEventListener("timeupdate",     onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    return () => {
      v.removeEventListener("timeupdate",     onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
    };
  }, []);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      const hls = hlsRef.current as { destroy?: () => void } | null;
      hls?.destroy?.();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* ── Auto-hide controls ── */
  const showControls = useCallback(() => {
    setShowCtrl(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowCtrl(false), 3000);
  }, []);

  /* ── Host controls ── */
  const hostPlay  = () => onControl({ isPlaying: true,  currentTime: videoRef.current?.currentTime });
  const hostPause = () => onControl({ isPlaying: false, currentTime: videoRef.current?.currentTime });
  const hostSeek  = (t: number) => { if (videoRef.current) videoRef.current.currentTime = t; onControl({ currentTime: t }); };
  const hostSkip  = (d: number) => hostSeek((videoRef.current?.currentTime ?? 0) + d);

  const pct = duration > 0 ? (localTime / duration) * 100 : 0;

  /* ── No content ── */
  if (!rawContent) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <MonitorPlay className="w-12 h-12 text-neutral-700" />
        <p className="text-sm text-neutral-500 font-sans">No content loaded yet</p>
        {isHost && <p className="text-xs text-neutral-600 font-sans">Upload a video when creating your room</p>}
      </div>
    );
  }

  /* ── Processing / pending ── */
  if (processing || pending) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <MonitorPlay className="w-6 h-6 text-violet-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white font-sans">Video is transcoding</p>
          <p className="text-xs text-neutral-500 font-sans mt-1">{pollStatus || "Checking status…"}</p>
          <p className="text-xs text-neutral-600 font-sans mt-0.5">Will play automatically when ready</p>
        </div>
        {/* Pulsing progress indicator */}
        <div className="flex gap-1.5">
          {[0,1,2,3].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Load error ── */
  if (loadErr) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-3">
        <MonitorPlay className="w-10 h-10 text-red-500/50" />
        <p className="text-sm text-neutral-400 font-sans">Could not load video</p>
        <p className="text-xs text-neutral-600 font-sans max-w-xs text-center">
          The stream may not be ready yet. Try refreshing in a moment.
        </p>
        <button onClick={() => { setLoadErr(false); setResolvedUrl(null); }}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs text-neutral-300 font-sans transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" onMouseMove={showControls}>

      {/* Direct video (HLS / MP4) */}
      {isDirect && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline muted={muted}
        />
      )}

      {/* YouTube */}
      {rawContent.type === "YOUTUBE" && (() => {
        const ytId = contentUrl?.includes("youtu.be/")
          ? contentUrl.split("youtu.be/")[1]?.split("?")[0]
          : new URLSearchParams((contentUrl ?? "").split("?")[1] ?? "").get("v");
        return ytId
          ? <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0`} allow="autoplay; fullscreen" />
          : <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm">Invalid YouTube URL</div>;
      })()}

      {/* Twitch */}
      {rawContent.type === "TWITCH" && (
        <iframe className="absolute inset-0 w-full h-full"
          src={`https://player.twitch.tv/?channel=${contentUrl}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&autoplay=true`}
          allow="autoplay; fullscreen" />
      )}

      {/* Controls overlay */}
      {isDirect && (
        <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showCtrl ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 px-4 pb-3">

            {/* seek bar */}
            <div className="relative w-full h-1.5 bg-white/20 rounded-full mb-3 cursor-pointer group/seek"
              onClick={(e) => {
                if (!isHost || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                hostSeek(((e.clientX - rect.left) / rect.width) * duration);
              }}>
              <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${pct}% - 7px)` }} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isHost ? (
                  <button onClick={playbackState?.isPlaying ? hostPause : hostPlay}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
                    {playbackState?.isPlaying
                      ? <Pause className="w-4 h-4 text-white" />
                      : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />}
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    {playbackState?.isPlaying
                      ? <Pause className="w-4 h-4 text-neutral-500" />
                      : <Play  className="w-4 h-4 text-neutral-500 ml-0.5" />}
                  </div>
                )}
                {isHost && (
                  <>
                    <button onClick={() => hostSkip(-10)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors" title="Back 10s">
                      <RotateCcw className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button onClick={() => hostSkip(10)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors" title="Forward 10s">
                      <RotateCw className="w-3.5 h-3.5 text-white" />
                    </button>
                  </>
                )}
                <button onClick={() => { const n = !muted; setMuted(n); if (videoRef.current) videoRef.current.muted = n; }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
                  {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-[10px] text-white/80 font-sans tabular-nums">
                  {fmtTime(localTime)} / {fmtTime(duration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors" title="Subtitles">
                  <Subtitles className="w-3.5 h-3.5 text-white" />
                </button>
                <button onClick={() => videoRef.current?.requestFullscreen()}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
