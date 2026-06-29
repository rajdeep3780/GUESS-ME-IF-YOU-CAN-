import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../utils/sound';

export default function SoundToggle() {
  const [muted, setMuted] = useState(soundManager.getIsMuted());

  const handleToggle = () => {
    const isMuted = soundManager.toggleMute();
    setMuted(isMuted);
    soundManager.playClick();
  };

  return (
    <button
      id="sound-toggle-btn"
      onClick={handleToggle}
      className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer ${
        muted
          ? 'bg-red-950/40 border-red-800/40 text-red-400 hover:bg-red-900/40'
          : 'bg-violet-950/40 border-violet-800/40 text-violet-400 hover:bg-violet-900/40 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
      }`}
      title={muted ? "Unmute sound" : "Mute sound"}
    >
      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
}
