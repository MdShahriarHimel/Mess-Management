import React, { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";

interface SyncIndicatorProps {
  className?: string;
  compact?: boolean;
}

// Custom event dispatchers for immediate client-side sync indicators
export function triggerSyncStart() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:sync-start"));
  }
}

export function triggerSyncEnd() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:sync-end"));
  }
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ className = "", compact = false }) => {
  const [serverStatus, setServerStatus] = useState<"Idle" | "Syncing" | "Pending">("Idle");
  const [isLocalSyncing, setIsLocalSyncing] = useState<boolean>(false);
  const [justCompleted, setJustCompleted] = useState<boolean>(false);

  // Hook into client-side sync events from user actions
  useEffect(() => {
    let activeCount = 0;
    let finishTimer: any = null;

    const onStart = () => {
      activeCount++;
      setIsLocalSyncing(true);
      setJustCompleted(false);
    };

    const onEnd = () => {
      activeCount = Math.max(0, activeCount - 1);
      if (activeCount === 0) {
        clearTimeout(finishTimer);
        finishTimer = setTimeout(() => {
          setIsLocalSyncing(false);
          setJustCompleted(true);
          setTimeout(() => setJustCompleted(false), 2000);
        }, 800);
      }
    };

    window.addEventListener("app:sync-start", onStart);
    window.addEventListener("app:sync-end", onEnd);

    return () => {
      window.removeEventListener("app:sync-start", onStart);
      window.removeEventListener("app:sync-end", onEnd);
      clearTimeout(finishTimer);
    };
  }, []);

  // Check server sync status once on mount without continuous network polling
  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/sync-status");
        if (res.ok && mounted) {
          const data = await res.json();
          setServerStatus(data.status);
        }
      } catch (e) {
        // Silently ignore
      }
    };

    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const isSyncingActive = isLocalSyncing || serverStatus === "Syncing" || serverStatus === "Pending";

  const sizeClass = compact ? "text-[11px] px-2 py-0.5 gap-1.5" : "text-xs px-2.5 py-1 gap-2";
  const iconSize = compact ? 13 : 15;

  if (isSyncingActive) {
    return (
      <div 
        title="ডেটাবেজ ও ক্লাউড সিঙ্ক হচ্ছে..."
        className={`relative flex items-center font-bold tracking-wide rounded-full border transition-all duration-300 ${sizeClass} 
          bg-gradient-to-r from-cyan-950/90 via-sky-900/90 to-blue-950/90
          text-cyan-200 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.75)]
          ring-2 ring-cyan-400/50 backdrop-blur-md cursor-default select-none animate-pulse ${className}`}
        style={{
          boxShadow: "0 0 16px rgba(6, 182, 212, 0.75), inset 0 0 8px rgba(6, 182, 212, 0.3)"
        }}
      >
        {/* Animated Glowing Radar Ping */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300 shadow-[0_0_8px_#22d3ee]"></span>
        </span>

        {/* Continuously Rotating Spinning Icon */}
        <LucideIcons.RefreshCw 
          size={iconSize} 
          className="animate-spin text-cyan-300 shrink-0 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]" 
          style={{ animationDuration: "1s" }}
        />

        <span className="truncate font-semibold tracking-wider uppercase text-[10px] text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
          {serverStatus === "Pending" ? "Saving..." : "Syncing..."}
        </span>
      </div>
    );
  }

  if (justCompleted) {
    return (
      <div 
        title="সিঙ্ক সম্পন্ন হয়েছে"
        className={`flex items-center font-medium rounded-full border transition-all duration-500 ${sizeClass}
          bg-emerald-950/60 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)] backdrop-blur-sm ${className}`}
      >
        <LucideIcons.CheckCircle2 size={iconSize} className="text-emerald-400 shrink-0 drop-shadow-[0_0_4px_#34d399]" />
        <span className="truncate font-semibold text-[10px] uppercase tracking-wider text-emerald-200">Synced!</span>
      </div>
    );
  }

  // Idle state: Clean, unobtrusive, readable on any theme
  return (
    <div 
      title="সব ডেটা ক্লাউডের সাথে সিঙ্কড আছে"
      className={`flex items-center font-medium rounded-full border transition-all duration-300 ${sizeClass} 
        bg-slate-900/60 dark:bg-slate-900/60 light:bg-white/80 border-slate-700/60 dark:border-slate-800 text-slate-300 dark:text-slate-300 light:text-slate-700
        hover:border-cyan-500/50 backdrop-blur-sm ${className}`}
    >
      <LucideIcons.CheckCircle2 size={iconSize} className="text-emerald-400 shrink-0" />
      <span className="truncate text-[10px] uppercase tracking-wider text-slate-300/90 font-medium">Synced</span>
    </div>
  );
};

