import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
import { useAutoRefresh, RefreshModule } from "../utils/AutoRefreshContext";

interface RefreshButtonProps {
  module: RefreshModule;
  onRefresh?: () => Promise<void> | void;
  className?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ module, onRefresh, className = "" }) => {
  const { refreshModule } = useAutoRefresh();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      refreshModule(module);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setTimeout(() => setLoading(false), 800); // Gentle duration to let spin animate beautifully
    }
  };

  return (
    <button
      id={`refresh-btn-${module}`}
      onClick={handleRefresh}
      disabled={loading}
      className={`p-2 px-3 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-[11px] font-bold tracking-wide uppercase ${className}`}
      title="Refresh Data"
    >
      <LucideIcons.RefreshCw size={12} className={loading ? "animate-spin text-cyan-400" : ""} />
      <span>{loading ? "Refreshing..." : "Refresh"}</span>
    </button>
  );
};
