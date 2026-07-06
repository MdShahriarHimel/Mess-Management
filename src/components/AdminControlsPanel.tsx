import React, { useState, useEffect } from "react";
import { Shield, Check, Save, AlertTriangle, Building, CheckSquare, Square } from "lucide-react";
import { Member, UserRole } from "../types";

interface Mess {
  id: string;
  name: string;
}

interface AdminControlsPanelProps {
  messes: Mess[];
  sessionToken: string;
  isDarkMode: boolean;
}

interface AdminControlConfig {
  allowedMesses: string[];
  canEditBills: boolean;
  canManageMeals: boolean;
  canAddMarkets: boolean;
  canSuspendMembers: boolean;
}

export function AdminControlsPanel({ messes, sessionToken, isDarkMode }: AdminControlsPanelProps) {
  const [admins, setAdmins] = useState<Member[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");
  const [controls, setControls] = useState<Record<string, AdminControlConfig>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // States for selected admin's configuration
  const [allowedMesses, setAllowedMesses] = useState<string[]>([]);
  const [canEditBills, setCanEditBills] = useState(true);
  const [canManageMeals, setCanManageMeals] = useState(true);
  const [canAddMarkets, setCanAddMarkets] = useState(true);
  const [canSuspendMembers, setCanSuspendMembers] = useState(true);

  // Fetch all members to find other admins across all messes
  const fetchData = async () => {
    setLoading(true);
    try {
      const controlsResp = await fetch("/api/admin/controls", {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });

      if (controlsResp.ok) {
        const controlsData = await controlsResp.json();
        
        // Use the multi-mess scan list from the endpoint or fallback
        const adminUsers = controlsData.admins || [];

        setAdmins(adminUsers);
        setControls(controlsData.controls || {});

        if (adminUsers.length > 0) {
          const firstAdmin = adminUsers[0];
          setSelectedAdminId(firstAdmin.id);
          loadAdminConfig(firstAdmin.id, firstAdmin.email, controlsData.controls || {});
        }
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to load admin controlling panel configurations." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionToken) {
      fetchData();
    }
  }, [sessionToken]);

  const loadAdminConfig = (adminId: string, email: string, allControls: Record<string, AdminControlConfig>) => {
    const config = (email && allControls[email.toLowerCase()]) || allControls[adminId] || {
      allowedMesses: [],
      canEditBills: true,
      canManageMeals: true,
      canAddMarkets: true,
      canSuspendMembers: true
    };

    setAllowedMesses(config.allowedMesses || []);
    setCanEditBills(config.canEditBills !== false);
    setCanManageMeals(config.canManageMeals !== false);
    setCanAddMarkets(config.canAddMarkets !== false);
    setCanSuspendMembers(config.canSuspendMembers !== false);
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAdminId(id);
    const selectedAdmin = admins.find(a => a.id === id);
    if (selectedAdmin) {
      loadAdminConfig(id, selectedAdmin.email, controls);
    }
    setMessage(null);
  };

  const toggleMessSelection = (messId: string) => {
    if (allowedMesses.includes(messId)) {
      setAllowedMesses(allowedMesses.filter((id) => id !== messId));
    } else {
      setAllowedMesses([...allowedMesses, messId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedAdmin = admins.find(a => a.id === selectedAdminId);
    if (!selectedAdmin) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/controls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          userId: selectedAdmin.id,
          email: selectedAdmin.email,
          allowedMesses,
          canEditBills,
          canManageMeals,
          canAddMarkets,
          canSuspendMembers
        })
      });

      if (response.ok) {
        const data = await response.json();
        setControls(data.controls || {});
        setMessage({ type: "success", text: "Admin controlling configurations saved successfully!" });
      } else {
        const err = await response.json();
        setMessage({ type: "error", text: err.error || "Failed to save configurations." });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Network error saving configurations." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200"} animate-pulse`}>
        <div className="h-4 bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-slate-800 rounded mb-4"></div>
        <div className="h-20 bg-slate-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl border lg:col-span-2 ${
      isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="text-cyan-400" size={20} />
        <h3 className="text-sm font-bold font-display text-cyan-300">Admin Controlling Panel (ERP Control)</h3>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-6">
        As the ultimate authority, you can restrict standard Admins' control and edit permissions, select which messes they administer, and prevent administrative overreaches.
      </p>

      {admins.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-800/50 text-center">
          <AlertTriangle className="mx-auto text-orange-500 mb-2" size={20} />
          <p className="text-xs text-slate-400">No standard Admin accounts found in this ERP workspace to configure.</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block font-display">
              Select Admin to Configure
            </label>
            <select
              value={selectedAdminId}
              onChange={handleAdminChange}
              className="w-full max-w-md px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-850 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {admins.map((adm) => (
                <option key={adm.id} value={adm.id}>
                  {adm.nickname} ({adm.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Allowed messes branch scope */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block font-display">
                Allowed Mess Branches Scope
              </span>
              <p className="text-[10px] text-slate-500 mb-2">
                If no messes are selected, they can access all messes by default. Otherwise, they can only switch to selected messes.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {messes.map((mess) => {
                  const isChecked = allowedMesses.includes(mess.id);
                  return (
                    <button
                      key={mess.id}
                      type="button"
                      onClick={() => toggleMessSelection(mess.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                        isChecked
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-bold"
                          : "bg-slate-950/20 border-slate-850 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <Building size={14} className={isChecked ? "text-cyan-400" : "text-slate-500"} />
                        <span>{mess.name}</span>
                      </div>
                      {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Permission checklist toggles */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block font-display">
                Action Control Restrictions
              </span>
              <p className="text-[10px] text-slate-500 mb-2">
                Uncheck features below to deny this administrator from executing respective operations.
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/15 border border-slate-850/50 cursor-pointer hover:bg-slate-950/30 transition-all">
                  <input
                    type="checkbox"
                    checked={canEditBills}
                    onChange={(e) => setCanEditBills(e.target.checked)}
                    className="accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Can Edit Utility Bills</p>
                    <p className="text-[9px] text-slate-500">Allow adding, editing, or deleting monthly utility bills.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/15 border border-slate-850/50 cursor-pointer hover:bg-slate-950/30 transition-all">
                  <input
                    type="checkbox"
                    checked={canManageMeals}
                    onChange={(e) => setCanManageMeals(e.target.checked)}
                    className="accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Can Manage Daily Meals</p>
                    <p className="text-[9px] text-slate-500">Allow logging, editing, and shifting daily member meal counts.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/15 border border-slate-850/50 cursor-pointer hover:bg-slate-950/30 transition-all">
                  <input
                    type="checkbox"
                    checked={canAddMarkets}
                    onChange={(e) => setCanAddMarkets(e.target.checked)}
                    className="accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Can Log/Manage Markets</p>
                    <p className="text-[9px] text-slate-500">Allow adding or deleting daily grocery purchase market entries.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/15 border border-slate-850/50 cursor-pointer hover:bg-slate-950/30 transition-all">
                  <input
                    type="checkbox"
                    checked={canSuspendMembers}
                    onChange={(e) => setCanSuspendMembers(e.target.checked)}
                    className="accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Can Suspend / Archive Members</p>
                    <p className="text-[9px] text-slate-500">Allow suspending active profiles, left notices, or soft deletion.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-xs ${
              message.type === "success"
                ? "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400"
                : "bg-red-500/15 border border-red-500/20 text-red-400"
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wider"
            >
              <Save size={14} />
              {saving ? "SAVING CONTROLS..." : "SAVE ADMIN PERMISSIONS"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
