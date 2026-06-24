"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Subtitles, Maximize2, MonitorPlay, Lock,
} from "lucide-react";
import type { PlaybackState, QueueItem } from "./LiveRoom";

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

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
  onControl:     (update: Partial<{ isPlaying: boolean; currentTime: number; speed: number; roomContentId: string }>) => Promise<void>;
  onVideoRef?:   (el: HTMLVideoElement | null) => void;
}

export function VideoPlayer({ playbackState, queue, isHost, onControl, onVideoRef }: VideoPlayerProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const hlsRef    = useRef<unknown>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncTime = useRef<number>(-1);

  const [muted,       setMuted]       = useState(false);
  const [localTime,   setLocalTime]   = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [showCtrl,    setShowCtrl]    = useState(true);
  const [loadErr,     setLoadErr]     = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [processing,  setProcessing]  = useState(false);
  const [pollStatus,  setPollStatus]  = useState("");
  const [isBusy,      setIsBusy]      = useState(false); // debounce rapid host clicks

  const rawContent = playbackState?.roomContent?.content ?? queue[0]?.content ?? null;
  const contentUrl = resolvedUrl ?? rawContent?.url ?? null;
  const contentType = rawContent?.type ?? "HLS";

  const pending  = Boolean(contentUrl && isMuxUploadId(contentUrl));
  const isHLS    = !pending && (contentUrl?.includes("stream.mux.com") || contentUrl?.endsWith(".m3u8") || contentType === "HLS");
  const isDirect = !pending && Boolean(contentUrl) && (isHLS || contentType === "MP4" || contentType === "DASH");

  /* ── Poll Mux until transcoding is done ── */
  useEffect(() => {
    if (!pending || !contentUrl) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    setProcessing(true);
    const uploadId = contentUrl;
    const check = async () => {
      try {
        const data = await fetch(`/api/mux/status/${uploadId}`).then(r => r.json());
        if (data.status === "ready" && data.url) {
          setResolvedUrl(data.url);
          setProcessing(false);
          clearInterval(pollRef.current!);
          pollRef.current = null;
        } else {
          setPollStatus(
            data.status === "preparing" ? "Transcoding… almost there" :
            data.status === "waiting"   ? "Upload received, starting transcode…" :
            `Processing (${data.status ?? "checking"})…`
          );
        }
      } catch { /* retry silently */ }
    };
    check();
    pollRef.current = setInterval(check, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [pending, contentUrl]);

  /* ── Load video source ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !contentUrl || pending) return;
    setLoadErr(false);
    (hlsRef.current as { destroy?: () => void } | null)?.destroy?.();
    hlsRef.current = null;
    if (!isDirect) return;

    if (isHLS && v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = contentUrl; return;
    }
    if (isHLS) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) { setLoadErr(true); return; }
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(contentUrl);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_: unknown, d: { fatal?: boolean }) => { if (d.fatal) setLoadErr(true); });
        hlsRef.current = hls;
      });
      return;
    }
    v.src = contentUrl;
  }, [contentUrl, isDirect, isHLS, pending]);

  /* ── Sync video with server playback state ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playbackState || pending || !isDirect) return;

    const serverTime = playbackState.currentTime;

    // Seed localTime immediately so seek bar shows correct position before video loads
    if (serverTime > 0) setLocalTime(serverTime);

    // Only seek if this is a newly received server time (avoids re-seeking on every tick)
    if (Math.abs(serverTime - lastSyncTime.current) > 1) {
      const drift = Math.abs(v.currentTime - serverTime);
      if (drift > 1.5) v.currentTime = serverTime;
      lastSyncTime.current = serverTime;
    }

    v.playbackRate = playbackState.speed ?? 1;

    if (playbackState.isPlaying && v.paused)   v.play().catch(() => {});
    if (!playbackState.isPlaying && !v.paused) v.pause();
  }, [playbackState, pending, isDirect]);

  /* ── Track local time ── */
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

  /* ── Expose video element to parent (for host sync tick) ── */
  useEffect(() => {
    onVideoRef?.(videoRef.current);
    return () => onVideoRef?.(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      (hlsRef.current as { destroy?: () => void } | null)?.destroy?.();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* ── Auto-hide controls ── */
  const revealControls = useCallback(() => {
    setShowCtrl(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowCtrl(false), 3000);
  }, []);

  /* ── Host control helpers ── */
  const hostControl = useCallback(async (update: Partial<{ isPlaying: boolean; currentTime: number; speed: number }>) => {
    if (!isHost || isBusy) return;
    setIsBusy(true);
    // Optimistic local update so host sees immediate feedback
    const v = videoRef.current;
    if (v) {
      if (update.currentTime !== undefined) v.currentTime = update.currentTime;
      if (update.isPlaying === true  && v.paused)  v.play().catch(() => {});
      if (update.isPlaying === false && !v.paused) v.pause();
    }
    await onControl(update).catch(console.error);
    setTimeout(() => setIsBusy(false), 300);
  }, [isHost, isBusy, onControl]);

  const hostPlay  = () => hostControl({ isPlaying: true,  currentTime: videoRef.current?.currentTime });
  const hostPause = () => hostControl({ isPlaying: false, currentTime: videoRef.current?.currentTime });
  const hostSeek  = (t: number) => hostControl({ currentTime: t });
  const hostSkip  = (d: number) => hostControl({ currentTime: Math.max(0, (videoRef.current?.currentTime ?? 0) + d) });

  const pct = duration > 0 ? Math.min(100, (localTime / duration) * 100) : 0;

  /* ── States: no content ── */
  if (!rawContent) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <MonitorPlay className="w-12 h-12 text-neutral-700" />
        <p className="text-sm text-neutral-500 font-sans">No content loaded yet</p>
        {isHost && <p className="text-xs text-neutral-600 font-sans">Upload a video when creating your room</p>}
      </div>
    );
  }

  /* ── States: transcoding ── */
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
          <p className="text-xs text-neutral-600 font-sans mt-0.5">Plays automatically when ready</p>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2,3].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: `${i*200}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── States: load error ── */
  if (loadErr) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-3">
        <MonitorPlay className="w-10 h-10 text-red-500/50" />
        <p className="text-sm text-neutral-400 font-sans">Could not load video</p>
        <button onClick={() => { setLoadErr(false); setResolvedUrl(null); }}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs text-neutral-300 font-sans transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" onMouseMove={revealControls}>

      {/* Direct video */}
      {isDirect && (
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain" playsInline muted={muted} />
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

      {/* ── Controls overlay ── */}
      {isDirect && (
        <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showCtrl ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 px-4 pb-3">
            {/* ── Seek bar ── clickable for host, read-only for viewers */}
            <div
              className={`relative w-full h-1.5 rounded-full mb-3 group/seek ${isHost ? "cursor-pointer" : "cursor-default"} bg-white/20`}
              onClick={(e) => {
                if (!isHost || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                hostSeek(((e.clientX - rect.left) / rect.width) * duration);
              }}
            >
              <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
              {/* scrub handle — only visible for host */}
              {isHost && (
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `calc(${pct}% - 7px)` }} />
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">

                {/* Play / Pause — host gets clickable button, viewers get visual indicator */}
                {isHost ? (
                  <button
                    onClick={playbackState?.isPlaying ? hostPause : hostPlay}
                    disabled={isBusy}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-50 flex items-center justify-center transition-colors"
                  >
                    {playbackState?.isPlaying
                      ? <Pause className="w-4 h-4 text-white" />
                      : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />}
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center" title="Playback controlled by host">
                    {playbackState?.isPlaying
                      ? <Pause className="w-4 h-4 text-neutral-500" />
                      : <Play  className="w-4 h-4 text-neutral-500 ml-0.5" />}
                  </div>
                )}

                {/* Skip buttons — host only */}
                {isHost && (
                  <>
                    <button onClick={() => hostSkip(-10)} disabled={isBusy}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-50 flex items-center justify-center transition-colors" title="Back 10s">
                      <RotateCcw className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button onClick={() => hostSkip(10)} disabled={isBusy}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-50 flex items-center justify-center transition-colors" title="Forward 10s">
                      <RotateCw className="w-3.5 h-3.5 text-white" />
                    </button>
                  </>
                )}

                {/* Volume — everyone can adjust their own local volume */}
                <button onClick={() => { const n = !muted; setMuted(n); if (videoRef.current) videoRef.current.muted = n; }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
                  {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
                </button>

                {/* Time */}
                <span className="text-[10px] text-white/80 font-sans tabular-nums">
                  {fmtTime(localTime)} / {fmtTime(duration)}
                </span>

                {/* Viewer lock indicator */}
                {!isHost && (
                  <div className="flex items-center gap-1 text-[9px] text-neutral-600 font-sans ml-1">
                    <Lock className="w-2.5 h-2.5" /> Host controls
                  </div>
                )}
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
