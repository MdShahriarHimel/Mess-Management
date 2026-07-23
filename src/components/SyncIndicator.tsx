import React, { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";

export const SyncIndicator: React.FC = () => {
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

  if (status === "Idle") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-900/50 px-2 py-1 rounded-md border border-slate-800">
        <LucideIcons.CheckCircle2 size={14} className="text-emerald-400" />
        <span>Synced</span>
      </div>
    );
  }

  if (status === "Pending") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-900/20 px-2 py-1 rounded-md border border-amber-800/50">
        <LucideIcons.Clock size={14} />
        <span>Saving...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 bg-cyan-900/20 px-2 py-1 rounded-md border border-cyan-800/50">
      <LucideIcons.RefreshCw size={14} className="animate-spin" />
      <span>Syncing</span>
    </div>
  );
};
