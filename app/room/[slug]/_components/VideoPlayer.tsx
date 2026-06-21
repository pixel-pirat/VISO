"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, RotateCcw, RotateCw,
  Volume2, VolumeX, Subtitles, Settings2, Maximize2, MonitorPlay,
} from "lucide-react";
import type { PlaybackState, QueueItem } from "./LiveRoom";

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface VideoPlayerProps {
  playbackState: PlaybackState | null;
  queue:         QueueItem[];
  isHost:        boolean;
  onControl:     (update: Partial<{ isPlaying: boolean; currentTime: number; speed: number; roomContentId: string }>) => void;
}

export function VideoPlayer({ playbackState, queue, isHost, onControl }: VideoPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const [volume,    setVolume]    = useState(1);
  const [muted,     setMuted]     = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [showCtrl,  setShowCtrl]  = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<number>(0);

  const content = playbackState?.roomContent?.content ?? queue[0]?.content ?? null;

  /* ── Sync video element with playback state from server ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playbackState) return;

    const serverTime = playbackState.currentTime;
    const drift = Math.abs(v.currentTime - serverTime);

    // Only seek if drift > 2 s to avoid constant micro-seeks
    if (drift > 2) v.currentTime = serverTime;

    if (playbackState.isPlaying && v.paused) {
      v.play().catch(() => {});
    } else if (!playbackState.isPlaying && !v.paused) {
      v.pause();
    }

    v.playbackRate = playbackState.speed ?? 1;
    lastSyncRef.current = Date.now();
  }, [playbackState]);

  /* ── Track local time ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setLocalTime(v.currentTime);
    const onMeta = () => setDuration(v.duration || 0);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onMeta); };
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

  if (!content) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 gap-4">
        <MonitorPlay className="w-12 h-12 text-neutral-700" />
        <p className="text-sm text-neutral-500 font-sans">No content loaded yet</p>
        {isHost && (
          <p className="text-xs text-neutral-600 font-sans">Upload or queue a video to begin</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black group overflow-hidden" onMouseMove={showControls}>
      {/* ── video element ── */}
      {(content.type === "MP4" || content.type === "HLS" || content.type === "DASH") && (
        <video
          ref={videoRef}
          src={content.url}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          onPlay={() => {}}
          onPause={() => {}}
        />
      )}

      {/* YouTube / Twitch — iframe embed */}
      {content.type === "YOUTUBE" && (() => {
        const ytId = content.url.includes("youtu.be/")
          ? content.url.split("youtu.be/")[1]?.split("?")[0]
          : new URLSearchParams(content.url.split("?")[1] ?? "").get("v");
        return ytId
          ? <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0`} allow="autoplay; fullscreen" />
          : null;
      })()}

      {content.type === "TWITCH" && (
        <iframe className="absolute inset-0 w-full h-full"
          src={`https://player.twitch.tv/?channel=${content.url}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&autoplay=true`}
          allow="autoplay; fullscreen" />
      )}

      {/* ── overlay controls (only for direct video) ── */}
      {(content.type === "MP4" || content.type === "HLS" || content.type === "DASH") && (
        <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showCtrl ? "opacity-100" : "opacity-0"}`}>
          {/* gradient */}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

          {/* controls */}
          <div className="relative z-10 px-4 pb-2">
            {/* seek bar */}
            <div className="relative w-full h-1 bg-white/20 rounded-full mb-2 cursor-pointer group/seek"
              onClick={(e) => {
                if (!isHost) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct  = (e.clientX - rect.left) / rect.width;
                hostSeek(pct * duration);
              }}>
              <div className="h-1 bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/seek:opacity-100 transition-opacity"
                style={{ left: `calc(${pct}% - 6px)` }} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* play/pause — host only */}
                {isHost ? (
                  <button onClick={playbackState?.isPlaying ? hostPause : hostPlay}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    {playbackState?.isPlaying
                      ? <Pause className="w-4 h-4 text-white" />
                      : <Play  className="w-4 h-4 text-white fill-white" />}
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    {playbackState?.isPlaying
                      ? <Pause className="w-4 h-4 text-neutral-500" />
                      : <Play  className="w-4 h-4 text-neutral-500" />}
                  </div>
                )}
                {isHost && (
                  <>
                    <button onClick={() => hostSkip(-10)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                      <RotateCcw className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button onClick={() => hostSkip(10)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                      <RotateCw className="w-3.5 h-3.5 text-white" />
                    </button>
                  </>
                )}

                {/* volume */}
                <button onClick={() => { setMuted((v) => !v); if (videoRef.current) videoRef.current.muted = !muted; }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
                </button>

                {/* time */}
                <span className="text-[10px] text-white font-mono font-sans">
                  {fmtTime(localTime)} / {fmtTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Subtitles">
                  <Subtitles className="w-3.5 h-3.5 text-white" />
                </button>
                {isHost && (
                  <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Settings">
                    <Settings2 className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
                <button
                  onClick={() => videoRef.current?.requestFullscreen()}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theatre mode badge */}
      <div className="absolute top-3 right-3 z-10">
        <span className="flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur rounded-lg text-[9px] font-bold text-neutral-300 font-sans">
          <MonitorPlay className="w-3 h-3" /> Theatre Mode
        </span>
      </div>
    </div>
  );
}
