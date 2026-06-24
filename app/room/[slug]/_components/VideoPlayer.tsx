"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Maximize2, Minimize2, MonitorPlay, Lock,
} from "lucide-react";
import type { PlaybackState, QueueItem } from "./LiveRoom";

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s) || s < 0) return "0:00";
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
    : `${m}:${String(sec).padStart(2,"0")}`;
}

function isMuxUploadId(url: string): boolean {
  return Boolean(url) && !url.startsWith("http") && !url.startsWith("/") &&
    !url.startsWith("data:") && url.length > 10 && /^[a-zA-Z0-9_-]+$/.test(url);
}

interface VideoPlayerProps {
  playbackState: PlaybackState | null;
  queue:         QueueItem[];
  isHost:        boolean;
  onControl:     (update: Partial<{ isPlaying: boolean; currentTime: number; speed: number }>) => void;
  onVideoRef?:   (el: HTMLVideoElement | null) => void;
}

export function VideoPlayer({ playbackState, queue, isHost, onControl, onVideoRef }: VideoPlayerProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const hlsRef        = useRef<unknown>(null);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef   = useRef<number>(-1);
  const busyRef       = useRef(false);   // use ref not state — no re-render needed

  const [localTime,   setLocalTime]   = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [volume,      setVolume]      = useState(1);
  const [muted,       setMuted]       = useState(false);
  const [showCtrl,    setShowCtrl]    = useState(true);
  const [loadErr,     setLoadErr]     = useState(false);
  const [isFullscreen,setIsFullscreen]= useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [processing,  setProcessing]  = useState(false);
  const [pollStatus,  setPollStatus]  = useState("");

  const rawContent  = playbackState?.roomContent?.content ?? queue[0]?.content ?? null;
  const contentUrl  = resolvedUrl ?? rawContent?.url ?? null;
  const contentType = rawContent?.type ?? "HLS";
  const pending     = Boolean(contentUrl && isMuxUploadId(contentUrl));
  const isHLS       = !pending && (
    contentUrl?.includes("stream.mux.com") ||
    contentUrl?.endsWith(".m3u8") ||
    contentType === "HLS"
  );
  const isDirect = !pending && Boolean(contentUrl) &&
    (isHLS || contentType === "MP4" || contentType === "DASH");

  /* ── Expose video ref to parent immediately ── */
  useEffect(() => {
    onVideoRef?.(videoRef.current);
    return () => onVideoRef?.(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Poll Mux status ── */
  useEffect(() => {
    if (!pending || !contentUrl) {
      pollRef.current && clearInterval(pollRef.current);
      return;
    }
    setProcessing(true);
    const id = contentUrl;
    const check = async () => {
      try {
        const d = await fetch(`/api/mux/status/${id}`).then(r => r.json());
        if (d.status === "ready" && d.url) {
          setResolvedUrl(d.url);
          setProcessing(false);
          clearInterval(pollRef.current!);
        } else {
          setPollStatus(
            d.status === "preparing" ? "Transcoding… almost there" :
            d.status === "waiting"   ? "Upload received, starting…" :
            `Processing…`
          );
        }
      } catch { /* retry */ }
    };
    check();
    pollRef.current = setInterval(check, 4000);
    return () => { pollRef.current && clearInterval(pollRef.current); };
  }, [pending, contentUrl]);

  /* ── Load video source + wire HLS.js ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !contentUrl || pending || !isDirect) return;

    setLoadErr(false);
    setDuration(0);

    // Destroy previous HLS instance
    (hlsRef.current as { destroy?: () => void } | null)?.destroy?.();
    hlsRef.current = null;

    // Safari — native HLS
    if (isHLS && v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = contentUrl;
      return;
    }

    // Chrome / Firefox — HLS.js
    if (isHLS) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) { setLoadErr(true); return; }
        const hls = new Hls({ enableWorker: true, startLevel: -1 });
        hls.loadSource(contentUrl);
        hls.attachMedia(v);

        // HLS.js exposes duration here — NOT from loadedmetadata
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (v.duration && isFinite(v.duration)) setDuration(v.duration);
        });
        hls.on(Hls.Events.LEVEL_LOADED, (_: unknown, data: { details?: { totalduration?: number } }) => {
          const dur = data.details?.totalduration;
          if (dur && isFinite(dur)) setDuration(dur);
        });
        hls.on(Hls.Events.ERROR, (_: unknown, d: { fatal?: boolean }) => {
          if (d.fatal) setLoadErr(true);
        });
        hlsRef.current = hls;
      });
      return;
    }

    // Plain MP4
    v.src = contentUrl;
  }, [contentUrl, isDirect, isHLS, pending]);

  /* ── Track video element events ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime   = () => setLocalTime(v.currentTime);
    const onMeta   = () => {
      if (v.duration && isFinite(v.duration)) setDuration(v.duration);
    };
    const onPlay   = () => setIsPlaying(true);
    const onPause  = () => setIsPlaying(false);
    const onVolume = () => { setVolume(v.volume); setMuted(v.muted); };

    v.addEventListener("timeupdate",     onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("play",           onPlay);
    v.addEventListener("pause",          onPause);
    v.addEventListener("volumechange",   onVolume);

    return () => {
      v.removeEventListener("timeupdate",     onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("play",           onPlay);
      v.removeEventListener("pause",          onPause);
      v.removeEventListener("volumechange",   onVolume);
    };
  }, []);

  /* ── Fullscreen change detection ── */
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ── Page visibility — don't reload on tab switch ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onVis = () => {
      // When tab comes back to foreground, just resume if it was playing
      if (document.visibilityState === "visible" && playbackState?.isPlaying && v.paused) {
        v.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [playbackState?.isPlaying]);

  /* ── Sync from playbackState (from LiveKit data channel) ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playbackState || pending || !isDirect) return;

    const serverTime = playbackState.currentTime;

    // Seed progress bar immediately (before video seeks)
    setLocalTime(serverTime);

    // Seek only when genuinely different from last known server time
    const timeDiff = Math.abs(serverTime - lastSyncRef.current);
    if (timeDiff > 1) {
      lastSyncRef.current = serverTime;
      const drift = Math.abs(v.currentTime - serverTime);
      if (drift > 1.5) v.currentTime = serverTime;
    }

    v.playbackRate = playbackState.speed ?? 1;

    if (playbackState.isPlaying && v.paused)   v.play().catch(() => {});
    if (!playbackState.isPlaying && !v.paused) v.pause();
  }, [playbackState, pending, isDirect]);

  /* ── Cleanup ── */
  useEffect(() => () => {
    (hlsRef.current as { destroy?: () => void } | null)?.destroy?.();
    pollRef.current && clearInterval(pollRef.current);
  }, []);

  /* ── Auto-hide controls ── */
  const revealControls = useCallback(() => {
    setShowCtrl(true);
    hideTimer.current && clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowCtrl(false), 3000);
  }, []);

  /* ── Host control — immediate local update + broadcast ── */
  const doControl = useCallback((update: Partial<{ isPlaying: boolean; currentTime: number; speed: number }>) => {
    if (!isHost) return;

    // Apply locally first — instant feedback, no waiting for round-trip
    const v = videoRef.current;
    if (v) {
      if (update.currentTime !== undefined) {
        v.currentTime = update.currentTime;
        setLocalTime(update.currentTime);
      }
      if (update.isPlaying === true)  v.play().catch(() => {});
      if (update.isPlaying === false) v.pause();
    }

    // Broadcast to all viewers (fire and forget)
    try { onControl(update); } catch { /* ignore */ }
  }, [isHost, onControl]);

  const play  = () => doControl({ isPlaying: true,  currentTime: videoRef.current?.currentTime });
  const pause = () => doControl({ isPlaying: false, currentTime: videoRef.current?.currentTime });
  const seek  = (t: number) => doControl({ currentTime: t });
  const skip  = (d: number) => doControl({ currentTime: Math.max(0, (videoRef.current?.currentTime ?? 0) + d) });

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const pct = duration > 0 ? Math.min(100, (localTime / duration) * 100) : 0;

  /* ── Empty state ── */
  if (!rawContent) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <MonitorPlay className="w-12 h-12 text-neutral-700" />
        <p className="text-sm text-neutral-500 font-sans">No content yet</p>
        {isHost && <p className="text-xs text-neutral-600 font-sans">Upload a video when creating the room</p>}
      </div>
    );
  }

  /* ── Transcoding state ── */
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
          <p className="text-xs text-neutral-500 font-sans mt-1">{pollStatus || "Checking…"}</p>
          <p className="text-xs text-neutral-600 font-sans mt-0.5">Starts automatically when ready</p>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2,3].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"
              style={{ animationDelay: `${i*150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (loadErr) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-3">
        <MonitorPlay className="w-10 h-10 text-red-500/50" />
        <p className="text-sm text-neutral-400 font-sans">Could not load video</p>
        <button onClick={() => { setLoadErr(false); setResolvedUrl(null); }}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs text-neutral-300 font-sans">
          Retry
        </button>
      </div>
    );
  }

  return (
    /* Container — fullscreen targets this div so our custom controls stay visible */
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onMouseMove={revealControls}
      onMouseLeave={() => {
        hideTimer.current && clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setShowCtrl(false), 1000);
      }}
    >
      {/* ── Direct video (HLS / MP4) — no browser controls, no muted prop so React doesn't fight us ── */}
      {isDirect && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          // IMPORTANT: Do NOT pass controls={false} as a prop — it causes flicker.
          // Never pass muted as a controlled prop either — we manage it imperatively.
        />
      )}

      {/* YouTube */}
      {rawContent.type === "YOUTUBE" && (() => {
        const ytId = contentUrl?.includes("youtu.be/")
          ? contentUrl.split("youtu.be/")[1]?.split("?")[0]
          : new URLSearchParams((contentUrl ?? "").split("?")[1] ?? "").get("v");
        return ytId
          ? <iframe className="absolute inset-0 w-full h-full border-none"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&modestbranding=1`}
              allow="autoplay; fullscreen" />
          : null;
      })()}

      {/* Twitch */}
      {rawContent.type === "TWITCH" && (
        <iframe className="absolute inset-0 w-full h-full border-none"
          src={`https://player.twitch.tv/?channel=${contentUrl}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&autoplay=true`}
          allow="autoplay; fullscreen" />
      )}

      {/* ── Custom controls overlay ── always on top, pointer-events only on the bar area ── */}
      {isDirect && (
        <div
          className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200 ${showCtrl ? "opacity-100" : "opacity-0"}`}
          // Keep controls visible when mouse is over them
          onMouseEnter={() => { hideTimer.current && clearTimeout(hideTimer.current); setShowCtrl(true); }}
        >
          {/* gradient behind controls */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent pointer-events-none" />

          <div className="relative px-4 pb-3 pt-8">
            {/* ── Seek bar ── */}
            <div
              className={`relative w-full h-5 flex items-center mb-1 ${isHost ? "cursor-pointer" : "cursor-default"}`}
              onClick={(e) => {
                if (!isHost || !duration) return;
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * duration);
              }}
            >
              {/* track */}
              <div className="absolute inset-y-0 my-auto h-1.5 w-full rounded-full bg-white/25" />
              {/* fill */}
              <div className="absolute inset-y-0 my-auto h-1.5 rounded-full bg-violet-500"
                style={{ width: `${pct}%` }} />
              {/* scrub dot — host only */}
              {isHost && duration > 0 && (
                <div className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md -translate-x-1/2"
                  style={{ left: `${pct}%` }} />
              )}
            </div>

            {/* ── Buttons row ── */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">

                {/* Play / Pause */}
                {isHost ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const playing = !(videoRef.current?.paused ?? true);
                      playing ? pause() : play();
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 flex items-center justify-center transition-all"
                  >
                    {isPlaying
                      ? <Pause className="w-4 h-4 text-white" />
                      : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />}
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    {isPlaying
                      ? <Pause className="w-4 h-4 text-neutral-500" />
                      : <Play  className="w-4 h-4 text-neutral-500 ml-0.5" />}
                  </div>
                )}

                {/* Skip — host only */}
                {isHost && <>
                  <button onClick={(e) => { e.stopPropagation(); skip(-10); }}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 flex items-center justify-center transition-all" title="-10s">
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); skip(10); }}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 flex items-center justify-center transition-all" title="+10s">
                    <RotateCw className="w-3.5 h-3.5 text-white" />
                  </button>
                </>}

                {/* Volume */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const v = videoRef.current;
                    if (!v) return;
                    v.muted = !v.muted;
                    setMuted(v.muted);
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 flex items-center justify-center transition-all"
                >
                  {muted || volume === 0
                    ? <VolumeX className="w-3.5 h-3.5 text-white" />
                    : <Volume2 className="w-3.5 h-3.5 text-white" />}
                </button>

                {/* Time display */}
                <span className="text-[11px] text-white/80 font-sans tabular-nums ml-1">
                  {fmtTime(localTime)} / {fmtTime(duration)}
                </span>

                {/* Viewer lock badge */}
                {!isHost && (
                  <span className="flex items-center gap-1 text-[9px] text-neutral-500 font-sans ml-1">
                    <Lock className="w-2.5 h-2.5" /> Host controls
                  </span>
                )}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 flex items-center justify-center transition-all"
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen
                    ? <Minimize2 className="w-3.5 h-3.5 text-white" />
                    : <Maximize2 className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
