import React, { useState, useEffect } from "react";
import { Vote, Award, Check, UserCheck, ShieldAlert, ShieldCheck, ToggleLeft, ToggleRight, Trash2, Plus, RefreshCw, UserMinus } from "lucide-react";

import { Member, UserRole, RespectSenioritySettings } from "../types.js";
import { getRespectDisplayName } from "../utils/respectHelper.js";

interface DemocracyProps {
  currentUser: Member;
  isDarkMode: boolean;
  members: Member[];
  elections: {
    enabled: boolean;
    topic?: string;
    subject?: string;
    voteType?: "superuser" | "custom";
    options?: string[];
    isFinal?: boolean;
    candidates: string[];
    votes: {
      SUPERUSER: Record<string, string>;
      ASSISTANT_SUPERUSER: Record<string, string>;
      CUSTOM?: Record<string, string>;
    };
    startDate?: string;
    endDate?: string;
  };
  sessionToken: string;
  onRefresh: () => void;
  currencySymbol?: string;
  respectSenioritySettings?: RespectSenioritySettings;
}

export default function Democracy({
  currentUser,
  isDarkMode,
  members,
  elections,
  sessionToken,
  onRefresh,
  currencySymbol = "৳",
  respectSenioritySettings
}: DemocracyProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

  const isElevatedUser = ["ADMIN", "MANAGER", "SUPERUSER"].includes(currentUser.role);

  // Helper to render member photo
  const renderMemberPhoto = (memberId: string, name: string, sizeClass = "w-10 h-10") => {
    const found = members.find(m => m.id === memberId);
    const photo = found ? found.photo : null;
    const initial = name ? name.charAt(0).toUpperCase() : "M";
    if (photo) {
      return (
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          className={`${sizeClass} rounded-full object-cover border border-cyan-500/40 shrink-0`}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-extrabold uppercase font-mono shrink-0`}>
        {initial}
      </div>
    );
  };

  // Helper to count votes for a candidate for a role
  const getVoteCount = (role: "SUPERUSER" | "ASSISTANT_SUPERUSER" | "CUSTOM", candidateId: string) => {
    const roleVotes = (elections.votes as any)[role] || {};
    return Object.values(roleVotes).filter(cid => cid === candidateId).length;
  };

  // Get voters of a specific candidate
  const getVotersOfCandidate = (role: "SUPERUSER" | "ASSISTANT_SUPERUSER" | "CUSTOM", candidateId: string) => {
    const roleVotes = (elections.votes as any)[role] || {};
    return Object.entries(roleVotes)
      .filter(([_, cid]) => cid === candidateId)
      .map(([voterId]) => getRespectDisplayName(currentUser, members.find(m => m.id === voterId), respectSenioritySettings) || "Unknown");
  };

  // Handle Admin saving configuration
  const handleConfigureElections = async (enabled: boolean, candidates: string[]) => {
    setLoading(true);
    try {
      const response = await fetch("/api/elections/configure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ enabled, candidates })
      });
      if (response.ok) {
        onRefresh();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to update election configuration");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating election configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleGlobalRefresh = () => {
      onRefresh();
    };
    window.addEventListener("app-global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("app-global-refresh", handleGlobalRefresh);
  }, [onRefresh]);

  // Handle member casting a vote
  const handleCastVote = async (roleType: "SUPERUSER" | "ASSISTANT_SUPERUSER" | "CUSTOM", candidateId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/elections/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ roleType, candidateId })
      });
      if (response.ok) {
        onRefresh();
        alert(`Successfully casted your secure choice for ${roleType === "CUSTOM" ? (elections.topic || "poll") : roleType}!`);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to cast vote");
      }
    } catch (e) {
      console.error(e);
      alert("Error casting vote.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin resolving election (declaring a winner)
  const handleResolveElection = async (targetRole: "SUPERUSER" | "ASSISTANT_SUPERUSER" | "CUSTOM") => {
    if (targetRole === "CUSTOM") {
      const customVotes = (elections as any).votes?.CUSTOM || {};
      const opts = elections.options || [];
      
      const counts: Record<string, number> = {};
      opts.forEach((o: string) => { counts[o] = 0; });
      Object.values(customVotes).forEach((v: any) => {
        if (counts[v] !== undefined) counts[v]++;
      });

      let max = -1;
      let winnerOption = "";
      Object.entries(counts).forEach(([o, c]) => {
        if (c > max) {
          max = c;
          winnerOption = o;
        }
      });

      if (confirm(`Do you want to finalize this poll for "${elections.topic}"? This will close the ballot, hide the Democracy tab, and publish the final results with "${winnerOption || 'No votes'}" as the winner on the Dashboard for everyone to see.`)) {
        setLoading(true);
        try {
          const response = await fetch("/api/elections/resolve", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ targetRole, winnerId: winnerOption || "None" })
          });
          if (response.ok) {
            onRefresh();
            alert(`Successfully finalized the poll and published results!`);
          } else {
            const err = await response.json().catch(() => ({}));
            alert(err.error || "Failed to resolve poll");
          }
        } catch (e) {
          console.error(e);
          alert("Error resolving poll.");
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    // Determine the candidate with the highest vote counts
    const candidateVotes = (elections.candidates || []).map(cid => ({
      id: cid,
      count: getVoteCount(targetRole, cid)
    }));

    if (candidateVotes.length === 0) {
      alert("There are no candidates in the election list to resolve.");
      return;
    }

    // Sort by count descending
    candidateVotes.sort((a, b) => b.count - a.count);
    const leadingCandidate = candidateVotes[0];

    if (leadingCandidate.count === 0) {
      alert("No votes have been cast for this position yet.");
      return;
    }

    const winnerMember = members.find(m => m.id === leadingCandidate.id);
    if (!winnerMember) {
      alert("Elected winner not found in database.");
      return;
    }

    if (confirm(`Do you want to democratically promote "${getRespectDisplayName(currentUser, winnerMember, respectSenioritySettings)}" to ${targetRole}? This will upgrade their system privileges, clear current ballots for this role, and log this resolution in the Audit Trails.`)) {
      setLoading(true);
      try {
        const response = await fetch("/api/elections/resolve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`
          },
          body: JSON.stringify({ targetRole, winnerId: leadingCandidate.id })
        });
        if (response.ok) {
          onRefresh();
          alert(`Successfully promoted ${winnerMember.nickname} to ${targetRole}!`);
        } else {
          const err = await response.json().catch(() => ({}));
          alert(err.error || "Failed to resolve election");
        }
      } catch (e) {
        console.error(e);
        alert("Error resolving election.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Check if current user has voted in a role
  const getUserVotedCandidateId = (role: "SUPERUSER" | "ASSISTANT_SUPERUSER" | "CUSTOM") => {
    const roleVotes = (elections.votes as any)[role] || {};
    return roleVotes[currentUser.id] || null;
  };

  return (
    <div className="space-y-6" id="democracy-view-container">
      {/* Top Banner */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <Vote className="text-cyan-400" />
              Democratic Ballot & Electoral Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select mess officers democratically. Cast your secure ballot for Super User and Assistant Super User positions below.
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white bg-slate-950 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Ballot
          </button>
        </div>
      </div>

      {/* Admin Panel (ONLY Visible to Admin, Manager, Super User) */}
      {isElevatedUser && (
        <div className={`p-6 rounded-2xl border border-orange-500/20 bg-orange-950/5 relative overflow-hidden`} id="admin-elections-ctrl">
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 bg-orange-500/5 rounded-full blur-xl pointer-events-none"></div>
          
          <h3 className="text-sm font-bold font-display text-orange-400 flex items-center gap-2 uppercase tracking-wider mb-4">
            <ShieldAlert size={16} /> ERP Democracy Controller Panel
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status */}
            <div className="space-y-4 lg:col-span-1">
              {/* Toggle enabled state */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
                <p className="text-xs font-bold text-slate-300 block uppercase tracking-wider">Ballot Session Status</p>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-mono font-bold ${elections.enabled ? "text-emerald-400" : "text-slate-400"}`}>
                    {elections.enabled ? "ACTIVE & OPEN TO ALL VOTERS" : "CLOSED / DISABLED"}
                  </span>
                  <button
                    onClick={() => handleConfigureElections(!elections.enabled, elections.candidates)}
                    disabled={loading}
                    className="cursor-pointer text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {elections.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Vote Type info */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-1 text-xs text-slate-400">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">BALLOT INFO</p>
                <p><strong className="text-slate-200">Type:</strong> {elections.voteType === "custom" ? "Custom Opinion Poll" : "Mess Officer Election"}</p>
                <p><strong className="text-slate-200">Topic:</strong> {elections.topic || "N/A"}</p>
                <p><strong className="text-slate-200">Subject:</strong> {elections.subject || "N/A"}</p>
              </div>
            </div>

            {/* Candidates/Options list & Tally */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
                {elections.voteType === "custom" ? (
                  // Custom Poll option management & tally
                  <>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Poll Options & Current Tally</p>
                      <span className="text-[10px] text-slate-500 italic">Preconfigured choices</span>
                    </div>

                    <div className="divide-y divide-slate-850 max-h-[190px] overflow-y-auto pr-1">
                      {(!elections.options || elections.options.length === 0) ? (
                        <div className="text-center py-8 text-xs text-slate-500 italic">No options defined on this custom poll.</div>
                      ) : (
                        elections.options.map((opt) => {
                          const votesCount = Object.values((elections.votes as any)?.CUSTOM || {}).filter(v => v === opt).length;
                          return (
                            <div key={opt} className="py-2.5 flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-200">{opt}</span>
                              <span className="font-mono font-bold text-cyan-400 text-sm">{votesCount} votes</span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-slate-850 pt-3 flex justify-end">
                      <button
                        onClick={() => handleResolveElection("CUSTOM")}
                        disabled={loading}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-600 hover:from-cyan-400 hover:to-emerald-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Award size={13} /> Finalize Poll & Publish Results
                      </button>
                    </div>
                  </>
                ) : (
                  // Superuser/Officer election management & tally
                  <>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ballot Candidates ({elections.candidates?.length || 0})</p>
                      <span className="text-[10px] text-slate-500 italic">Registered candidates can be voted for by all active members</span>
                    </div>

                    <div className="divide-y divide-slate-850 max-h-[190px] overflow-y-auto pr-1">
                      {(!elections.candidates || elections.candidates.length === 0) ? (
                        <div className="text-center py-8 text-xs text-slate-500 italic">No candidates registered on the ballot yet. Add candidates in Settings page.</div>
                      ) : (
                        elections.candidates.map((cid) => {
                          const m = members.find(member => member.id === cid);
                          if (!m) return null;
                          return (
                            <div key={cid} className="py-2.5 flex justify-between items-center text-xs">
                              <div className="flex items-center gap-3">
                                {renderMemberPhoto(cid, m.name, "w-8 h-8")}
                                <div>
                                  <p className="font-bold text-slate-200">{getRespectDisplayName(currentUser, m, respectSenioritySettings)} <span className="font-normal text-[10px] text-slate-400">({m.name})</span></p>
                                  <p className="text-[9px] text-slate-500 uppercase font-mono">{m.role.replace(/_/g, " ")} • {m.assignedTask || "General Member"}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className="font-bold text-orange-400 block">{getVoteCount("SUPERUSER", cid)} votes</span>
                                  <span className="text-[9px] text-slate-500">SU Position</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-purple-400 block">{getVoteCount("ASSISTANT_SUPERUSER", cid)} votes</span>
                                  <span className="text-[9px] text-slate-500">ASU Position</span>
                                </div>

                                <button
                                  onClick={() => {
                                    const newList = elections.candidates.filter(id => id !== cid);
                                    handleConfigureElections(elections.enabled, newList);
                                  }}
                                  disabled={loading}
                                  title="Remove Candidate"
                                  className="p-1 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                                >
                                  <UserMinus size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Resolve Elections Actions */}
                    {elections.candidates && elections.candidates.length > 0 && (
                      <div className="border-t border-slate-850 pt-3 flex flex-wrap gap-2 justify-end">
                        <button
                          onClick={() => handleResolveElection("SUPERUSER")}
                          disabled={loading}
                          className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Award size={13} /> Resolve Winner to SUPER USER
                        </button>
                        <button
                          onClick={() => handleResolveElection("ASSISTANT_SUPERUSER")}
                          disabled={loading}
                          className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Award size={13} /> Resolve Winner to ASSISTANT SUPER USER
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Ballot Casting Section */}
      {!elections.enabled ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isDarkMode ? "bg-slate-900/20 border-slate-800" : "bg-white border-slate-200"
        }`} id="elections-closed-banner">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-950 border border-slate-800 text-slate-500 mb-4 animate-pulse">
            <Vote size={32} />
          </div>
          <h3 className="text-base font-extrabold font-display tracking-wide uppercase text-slate-300">DEMOCRACY BALLOT IS CLOSED</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            The active ballot cycle has been closed or resolved. When opened by an authorized Admin, Manager, or Super User, all eligible members can securely cast votes here.
          </p>
        </div>
      ) : elections.voteType === "custom" ? (
        // Custom Vote Ballot casting
        <div className={`p-6 rounded-2xl border ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white animate-fade-in" : "bg-white border-slate-200 shadow-sm text-slate-800"
        }`} id="democracy-custom-panel">
          <div className="border-b border-cyan-500/10 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold font-display text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Vote size={18} /> Topic: {elections.topic || "Custom Vote"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Please express your democratic choice for: <strong className="text-slate-200">{elections.subject || "options"}</strong></p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-cyan-500/10 text-cyan-400 rounded-full uppercase font-mono border border-cyan-500/20 max-w-max">
              1 Choice Allowed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(!elections.options || elections.options.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-8 text-center col-span-2">No active options listed. Admin/Manager must configure choices.</p>
            ) : (
              elections.options.map((option: string) => {
                const customVotes = (elections.votes as any)?.CUSTOM || {};
                const userVotedChoice = customVotes[currentUser.id] || null;
                const hasVotedForThis = userVotedChoice === option;

                return (
                  <div 
                    key={option} 
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      hasVotedForThis 
                        ? "bg-emerald-950/15 border-emerald-500/40" 
                        : "bg-slate-950/30 border-slate-850 hover:bg-slate-950/50 animate-fade-in"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <p className={`font-bold text-sm ${hasVotedForThis ? "text-emerald-400" : "text-slate-200"}`}>{option}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Select this to submit your official vote.</p>
                      </div>

                      <button
                        onClick={() => handleCastVote("CUSTOM", option)}
                        disabled={loading || hasVotedForThis || !!userVotedChoice}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-80 shrink-0 ${
                          hasVotedForThis 
                            ? "bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-500/10" 
                            : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                        }`}
                      >
                        {hasVotedForThis ? (
                          <>
                            <Check size={14} /> SELECTED
                          </>
                        ) : (
                          "SELECT CHOICE"
                        )}
                      </button>
                    </div>

                    <div className="border-t border-slate-900 mt-2 pt-2 text-[10px] text-slate-500 flex justify-between items-center">
                      <span>Live ballot option</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Position (1): SUPERUSER */}
          <div className={`p-5 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`} id="democracy-superuser-panel">
            <div className="border-b border-cyan-500/10 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold font-display text-orange-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Award size={16} /> Position: Super User (SU)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Assists Admin in meal approvals, logs, and billing audits.</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded uppercase font-mono border border-orange-500/20">
                1 Vote Allowed
              </span>
            </div>

            <div className="space-y-4">
              {(!elections.candidates || elections.candidates.length === 0) ? (
                <p className="text-xs text-slate-500 italic py-8 text-center">No active candidates listed. Admin must add candidates.</p>
              ) : (
                elections.candidates.map((cid) => {
                  const m = members.find(member => member.id === cid);
                  if (!m) return null;
                  
                  const count = getVoteCount("SUPERUSER", cid);
                  const voters = getVotersOfCandidate("SUPERUSER", cid);
                  const userVotedId = getUserVotedCandidateId("SUPERUSER");
                  const hasVotedForThis = userVotedId === cid;

                  return (
                    <div 
                      key={cid} 
                      className={`p-4 rounded-xl border transition-all ${
                        hasVotedForThis 
                          ? "bg-emerald-950/10 border-emerald-500/30" 
                          : "bg-slate-950/30 border-slate-850 hover:bg-slate-950/50"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          {renderMemberPhoto(cid, m.name, "w-12 h-12")}
                          <div>
                            <p className="font-bold text-sm text-slate-200">{getRespectDisplayName(currentUser, m, respectSenioritySettings)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Full Name: {m.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">{m.assignedTask || "General Member"}</p>
                          </div>
                        </div>

                        {/* Vote Action */}
                        <button
                          onClick={() => handleCastVote("SUPERUSER", cid)}
                          disabled={loading || hasVotedForThis}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-80 shrink-0 ${
                            hasVotedForThis 
                              ? "bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-500/10" 
                              : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                          }`}
                        >
                          {hasVotedForThis ? (
                            <>
                              <Check size={14} /> VOTED
                            </>
                          ) : (
                            "CAST BALLOT"
                          )}
                        </button>
                      </div>

                      {/* Vote statistics */}
                      <div className="border-t border-slate-900 mt-3 pt-2.5 flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-semibold text-orange-400 font-mono text-[11px]">{count} Votes Received</span>
                        {voters.length > 0 && (
                          <span className="text-slate-500 max-w-xs truncate italic" title={voters.join(", ")}>
                            Voted by: {voters.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Position (2): ASSISTANT_SUPERUSER */}
          <div className={`p-5 rounded-2xl border ${
            isDarkMode ? "bg-slate-900/40 border-cyan-500/10 text-white" : "bg-white border-slate-200 shadow-sm text-slate-800"
          }`} id="democracy-asu-panel">
            <div className="border-b border-cyan-500/10 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold font-display text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Award size={16} /> Position: Assistant Super User (ASU)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Assists the main SU and Admin in daily moderation.</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded uppercase font-mono border border-purple-500/20">
                1 Vote Allowed
              </span>
            </div>

            <div className="space-y-4">
              {(!elections.candidates || elections.candidates.length === 0) ? (
                <p className="text-xs text-slate-500 italic py-8 text-center">No active candidates listed. Admin must add candidates.</p>
              ) : (
                elections.candidates.map((cid) => {
                  const m = members.find(member => member.id === cid);
                  if (!m) return null;
                  
                  const count = getVoteCount("ASSISTANT_SUPERUSER", cid);
                  const voters = getVotersOfCandidate("ASSISTANT_SUPERUSER", cid);
                  const userVotedId = getUserVotedCandidateId("ASSISTANT_SUPERUSER");
                  const hasVotedForThis = userVotedId === cid;

                  return (
                    <div 
                      key={cid} 
                      className={`p-4 rounded-xl border transition-all ${
                        hasVotedForThis 
                          ? "bg-emerald-950/10 border-emerald-500/30" 
                          : "bg-slate-950/30 border-slate-850 hover:bg-slate-950/50"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          {renderMemberPhoto(cid, m.name, "w-12 h-12")}
                          <div>
                            <p className="font-bold text-sm text-slate-200">{getRespectDisplayName(currentUser, m, respectSenioritySettings)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Full Name: {m.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">{m.assignedTask || "General Member"}</p>
                          </div>
                        </div>

                        {/* Vote Action */}
                        <button
                          onClick={() => handleCastVote("ASSISTANT_SUPERUSER", cid)}
                          disabled={loading || hasVotedForThis}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-80 shrink-0 ${
                            hasVotedForThis 
                              ? "bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-500/10" 
                              : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                          }`}
                        >
                          {hasVotedForThis ? (
                            <>
                              <Check size={14} /> VOTED
                            </>
                          ) : (
                            "CAST BALLOT"
                          )}
                        </button>
                      </div>

                      {/* Vote statistics */}
                      <div className="border-t border-slate-900 mt-3 pt-2.5 flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-semibold text-purple-400 font-mono text-[11px]">{count} Votes Received</span>
                        {voters.length > 0 && (
                          <span className="text-slate-500 max-w-xs truncate italic" title={voters.join(", ")}>
                            Voted by: {voters.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
