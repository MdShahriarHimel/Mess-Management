/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  Shield, Search, Clock, Info, Download, FileSpreadsheet, FileText, 
  Filter, Calendar, User, Layers, Settings, Check, X, Eye, 
  RefreshCw, Globe, Terminal, ArrowRight, ShieldAlert, CheckCircle2,
  Trash2, Sliders, LayoutGrid
} from "lucide-react";
import { Member, AuditLog, RespectSenioritySettings } from "../types.js";
import { useAutoRefresh } from "../utils/AutoRefreshContext.tsx";
import { RefreshButton } from "./RefreshButton.tsx";
import { getRespectDisplayName } from "../utils/respectHelper.js";
import { getAuthToken } from "../lib/authHeader.ts";

interface AuditLogsProps {
  currentUser: Member;
  isDarkMode: boolean;
  members?: Member[];
  respectSenioritySettings?: RespectSenioritySettings;
}

interface MessOption {
  id: string;
  name: string;
  superUserId?: string;
}

export default function AuditLogs({ currentUser, isDarkMode, members = [], respectSenioritySettings }: AuditLogsProps) {
  const authToken = getAuthToken(currentUser);
  const { refreshTriggers, isModuleDisabled } = useAutoRefresh();
  // State variables
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [messes, setMesses] = useState<MessOption[]>([]);
  const [activeMessId, setActiveMessId] = useState("default");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Settings retention period
  const [retentionDays, setRetentionDays] = useState(30);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedMess, setSelectedMess] = useState("");
  const [selectedSuperUser, setSelectedSuperUser] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Audit Mode states
  const [auditMode, setAuditMode] = useState<boolean>(false);
  const [auditModeExpiresAt, setAuditModeExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isTogglingAuditMode, setIsTogglingAuditMode] = useState<boolean>(false);

  // Pagination states
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Drilldown Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Access Roles
  const isAdmin = currentUser.role === "ADMIN";
  const isSuperUser = currentUser.role === "SUPERUSER";

  // Display toast
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  // 20-minute countdown timer effect that survives page refresh
  useEffect(() => {
    if (!auditMode || !auditModeExpiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const expiryMs = new Date(auditModeExpiresAt).getTime();
      const nowMs = Date.now();
      const diffSec = Math.floor((expiryMs - nowMs) / 1000);

      if (diffSec <= 0) {
        setAuditMode(false);
        setAuditModeExpiresAt(null);
        setRemainingSeconds(0);
        setLogs([]);
        showToast("Audit Mode has expired. Viewing access is now disabled.", "error");
      } else {
        setRemainingSeconds(diffSec);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auditMode, auditModeExpiresAt]);

  const formatTimer = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "00:00";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleAuditMode = async (enabled: boolean) => {
    setIsTogglingAuditMode(true);
    try {
      const response = await fetch("/api/settings/audit-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ enabled, messId: selectedMess || activeMessId || "default" })
      });
      if (response.ok) {
        const data = await response.json();
        setAuditMode(data.auditMode);
        setAuditModeExpiresAt(data.auditModeExpiresAt);
        if (data.auditMode) {
          showToast("Audit Mode enabled for 20 minutes.", "success");
          triggerFetchLogs();
        } else {
          setLogs([]);
          showToast("Audit Mode disabled by Administrator.", "success");
        }
      } else {
        const err = await response.json();
        showToast(err.error || "Failed to toggle Audit Mode.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error toggling Audit Mode.", "error");
    } finally {
      setIsTogglingAuditMode(false);
    }
  };

  // Fetch audit logs with query params and pagination
  const fetchLogs = async (isAppend = false, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const currentOffset = isAppend ? offset + limit : 0;
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (selectedRole) queryParams.append("userRole", selectedRole);
      if (selectedModule) queryParams.append("module", selectedModule);
      if (selectedMess) queryParams.append("messId", selectedMess);
      if (selectedSuperUser) queryParams.append("superUserId", selectedSuperUser);

      // Add pagination params
      queryParams.append("limit", limit.toString());
      queryParams.append("offset", currentOffset.toString());

      const url = `/api/auditlogs?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${authToken}` },
        signal
      });
      if (response.ok) {
        const data = await response.json();
        const isModeActive = !!data.auditMode;
        setAuditMode(isModeActive);
        setAuditModeExpiresAt(data.auditModeExpiresAt || null);

        if (!isModeActive) {
          setLogs([]);
          setHasMore(false);
        } else {
          const newLogs = data.auditLogs || [];
          if (isAppend) {
            setLogs(prev => [...prev, ...newLogs]);
            setOffset(currentOffset);
          } else {
            setLogs(newLogs);
            setOffset(0);
          }
          setHasMore(newLogs.length >= limit);
        }
      } else {
        console.error("Failed to fetch logs");
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Fetch aborted");
        return;
      }
      console.error(e);
    } finally {
      if (!signal || !signal.aborted) {
        setLoading(false);
      }
    }
  };

  const triggerFetchLogs = async (isAppend = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    await fetchLogs(isAppend, controller.signal);
  };

  // Fetch messes list (Admin only)
  const fetchMesses = async () => {
    if (!isAdmin && !isSuperUser) return;
    try {
      const response = await fetch("/api/admin/messes", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMesses(data.messes || []);
        setActiveMessId(data.activeMessId || "default");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch settings for retention days
  const fetchSettings = async () => {
    if (!isAdmin) return;
    try {
      const response = await fetch("/api/settings", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.auditRetentionDays) {
          setRetentionDays(data.auditRetentionDays);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update retention days
  const handleSaveRetention = async (days: number) => {
    setSettingsLoading(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ auditRetentionDays: days })
      });
      if (response.ok) {
        setRetentionDays(days);
        showToast(`Retention period updated to ${days} Days. Older logs deleted safely.`, "success");
        triggerFetchLogs();
      } else {
        const err = await response.json();
        showToast(err.error || "Failed to save retention settings.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error. Failed to save settings.", "error");
    } finally {
      setSettingsLoading(false);
    }
  };

  const isFirstMount = useRef(true);

  // Mount-only init for messes and settings
  useEffect(() => {
    fetchMesses();
    fetchSettings();
  }, []);

  // Debounced filters fetch
  useEffect(() => {
    if (isModuleDisabled("auditLog")) return;

    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      triggerFetchLogs(false);
    }, 300); // ≈300 ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [startDate, endDate, selectedRole, selectedModule, selectedMess, selectedSuperUser]);

  // Refresh trigger (on manual refresh or initial mount)
  useEffect(() => {
    if (isModuleDisabled("auditLog")) return;
    triggerFetchLogs(false);
  }, [refreshTriggers.auditLog]);

  // Client-side search filters combined with API results
  const filteredLogs = logs.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.userName || "").toLowerCase().includes(term) ||
      (l.action || "").toLowerCase().includes(term) ||
      (l.reason || "").toLowerCase().includes(term) ||
      (l.description || "").toLowerCase().includes(term) ||
      (l.id || "").toLowerCase().includes(term)
    );
  });

  // Export to CSV/Excel
  const handleExportCSV = async () => {
    if (filteredLogs.length === 0) {
      showToast("No records available to export.", "error");
      return;
    }
    try {
      // 1. Log export action to backend
      await fetch("/api/auditlogs/log-export", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ format: "csv", reason: `Exported ${filteredLogs.length} audit logs as CSV file.` })
      });

      // 2. Build CSV contents
      const headers = ["Audit ID", "Timestamp", "Operator Name", "Operator Role", "Action", "Module", "Mess Scope", "Super User", "Old Value", "New Value", "Reason Statement", "Browser Agent", "IP Address"];
      const csvRows = [headers.join(",")];

      filteredLogs.forEach(log => {
        const row = [
          `"${log.id}"`,
          `"${new Date(log.timestamp).toLocaleString()}"`,
          `"${log.userName}"`,
          `"${log.userRole || 'UNKNOWN'}"`,
          `"${log.action}"`,
          `"${log.module || 'OTHER'}"`,
          `"${log.messId || 'default'}"`,
          `"${log.superUserId || 'system_superuser'}"`,
          `"${(log.oldValue || '').replace(/"/g, '""')}"`,
          `"${(log.newValue || '').replace(/"/g, '""')}"`,
          `"${(log.reason || '').replace(/"/g, '""')}"`,
          `"${(log.browser || 'Unknown').replace(/"/g, '""')}"`,
          `"${log.ipAddress || 'Unknown'}"`
        ];
        csvRows.push(row.join(","));
      });

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `mess_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Audit Trail successfully exported to Excel format.", "success");
      triggerFetchLogs(); // refresh logs to record this export log
    } catch (err) {
      console.error(err);
      showToast("Failed to export Excel file.", "error");
    }
  };

  // Export to Printable PDF view
  const handleExportPDF = async () => {
    if (filteredLogs.length === 0) {
      showToast("No records available to print.", "error");
      return;
    }
    try {
      // Log export action to backend
      await fetch("/api/auditlogs/log-export", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ format: "pdf", reason: `Printed/Exported ${filteredLogs.length} audit logs as PDF.` })
      });

      // Simple, beautiful standard print invocation
      window.print();
      showToast("PDF print window triggered successfully.", "success");
      triggerFetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedModule("");
    setSelectedRole("");
    setSelectedMess("");
    setSelectedSuperUser("");
    setStartDate("");
    setEndDate("");
    showToast("Filters successfully cleared.", "success");
  };

  // Filter out unique super users from the members list
  const superUsersList = members.filter(m => m.role === "SUPERUSER");

  // ERP modules list
  const erpModules = [
    { value: "AUTH", label: "Authentication & Login" },
    { value: "MEMBERS", label: "Members Management" },
    { value: "MANAGER", label: "Manager Controls" },
    { value: "MEALS", label: "Meals Tracking" },
    { value: "MEAL_CONFIG", label: "Meal Configs" },
    { value: "MARKET", label: "Bazaar & Expenses" },
    { value: "BILLS", label: "Utility Bills" },
    { value: "DEPOSITS", label: "Member Deposits" },
    { value: "DUTIES", label: "Task Duties" },
    { value: "NOTIFICATIONS", label: "Notices & Broadcasts" },
    { value: "REPORTS", label: "Reports & Exports" },
    { value: "SETTINGS", label: "System Settings" },
    { value: "PERMISSIONS", label: "Admin Permissions" }
  ];

  // Roles list
  const erpRoles = ["ADMIN", "SUPERUSER", "ASSISTANT_SUPERUSER", "MANAGER", "PARTIAL_MANAGER", "MEMBER"];

  return (
    <div className="space-y-6 relative print:p-0 print:space-y-4" id="audit-logs-wrapper">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-xl animate-bounce ${
          toast.type === "success" 
            ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/30" 
            : "bg-rose-950/90 text-rose-300 border-rose-500/30"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="text-emerald-400 shrink-0" size={18} /> : <ShieldAlert className="text-rose-400 shrink-0" size={18} />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Print only Report Header */}
      <div className="hidden print:block border-b border-slate-300 pb-4 text-slate-800">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bangladesh Cooperative Mess ERP</h1>
            <p className="text-sm text-slate-500">Immutable Audit Log Certificate Report</p>
          </div>
          <div className="text-right text-xs">
            <p><strong>Printed By:</strong> {currentUser.name} ({currentUser.role})</p>
            <p><strong>Print Date:</strong> {new Date().toLocaleString()}</p>
            <p><strong>Filter Scope:</strong> {logs.length} logged events</p>
          </div>
        </div>
      </div>

      {/* Primary Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-2.5 text-gray-900 dark:text-white">
            <Shield className="text-cyan-500 animate-pulse shrink-0" size={26} />
            Production-Grade Audit Trail
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Securely tracking organization-wide compliance logs, user sessions, and ERP configuration modifications.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {auditMode ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Audit Mode ON</span>
              <span className="text-cyan-300 ml-1">[{formatTimer(remainingSeconds)}]</span>
              {(isAdmin || isSuperUser) && (
                <button
                  onClick={() => handleToggleAuditMode(false)}
                  disabled={isTogglingAuditMode}
                  className="ml-2 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-sans border border-rose-500/40 cursor-pointer"
                >
                  Turn OFF
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Audit Mode OFF</span>
              {(isAdmin || isSuperUser) && (
                <button
                  onClick={() => handleToggleAuditMode(true)}
                  disabled={isTogglingAuditMode}
                  className="ml-2 px-2.5 py-0.5 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-[10px] font-sans font-bold cursor-pointer transition-all"
                >
                  Enable (20 min)
                </button>
              )}
            </div>
          )}

          <RefreshButton 
            module="auditLog" 
            onRefresh={async () => {
              await triggerFetchLogs();
            }}
          />
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              isFilterExpanded 
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" 
                : "bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-cyan-500/10 text-slate-600 dark:text-slate-300 hover:border-cyan-500/30"
            }`}
          >
            <Filter size={14} />
            Advanced Filters
            { (selectedModule || selectedRole || selectedMess || selectedSuperUser || startDate || endDate) && (
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            )}
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-orange-500/10 active:scale-95"
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-cyan-500/10 active:scale-95"
          >
            <FileText size={14} />
            Export PDF / Print
          </button>
        </div>
      </div>

      {/* SECURITY BANNER */}
      <div className="p-4 rounded-xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/10 dark:border-cyan-500/20 flex items-start gap-3 text-xs text-slate-600 dark:text-cyan-400 print:hidden shadow-sm">
        <Info size={16} className="shrink-0 text-cyan-500 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">CYAN COMPLIANCE ACTIVE:</p>
          <p className="leading-relaxed text-slate-500 dark:text-slate-300 text-[11px]">
            To comply with national financial accountability regulations, all transactional actions, password resets, and admin reconfigurations produce immutable cryptographic audit entries. These trails cannot be altered or purged. Admin-configured retention rules run background automatic garbage collection safely.
          </p>
        </div>
      </div>

      {/* CONFIGURATION & SYSTEM STATS (Admin Only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden" id="admin-configs-panel">
          
          {/* Retention Configuration Card */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDarkMode ? "bg-slate-900/60 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings size={13} className="text-orange-500" />
                  Retention Policy
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">Automatic cleanup of log archives.</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse">
                Auto-Cleanup Active
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <select
                value={retentionDays}
                onChange={(e) => handleSaveRetention(Number(e.target.value))}
                disabled={settingsLoading}
                className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDarkMode ? "bg-slate-950 border-cyan-500/20 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <option value={30}>30 Days (Standard)</option>
                <option value={60}>60 Days (Extended)</option>
                <option value={90}>90 Days (Quarterly)</option>
                <option value={180}>180 Days (Semi-Annual)</option>
                <option value={365}>365 Days (Annual)</option>
              </select>
              {settingsLoading && (
                <RefreshCw className="text-cyan-500 animate-spin shrink-0" size={14} />
              )}
            </div>
          </div>

          {/* Quick Stats: Logs Volume */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDarkMode ? "bg-slate-900/60 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={13} className="text-cyan-400" />
                Active Scope Logs
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">Volume under filtered criteria.</p>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-cyan-400">{filteredLogs.length}</span>
              <span className="text-[10px] text-slate-500">out of {logs.length} total</span>
            </div>
          </div>

          {/* Active Mess Connection Info */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDarkMode ? "bg-slate-900/60 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe size={13} className="text-emerald-400" />
                Active Database Context
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">Switched dynamic ERP branch connection.</p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                {activeMessId === "default" ? "Ababil Mess (Main)" : `Mess Scope ID: ${activeMessId}`}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* FILTER DRAWER / CONTROLS (EXPANDABLE) */}
      <div className={`p-4 rounded-xl border print:hidden transition-all duration-200 ${
        isFilterExpanded ? "block" : "hidden"
      } ${
        isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
      }`}>
        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-cyan-500/10 mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Sliders size={14} className="text-cyan-500" />
            Audit Criteria Filters
          </h3>
          <button 
            onClick={handleResetFilters}
            className="text-[10px] font-bold text-orange-400 hover:text-orange-500 flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Module Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ERP Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDarkMode ? "bg-slate-950 border-cyan-500/20 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <option value="">All Modules</option>
              {erpModules.map(mod => (
                <option key={mod.value} value={mod.value}>{mod.label}</option>
              ))}
            </select>
          </div>

          {/* Role Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operator Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDarkMode ? "bg-slate-950 border-cyan-500/20 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <option value="">All Roles</option>
              {erpRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Mess Selection (Admin Only) */}
          {isAdmin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mess Scope</label>
              <select
                value={selectedMess}
                onChange={(e) => setSelectedMess(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDarkMode ? "bg-slate-950 border-cyan-500/20 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <option value="">All Messes (Global)</option>
                {messes.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Super User Selection (Admin Only) */}
          {isAdmin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Super User Account</label>
              <select
                value={selectedSuperUser}
                onChange={(e) => setSelectedSuperUser(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDarkMode ? "bg-slate-950 border-cyan-500/20 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <option value="">All Super Users</option>
                {superUsersList.map(su => (
                  <option key={su.id} value={su.id}>{su.name} (@{getRespectDisplayName(currentUser, su, respectSenioritySettings)})</option>
                ))}
              </select>
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-500/40" size={13} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDarkMode ? "bg-slate-950 border-cyan-500/20 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-500/40" size={13} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDarkMode ? "bg-slate-950 border-cyan-500/20 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}
              />
            </div>
          </div>

        </div>
      </div>

      {!auditMode ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 my-6 print:hidden">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-rose-400 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-base sm:text-lg font-bold font-display text-white">
              Audit access is currently disabled by Administrator.
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Audit logs are disabled by default for every mess. An Administrator must explicitly enable 20-minute temporary Audit Mode access in the ERP Control Panel to view audit records.
            </p>
          </div>
          {(isAdmin || isSuperUser) && (
            <div className="pt-2">
              <button
                onClick={() => handleToggleAuditMode(true)}
                disabled={isTogglingAuditMode}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/10 flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                <Shield size={16} />
                {isTogglingAuditMode ? "Enabling..." : "Enable Audit Mode (20 min)"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* QUICK SEARCH BAR */}
          <div className="relative max-w-lg print:hidden">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
            <input
              id="audit-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter logs dynamically by operator nickname, action tag, or reason..."
              className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                isDarkMode 
                  ? "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500" 
                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
              }`}
            />
          </div>

          {/* AUDIT LIST PANEL TABLE */}
          <div className={`p-5 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`} id="audit-logs-panel">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="text-cyan-400 animate-spin" size={24} />
                  <span className="text-xs text-slate-500">Querying cryptographic ledger...</span>
                </div>
              ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDarkMode ? "bg-slate-950/30 border-slate-850 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"} font-bold`}>
                  <th className="py-3 px-4">Ledger Timestamp</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 print:hidden">Audit ID</th>
                  <th className="py-3 px-4 print:table-cell">Details / Statement</th>
                  <th className="py-3 px-4 text-center print:hidden">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/5 font-mono text-[11px]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">No matching immutable audit records located in this cryptographic database scope.</td>
                  </tr>
                ) : (
                  filteredLogs.map((l) => {
                    const isUltimateAdminLog = l.userName.toLowerCase() === "mdshahriarhimel" || 
                                               l.userName.toLowerCase() === "mdshahriarhimel@gmail.com";
                    
                    const logTime = new Date(l.timestamp).getTime();
                    const isRecent = (Date.now() - logTime) < 24 * 60 * 60 * 1000;
                    
                    const rowClass = (isRecent && !isUltimateAdminLog)
                      ? (isDarkMode ? "bg-amber-500/5 border-l-2 border-amber-500 hover:bg-amber-500/10 transition-all duration-150" : "bg-amber-50/50 border-l-2 border-amber-400 hover:bg-amber-100/50 transition-all duration-150")
                      : "hover:bg-cyan-500/5 transition-all duration-150 cursor-pointer";

                    return (
                      <tr 
                        key={l.id} 
                        className={rowClass}
                        onClick={() => setSelectedLog(l)}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} className="text-cyan-500/60" />
                            <span>{new Date(l.timestamp).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400">({new Date(l.timestamp).toLocaleTimeString()})</span>
                            {isRecent && !isUltimateAdminLog && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-500/20 text-amber-500 animate-pulse print:hidden">Recent</span>
                            )}
                          </div>
                        </td>

                        {/* Operator */}
                        <td className="py-3 px-4 font-bold text-cyan-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User size={11} className="text-cyan-500/60" />
                            <span>{l.userName}</span>
                            <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">[{l.userRole || "MEMBER"}]</span>
                          </div>
                        </td>

                        {/* Action tag */}
                        <td className="py-3 px-4 font-bold text-orange-400 whitespace-nowrap">
                          {l.actionType || l.action}
                        </td>

                        {/* Category Module */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/10">
                            {l.module || "OTHER"}
                          </span>
                        </td>

                        {/* ID */}
                        <td className="py-3 px-4 text-slate-500 font-mono text-[9px] print:hidden max-w-[80px] truncate" title={l.id}>
                          {l.id}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4 text-slate-300 dark:text-slate-200 max-w-xs truncate" title={l.description || l.reason}>
                          {l.description || l.reason}
                        </td>

                        {/* Interactive Inspect Column */}
                        <td className="py-3 px-4 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedLog(l)}
                            className="p-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-all"
                            title="Inspect complete metadata block"
                          >
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination / Load More button */}
        {hasMore && filteredLogs.length > 0 && !loading && (
          <div className="mt-6 pt-4 border-t border-cyan-500/5 flex justify-center pb-2">
            <button
              onClick={() => triggerFetchLogs(true)}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 ${
                isDarkMode 
                  ? "bg-slate-900 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/40" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <RefreshCw size={12} className="shrink-0" />
              Load More Audit Records
            </button>
          </div>
        )}
      </div>
        </>
      )}

      {/* DETAIL INSPECTION MODAL (DRILLDOWN OVERLAY) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm print:hidden">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode ? "bg-slate-900 border-cyan-500/20 text-white" : "bg-white border-slate-200 text-slate-800"
          }`}>
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-cyan-500/10 bg-slate-100 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <Shield className="text-cyan-400" size={18} />
                <h3 className="text-sm font-bold font-display uppercase tracking-widest text-slate-800 dark:text-cyan-300">
                  Cryptographic Log Inspector
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh] text-xs font-sans">
              
              {/* General details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 dark:border-cyan-500/10 pb-4">
                
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Log ID Identifier</p>
                  <p className="font-mono bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded text-[11px] text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-cyan-500/5 select-all">
                    {selectedLog.id}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exact Timestamp</p>
                  <p className="font-mono bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded text-[11px] text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-cyan-500/5">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operator Identity</p>
                  <div className="flex items-center gap-2 font-mono bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded text-[11px] text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-cyan-500/5">
                    <strong>{selectedLog.userName}</strong>
                    <span className="text-[10px] text-cyan-400">({selectedLog.userRole || "UNKNOWN"})</span>
                    <span className="text-[9px] text-slate-500">ID: {selectedLog.userId}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scope Context</p>
                  <div className="flex items-center gap-2 font-mono bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded text-[11px] text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-cyan-500/5">
                    <span>Mess: <strong>{selectedLog.messId || "default"}</strong></span>
                    <span>|</span>
                    <span>SuperUser: <strong>{selectedLog.superUserId || "system"}</strong></span>
                  </div>
                </div>

              </div>

              {/* Action and description block */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                    {selectedLog.module || "OTHER"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-orange-500/15 text-orange-400 border border-orange-500/20">
                    {selectedLog.actionType || selectedLog.action}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action Statement</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {selectedLog.description || selectedLog.reason}
                  </p>
                </div>
              </div>

              {/* Old vs New Values Diff */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ERP State Transition Values</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Previous State */}
                  <div className="rounded-xl border border-rose-500/10 dark:border-rose-500/20 bg-rose-500/5 p-3">
                    <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mb-1.5">Previous State / Old Value</p>
                    <pre className="font-mono text-[10px] text-rose-300/90 whitespace-pre-wrap break-all bg-slate-950/40 p-2 rounded-lg max-h-36 overflow-y-auto">
                      {selectedLog.oldValue || "None"}
                    </pre>
                  </div>

                  {/* New State */}
                  <div className="rounded-xl border border-emerald-500/10 dark:border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Updated State / New Value</p>
                    <pre className="font-mono text-[10px] text-emerald-300/90 whitespace-pre-wrap break-all bg-slate-950/40 p-2 rounded-lg max-h-36 overflow-y-auto">
                      {selectedLog.newValue || "None"}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Technical context footer */}
              <div className="border-t border-slate-200 dark:border-cyan-500/10 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Globe size={11} className="text-cyan-500/60" />
                  <span className="text-slate-500">Client IP Address:</span>
                  <span className="text-slate-300 font-semibold">{selectedLog.ipAddress || "Unknown"}</span>
                </div>
                <div className="flex items-start gap-1.5 col-span-1 sm:col-span-2">
                  <Globe size={11} className="text-cyan-500/60 mt-0.5" />
                  <span className="text-slate-500 shrink-0">Client User Agent:</span>
                  <span className="text-slate-300 leading-normal break-all">{selectedLog.browser || "Unknown"}</span>
                </div>
              </div>

            </div>

            {/* Footer close bar */}
            <div className="px-6 py-4 bg-slate-100 dark:bg-slate-950/50 border-t border-slate-200 dark:border-cyan-500/10 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold flex items-center gap-2 transition-all shadow-md shadow-cyan-500/10 active:scale-95"
              >
                Inspect Complete
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
