import React, { useState } from "react";
import { Vote, Award, Check, UserCheck, ShieldAlert, ShieldCheck, ToggleLeft, ToggleRight, Trash2, Plus, RefreshCw, UserMinus } from "lucide-react";

interface Member {
  id: string;
  name: string;
  nickname: string;
  role: string;
  photo?: string | null;
  assignedTask?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

interface DemocracyProps {
  currentUser: Member;
  isDarkMode: boolean;
  members: Member[];
  elections: {
    enabled: boolean;
    candidates: string[];
    votes: {
      SUPERUSER: Record<string, string>;
      ASSISTANT_SUPERUSER: Record<string, string>;
    };
  };
  sessionToken: string;
  onRefresh: () => void;
  currencySymbol?: string;
}

export default function Democracy({
  currentUser,
  isDarkMode,
  members,
  elections,
  sessionToken,
  onRefresh,
  currencySymbol = "৳"
}: DemocracyProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

  const isSystemAdmin = currentUser.role === "ADMIN";

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
  const getVoteCount = (role: "SUPERUSER" | "ASSISTANT_SUPERUSER", candidateId: string) => {
    const roleVotes = elections.votes[role] || {};
    return Object.values(roleVotes).filter(cid => cid === candidateId).length;
  };

  // Get voters of a specific candidate
  const getVotersOfCandidate = (role: "SUPERUSER" | "ASSISTANT_SUPERUSER", candidateId: string) => {
    const roleVotes = elections.votes[role] || {};
    return Object.entries(roleVotes)
      .filter(([_, cid]) => cid === candidateId)
      .map(([voterId]) => members.find(m => m.id === voterId)?.nickname || "Unknown");
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
        const err = await response.json();
        alert(err.error || "Failed to update election configuration");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating election configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Handle member casting a vote
  const handleCastVote = async (roleType: "SUPERUSER" | "ASSISTANT_SUPERUSER", candidateId: string) => {
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
        alert(`Successfully casted your democratic ballot for ${roleType}!`);
      } else {
        const err = await response.json();
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
  const handleResolveElection = async (targetRole: "SUPERUSER" | "ASSISTANT_SUPERUSER") => {
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

    if (confirm(`Do you want to democratically promote "${winnerMember.nickname}" to ${targetRole}? This will upgrade their system privileges, clear current ballots for this role, and log this resolution in the Audit Trails.`)) {
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
          const err = await response.json();
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
  const getUserVotedCandidateId = (role: "SUPERUSER" | "ASSISTANT_SUPERUSER") => {
    const roleVotes = elections.votes[role] || {};
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

      {/* Admin Panel (ONLY Visible to Admin) */}
      {isSystemAdmin && (
        <div className={`p-6 rounded-2xl border border-orange-500/20 bg-orange-950/5 relative overflow-hidden`} id="admin-elections-ctrl">
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 bg-orange-500/5 rounded-full blur-xl pointer-events-none"></div>
          
          <h3 className="text-sm font-bold font-display text-orange-400 flex items-center gap-2 uppercase tracking-wider mb-4">
            <ShieldAlert size={16} /> Admin Election Controller Panel
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status & Add Candidate */}
            <div className="space-y-4 lg:col-span-1">
              {/* Toggle enabled state */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
                <p className="text-xs font-bold text-slate-300 block uppercase tracking-wider">Election Session Status</p>
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

              {/* Add Candidate Form */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
                <p className="text-xs font-bold text-slate-300 block uppercase tracking-wider">Register Candidate</p>
                <div className="space-y-2">
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="">Select a member...</option>
                    {members
                      .filter(m => !elections.candidates.includes(m.id))
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.nickname} ({m.name})</option>
                      ))
                    }
                  </select>
                  <button
                    onClick={() => {
                      if (!selectedCandidateId) return;
                      const newList = [...elections.candidates, selectedCandidateId];
                      handleConfigureElections(elections.enabled, newList);
                      setSelectedCandidateId("");
                    }}
                    disabled={loading || !selectedCandidateId}
                    className="w-full py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Add Candidate to ballot
                  </button>
                </div>
              </div>
            </div>

            {/* Candidates list & Tally */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ballot Candidates ({elections.candidates?.length || 0})</p>
                  <span className="text-[10px] text-slate-500 italic">Registered candidates can be voted for by all active members</span>
                </div>

                <div className="divide-y divide-slate-850 max-h-[190px] overflow-y-auto pr-1">
                  {(!elections.candidates || elections.candidates.length === 0) ? (
                    <div className="text-center py-8 text-xs text-slate-500 italic">No candidates registered on the ballot yet. Add candidates above.</div>
                  ) : (
                    elections.candidates.map((cid) => {
                      const m = members.find(member => member.id === cid);
                      if (!m) return null;
                      return (
                        <div key={cid} className="py-2.5 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-3">
                            {renderMemberPhoto(cid, m.name, "w-8 h-8")}
                            <div>
                              <p className="font-bold text-slate-200">{m.nickname} <span className="font-normal text-[10px] text-slate-400">({m.name})</span></p>
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
            The active election cycle has not been initialized by the Primary Admin. When opened, all members can securely cast votes for executive Super User roles.
          </p>
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
                            <p className="font-bold text-sm text-slate-200">{m.nickname}</p>
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
                            <p className="font-bold text-sm text-slate-200">{m.nickname}</p>
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
