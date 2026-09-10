import React, { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";

interface SyncIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ className = "", compact = false }) => {
  const [status, setStatus] = useState<"Idle" | "Syncing" | "Pending">("Idle");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/sync-status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
        }
      } catch (e) {
        // Handle error silently
      }
    };

    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const sizeClass = compact ? "text-[11px] px-1.5 py-0.5 gap-1" : "text-xs px-2 py-1 gap-1.5";
  const iconSize = compact ? 12 : 14;

  if (status === "Idle") {
    return (
      <div 
        title="Database status: All changes synced to cloud"
        className={`flex items-center font-medium rounded-md border transition-all ${sizeClass} bg-slate-900/60 border-slate-800 text-slate-300 ${className}`}
      >
        <LucideIcons.CheckCircle2 size={iconSize} className="text-emerald-400 shrink-0" />
        <span className="truncate">Synced</span>
      </div>
    );
  }

  if (status === "Pending") {
    return (
      <div 
        title="Database status: Saving changes to cloud"
        className={`flex items-center font-medium rounded-md border transition-all ${sizeClass} bg-amber-950/40 border-amber-800/60 text-amber-300 ${className}`}
      >
        <LucideIcons.Clock size={iconSize} className="text-amber-400 shrink-0" />
        <span className="truncate">Saving...</span>
      </div>
    );
  }

  return (
    <div 
      title="Database status: Syncing with cloud database"
      className={`flex items-center font-medium rounded-md border transition-all ${sizeClass} bg-cyan-950/40 border-cyan-800/60 text-cyan-300 ${className}`}
    >
      <LucideIcons.RefreshCw size={iconSize} className="animate-spin text-cyan-400 shrink-0" />
      <span className="truncate">Syncing</span>
    </div>
  );
};

