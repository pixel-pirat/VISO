"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Subtitles, Settings2, Maximize2, MonitorPlay,
} from "lucide-react";
import type { PlaybackState, QueueItem } from "./LiveRoom";

function fmtTime(s: number) {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

interface VideoPlayerProps {
  playbackState: PlaybackState | null;
  queue:         QueueItem[];
  isHost:        boolean;
  onControl:     (update: Partial<{ isPlaying: boolean; currentTime: number; speed: number; roomContentId: string }>) => void;
}

export function VideoPlayer({ playbackState, queue, isHost, onControl }: VideoPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const hlsRef      = useRef<unknown>(null);          // hls.js instance
  const [muted,     setMuted]     = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [showCtrl,  setShowCtrl]  = useState(true);
  const [loadErr,   setLoadErr]   = useState(false);
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const content = playbackState?.roomContent?.content ?? queue[0]?.content ?? null;
  const isHLS   = content?.url?.endsWith(".m3u8") || content?.type === "HLS";
  const isMP4   = content?.type === "MP4" || (!isHLS && content?.url && !content.url.startsWith("http") === false);
  const isDirect = content && (isHLS || isMP4 || content.type === "DASH");

  /* ── Load HLS.js for .m3u8 streams ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !content?.url) return;

    setLoadErr(false);

    // Destroy previous HLS instance
    const prevHls = hlsRef.current as { destroy?: () => void } | null;
    prevHls?.destroy?.();
    hlsRef.current = null;

    if (!isDirect) return;

    // Native HLS support (Safari)
    if (isHLS && v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = content.url;
      return;
    }

    // HLS via hls.js (Chrome, Firefox, Edge)
    if (isHLS) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          setLoadErr(true);
          return;
        }
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(content.url);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_evt: unknown, data: { fatal?: boolean }) => {
          if (data.fatal) setLoadErr(true);
        });
        hlsRef.current = hls;
      });
      return;
    }

    // Plain MP4 / DASH
    v.src = content.url;
  }, [content?.url, isDirect, isHLS]);

  /* ── Sync video element with server playback state ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playbackState) return;
    const drift = Math.abs(v.currentTime - playbackState.currentTime);
    if (drift > 2) v.currentTime = playbackState.currentTime;
    if (playbackState.isPlaying && v.paused)  v.play().catch(() => {});
    if (!playbackState.isPlaying && !v.paused) v.pause();
    v.playbackRate = playbackState.speed ?? 1;
  }, [playbackState]);

  /* ── Track time ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setLocalTime(v.currentTime);
    const onMeta = () => setDuration(v.duration || 0);
    v.addEventListener("timeupdate",      onTime);
    v.addEventListener("loadedmetadata",  onMeta);
    v.addEventListener("durationchange",  onMeta);
    return () => {
      v.removeEventListener("timeupdate",     onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
    };
  }, []);

  /* ── Cleanup HLS on unmount ── */
  useEffect(() => {
    return () => {
      const hls = hlsRef.current as { destroy?: () => void } | null;
      hls?.destroy?.();
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
  const hostSeek  = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
    onControl({ currentTime: t });
  };
  const hostSkip = (d: number) => hostSeek((videoRef.current?.currentTime ?? 0) + d);

  const pct = duration > 0 ? (localTime / duration) * 100 : 0;

  /* ── No content ── */
  if (!content) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <MonitorPlay className="w-12 h-12 text-neutral-700" />
        <p className="text-sm text-neutral-500 font-sans">No content loaded yet</p>
        {isHost && <p className="text-xs text-neutral-600 font-sans">Upload a video when creating the room</p>}
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
          {content.url?.startsWith("data:") ? "Cover image shown — video is still processing." : "Check the video URL or try re-uploading."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" onMouseMove={showControls}>

      {/* ── Direct video (HLS / MP4 / DASH) ── */}
      {isDirect && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          muted={muted}
        />
      )}

      {/* ── YouTube ── */}
      {content.type === "YOUTUBE" && (() => {
        const ytId = content.url.includes("youtu.be/")
          ? content.url.split("youtu.be/")[1]?.split("?")[0]
          : new URLSearchParams(content.url.split("?")[1] ?? "").get("v");
        return ytId
          ? <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0`} allow="autoplay; fullscreen" />
          : <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm font-sans">Invalid YouTube URL</div>;
      })()}

      {/* ── Twitch ── */}
      {content.type === "TWITCH" && (
        <iframe className="absolute inset-0 w-full h-full"
          src={`https://player.twitch.tv/?channel=${content.url}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&autoplay=true`}
          allow="autoplay; fullscreen" />
      )}

      {/* ── Mux upload pending (uploadId placeholder, not yet an HLS URL) ── */}
      {content.url && !content.url.startsWith("http") && !content.url.startsWith("data:") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 gap-3 z-10">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400 font-sans">Video is processing…</p>
          <p className="text-xs text-neutral-600 font-sans">This usually takes 1–3 minutes</p>
        </div>
      )}

      {/* ── Player controls overlay ── */}
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
              <div className="h-1.5 bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none"
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

                <button onClick={() => { const next = !muted; setMuted(next); if (videoRef.current) videoRef.current.muted = next; }}
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
