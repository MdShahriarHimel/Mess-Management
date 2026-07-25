import React, { useState, useEffect, useRef } from "react";
import * as LucideIcons from "lucide-react";

interface BackgroundAudioPlayerProps {
  activeAudioSettings: {
    url: string;
    enabled: boolean;
  } | null;
  isDarkMode?: boolean;
}

export const BackgroundAudioPlayer: React.FC<BackgroundAudioPlayerProps> = ({
  activeAudioSettings,
  isDarkMode = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5); // 0 to 1
  const [showControls, setShowControls] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const url = activeAudioSettings?.url || "";
  const isEnabled = activeAudioSettings?.enabled === true && !!url;

  // Extract YouTube ID if applicable
  const getYouTubeId = (videoUrl: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYouTubeId(url);
  const isYouTube = !!youtubeId;

  // Read saved mute / volume preferences from localStorage
  useEffect(() => {
    const savedMute = localStorage.getItem("ambient_audio_muted");
    const savedVolume = localStorage.getItem("ambient_audio_volume");
    
    if (savedMute !== null) {
      setIsMuted(savedMute === "true");
    }
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Sync state changes with local storage
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem("ambient_audio_muted", String(nextMute));
    
    // Auto start play state on user unmute
    if (!nextMute && !isPlaying) {
      setIsPlaying(true);
    }
    setHasInteracted(true);
  };

  const handleTogglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    setHasInteracted(true);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localStorage.setItem("ambient_audio_volume", String(newVol));
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      localStorage.setItem("ambient_audio_muted", "false");
    }
  };

  // HTML5 audio state synchronization
  useEffect(() => {
    if (!isYouTube && isEnabled && audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.warn("Autoplay blocked or playback error:", err);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted, volume, isYouTube, isEnabled, url]);

  // If settings turn off, pause audio
  useEffect(() => {
    if (!isEnabled) {
      setIsPlaying(false);
    } else {
      // If enabled, auto-play unless explicitly muted
      const savedMute = localStorage.getItem("ambient_audio_muted");
      if (savedMute === "false") {
        setIsPlaying(true);
      }
    }
  }, [isEnabled, url]);

  if (!isEnabled) return null;

  return (
    <>
      {/* HTML5 Audio element for direct links */}
      {!isYouTube && (
        <audio
          ref={audioRef}
          src={url}
          loop
          preload="auto"
        />
      )}

      {/* Embedded YouTube Iframe for YouTube links */}
      {isYouTube && isPlaying && (
        <iframe
          width="0"
          height="0"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${youtubeId}&enablejsapi=1&volume=${Math.round(volume * 100)}`}
          allow="autoplay"
          className="hidden"
          title="Ambient Music Iframe"
        />
      )}

      {/* Floating Widget and Indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Compact Autoplay/Unmute Call-to-action */}
        {isEnabled && isMuted && !hasInteracted && (
          <button
            onClick={handleToggleMute}
            className="px-3 py-1.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] tracking-wider uppercase animate-bounce cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <LucideIcons.Music size={11} className="animate-spin" />
            Tap to Unmute Ambient Audio
          </button>
        )}

        {/* Floating Controller Card */}
        <div className="flex items-center gap-2">
          {/* Expanded Controls Panel */}
          {showControls && (
            <div
              className={`p-3 rounded-2xl border flex items-center gap-4 shadow-xl transition-all duration-300 ${
                isDarkMode 
                  ? "bg-slate-950/95 border-cyan-500/20 backdrop-blur" 
                  : "bg-white/95 border-slate-200 shadow-slate-200/50 backdrop-blur"
              }`}
            >
              <div className="space-y-1">
                <span className={`text-[9px] uppercase tracking-widest font-bold block ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                  {isYouTube ? "YouTube Stream" : "Ambient Music"}
                </span>
                <span className={`text-[10px] font-medium block truncate max-w-[120px] ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} title={url}>
                  {url.substring(url.lastIndexOf('/') + 1) || "Audio Source"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                {/* Play/Pause */}
                <button
                  onClick={handleTogglePlay}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isDarkMode ? "hover:bg-slate-900 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                  }`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <LucideIcons.Pause size={14} /> : <LucideIcons.Play size={14} />}
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={handleToggleMute}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isDarkMode ? "hover:bg-slate-900 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <LucideIcons.VolumeX size={14} className="text-rose-400" /> : <LucideIcons.Volume2 size={14} />}
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Trigger Disc Button */}
          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-3 rounded-full border transition-all duration-300 cursor-pointer shadow-lg flex items-center justify-center ${
              isPlaying && !isMuted 
                ? "bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 border-cyan-400 hover:scale-105 active:scale-95 animate-pulse" 
                : isDarkMode 
                  ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200" 
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"
            }`}
          >
            {isPlaying && !isMuted ? (
              <LucideIcons.Music size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
            ) : (
              <LucideIcons.VolumeX size={16} />
            )}
          </button>
        </div>
      </div>
    </>
  );
};
