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
  const [liveAudioSettings, setLiveAudioSettings] = useState<{ url: string; enabled: boolean } | null>(activeAudioSettings);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.6); // 0 to 1
  const [showControls, setShowControls] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(() => {
    return sessionStorage.getItem("user_has_interacted") === "true";
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (activeAudioSettings) {
      setLiveAudioSettings(activeAudioSettings);
    }
  }, [activeAudioSettings]);

  // Real-time 3-second polling to instantly sync audio URL/toggle across all other logged-in accounts
  useEffect(() => {
    let isMounted = true;
    const pollAudioSettings = async () => {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          if (data.activeAudioSettings && isMounted) {
            setLiveAudioSettings(prev => {
              if (!prev || prev.url !== data.activeAudioSettings.url || prev.enabled !== data.activeAudioSettings.enabled) {
                return data.activeAudioSettings;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // silent fetch error handling
      }
    };

    pollAudioSettings();
    const interval = setInterval(pollAudioSettings, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const rawUrl = liveAudioSettings?.url || "";
  const isEnabled = liveAudioSettings?.enabled === true && !!rawUrl.trim();

  // Robust YouTube ID extraction supporting shorts, music.youtube, embeds, watch links
  const getYouTubeId = (videoUrl: string) => {
    if (!videoUrl) return null;
    const cleanUrl = videoUrl.trim();
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = cleanUrl.match(regExp);
    return match ? match[1] : null;
  };

  // Convert Google Drive or Dropbox links to streamable URLs
  const formatAudioUrl = (inputUrl: string) => {
    if (!inputUrl) return "";
    let clean = inputUrl.trim();
    
    // Google Drive share link conversion
    if (clean.includes("drive.google.com")) {
      const gDriveMatch = clean.match(/\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (gDriveMatch && gDriveMatch[1]) {
        return `https://docs.google.com/uc?export=open&id=${gDriveMatch[1]}`;
      }
    }
    
    // Dropbox share link conversion
    if (clean.includes("dropbox.com")) {
      clean = clean.replace("dl=0", "raw=1").replace("dl=1", "raw=1");
      if (!clean.includes("raw=1")) {
        clean += (clean.includes("?") ? "&raw=1" : "?raw=1");
      }
      return clean;
    }
    
    return clean;
  };

  const youtubeId = getYouTubeId(rawUrl);
  const isYouTube = !!youtubeId;
  const formattedAudioUrl = isYouTube ? "" : formatAudioUrl(rawUrl);

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

  // Sync state when enabled settings or rawUrl change
  useEffect(() => {
    if (isEnabled) {
      const savedMute = localStorage.getItem("ambient_audio_muted");
      if (savedMute !== "true") {
        setIsMuted(false);
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isEnabled, rawUrl]);

  // Handle first user interaction anywhere on window to trigger unmuted playback for browser autoplay policies
  useEffect(() => {
    const markInteracted = () => {
      sessionStorage.setItem("user_has_interacted", "true");
      setHasInteracted(true);
      const savedMute = localStorage.getItem("ambient_audio_muted");
      if (savedMute !== "true" && isEnabled) {
        setIsPlaying(true);
        setIsMuted(false);
      }
    };

    if (hasInteracted) return;

    const events = ["click", "keydown", "touchstart", "pointerdown", "scroll"];
    events.forEach(evt => window.addEventListener(evt, markInteracted, { once: true }));

    return () => {
      events.forEach(evt => window.removeEventListener(evt, markInteracted));
    };
  }, [isEnabled, hasInteracted]);

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem("ambient_audio_muted", String(nextMute));
    sessionStorage.setItem("user_has_interacted", "true");
    setHasInteracted(true);
    
    if (!nextMute && !isPlaying) {
      setIsPlaying(true);
    }
  };

  // Toggle Play
  const handleTogglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    sessionStorage.setItem("user_has_interacted", "true");
    setHasInteracted(true);
  };

  // Volume Change
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

  // HTML5 audio playback sync
  useEffect(() => {
    if (!isYouTube && isEnabled && audioRef.current && formattedAudioUrl) {
      audioRef.current.volume = isMuted ? 0 : volume;
      
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("Autoplay prevented or playback error:", err);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted, volume, isYouTube, isEnabled, formattedAudioUrl]);

  // YouTube postMessage controller
  const sendYouTubeCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
      } catch (e) {
        // ignore cross-origin error
      }
    }
  };

  useEffect(() => {
    if (isYouTube && isEnabled) {
      const runCommands = () => {
        sendYouTubeCommand(isPlaying ? "playVideo" : "pauseVideo");
        sendYouTubeCommand((isMuted || !hasInteracted) ? "mute" : "unMute");
        sendYouTubeCommand("setVolume", [Math.round(volume * 100)]);
      };

      runCommands();
      // Send command retries at 500ms and 1500ms after render to ensure iframe JS API is ready
      const t1 = setTimeout(runCommands, 500);
      const t2 = setTimeout(runCommands, 1500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isPlaying, isMuted, volume, isYouTube, isEnabled, youtubeId, hasInteracted]);

  if (!isEnabled) return null;

  return (
    <>
      {/* HTML5 Audio element for direct links & stream URLs */}
      {!isYouTube && formattedAudioUrl && (
        <audio
          ref={audioRef}
          src={formattedAudioUrl}
          loop
          preload="auto"
        />
      )}

      {/* Off-screen embedded YouTube Iframe */}
      {isYouTube && (
        <iframe
          key={youtubeId}
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=1&mute=${(isMuted || !hasInteracted) ? 1 : 0}&loop=1&playlist=${youtubeId}&controls=0`}
          allow="autoplay; encrypted-media"
          onLoad={() => {
            sendYouTubeCommand(isPlaying ? "playVideo" : "pauseVideo");
            sendYouTubeCommand((isMuted || !hasInteracted) ? "mute" : "unMute");
            sendYouTubeCommand("setVolume", [Math.round(volume * 100)]);
          }}
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none'
          }}
          title="Background YouTube Audio Player"
        />
      )}

      {/* Floating Controller Card */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Prompts to click/unmute if muted or initial page load */}
        {isEnabled && (isMuted || !hasInteracted) && (
          <button
            onClick={() => {
              sessionStorage.setItem("user_has_interacted", "true");
              setHasInteracted(true);
              setIsMuted(false);
              setIsPlaying(true);
              localStorage.setItem("ambient_audio_muted", "false");
            }}
            className="px-3.5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs tracking-wider uppercase animate-bounce cursor-pointer shadow-xl shadow-cyan-500/30 flex items-center gap-2 border border-cyan-300"
          >
            <LucideIcons.Music size={13} className="animate-spin" />
            Click to Play / Unmute Ambient Audio
          </button>
        )}

        <div className="flex items-center gap-2">
          {showControls && (
            <div
              className={`p-3 rounded-2xl border flex items-center gap-4 shadow-xl transition-all duration-300 ${
                isDarkMode 
                  ? "bg-slate-950/95 border-cyan-500/20 backdrop-blur text-white" 
                  : "bg-white/95 border-slate-200 shadow-slate-200/50 backdrop-blur text-slate-800"
              }`}
            >
              <div className="space-y-1">
                <span className={`text-[9px] uppercase tracking-widest font-bold block ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                  {isYouTube ? "YouTube Audio Stream" : "Ambient Audio Stream"}
                </span>
                <span className={`text-[10px] font-medium block truncate max-w-[140px] ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} title={rawUrl}>
                  {rawUrl.substring(rawUrl.lastIndexOf('/') + 1) || "Audio Stream"}
                </span>
              </div>

              <div className="flex items-center gap-2 border-l border-slate-800/50 pl-3">
                <button
                  onClick={handleTogglePlay}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isDarkMode ? "hover:bg-slate-900 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                  }`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <LucideIcons.Pause size={14} /> : <LucideIcons.Play size={14} />}
                </button>

                <button
                  onClick={handleToggleMute}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isDarkMode ? "hover:bg-slate-900 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <LucideIcons.VolumeX size={14} className="text-rose-400" /> : <LucideIcons.Volume2 size={14} />}
                </button>

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

          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-3 rounded-full border transition-all duration-300 cursor-pointer shadow-lg flex items-center justify-center ${
              isPlaying && !isMuted 
                ? "bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 border-cyan-400 hover:scale-105 active:scale-95 animate-pulse" 
                : isDarkMode 
                  ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200" 
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"
            }`}
            title="Toggle Background Audio Controls"
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

