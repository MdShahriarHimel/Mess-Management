/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Settings, 
  Users, 
  Activity, 
  AlertTriangle, 
  Bell, 
  Database, 
  Cpu, 
  TrendingUp, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Search, 
  CornerDownRight, 
  DollarSign, 
  Flame, 
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle,
  AlertOctagon,
  X,
  HelpCircle,
  FileText
} from "lucide-react";
import { Member } from "../types.js";

interface FounderConsoleProps {
  currentUser: Member;
  isDarkMode: boolean;
  t: (key: string) => string;
  onRefreshPlatformStatus: () => void;
}

export default function FounderConsole({ currentUser, isDarkMode, t, onRefreshPlatformStatus }: FounderConsoleProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "dashboard" | "maintenance" | "announcements" | "flags" | "storage" | "gemini" | "analytics" | "owners" | "logs"
  >("dashboard");

  // Core configuration states
  const [controls, setControls] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Storage metrics
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Gemini statistics
  const [geminiStatus, setGeminiStatus] = useState<any>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Platform analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsSearch, setLogsSearch] = useState("");

  // New announcement form state
  const [newAnn, setNewAnn] = useState({
    title: "",
    content: "",
    type: "info", // info, success, warning, danger, emergency, maintenance
    displayMethod: "top-banner", // full-screen, top-banner, bottom-banner, dashboard-notice, login-screen
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    priority: "medium", // high, medium, low
    dismissible: true,
    target: "everyone", // everyone, premium, mess, users
    targetMessId: "",
    targetUserIds: ""
  });

  // Transfer ownership state
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerRole, setNewOwnerRole] = useState("Future Co-Founder");
  const [transferConfirm, setTransferConfirm] = useState(false);

  // General Notification Banner within console
  const [banner, setBanner] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const getHeaders = () => {
    const token = sessionStorage.getItem("mess_token") || localStorage.getItem("mess_token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  };

  // Load platform controls
  const loadControls = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/founder/controls", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setControls(data);
      } else {
        showBanner("Failed to load platform controls. Verify you are an owner.", "error");
      }
    } catch (err) {
      showBanner("Failed to fetch server controls.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadControls();
  }, []);

  const showBanner = (message: string, type: "success" | "error" = "success") => {
    setBanner({ message, type });
    setTimeout(() => setBanner(null), 5000);
  };

  // Save general controls
  const handleSaveControls = async (updatedControls = controls) => {
    setSaveLoading(true);
    try {
      const res = await fetch("/api/founder/controls", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(updatedControls)
      });
      if (res.ok) {
        const data = await res.json();
        setControls(data.controls);
        showBanner("Platform controls saved successfully!", "success");
        onRefreshPlatformStatus(); // Propagate status updates to parent App layout
      } else {
        const errData = await res.json();
        showBanner(errData.error || "Failed to save controls.", "error");
      }
    } catch (err) {
      showBanner("Error saving platform controls.", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Fetch Storage / DB Status
  const fetchDbStatus = async () => {
    setDbLoading(true);
    try {
      const res = await fetch("/api/founder/db-status", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
        showBanner("Database and storage metrics loaded on-demand.", "success");
      } else {
        showBanner("Failed to retrieve storage metrics.", "error");
      }
    } catch (e) {
      showBanner("Failed to fetch storage API.", "error");
    } finally {
      setDbLoading(false);
    }
  };

  // Fetch Gemini dashboard analytics
  const fetchGeminiStatus = async () => {
    setGeminiLoading(true);
    try {
      const res = await fetch("/api/founder/gemini-status", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGeminiStatus(data);
        showBanner("Gemini analytics refreshed successfully.", "success");
      } else {
        showBanner("Failed to retrieve Gemini stats.", "error");
      }
    } catch (e) {
      showBanner("Failed to fetch Gemini stats API.", "error");
    } finally {
      setGeminiLoading(false);
    }
  };

  // Fetch Platform Analytics
  const fetchPlatformAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/founder/platform-analytics", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
        showBanner("Platform analytics compiled successfully.", "success");
      } else {
        showBanner("Failed to compile analytics.", "error");
      }
    } catch (e) {
      showBanner("Failed to fetch analytics API.", "error");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch Founder Audit Logs
  const fetchAuditLogs = async (searchQuery = logsSearch) => {
    setLogsLoading(true);
    try {
      const url = searchQuery 
        ? `/api/founder/audit-logs?query=${encodeURIComponent(searchQuery)}` 
        : "/api/founder/audit-logs";
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      } else {
        showBanner("Failed to load audit logs.", "error");
      }
    } catch (e) {
      showBanner("Failed to fetch founder audit logs.", "error");
    } finally {
      setLogsLoading(false);
    }
  };

  // Load contextual subtab data lazily (high performance)
  useEffect(() => {
    if (activeSubTab === "storage" && !dbStatus) {
      fetchDbStatus();
    } else if (activeSubTab === "gemini" && !geminiStatus) {
      fetchGeminiStatus();
    } else if (activeSubTab === "analytics" && !analytics) {
      fetchPlatformAnalytics();
    } else if (activeSubTab === "logs") {
      fetchAuditLogs();
    }
  }, [activeSubTab]);

  // Handle Feature Flag toggles
  const handleFeatureFlagToggle = (key: string) => {
    const updated = {
      ...controls,
      featureFlags: {
        ...controls.featureFlags,
        [key]: !controls.featureFlags[key]
      }
    };
    setControls(updated);
    handleSaveControls(updated);
  };

  // Create new Announcement
  const handleAddAnnouncement = () => {
    if (!newAnn.title || !newAnn.content) {
      showBanner("Please fill in both the Title and Content for the announcement.", "error");
      return;
    }

    const ann = {
      id: "ann_" + Math.random().toString(36).substring(2, 11),
      ...newAnn,
      dismissible: newAnn.dismissible === true
    };

    const updated = {
      ...controls,
      announcements: [ann, ...(controls.announcements || [])]
    };

    setControls(updated);
    handleSaveControls(updated);

    // Reset Form
    setNewAnn({
      title: "",
      content: "",
      type: "info",
      displayMethod: "top-banner",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      priority: "medium",
      dismissible: true,
      target: "everyone",
      targetMessId: "",
      targetUserIds: ""
    });
  };

  // Delete Announcement
  const handleDeleteAnnouncement = (id: string) => {
    const updated = {
      ...controls,
      announcements: (controls.announcements || []).filter((a: any) => a.id !== id)
    };
    setControls(updated);
    handleSaveControls(updated);
  };

  // Add Co-Founder or Transfer Owner
  const handleAddOwner = async () => {
    if (!newOwnerEmail || !newOwnerEmail.includes("@")) {
      showBanner("Please specify a valid Gmail/email address.", "error");
      return;
    }

    const exists = controls.owners.some((o: any) => o.email.toLowerCase() === newOwnerEmail.toLowerCase());
    if (exists) {
      showBanner("This user is already a Platform Owner.", "error");
      return;
    }

    const updatedOwners = [
      ...controls.owners,
      { email: newOwnerEmail.toLowerCase().trim(), role: newOwnerRole }
    ];

    try {
      const res = await fetch("/api/founder/transfer-ownership", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ owners: updatedOwners })
      });

      if (res.ok) {
        const data = await res.json();
        setControls({ ...controls, owners: data.owners });
        setNewOwnerEmail("");
        setNewOwnerRole("Future Co-Founder");
        showBanner("Platform owner roster updated successfully!", "success");
        onRefreshPlatformStatus();
      } else {
        showBanner("Failed to transfer platform ownership.", "error");
      }
    } catch (err) {
      showBanner("Error updating owners list.", "error");
    }
  };

  // Remove Owner
  const handleRemoveOwner = async (email: string) => {
    if (controls.owners.length <= 1) {
      showBanner("You must keep at least one Platform Owner to prevent administrative lockouts.", "error");
      return;
    }

    const updatedOwners = controls.owners.filter((o: any) => o.email.toLowerCase() !== email.toLowerCase());

    try {
      const res = await fetch("/api/founder/transfer-ownership", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ owners: updatedOwners })
      });

      if (res.ok) {
        const data = await res.json();
        setControls({ ...controls, owners: data.owners });
        showBanner("Owner removed from access list successfully.", "success");
        onRefreshPlatformStatus();
      } else {
        showBanner("Failed to update access list.", "error");
      }
    } catch (err) {
      showBanner("Error updating owners list.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="animate-spin text-cyan-400" size={32} />
        <p className="text-sm font-mono text-slate-400">Loading secure platform configurations...</p>
      </div>
    );
  }

  const platformStatuses = [
    { value: "Operational", label: "🟢 Operational", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { value: "Scheduled Maintenance", label: "🟡 Scheduled Maintenance", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    { value: "Partial Outage", label: "🟠 Partial Outage", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    { value: "Emergency Maintenance", label: "🔴 Emergency Maintenance", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
    { value: "Database Upgrade", label: "🔵 Database Upgrade", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { value: "AI Service Limited", label: "🟣 AI Service Limited", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" }
  ];

  return (
    <div id="founder-console" className={`space-y-6 ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
      {/* Top Console Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">👑</span>
            <h1 className="text-2xl font-bold font-sans tracking-tight bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Founder Console
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Platform Owner Mode
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Global administrative, billing, server, and licensing commands. Handle with absolute care.
          </p>
        </div>

        {/* Global Manual Reset Controls */}
        <div className="flex items-center space-x-2">
          <button 
            id="refresh-configs-btn"
            onClick={loadControls}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-all"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span>Reload Controls</span>
          </button>
        </div>
      </div>

      {/* Internal Notification Banners */}
      {banner && (
        <div id="console-notification-banner" className={`p-3 rounded-lg border text-sm font-mono flex items-center space-x-2 animate-pulse ${
          banner.type === "success" 
            ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30" 
            : "bg-rose-950/40 text-rose-300 border-rose-500/30"
        }`}>
          {banner.type === "success" ? <CheckCircle size={16} /> : <AlertOctagon size={16} />}
          <span>{banner.message}</span>
        </div>
      )}

      {/* HORIZONTAL CONSOLE MENU RAIL */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-2 border-b border-slate-800/40 scrollbar-none">
        {[
          { id: "dashboard", label: "Dashboard", icon: <Activity size={14} /> },
          { id: "maintenance", label: "Maintenance", icon: <Lock size={14} /> },
          { id: "announcements", label: "Announcements", icon: <Bell size={14} /> },
          { id: "flags", label: "Feature Flags", icon: <Settings size={14} /> },
          { id: "storage", label: "Storage & DB", icon: <Database size={14} /> },
          { id: "gemini", label: "AI & Gemini", icon: <Cpu size={14} /> },
          { id: "analytics", label: "Platform Analytics", icon: <TrendingUp size={14} /> },
          { id: "owners", label: "Platform Owners", icon: <Users size={14} /> },
          { id: "logs", label: "Audit Log", icon: <Shield size={14} /> }
        ].map((item) => (
          <button
            key={item.id}
            id={`tab-link-${item.id}`}
            onClick={() => setActiveSubTab(item.id as any)}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono rounded border transition-all whitespace-nowrap ${
              activeSubTab === item.id
                ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/40"
                : "bg-transparent text-slate-400 border-transparent hover:bg-slate-800/40"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* =========================================================================
          TAB 1: GLOBAL DASHBOARD OVERVIEW
          ========================================================================= */}
      {activeSubTab === "dashboard" && (
        <div id="founder-tab-dashboard" className="space-y-6">
          {/* Quick status bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <span className="text-xs font-mono text-slate-400">Global Platform Status</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold">
                  {controls.platformStatus || "Operational"}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                  controls.platformStatus === "Operational" 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-rose-500/20 text-rose-400"
                }`}>
                  Live
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <span className="text-xs font-mono text-slate-400">Active Mode</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold font-mono">
                  {controls.maintenanceMode || "Normal"}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                  controls.maintenanceMode === "Normal" 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : controls.maintenanceMode === "Read Only" 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "bg-rose-500/20 text-rose-400"
                }`}>
                  {controls.maintenanceMode === "Normal" ? "Operational" : "Restricted"}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <span className="text-xs font-mono text-slate-400">Total System Founders</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold">
                  {controls.owners?.length || 1} Primary
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Multiple Authorized
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-mono font-bold text-slate-300">Platform Analytics Snapshot</h2>
              <button 
                onClick={fetchPlatformAnalytics} 
                disabled={analyticsLoading}
                className="text-xs font-mono text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <RefreshCw size={10} className={analyticsLoading ? "animate-spin" : ""} />
                <span>Compile Refresh</span>
              </button>
            </div>

            {analytics ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Mess Guilds</span>
                  <span className="text-2xl font-bold font-mono">{analytics.totalMesses}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">Active: {analytics.activeMesses}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Platform Users</span>
                  <span className="text-2xl font-bold font-mono">{analytics.totalMembers}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">Active: {analytics.activeMembers}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Premium Ratio</span>
                  <span className="text-2xl font-bold font-mono text-purple-400">{analytics.premiumRatio}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">Members: {analytics.premiumMembers}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Platform Ads Rendered</span>
                  <span className="text-2xl font-bold font-mono text-yellow-400">{analytics.totalAdvertisements}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">Reward Users: {analytics.totalRewardUsers}</span>
                </div>

                <div className="space-y-1 pt-4 border-t border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Estimated Paid Revenue</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">{analytics.estimatedRevenue}</span>
                </div>

                <div className="space-y-1 pt-4 border-t border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Future Pipeline Recurring</span>
                  <span className="text-xl font-bold font-mono text-cyan-400">{analytics.futureRevenue}</span>
                </div>

                <div className="space-y-1 pt-4 border-t border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Platform Reward Points</span>
                  <span className="text-xl font-bold font-mono text-amber-500">{analytics.totalRewardPoints}</span>
                </div>

                <div className="space-y-1 pt-4 border-t border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Database Storage Status</span>
                  <span className="text-xl font-bold font-mono text-blue-400">Operational</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs font-mono">
                Platform analytics not loaded. Click "Compile Refresh" above to process metrics from Database.
              </div>
            )}
          </div>

          {/* Quick System Diagnostics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
              <h3 className="text-sm font-mono font-bold text-slate-300">Gemini Resource Consumption</h3>
              {controls.geminiStats ? (
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-950 rounded border border-slate-800/40">
                    <span className="text-slate-500 block">API Requests</span>
                    <span className="text-lg font-bold text-cyan-400">{controls.geminiStats.totalRequests}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800/40">
                    <span className="text-slate-500 block">Today's Usage</span>
                    <span className="text-lg font-bold text-purple-400">{controls.geminiStats.todayRequests}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800/40 col-span-2">
                    <span className="text-slate-500 block">Errors / Failed Loops</span>
                    <span className="text-sm font-bold text-rose-400">{controls.geminiStats.failedRequests} failures</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">Loading Gemini stats...</p>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
              <h3 className="text-sm font-mono font-bold text-slate-300">Storage & Connection Health</h3>
              {dbStatus ? (
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-950 rounded border border-slate-800/40">
                    <span className="text-slate-500 block">Database Size</span>
                    <span className="text-sm font-bold text-emerald-400">{dbStatus.databaseSize}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800/40">
                    <span className="text-slate-500 block">JSON Cache Storage</span>
                    <span className="text-sm font-bold text-cyan-400">{dbStatus.storageUsage}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded border border-slate-800/40 col-span-2">
                    <span className="text-slate-500 block">Cache Connection State</span>
                    <span className="text-sm font-bold text-blue-400">{dbStatus.cacheStatus}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <button onClick={fetchDbStatus} className="text-xs font-mono text-cyan-400 hover:underline">
                    Load Diagnostics
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MAINTENANCE CENTER & HARDWARE ENFORCEMENT
          ========================================================================= */}
      {activeSubTab === "maintenance" && (
        <div id="founder-tab-maintenance" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Lock className="text-rose-400" size={18} />
            <h2 className="text-base font-bold font-sans">Maintenance & Locking Controls</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Maintenance Mode Selectors */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 block">Configure Platform Access Mode</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "Normal", label: "🟢 Normal Mode", desc: "Full platform operation. All members can log in, edit, perform transactions." },
                    { value: "Read Only", label: "🟡 Read-Only Mode", desc: "No modifications. Users can view past months, meals, and notices, but block all create, update, delete, deposits, AI, rewards and theme actions." },
                    { value: "Full Lock", label: "🔴 Emergency Full Lock", desc: "Locks down the entire ERP. Non-owners are locked out with a full-screen warnings page. Only Platform Owners can bypass to access controls." }
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setControls({ ...controls, maintenanceMode: mode.value })}
                      className={`text-left p-3 rounded border font-sans transition-all flex flex-col space-y-1 ${
                        controls.maintenanceMode === mode.value
                          ? "bg-cyan-500/10 border-cyan-400 text-cyan-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="text-sm font-bold">{mode.label}</span>
                      <span className="text-[11px] text-slate-500 font-mono leading-relaxed">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 block">Platform Operational Status Badge</label>
                <select
                  value={controls.platformStatus}
                  onChange={(e) => setControls({ ...controls, platformStatus: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  {platformStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Maintenance Screen Configuration */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-4">
              <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Maintenance Warnings Configuration</h3>

              <div className="space-y-2 text-xs font-mono">
                <label className="text-slate-400 block">Maintenance Reason / Description</label>
                <textarea
                  value={controls.maintenanceReason}
                  onChange={(e) => setControls({ ...controls, maintenanceReason: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block">Estimated Completion</label>
                  <input
                    type="text"
                    value={controls.maintenanceEstimatedCompletion || ""}
                    onChange={(e) => setControls({ ...controls, maintenanceEstimatedCompletion: e.target.value })}
                    placeholder="e.g. 1 hour, 45 minutes"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block">Target Timezone</label>
                  <input
                    type="text"
                    value={controls.maintenanceTimezone || ""}
                    onChange={(e) => setControls({ ...controls, maintenanceTimezone: e.target.value })}
                    placeholder="Asia/Dhaka"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block">Emoji</label>
                  <input
                    type="text"
                    value={controls.maintenanceEmoji || "⚙️"}
                    onChange={(e) => setControls({ ...controls, maintenanceEmoji: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400 text-center"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block">Icon</label>
                  <input
                    type="text"
                    value={controls.maintenanceWarningIcon || "AlertTriangle"}
                    onChange={(e) => setControls({ ...controls, maintenanceWarningIcon: e.target.value })}
                    placeholder="AlertTriangle, Lock"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block">Theme Color</label>
                  <input
                    type="text"
                    value={controls.maintenanceThemeColor || "cyan"}
                    onChange={(e) => setControls({ ...controls, maintenanceThemeColor: e.target.value })}
                    placeholder="cyan, red, yellow"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <label className="text-slate-400 block">Optional Banner Image URL</label>
                <input
                  type="text"
                  value={controls.maintenanceBannerImage || ""}
                  onChange={(e) => setControls({ ...controls, maintenanceBannerImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
            <button
              id="save-maintenance-btn"
              onClick={() => handleSaveControls()}
              disabled={saveLoading}
              className="px-5 py-2 text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded transition-all flex items-center space-x-1.5"
            >
              {saveLoading ? <RefreshCw className="animate-spin" size={14} /> : <Unlock size={14} />}
              <span>Commit Maintenance Locks</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ANNOUNCEMENT CENTER & BULK DISTRIBUTOR
          ========================================================================= */}
      {activeSubTab === "announcements" && (
        <div id="founder-tab-announcements" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New Announcement Form */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <Bell className="text-cyan-400" size={16} />
              <h2 className="text-sm font-bold font-mono">Publish Announcement</h2>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-400">Notice Title</label>
                <input
                  type="text"
                  value={newAnn.title}
                  onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                  placeholder="Platform Core System Update"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none focus:border-cyan-400 text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Message Content</label>
                <textarea
                  value={newAnn.content}
                  onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                  placeholder="We are updating the primary databases..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none focus:border-cyan-400 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Banner Type</label>
                  <select
                    value={newAnn.type}
                    onChange={(e) => setNewAnn({ ...newAnn, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none focus:border-cyan-400 text-slate-200"
                  >
                    <option value="info">ℹ️ Information</option>
                    <option value="success">🟢 Success Notice</option>
                    <option value="warning">🟡 Active Warning</option>
                    <option value="danger">🔴 Danger Hazard</option>
                    <option value="emergency">🚨 Emergency System</option>
                    <option value="maintenance">⚙️ Scheduled Work</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Display Layout</label>
                  <select
                    value={newAnn.displayMethod}
                    onChange={(e) => setNewAnn({ ...newAnn, displayMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none focus:border-cyan-400 text-slate-200"
                  >
                    <option value="top-banner">Top Slim Banner</option>
                    <option value="bottom-banner">Bottom Slim Banner</option>
                    <option value="full-screen">Full Screen Modal</option>
                    <option value="dashboard-notice">Dashboard Widget</option>
                    <option value="login-screen">Auth Screen Notice</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={newAnn.startDate}
                    onChange={(e) => setNewAnn({ ...newAnn, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={newAnn.endDate}
                    onChange={(e) => setNewAnn({ ...newAnn, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Priority Level</label>
                  <select
                    value={newAnn.priority}
                    onChange={(e) => setNewAnn({ ...newAnn, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Dismissibility</label>
                  <select
                    value={newAnn.dismissible ? "yes" : "no"}
                    onChange={(e) => setNewAnn({ ...newAnn, dismissible: e.target.value === "yes" })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2"
                  >
                    <option value="yes">Dismissible by user</option>
                    <option value="no">Non-dismissible (Forced)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Recipient Target</label>
                <select
                  value={newAnn.target}
                  onChange={(e) => setNewAnn({ ...newAnn, target: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                >
                  <option value="everyone">Everyone (All Messes & Users)</option>
                  <option value="premium">Premium Subscribed Users</option>
                  <option value="mess">Target Specific Mess ID</option>
                  <option value="users">Target Specific User emails (comma-separated)</option>
                </select>
              </div>

              {newAnn.target === "mess" && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-slate-400">Target Mess ID</label>
                  <input
                    type="text"
                    value={newAnn.targetMessId}
                    onChange={(e) => setNewAnn({ ...newAnn, targetMessId: e.target.value })}
                    placeholder="e.g. idx_default_mess"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none"
                  />
                </div>
              )}

              {newAnn.target === "users" && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-slate-400">Target User Emails (Comma-separated)</label>
                  <input
                    type="text"
                    value={newAnn.targetUserIds}
                    onChange={(e) => setNewAnn({ ...newAnn, targetUserIds: e.target.value })}
                    placeholder="email1@gmail.com, email2@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 focus:outline-none"
                  />
                </div>
              )}

              <button
                onClick={handleAddAnnouncement}
                disabled={saveLoading}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold rounded hover:opacity-90 transition-all flex items-center justify-center space-x-1"
              >
                <Plus size={14} />
                <span>Publish Notice Broadcast</span>
              </button>
            </div>
          </div>

          {/* Active Broadcasts List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-bold font-mono text-slate-300">Active Platform Announcements ({(controls.announcements || []).length})</h2>

            {(controls.announcements || []).length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs font-mono">
                No active announcements circulating. Use the form on the left to publish a notice.
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
                {(controls.announcements || []).map((ann: any) => (
                  <div key={ann.id} className="p-4 bg-slate-950 rounded border border-slate-800/60 relative hover:border-slate-700 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          ann.type === "danger" || ann.type === "emergency" 
                            ? "bg-rose-500 animate-ping" 
                            : ann.type === "warning" 
                            ? "bg-amber-500" 
                            : ann.type === "success" 
                            ? "bg-emerald-500" 
                            : "bg-cyan-500"
                        }`} />
                        <span className="text-xs font-mono font-bold text-slate-300 capitalize">
                          {ann.type} ({ann.displayMethod})
                        </span>
                        <span className="px-1.5 py-0.5 text-[8px] font-mono rounded bg-slate-800 text-slate-400">
                          Priority: {ann.priority}
                        </span>
                      </div>

                      <h3 className="text-sm font-sans font-bold text-slate-100 mt-2">{ann.title}</h3>
                      <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">{ann.content}</p>

                      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-mono text-slate-500">
                        <span>Active: {ann.startDate} to {ann.endDate}</span>
                        <span>•</span>
                        <span>Target: {ann.target}</span>
                        {ann.targetMessId && <span>(Mess: {ann.targetMessId})</span>}
                        <span>•</span>
                        <span>{ann.dismissible ? "Dismissible" : "Forced"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 transition-all"
                      title="Terminate Broadcast"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: GLOBAL FEATURE FLAGS
          ========================================================================= */}
      {activeSubTab === "flags" && (
        <div id="founder-tab-flags" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Settings className="text-purple-400" size={18} />
            <h2 className="text-base font-bold font-sans">Global Platform Feature Flags</h2>
          </div>

          <p className="text-xs font-mono text-slate-400 max-w-2xl leading-relaxed">
            Instantly enable or disable individual segments of the application globally without deploying any code. Disabling a flag hides the visual entry points in the client app and automatically enforces rejection of matching write queries server-side.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: "monetization", title: "💳 Monetization Systems", desc: "Master switch for subscription checking, billing portals, and monetization plans." },
              { key: "advertisements", title: "📺 Advertisement Network", desc: "Allows viewing banner and rewarded video ads to earn local reward points." },
              { key: "rewardCenter", title: "🏆 Reward Center / Gamification", desc: "Enables point calculations, watches metrics, claims, and achievements." },
              { key: "premiumStore", title: "🛍️ Premium Cosmetics Store", desc: "Allows members to redeem reward points or buy cosmetic glowing profiles and themes." },
              { key: "aiFeatures", title: "🤖 Gemini AI Food Intelligence", desc: "Allows menu text reading pipelines, categorization, confidence, and review queues." },
              { key: "themeEngine", title: "🎨 Personal Theme Customizations", desc: "Allows user-level custom themes (glass, cosmic, dark) and custom rgb colors." },
              { key: "statistics", title: "📊 Platform Analytics", desc: "Provides dashboard reports, dynamic trends, and data processing visualizations." },
              { key: "experimentalFeatures", title: "🧪 Experimental Labs", desc: "Beta features under sandbox testing. Proceed with caution." },
              { key: "futureModules", title: "🚀 Future Extensions", desc: "Predefined pathways for developers, billing modules, and global moderators." }
            ].map((flag) => {
              const isEnabled = controls.featureFlags?.[flag.key] ?? true;
              return (
                <div 
                  key={flag.key} 
                  id={`feature-card-${flag.key}`}
                  className={`p-4 rounded-lg border transition-all flex flex-col justify-between space-y-3 ${
                    isEnabled 
                      ? "bg-slate-950 border-cyan-500/20 text-slate-200" 
                      : "bg-slate-950 border-slate-800/80 text-slate-500"
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-sans font-bold">{flag.title}</h3>
                    <p className="text-[11px] font-mono leading-relaxed text-slate-400">{flag.desc}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"
                    }`}>
                      {isEnabled ? "ACTIVE" : "DISABLED"}
                    </span>

                    <button
                      onClick={() => handleFeatureFlagToggle(flag.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? "bg-cyan-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: STORAGE & DATABASE DIAGNOSTICS (Manual Refresh)
          ========================================================================= */}
      {activeSubTab === "storage" && (
        <div id="founder-tab-storage" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Database className="text-emerald-400" size={18} />
              <h2 className="text-base font-bold font-sans">Storage & SQL Database Inspector</h2>
            </div>
            <button
              onClick={fetchDbStatus}
              disabled={dbLoading}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-mono rounded transition-all flex items-center space-x-1"
            >
              <RefreshCw size={12} className={dbLoading ? "animate-spin" : ""} />
              <span>Diagnostic Refresh</span>
            </button>
          </div>

          {dbLoading ? (
            <div className="text-center py-20 font-mono text-slate-500 text-xs">
              Quering Postgres sizes and checking cloud storage blocks...
            </div>
          ) : dbStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Database Engine", value: "PostgreSQL Cloud SQL", status: "Connected", color: "text-emerald-400" },
                { title: "Active Connection Status", value: dbStatus.connectionStatus, status: dbStatus.databaseStatus, color: dbStatus.databaseStatus === "Connected" ? "text-emerald-400" : "text-rose-400" },
                { title: "Postgres Size On Disk", value: dbStatus.databaseSize, status: "Normal size", color: "text-cyan-400" },
                { title: "Local Cache Directory Size", value: dbStatus.storageUsage, status: "/tmp/data and ./data", color: "text-cyan-400" },
                { title: "Backup Sync Status", value: dbStatus.backupStatus, status: "Autosave Sync active", color: "text-emerald-400" },
                { title: "In-Memory Cache Status", value: dbStatus.cacheStatus, status: "Active synchronization", color: "text-blue-400" }
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">{item.title}</span>
                  <span className={`text-sm font-mono font-bold block ${item.color}`}>{item.value}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">{item.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 font-mono text-xs text-slate-500">
              No metrics loaded yet. Click "Diagnostic Refresh" to query.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 6: GEMINI DASHBOARD ANALYTICS (Read Only)
          ========================================================================= */}
      {activeSubTab === "gemini" && (
        <div id="founder-tab-gemini" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="text-cyan-400" size={18} />
              <h2 className="text-base font-bold font-sans">Gemini AI Usage & Cost Analytics</h2>
            </div>
            <button
              onClick={fetchGeminiStatus}
              disabled={geminiLoading}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-mono rounded transition-all flex items-center space-x-1"
            >
              <RefreshCw size={12} className={geminiLoading ? "animate-spin" : ""} />
              <span>Usage Refresh</span>
            </button>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 text-xs font-mono leading-relaxed text-slate-400 rounded-lg">
            <span className="font-bold text-cyan-300">Google GenAI SDK pricing model:</span> Gemini 3.5 Flash queries are optimized at a microscale rate. We catalog results natively inside our local Cache and Postgres Database to prevent repeated queries to Gemini APIs, resulting in massive speedups and Render-Free platform optimizations.
          </div>

          {geminiLoading ? (
            <div className="text-center py-20 font-mono text-slate-500 text-xs">
              Compiling Gemini usage telemetry logs...
            </div>
          ) : geminiStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Total LLM Requests", value: `${geminiStatus.requests} API Calls`, desc: "Incurred via normalized food translation pipelines." },
                { title: "Estimated Cost Billed", value: geminiStatus.estimatedUsage, desc: "Approximate API billing cost." },
                { title: "Today's Calls", value: `${geminiStatus.todayUsage} Queries`, desc: "Resetting automatically at UTC 00:00." },
                { title: "Monthly Accumulated", value: `${geminiStatus.monthlyUsage} Queries`, desc: "Calculated across last 30 calendar days." },
                { title: "Failed / Error Pipeline Calls", value: `${geminiStatus.errors} Errors`, desc: "Failures returned from Gemini servers." },
                { title: "Future Cost Estimations", value: geminiStatus.futureCostEstimation, desc: "Based on active user base scaling factor of 1.5x." }
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">{item.title}</span>
                  <span className="text-lg font-mono font-bold text-slate-200 block">{item.value}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">{item.desc}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 font-mono text-xs text-slate-500">
              No Gemini analytics loaded yet. Click "Usage Refresh" to query.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 7: PLATFORM GROWTH ANALYTICS (Manual Refresh)
          ========================================================================= */}
      {activeSubTab === "analytics" && (
        <div id="founder-tab-analytics" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="text-purple-400" size={18} />
              <h2 className="text-base font-bold font-sans">Platform Growth and Revenue Ledger</h2>
            </div>
            <button
              onClick={fetchPlatformAnalytics}
              disabled={analyticsLoading}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-mono rounded transition-all flex items-center space-x-1"
            >
              <RefreshCw size={12} className={analyticsLoading ? "animate-spin" : ""} />
              <span>Full Analytics Compile</span>
            </button>
          </div>

          {analyticsLoading ? (
            <div className="text-center py-20 font-mono text-slate-500 text-xs">
              Processing totals, subscriptions paid plans, and rendering charts...
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Analytics table */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">6-Month Historic Growth Trend</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="pb-2">Metric Track</th>
                        {analytics.growthCharts?.labels?.map((l: string, idx: number) => (
                          <th key={idx} className="pb-2">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr>
                        <td className="py-2.5 font-bold text-slate-400">Total Members Added</td>
                        {analytics.growthCharts?.userGrowth?.map((v: number, idx: number) => (
                          <td key={idx} className="py-2.5">{v}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-400">Total Registered Messes</td>
                        {analytics.growthCharts?.messGrowth?.map((v: number, idx: number) => (
                          <td key={idx} className="py-2.5">{v}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-400">Estimated Revenue ($)</td>
                        {analytics.growthCharts?.revenueGrowth?.map((v: number, idx: number) => (
                          <td key={idx} className="py-2.5">${v.toFixed(2)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Responsive Layout Representation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Growth Insights</h4>
                  <p className="text-xs text-slate-300 font-sans mt-2 leading-relaxed">
                    Growth parameters indicating a steady expansion rate. Premium subscribers are primarily leveraging personal customization and customizable glow style layouts. High conversion is seen around premium subscription plans.
                  </p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">System Maintenance Advice</h4>
                  <p className="text-xs text-slate-300 font-sans mt-2 leading-relaxed">
                    With storage sizes under 1MB, database efficiency is extremely high. All files reside in PostgreSQL single source of truth, enabling optimal server operations fully optimized for Render Free Tier.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 font-mono text-xs text-slate-500">
              No analytics loaded yet. Click "Full Analytics Compile" to calculate.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 8: PLATFORM OWNERS ARCHITECTURE (Add / Remove Owners)
          ========================================================================= */}
      {activeSubTab === "owners" && (
        <div id="founder-tab-owners" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Users className="text-cyan-400" size={18} />
            <h2 className="text-base font-bold font-sans">Platform Owner Architecture</h2>
          </div>

          <p className="text-xs font-mono text-slate-400 max-w-2xl leading-relaxed">
            Manage system administrators who are authorized to access this Founder Console. Platform ownership is transferable dynamically via database records. Do not hardcode any Gmail addresses.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New Owner Form */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-4">
              <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Authorize Co-Founder or Role</h3>

              <div className="space-y-3 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-slate-400">Gmail Email Address</label>
                  <input
                    type="email"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="partner@gmail.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400 text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Founder Administrative Role</label>
                  <select
                    value={newOwnerRole}
                    onChange={(e) => setNewOwnerRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400 text-slate-200"
                  >
                    <option value="Primary Founder">Primary Founder</option>
                    <option value="Future Co-Founder">Future Co-Founder</option>
                    <option value="Global Platform Moderator">Global Platform Moderator</option>
                    <option value="Platform Administrator">Platform Administrator</option>
                  </select>
                </div>

                {transferConfirm ? (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded text-[11px] leading-relaxed text-rose-300">
                    ⚠️ <strong>Are you absolutely sure?</strong> Authorizing this email will grant them access to edit maintenance modes, database caches, monetization layers, and feature flags.
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={handleAddOwner}
                        className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded"
                      >
                        Yes, Authorize Owner
                      </button>
                      <button
                        onClick={() => setTransferConfirm(false)}
                        className="px-2 py-1 bg-slate-800 text-slate-300 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setTransferConfirm(true)}
                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded transition-all"
                  >
                    Authorize Administrator
                  </button>
                )}
              </div>
            </div>

            {/* Current Authorized List */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-300">Currently Authorized Owners ({(controls.owners || []).length})</h3>
              
              <div className="space-y-2">
                {(controls.owners || []).map((o: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800/60 rounded-lg flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-bold text-slate-200 block">{o.email}</span>
                      <span className="text-[10px] text-cyan-400 block mt-0.5">{o.role}</span>
                    </div>

                    {controls.owners.length > 1 && (
                      <button
                        onClick={() => handleRemoveOwner(o.email)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-all"
                        title="Revoke Admin Access"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 9: SEARCHABLE FOUNDER AUDIT LOG
          ========================================================================= */}
      {activeSubTab === "logs" && (
        <div id="founder-tab-logs" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Shield className="text-purple-400" size={18} />
              <h2 className="text-base font-bold font-sans">Founder Administrative Audit Trails</h2>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAuditLogs(logsSearch)}
                placeholder="Search action or email..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {logsLoading ? (
            <div className="text-center py-20 font-mono text-slate-500 text-xs">
              Filtering founder audit trails...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs font-mono">
              No founder action logs found matching search terms.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono leading-normal">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[9px]">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Action</th>
                    <th className="pb-2">Module</th>
                    <th className="pb-2">Result Outcomes</th>
                    <th className="pb-2">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 whitespace-nowrap text-slate-500">
                        {log.date} {log.time}
                      </td>
                      <td className="py-2.5 text-slate-400 whitespace-nowrap">{log.email}</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-850 border border-slate-800 text-cyan-400">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">{log.module}</td>
                      <td className="py-2.5 max-w-xs truncate" title={log.result}>
                        {log.result}
                      </td>
                      <td className="py-2.5 text-slate-500">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
