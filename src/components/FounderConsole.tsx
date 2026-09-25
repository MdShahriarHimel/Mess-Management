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
  FileText,
  Key,
  Building,
  Edit3,
  UserCheck,
  UserX,
  ExternalLink,
  Download, 
  Upload
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
    "dashboard" | "security" | "maintenance" | "announcements" | "flags" | "storage" | "gemini" | "analytics" | "owners" | "tenantAdmins" | "logs" | "backup"
  >("dashboard");

  const defaultControls = {
    platformStatus: "Operational",
    maintenanceMode: "Normal",
    maintenanceReason: "",
    maintenanceEstimatedCompletion: "",
    maintenanceTimezone: "Asia/Dhaka",
    maintenanceEmoji: "⚙️",
    maintenanceWarningIcon: "AlertTriangle",
    maintenanceThemeColor: "cyan",
    maintenanceBannerImage: "",
    featureFlags: {
      monetization: true,
      advertisements: true,
      rewardCenter: true,
      premiumStore: true,
      aiFeatures: true,
      themeEngine: true,
      statistics: true,
      experimentalFeatures: false,
      futureModules: true
    },
    announcements: [],
    owners: [],
    geminiStats: null
  };

  // Core configuration states
  const [controls, setControls] = useState<any>(defaultControls);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Security Dashboard state
  const [securityData, setSecurityData] = useState<any>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySearch, setSecuritySearch] = useState("");

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
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyPasscode, setVerifyPasscode] = useState("");

  // Authorized Tenant Admins state
  const [tenantAdmins, setTenantAdmins] = useState<any[]>([]);
  const [tenantAdminsLoading, setTenantAdminsLoading] = useState(false);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

  // New Tenant Admin Form
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantPhone, setNewTenantPhone] = useState("");
  const [newTenantMaxMesses, setNewTenantMaxMesses] = useState<number>(1);
  const [newTenantPassword, setNewTenantPassword] = useState("");
  const [newTenantNotes, setNewTenantNotes] = useState("");
  const [addingTenant, setAddingTenant] = useState(false);

  // Edit Tenant Admin Modal state
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [editMaxMesses, setEditMaxMesses] = useState<number>(1);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [savingEditTenant, setSavingEditTenant] = useState(false);

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
        const data = await res.json().catch(() => ({}));
        if (data && typeof data === "object") {
          setControls({
            ...defaultControls,
            ...data,
            featureFlags: {
              ...defaultControls.featureFlags,
              ...(data.featureFlags || {})
            },
            announcements: data.announcements || [],
            owners: data.owners || []
          });
        }
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
    if (!updatedControls) return;
    setSaveLoading(true);
    try {
      const res = await fetch("/api/founder/controls", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(updatedControls)
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.controls) {
          setControls((prev: any) => ({
            ...defaultControls,
            ...(prev || {}),
            ...data.controls,
            featureFlags: {
              ...defaultControls.featureFlags,
              ...(prev?.featureFlags || {}),
              ...(data.controls?.featureFlags || {})
            },
            announcements: data.controls?.announcements || prev?.announcements || [],
            owners: data.controls?.owners || prev?.owners || []
          }));
        }
        showBanner("Platform controls saved successfully!", "success");
        onRefreshPlatformStatus(); // Propagate status updates to parent App layout
      } else {
        const errData = await res.json().catch(() => ({}));
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
        const data = await res.json().catch(() => ({}));
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
        const data = await res.json().catch(() => ({}));
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
        const data = await res.json().catch(() => ({}));
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
        const data = await res.json().catch(() => ({}));
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

  const fetchSecurityDashboard = async () => {
    setSecurityLoading(true);
    try {
      const res = await fetch("/api/founder/security-dashboard", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setSecurityData(data);
      } else {
        showBanner("Failed to load security dashboard metrics.", "error");
      }
    } catch (e) {
      showBanner("Failed to fetch security dashboard.", "error");
    } finally {
      setSecurityLoading(false);
    }
  };

  // Load contextual subtab data lazily (high performance)
  useEffect(() => {
    if (activeSubTab === "security") {
      fetchSecurityDashboard();
    } else if (activeSubTab === "storage" && !dbStatus) {
      fetchDbStatus();
    } else if (activeSubTab === "gemini" && !geminiStatus) {
      fetchGeminiStatus();
    } else if (activeSubTab === "analytics" && !analytics) {
      fetchPlatformAnalytics();
    } else if (activeSubTab === "tenantAdmins") {
      fetchTenantAdmins();
    } else if (activeSubTab === "logs") {
      fetchAuditLogs();
    }
  }, [activeSubTab]);

  // Authorized Tenant Admins Operations
  const fetchTenantAdmins = async () => {
    setTenantAdminsLoading(true);
    try {
      const res = await fetch("/api/founder/tenant-admins", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setTenantAdmins(data.tenantAdmins || []);
      } else {
        showBanner("Failed to retrieve authorized tenant admins list.", "error");
      }
    } catch (e) {
      showBanner("Failed to fetch tenant admins API.", "error");
    } finally {
      setTenantAdminsLoading(false);
    }
  };

  const handleAddTenantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantEmail || !newTenantEmail.includes("@")) {
      showBanner("Please specify a valid email address.", "error");
      return;
    }
    setAddingTenant(true);
    try {
      const res = await fetch("/api/founder/tenant-admins", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          email: newTenantEmail.trim().toLowerCase(),
          name: newTenantName.trim(),
          phone: newTenantPhone.trim(),
          maxMesses: Math.max(1, Number(newTenantMaxMesses) || 1),
          initialPassword: newTenantPassword.trim(),
          notes: newTenantNotes.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showBanner(`Tenant Admin ${newTenantEmail} successfully authorized with quota of ${newTenantMaxMesses} mess(es)!`, "success");
        setNewTenantEmail("");
        setNewTenantName("");
        setNewTenantPhone("");
        setNewTenantMaxMesses(1);
        setNewTenantPassword("");
        setNewTenantNotes("");
        fetchTenantAdmins();
      } else {
        showBanner(data.error || "Failed to authorize tenant admin.", "error");
      }
    } catch (err) {
      showBanner("Network error authorizing tenant admin.", "error");
    } finally {
      setAddingTenant(false);
    }
  };

  const handleUpdateTenantAdmin = async (id: string, updates: any) => {
    setSavingEditTenant(true);
    try {
      const res = await fetch(`/api/founder/tenant-admins/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showBanner("Tenant Admin configurations updated successfully!", "success");
        setEditingTenant(null);
        fetchTenantAdmins();
      } else {
        showBanner(data.error || "Failed to update tenant admin.", "error");
      }
    } catch (err) {
      showBanner("Network error updating tenant admin.", "error");
    } finally {
      setSavingEditTenant(false);
    }
  };

  const handleRevokeTenantAdmin = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke authorization for tenant admin ${email}? They will immediately lose access to manage messes.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/founder/tenant-admins/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showBanner(`Tenant Admin ${email} revoked successfully.`, "success");
        fetchTenantAdmins();
      } else {
        showBanner(data.error || "Failed to revoke tenant admin.", "error");
      }
    } catch (err) {
      showBanner("Network error revoking tenant admin.", "error");
    }
  };

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

    if (!verifyPassword && !verifyPasscode) {
      showBanner("Please provide your account password or Founder passcode to verify identity.", "error");
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
        body: JSON.stringify({ 
          owners: updatedOwners,
          password: verifyPassword,
          passcode: verifyPasscode
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setControls({ ...controls, owners: data.owners });
        setNewOwnerEmail("");
        setNewOwnerRole("Future Co-Founder");
        setVerifyPassword("");
        setVerifyPasscode("");
        showBanner("Platform owner roster updated successfully!", "success");
        onRefreshPlatformStatus();
      } else {
        showBanner(data.error || "Failed to transfer platform ownership.", "error");
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

    if (!verifyPassword && !verifyPasscode) {
      showBanner("Please provide your account password or Founder passcode to verify identity for owner removal.", "error");
      return;
    }

    const updatedOwners = controls.owners.filter((o: any) => o.email.toLowerCase() !== email.toLowerCase());

    try {
      const res = await fetch("/api/founder/transfer-ownership", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ 
          owners: updatedOwners,
          password: verifyPassword,
          passcode: verifyPasscode
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setControls({ ...controls, owners: data.owners });
        setVerifyPassword("");
        setVerifyPasscode("");
        showBanner("Owner removed from access list successfully.", "success");
        onRefreshPlatformStatus();
      } else {
        showBanner(data.error || "Failed to update access list.", "error");
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
            <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
              isDarkMode 
                ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
                : "bg-purple-100 text-purple-800 border-purple-200"
            }`}>
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
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-800/40">
        {[
          { id: "dashboard", label: "Dashboard", icon: <Activity size={14} /> },
          { id: "security", label: "Security & Locks", icon: <Shield size={14} /> },
          { id: "maintenance", label: "Maintenance", icon: <Lock size={14} /> },
          { id: "announcements", label: "Announcements", icon: <Bell size={14} /> },
          { id: "flags", label: "Feature Flags", icon: <Settings size={14} /> },
          { id: "storage", label: "Storage & DB", icon: <Database size={14} /> },
          { id: "gemini", label: "AI & Gemini", icon: <Cpu size={14} /> },
          { id: "analytics", label: "Platform Analytics", icon: <TrendingUp size={14} /> },
          { id: "owners", label: "Platform Owners", icon: <Users size={14} /> },
          { id: "tenantAdmins", label: "🏢 Authorized Tenant Admins", icon: <Building size={14} /> },
          { id: "logs", label: "Audit Log", icon: <FileText size={14} /> },
          { id: "backup", label: "Backup & Restore", icon: <Download size={14} /> }
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
          TAB: SECURITY & LOGIN PROTECTION DASHBOARD (ULTIMATE ADMIN)
          ========================================================================= */}
      {activeSubTab === "security" && (
        <div id="founder-tab-security" className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-mono font-bold text-slate-200 flex items-center space-x-2">
                <Shield className="text-cyan-400" size={18} />
                <span>Security, Login Protection & Account Safety</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time security monitoring, rate limits, locked accounts, and credential audit trails.
              </p>
            </div>
            <button
              onClick={fetchSecurityDashboard}
              disabled={securityLoading}
              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-xs font-mono flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw size={12} className={securityLoading ? "animate-spin" : ""} />
              <span>Refresh Security Stream</span>
            </button>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Locked Accounts</span>
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold font-mono ${securityData?.summary?.lockedAccountsCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {securityData?.summary?.lockedAccountsCount ?? 0}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${securityData?.summary?.lockedAccountsCount > 0 ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-400"}`}>
                  {securityData?.summary?.lockedAccountsCount > 0 ? "ATTENTION REQUIRED" : "CLEAR"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block">5 consecutive failed logins threshold</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Failed Login Attempts</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-amber-400">
                  {securityData?.summary?.failedLoginAttemptsCount ?? 0}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Total Recorded</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block">Monitored per email & IP</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Password Reset Requests</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-cyan-400">
                  {securityData?.summary?.passwordResetRequestsCount ?? 0}
                </span>
                <span className="text-[10px] font-mono text-slate-400">OTP Generation</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block">Rate limited to 3 per 15 min</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Recently Changed Passwords</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-purple-400">
                  {securityData?.summary?.recentlyChangedPasswordsCount ?? 0}
                </span>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">Metadata Only</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block">Credentials/Hashes Never Stored</span>
            </div>
          </div>

          {/* Suspicious Patterns Alert Banner */}
          {securityData?.suspiciousPatterns && securityData.suspiciousPatterns.length > 0 && (
            <div className="bg-rose-950/30 border border-rose-500/40 rounded-lg p-4 space-y-3">
              <h3 className="text-xs font-mono font-bold text-rose-300 flex items-center space-x-2">
                <AlertOctagon size={14} className="text-rose-400" />
                <span>Suspicious Activity / Security Alerts ({securityData.suspiciousPatterns.length})</span>
              </h3>
              <div className="space-y-2">
                {securityData.suspiciousPatterns.map((pattern: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/80 border border-rose-900/50 rounded p-2.5 text-xs font-mono flex items-center justify-between text-slate-300">
                    <div className="space-y-0.5">
                      <span className="text-rose-400 font-bold block">{pattern.type}: {pattern.description}</span>
                      <span className="text-[10px] text-slate-500 block">Target: {pattern.email} | Origin IP: {pattern.ip}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                      {pattern.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Accounts Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-mono font-bold text-slate-300 flex items-center space-x-2">
              <Lock size={14} className="text-rose-400" />
              <span>Currently Locked Accounts ({securityData?.lockedAccounts?.length || 0})</span>
            </h3>

            {!securityData?.lockedAccounts || securityData.lockedAccounts.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded bg-slate-950/40">
                ✅ No accounts are currently locked due to failed login attempts.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px]">
                      <th className="pb-2">Account Email</th>
                      <th className="pb-2">Failed Attempts</th>
                      <th className="pb-2">Origin IP</th>
                      <th className="pb-2">Last Failed Attempt</th>
                      <th className="pb-2">Lock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {securityData.lockedAccounts.map((account: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 text-rose-400 font-bold whitespace-nowrap">{account.email}</td>
                        <td className="py-2.5 text-amber-400">{account.attempts} / 5</td>
                        <td className="py-2.5 text-slate-400">{account.ip}</td>
                        <td className="py-2.5 text-slate-500">{new Date(account.lastAttempt).toLocaleTimeString()}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px]">
                            Locked ({account.remainingLockSeconds}s remaining)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recently Changed Passwords (Metadata Only) */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-slate-300 flex items-center space-x-2">
                  <Key size={14} className="text-purple-400" />
                  <span>Recently Changed Passwords Audit Trail</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  🛡️ Security Guarantee: Passwords and hashes are NEVER recorded or stored in audit logs.
                </p>
              </div>
            </div>

            {!securityData?.recentlyChangedPasswords || securityData.recentlyChangedPasswords.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded bg-slate-950/40">
                No password change events recorded recently.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px]">
                      <th className="pb-2">Date & Time</th>
                      <th className="pb-2">Account Email</th>
                      <th className="pb-2">Action</th>
                      <th className="pb-2">Origin IP</th>
                      <th className="pb-2">Device / User Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {securityData.recentlyChangedPasswords.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 text-slate-500 whitespace-nowrap">{item.date} {item.time}</td>
                        <td className="py-2.5 text-cyan-400 font-bold whitespace-nowrap">{item.email}</td>
                        <td className="py-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px]">
                            {item.action}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400">{item.ip}</td>
                        <td className="py-2.5 text-slate-500 max-w-xs truncate" title={item.userAgent}>
                          {item.userAgent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comprehensive Security Event Log Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-mono font-bold text-slate-300 flex items-center space-x-2">
                <FileText size={14} className="text-cyan-400" />
                <span>Security Events Audit Stream</span>
              </h3>
              <input
                type="text"
                placeholder="Filter by email, action, or IP..."
                value={securitySearch}
                onChange={(e) => setSecuritySearch(e.target.value)}
                className="px-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {!securityData?.recentSecurityEvents || securityData.recentSecurityEvents.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-mono">
                No security events recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px]">
                      <th className="pb-2">Timestamp</th>
                      <th className="pb-2">Account Email</th>
                      <th className="pb-2">Action</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Details / Reason</th>
                      <th className="pb-2">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {securityData.recentSecurityEvents
                      .filter((e: any) => {
                        if (!securitySearch) return true;
                        const s = securitySearch.toLowerCase();
                        return (
                          (e.email || "").toLowerCase().includes(s) ||
                          (e.action || "").toLowerCase().includes(s) ||
                          (e.ip || "").toLowerCase().includes(s) ||
                          (e.reason || "").toLowerCase().includes(s)
                        );
                      })
                      .map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 text-slate-500 whitespace-nowrap">{e.date} {e.time}</td>
                          <td className="py-2.5 text-slate-300 whitespace-nowrap">{e.email}</td>
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 text-[10px]">
                              {e.action}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${e.success ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                              {e.success ? "SUCCESS" : "FAILED"}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400 max-w-xs truncate" title={e.reason}>{e.reason}</td>
                          <td className="py-2.5 text-slate-500">{e.ip}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
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
        <div id="founder-tab-storage" className={`border rounded-lg p-6 space-y-6 transition-all ${
          isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800 shadow-sm"
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDarkMode ? "border-slate-800" : "border-slate-100"
          }`}>
            <div className="flex items-center space-x-2">
              <Database className="text-emerald-500" size={18} />
              <h2 className="text-base font-bold font-sans">System Health & SQL Diagnostics</h2>
            </div>
            <button
              onClick={fetchDbStatus}
              disabled={dbLoading}
              className={`px-3 py-1.5 border text-xs font-mono rounded transition-all flex items-center space-x-1.5 ${
                isDarkMode 
                  ? "bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700 disabled:opacity-50" 
                  : "bg-slate-50 hover:bg-slate-100 text-cyan-600 border-slate-200 disabled:opacity-50"
              }`}
            >
              <RefreshCw size={12} className={dbLoading ? "animate-spin" : ""} />
              <span>Refresh Diagnostics</span>
            </button>
          </div>

          {dbLoading ? (
            <div className="text-center py-20 font-mono text-slate-500 text-xs flex flex-col items-center justify-center space-y-3">
              <RefreshCw size={24} className="animate-spin text-cyan-500" />
              <span>Querying real-time system metrics & verifying cloud endpoints...</span>
            </div>
          ) : dbStatus ? (
            <div className="space-y-6">
              {/* Overall Status Banner */}
              <div className={`p-4 rounded-lg border flex items-center justify-between ${
                dbStatus.healthStatus === "Excellent"
                  ? isDarkMode ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : isDarkMode ? "bg-amber-950/30 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${dbStatus.healthStatus === "Excellent" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-sans">Founder System Diagnostics Status</h3>
                    <p className="text-xs font-mono opacity-80 mt-0.5">
                      All operational processes are being tracked correctly. Fully optimized for Free Tier hosting constraints.
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider ${
                  dbStatus.healthStatus === "Excellent"
                    ? "bg-emerald-500/20 text-emerald-500"
                    : "bg-amber-500/20 text-amber-500"
                }`}>
                  {dbStatus.healthStatus || "Operational"}
                </span>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* CARD 1: CACHE HEALTH */}
                <div className={`p-5 border rounded-lg space-y-4 ${
                  isDarkMode ? "bg-slate-950 border-slate-800/60" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800/10 dark:border-slate-800/60">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="text-purple-500" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">In-Memory Cache</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">Engine Cache</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Cache Status:</span>
                      <span className="font-bold text-blue-500">{dbStatus.cacheDetails?.status || dbStatus.cacheStatus}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Loaded Items:</span>
                      <span className="font-bold text-slate-600 dark:text-slate-200">{dbStatus.cacheDetails?.loadedItems || 0} Records</span>
                    </div>

                    {/* Progress Bar for Cache density */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] opacity-50">
                        <span>Cache Density</span>
                        <span>{Math.min(100, Math.round((dbStatus.cacheDetails?.loadedItems || 0) / 20))}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.round((dbStatus.cacheDetails?.loadedItems || 0) / 20))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t pt-2 border-slate-800/10 dark:border-slate-800/60">
                      <span className="opacity-70">Cache RAM Size:</span>
                      <span className="font-bold text-cyan-500">{dbStatus.cacheDetails?.size || "N/A"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Cache Version:</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">{dbStatus.cacheDetails?.version || "v1.1.0"}</span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: DATABASE INSPECTOR */}
                <div className={`p-5 border rounded-lg space-y-4 ${
                  isDarkMode ? "bg-slate-950 border-slate-800/60" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800/10 dark:border-slate-800/60">
                    <div className="flex items-center space-x-2">
                      <Database className="text-emerald-500" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">PostgreSQL DB</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">Neon Free Tier</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Conn Status:</span>
                      <span className={`font-bold ${dbStatus.databaseStatus === "Connected" ? "text-emerald-500" : "text-rose-500"}`}>
                        {dbStatus.databaseDetails?.connectionStatus || dbStatus.connectionStatus}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Reachability:</span>
                      <span className="font-bold text-emerald-500">{dbStatus.databaseDetails?.reachability || "Reachable"}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] opacity-50">
                        <span>Database Engine</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal truncate" title={dbStatus.databaseDetails?.engine}>
                        {dbStatus.databaseDetails?.engine || "PostgreSQL Cloud SQL"}
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t pt-2 border-slate-800/10 dark:border-slate-800/60">
                      <span className="opacity-70">Disk Storage:</span>
                      <span className="font-bold text-cyan-500">{dbStatus.databaseSize || "Unknown"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Last Write:</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300 text-[10px] truncate max-w-[120px]" title={dbStatus.databaseDetails?.lastSuccessfulWrite}>
                        {dbStatus.databaseDetails?.lastSuccessfulWrite || "None"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 3: SYNCHRONIZATION DIAGNOSTICS */}
                <div className={`p-5 border rounded-lg space-y-4 ${
                  isDarkMode ? "bg-slate-950 border-slate-800/60" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800/10 dark:border-slate-800/60">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="text-cyan-500" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Sync Pipeline</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">Auto-Persist</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Sync State:</span>
                      <span className={`font-bold ${dbStatus.syncDetails?.syncState === "Syncing" ? "text-amber-500 animate-pulse" : "text-emerald-500"}`}>
                        {dbStatus.syncDetails?.syncState || "Idle"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Pending Queue:</span>
                      <span className="font-bold text-slate-600 dark:text-slate-200">
                        {dbStatus.syncDetails?.pendingQueueSize || 0} items
                      </span>
                    </div>

                    {/* Progress Bar for Sync activity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] opacity-50">
                        <span>Queue Status</span>
                        <span>{dbStatus.syncDetails?.pendingQueueSize > 0 ? "Queued" : "Clean"}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${dbStatus.syncDetails?.pendingQueueSize > 0 ? "bg-amber-500 animate-pulse w-1/2" : "bg-emerald-500 w-full"}`} 
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t pt-2 border-slate-800/10 dark:border-slate-800/60">
                      <span className="opacity-70">Last Successful Sync:</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate" title={dbStatus.syncDetails?.lastSuccessfulSync}>
                      {dbStatus.syncDetails?.lastSuccessfulSync || "None in session"}
                    </p>
                  </div>
                </div>

                {/* CARD 4: SERVER HEALTH */}
                <div className={`p-5 border rounded-lg space-y-4 md:col-span-2 lg:col-span-1 ${
                  isDarkMode ? "bg-slate-950 border-slate-800/60" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800/10 dark:border-slate-800/60">
                    <div className="flex items-center space-x-2">
                      <Cpu className="text-indigo-500" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">NodeJS Server</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">Runtime Core</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="opacity-70">Uptime:</span>
                      <span className="font-bold text-slate-600 dark:text-slate-200">{dbStatus.serverDetails?.uptime || "N/A"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="opacity-70">API Latency:</span>
                      <span className="font-bold text-emerald-500">{dbStatus.serverDetails?.apiResponseTime || "N/A"}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] opacity-50">
                        <span>Heap Allocation Density</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-1.5 rounded-full" 
                          style={{ width: "35%" }} 
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t pt-2 border-slate-800/10 dark:border-slate-800/60">
                      <span className="opacity-70">Heap Memory:</span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold truncate">
                      {dbStatus.serverDetails?.memoryUsage || "N/A"}
                    </p>
                  </div>
                </div>

                {/* CARD 5: DISK & BACKUPS */}
                <div className={`p-5 border rounded-lg space-y-4 md:col-span-2 lg:col-span-2 ${
                  isDarkMode ? "bg-slate-950 border-slate-800/60" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800/10 dark:border-slate-800/60">
                    <div className="flex items-center space-x-2">
                      <FileText className="text-amber-500" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Local Storage & Backups</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">Host Disk</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="opacity-70">Local Cache Folder:</span>
                        <span className="font-bold text-cyan-500">{dbStatus.storageUsage}</span>
                      </div>
                      <div className="p-2 bg-slate-200 dark:bg-slate-900/40 rounded border border-slate-300 dark:border-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400">
                        Contains database_backup.json, images, local databases, and temporary configuration cache stores.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="opacity-70">Backup Status:</span>
                      </div>
                      <span className="font-bold text-emerald-500 block text-xs truncate" title={dbStatus.backupStatus}>
                        {dbStatus.backupStatus || "Missing Backup File"}
                      </span>
                      <div className="p-2 bg-slate-200 dark:bg-slate-900/40 rounded border border-slate-300 dark:border-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400">
                        Disaster recovery active. Full ACID JSON dynamic schema copies are safely mirrored both locally and inside remote PostgreSQL persistent tables.
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-12 font-mono text-xs text-slate-500 space-y-3">
              <Database size={32} className="mx-auto text-slate-400 dark:text-slate-600 animate-pulse" />
              <p>System metrics have not been queried in this session yet.</p>
              <button 
                onClick={fetchDbStatus} 
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded text-xs transition-all"
              >
                Load System Diagnostics
              </button>
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

          {/* Action Verification Block */}
          <div className="bg-slate-950 border border-amber-500/10 p-4 rounded-lg space-y-3">
            <span className="text-xs font-bold text-amber-400 font-sans flex items-center gap-1.5">
              <Shield size={14} /> Security Credentials Verification Required
            </span>
            <p className="text-[11px] text-slate-400">
              Platform Owner modifications are highly protected. Please enter your account password or the Founder Security Passcode before adding or removing platform owners.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-400">Your Account Password</label>
                <input
                  type="password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">Founder Security Passcode</label>
                <input
                  type="password"
                  value={verifyPasscode}
                  onChange={(e) => setVerifyPasscode(e.target.value)}
                  placeholder="Passcode"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 mt-1 focus:outline-none focus:border-cyan-400 text-slate-200"
                />
              </div>
            </div>
          </div>

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
          TAB: AUTHORIZED TENANT ADMIN MANAGEMENT (ERP TENANT ISOLATION)
          ========================================================================= */}
      {activeSubTab === "tenantAdmins" && (
        <div id="founder-tab-tenant-admins" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Building className="text-cyan-400" size={20} />
              <div>
                <h2 className="text-base font-bold font-sans text-white">Authorized Tenant Admin Management</h2>
                <p className="text-xs font-mono text-cyan-400">অথরাইজড টেনেন্ট অ্যাডমিন ও স্বাধীন মেস ওয়ার্কস্পেস ব্যবস্থাপনা</p>
              </div>
            </div>
            <button
              onClick={fetchTenantAdmins}
              disabled={tenantAdminsLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded transition-all w-fit"
            >
              <RefreshCw size={12} className={tenantAdminsLoading ? "animate-spin" : ""} />
              <span>Refresh List</span>
            </button>
          </div>

          <p className="text-xs font-mono text-slate-400 max-w-3xl leading-relaxed">
            এখানে আপনি নতুন মেস অ্যাডমিনদের ইমেইল ও কোটা অনুমোদন করতে পারবেন। অনুমোদিত অ্যাডমিনরা স্বাধীনভাবে লগইন করে তাদের নিজস্ব মেস ওয়ার্কস্পেস তৈরি ও পরিচালনা করতে পারবেন। তারা আপনার আসল মেসের কোনো তথ্য দেখতে বা পরিবর্তন করতে পারবে না; তাদের সকল ডেটাবেজ ও আইডি সম্পূর্ণ আলাদা ও সুরক্ষিত থাকবে।
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Tenant Admins</span>
              <span className="text-xl font-bold font-mono text-cyan-400">{tenantAdmins.length}</span>
              <span className="text-[10px] font-mono text-slate-400 block">অনুমোদিত অ্যাডমিন</span>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Quota Allocated</span>
              <span className="text-xl font-bold font-mono text-purple-400">
                {tenantAdmins.reduce((sum, a) => sum + (a.maxMesses || 1), 0)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">বরাদ্দকৃত মেস কোটা</span>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Created Messes</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {tenantAdmins.reduce((sum, a) => sum + (a.createdMessesCount || (a.allowedMesses?.length || 0)), 0)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">সক্রিয় তৈরি মেস</span>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Active Status</span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {tenantAdmins.filter(a => a.status === "ACTIVE").length} / {tenantAdmins.length}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">সচল অ্যাকাউন্ট</span>
            </div>
          </div>

          {/* Form: Authorize New Tenant Admin */}
          <div className="p-5 bg-slate-950 border border-cyan-500/20 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
              <Plus size={14} />
              <span>Authorize New Tenant Admin / নতুন টেনেন্ট অ্যাডমিন অনুমোদন</span>
            </div>

            <form onSubmit={handleAddTenantAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-slate-400 block">Admin Email Address <span className="text-rose-400">*</span></label>
                  <input
                    type="email"
                    required
                    value={newTenantEmail}
                    onChange={(e) => setNewTenantEmail(e.target.value)}
                    placeholder="e.g. admin@gmail.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-600"
                  />
                  <p className="text-[10px] text-slate-500">Google বা Password দিয়ে এই ইমেইলে লগইন করবেন।</p>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Admin Name</label>
                  <input
                    type="text"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    placeholder="e.g. মোঃ রহিম আহমেদ"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={newTenantPhone}
                    onChange={(e) => setNewTenantPhone(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Allowed Mess Quota (সর্বোচ্চ কয়টি মেস তৈরি করতে পারবেন)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTenantMaxMesses}
                    onChange={(e) => setNewTenantMaxMesses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500">যেমন: ১, ২ বা ৩ টি মেস।</p>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Initial Password (ঐচ্ছিক - পাসওয়ার্ড লগইনের জন্য)</label>
                  <input
                    type="password"
                    value={newTenantPassword}
                    onChange={(e) => setNewTenantPassword(e.target.value)}
                    placeholder="নূন্যতম ৬ অক্ষর (বা Google Login ব্যবহার করবেন)"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Internal Notes (রেফারেন্স বা সাবস্ক্রিপশন নোট)</label>
                  <input
                    type="text"
                    value={newTenantNotes}
                    onChange={(e) => setNewTenantNotes(e.target.value)}
                    placeholder="e.g. 3 Messes plan - Paid 1500 BDT via bKash"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addingTenant}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded transition-all disabled:opacity-50 cursor-pointer"
                >
                  <UserCheck size={14} />
                  <span>{addingTenant ? "AUTHORIZING..." : "AUTHORIZE TENANT ADMIN / অ্যাডমিন অনুমোদন করুন"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder="Search by email, name, phone..."
                className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-600"
              />
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <span className="text-slate-500">Filter:</span>
              {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTenantStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                    tenantStatusFilter === filter
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Tenant Admins List */}
          {tenantAdminsLoading ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono animate-pulse">
              Loading authorized tenant admins from platform controls...
            </div>
          ) : (
            (() => {
              const filtered = tenantAdmins.filter((t) => {
                if (tenantStatusFilter !== "ALL" && t.status !== tenantStatusFilter) return false;
                if (!tenantSearch.trim()) return true;
                const q = tenantSearch.toLowerCase();
                return (
                  t.email?.toLowerCase().includes(q) ||
                  t.name?.toLowerCase().includes(q) ||
                  t.phone?.toLowerCase().includes(q) ||
                  t.notes?.toLowerCase().includes(q) ||
                  (t.createdMesses || []).some((m: any) => m.name?.toLowerCase().includes(q) || m.messCode?.toLowerCase().includes(q))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-500 text-xs font-mono bg-slate-950 border border-slate-800/80 rounded-lg">
                    {tenantAdmins.length === 0 
                      ? "এখনো কোনো টেনেন্ট অ্যাডমিন অনুমোদন করা হয়নি। ওপরের ফর্মটি পূরণ করে অ্যাডমিন যুক্ত করুন।"
                      : "কোনো অ্যাডমিন মেলেনি। সার্চ বা ফিল্টার পরিবর্তন করুন।"}
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filtered.map((t) => {
                    const messesCount = t.createdMessesCount || (t.allowedMesses?.length || 0);
                    const maxAllowed = t.maxMesses || 1;
                    const quotaPct = Math.min(100, Math.round((messesCount / maxAllowed) * 100));

                    return (
                      <div
                        key={t.id || t.email}
                        className="p-4 bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white font-sans">{t.name || "Tenant Admin"}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                                t.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}>
                                {t.status || "ACTIVE"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
                              <span className="text-cyan-400">{t.email}</span>
                              {t.phone && <span>📞 {t.phone}</span>}
                              {t.createdAt && <span className="text-[10px] text-slate-500">অনুমোদিত: {new Date(t.createdAt).toLocaleDateString()}</span>}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 self-start sm:self-auto">
                            <button
                              onClick={() => {
                                setEditingTenant(t);
                                setEditMaxMesses(t.maxMesses || 1);
                                setEditNotes(t.notes || "");
                                setEditStatus(t.status || "ACTIVE");
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded transition-all"
                              title="Edit Quota & Notes"
                            >
                              <Edit3 size={12} />
                              <span>Edit Quota</span>
                            </button>

                            <button
                              onClick={() => handleUpdateTenantAdmin(t.id || t.email, {
                                status: t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"
                              })}
                              className={`p-1.5 rounded border transition-all text-xs font-mono ${
                                t.status === "ACTIVE"
                                  ? "bg-rose-950/20 border-rose-800/40 text-rose-400 hover:bg-rose-900/30"
                                  : "bg-emerald-950/20 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/30"
                              }`}
                              title={t.status === "ACTIVE" ? "Suspend Admin" : "Activate Admin"}
                            >
                              {t.status === "ACTIVE" ? <UserX size={13} /> : <UserCheck size={13} />}
                            </button>

                            <button
                              onClick={() => handleRevokeTenantAdmin(t.id || t.email, t.email)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded border border-transparent hover:border-rose-800/30 transition-all"
                              title="Revoke Admin Access"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Quota & Created Messes overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono pt-1">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Mess Creation Quota:</span>
                              <span className="font-bold text-slate-200">
                                {messesCount} / {maxAllowed} Messes Created ({quotaPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  messesCount >= maxAllowed ? "bg-amber-400" : "bg-cyan-400"
                                }`}
                                style={{ width: `${quotaPct}%` }}
                              />
                            </div>
                            {t.notes && (
                              <p className="text-[11px] text-slate-400 pt-1 italic">
                                📝 {t.notes}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-slate-400 text-[11px] block">Created Isolated Mess Workspaces:</span>
                            {t.createdMesses && t.createdMesses.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {t.createdMesses.map((m: any) => (
                                  <span
                                    key={m.id}
                                    className="px-2 py-0.5 rounded text-[11px] bg-slate-900 border border-slate-800 text-slate-200 flex items-center space-x-1"
                                  >
                                    <Building size={10} className="text-cyan-400" />
                                    <span>{m.name}</span>
                                    {m.messCode && <span className="text-[9px] text-slate-500 font-mono">({m.messCode})</span>}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic block">
                                এই অ্যাডমিন এখনো কোনো মেস তৈরি করেননি (No mess created yet).
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}

          {/* Edit Tenant Admin Modal */}
          {editingTenant && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Edit3 size={16} className="text-cyan-400" />
                    <h3 className="text-sm font-bold text-white font-sans">Edit Tenant Admin Quota</h3>
                  </div>
                  <button
                    onClick={() => setEditingTenant(null)}
                    className="text-slate-400 hover:text-white transition-all p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Admin Target</span>
                    <span className="font-bold text-cyan-400 block text-sm">{editingTenant.email}</span>
                    <span className="text-slate-500 block text-[11px]">{editingTenant.name || "Tenant Admin"}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block">Max Allowed Messes Quota (কোটা বৃদ্ধি/হ্রাস)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editMaxMesses}
                      onChange={(e) => setEditMaxMesses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                    <p className="text-[10px] text-slate-500">বর্তমানে তৈরি আছে: {editingTenant.createdMessesCount || (editingTenant.allowedMesses?.length || 0)} টি মেস</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block">Account Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="ACTIVE">ACTIVE (সক্রিয়)</option>
                      <option value="SUSPENDED">SUSPENDED (স্থগিত / সাময়িক লক)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block">Internal Notes</label>
                    <textarea
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="e.g. Extended subscription to 5 messes on Sep 25"
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setEditingTenant(null)}
                    className="px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={savingEditTenant}
                    onClick={() => handleUpdateTenantAdmin(editingTenant.id || editingTenant.email, {
                      maxMesses: editMaxMesses,
                      status: editStatus,
                      notes: editNotes
                    })}
                    className="px-4 py-1.5 text-xs font-mono bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded transition-all disabled:opacity-50"
                  >
                    {savingEditTenant ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* =========================================================================
          TAB 10: BACKUP & RESTORE
          ========================================================================= */}
      {activeSubTab === "backup" && (
        <div id="founder-tab-backup" className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Download className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold font-sans">Database Backup & Restore</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center">
                <Download size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Export Database Backup</h3>
                <p className="text-xs text-slate-400">Download a complete .json snapshot of the entire ERP database, all settings, and configurations.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const token = localStorage.getItem("mess_token") || sessionStorage.getItem("mess_token") || localStorage.getItem("mess_session_token");
                    const res = await fetch("/api/admin/backup/export", {
                      headers: { "Authorization": "Bearer " + token }
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      alert(err.error || "Export failed");
                      return;
                    }
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = "mess_erp_full_backup.json";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    console.error("Export failed", e);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs transition-colors"
              >
                EXPORT BACKUP (.JSON)
              </button>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center">
                <Upload size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Import Database Backup</h3>
                <p className="text-xs text-slate-400">Restore the ERP to a previous state using a valid database_backup.json file.</p>
              </div>
              <label className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs transition-colors cursor-pointer text-center block">
                IMPORT BACKUP (.JSON)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      setLoading(true);
                      const fileContent = await file.text();
                      const payload = JSON.parse(fileContent);

                      const db = payload.db || payload;
                      const membersCount = Array.isArray(db?.members) ? db.members.length : 0;
                      const monthsCount = Array.isArray(db?.months) ? db.months.length : 0;
                      const mealsCount = Array.isArray(db?.meals) ? db.meals.length : 0;
                      const depositsCount = Array.isArray(db?.deposits) ? db.deposits.length : 0;
                      const marketCount = Array.isArray(db?.marketEntries) ? db.marketEntries.length : 0;

                      let warningMsg = "";
                      if (mealsCount === 0 || depositsCount === 0) {
                        warningMsg = "\n\n⚠️ সতর্কতা (WARNING): এই ব্যাকআপে মিল (Meals) বা ডিপোজিট (Deposits) সংখ্যা ০! এটি ইমপোর্ট করলে সংশ্লিষ্ট মেসের হিসাব শূন্য হয়ে যাবে।";
                      }

                      const confirmMsg = `📋 ব্যাকআপ ফাইল বিবরণী (Backup Preview):\n` +
                        `• সদস্য (Members): ${membersCount} জন\n` +
                        `• মাস (Months): ${monthsCount} টি\n` +
                        `• মিল রেকর্ড (Meals): ${mealsCount} টি\n` +
                        `• ডিপোজিট (Deposits): ${depositsCount} টি\n` +
                        `• বাজার এন্ট্রি (Market Entries): ${marketCount} টি\n` +
                        warningMsg +
                        `\n\nআপনি কি নিশ্চিতভাবে এই ব্যাকআপটি বর্তমান অ্যাক্টিভ মেসে রিস্টোর করতে চান?\n(আগের তথ্যের একটি সেফটি স্ন্যাপশট স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকবে)`;

                      if (!window.confirm(confirmMsg)) {
                        setLoading(false);
                        return;
                      }
                      
                      const token = localStorage.getItem("mess_token") || sessionStorage.getItem("mess_token") || localStorage.getItem("mess_session_token");
                      const res = await fetch("/api/admin/backup/import", {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          "Authorization": "Bearer " + token
                        },
                        body: JSON.stringify(payload)
                      });
                      
                      if (res.ok) {
                        const data = await res.json().catch(() => ({}));
                        alert(data.message || "Database successfully restored! Refreshing system...");
                        setTimeout(() => window.location.reload(), 1500);
                      } else {
                        const err = await res.json().catch(() => ({}));
                        alert(err.error || "Failed to import backup");
                      }
                    } catch (error) {
                      console.error(error);
                      alert("Invalid JSON format or corrupted backup file.");
                    } finally {
                      setLoading(false);
                      if (e.target) e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}


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
