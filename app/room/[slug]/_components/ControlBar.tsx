"use client";

import {
  Mic, MicOff, Video, VideoOff,
  MonitorUp, MonitorStop, Hand, Smile,
  Settings, PhoneOff,
} from "lucide-react";

interface ControlBarProps {
  isMuted:        boolean;
  isVideoOff:     boolean;
  isScreenSharing:boolean;
  handRaised:     boolean;
  isHost:         boolean;
  commAudio:      boolean;
  commVideo:      boolean;
  onToggleMic:    () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onRaiseHand:    () => void;
  onOpenReactions:() => void;
  onLeave:        () => void;
}

function CtrlBtn({
  onClick, title, active, danger, disabled, icon: Icon, label,
}: {
  onClick: () => void; title: string; active?: boolean; danger?: boolean;
  disabled?: boolean; icon: React.ElementType; label: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all group ${
        danger    ? "text-red-400 hover:bg-red-500/20"
        : active  ? "text-white bg-neutral-700"
        : disabled? "text-neutral-700 cursor-not-allowed"
        :           "text-neutral-400 hover:text-white hover:bg-neutral-800"
      }`}>
      <Icon className="w-5 h-5" />
      <span className="text-[9px] font-semibold font-sans">{label}</span>
    </button>
  );
}

export function ControlBar({
  isMuted, isVideoOff, isScreenSharing, handRaised, isHost,
  commAudio, commVideo,
  onToggleMic, onToggleCamera, onToggleScreenShare, onRaiseHand, onOpenReactions, onLeave,
}: ControlBarProps) {
  return (
    <footer className="h-16 shrink-0 flex items-center justify-center gap-1 px-6 border-t border-neutral-800/60 bg-[#0d0d0f]">
      <CtrlBtn
        icon={isMuted ? MicOff : Mic}
        label={isMuted ? "Unmute" : "Mute"}
        title={!commAudio ? "Audio not enabled for this room" : isMuted ? "Unmute microphone" : "Mute microphone"}
        active={!isMuted}
        disabled={!commAudio}
        onClick={commAudio ? onToggleMic : () => {}}
      />
      <CtrlBtn
        icon={isVideoOff ? VideoOff : Video}
        label={isVideoOff ? "Start Video" : "Stop Video"}
        title={!commVideo ? "Video not enabled for this room" : isVideoOff ? "Start camera" : "Stop camera"}
        active={!isVideoOff}
        disabled={!commVideo}
        onClick={commVideo ? onToggleCamera : () => {}}
      />
      <CtrlBtn
        icon={isScreenSharing ? MonitorStop : MonitorUp}
        label="Share Screen"
        title={isScreenSharing ? "Stop screen share" : "Share screen"}
        active={isScreenSharing}
        onClick={onToggleScreenShare}
      />
      <CtrlBtn
        icon={Hand}
        label="Raise Hand"
        title={handRaised ? "Lower hand" : "Raise hand"}
        active={handRaised}
        onClick={onRaiseHand}
      />
      <CtrlBtn
        icon={Smile}
        label="Reactions"
        title="Send a reaction"
        onClick={onOpenReactions}
      />
      <CtrlBtn
        icon={Settings}
        label="Settings"
        title="Settings"
        onClick={() => {}}
      />

      {/* spacer */}
      <div className="flex-1" />

      <CtrlBtn
        icon={PhoneOff}
        label="Leave"
        title="Leave room"
        danger
        onClick={onLeave}
      />
    </footer>
  );
}
