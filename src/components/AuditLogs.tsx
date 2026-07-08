/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Shield, Search, Clock, Info } from "lucide-react";
import { Member, AuditLog } from "../types.js";

interface AuditLogsProps {
  currentUser: Member;
  isDarkMode: boolean;
  members?: Member[];
}

export default function AuditLogs({ currentUser, isDarkMode, members = [] }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/auditlogs", {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.auditLogs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="audit-logs-wrapper">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Shield className="text-rose-500 animate-pulse" />
            System Audit Trail
          </h2>
          <p className="text-xs text-slate-400">
            Immutable log tracking every action, security override, and database change.
          </p>
        </div>
      </div>

      {/* Info warning */}
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-400">
        <Info size={16} className="shrink-0" />
        <span className="font-semibold leading-relaxed">
          SECURITY PROTOCOL ACTIVE: Under Bangladesh Mess ERP standards, audit histories cannot be edited, deleted, or cleared by ANY account status, including system Administrators.
        </span>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
        <input
          id="audit-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search logs by action, userName, or reason..."
          className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
            isDarkMode 
              ? "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500" 
              : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
          }`}
        />
      </div>

      {/* Table list */}
      <div className={`p-5 rounded-2xl border ${
        isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
      }`} id="audit-logs-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? "bg-slate-950/30 border-slate-850 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-600"} font-bold`}>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Previous Value</th>
                <th className="py-3 px-4">New Value</th>
                <th className="py-3 px-4">Reason Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">No matching logs recorded.</td>
                </tr>
              ) : (
                filteredLogs.map((l) => {
                  const opMember = members.find(m => m.id === l.userId || m.nickname.toLowerCase() === l.userName.toLowerCase());
                  const isUltimateAdminLog = opMember?.email?.toLowerCase() === "mdshahriarhimel@gmail.com" || 
                                             l.userName.toLowerCase() === "mdshahriarhimel" || 
                                             l.userName.toLowerCase() === "mdshahriarhimel@gmail.com";
                  const isSuperUserLog = opMember?.role === "SUPERUSER" || l.reason.toLowerCase().includes("superuser");
                  
                  const logTime = new Date(l.timestamp).getTime();
                  const isRecent = (Date.now() - logTime) < 24 * 60 * 60 * 1000;
                  
                  const rowClass = (isRecent && !isUltimateAdminLog)
                    ? (isDarkMode ? "bg-amber-500/10 border-l-2 border-amber-500 hover:bg-amber-500/15 transition-all duration-150" : "bg-amber-50/70 border-l-2 border-amber-400 hover:bg-amber-100 transition-all duration-150")
                    : "hover:bg-cyan-500/5 transition-all duration-150";

                  return (
                    <tr key={l.id} className={rowClass}>
                      <td className="py-3 px-4 text-slate-500 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(l.timestamp).toLocaleString()}
                        {isRecent && !isUltimateAdminLog && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-500/20 text-amber-500 animate-pulse">Recent</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-400">
                        <div className="flex items-center gap-1.5">
                          <span>{l.userName}</span>
                          {isSuperUserLog && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" title="Action by Super User" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-orange-400">{l.action}</td>
                      <td className="py-3 px-4 truncate max-w-[120px]" title={l.oldValue}>{l.oldValue}</td>
                      <td className="py-3 px-4 truncate max-w-[120px]" title={l.newValue}>{l.newValue}</td>
                      <td className="py-3 px-4 text-slate-300 max-w-[200px] whitespace-normal" title={l.reason}>{l.reason}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
