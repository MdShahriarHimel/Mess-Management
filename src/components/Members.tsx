/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Users, UserPlus, Search, Edit2, Archive, Trash2, Shield, 
  RotateCcw, Check, X, Phone, UserCheck, Heart, Briefcase, Mail
} from "lucide-react";
import { Member, UserRole, MemberStatus } from "../types.js";

interface MembersProps {
  currentUser: Member;
  members: Member[];
  isDarkMode: boolean;
  onRefresh: () => void;
  currentMonthId: string;
  dropdownOptions?: string[];
}

export default function Members({ currentUser, members, isDarkMode, onRefresh, currentMonthId, dropdownOptions = [] }: MembersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null);
  const [shiftReason, setShiftReason] = useState("");
  const [roleAnimations, setRoleAnimations] = useState<any>(null);
  const [adminVisibility, setAdminVisibility] = useState<any>({
    showAdminCard: false,
    showAdminPhone: false,
    showAdminEmail: false,
    showAdminRole: false
  });

  React.useEffect(() => {
    fetch("/api/settings", {
      headers: { "Authorization": `Bearer ${currentUser.id}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.roleAnimations) setRoleAnimations(data.roleAnimations);
          if (data.adminVisibility) setAdminVisibility(data.adminVisibility);
        }
      })
      .catch(e => console.error("Error fetching settings in Members:", e));
  }, [currentUser.id]);

  const getRoleStyle = (userRole: UserRole) => {
    const config = roleAnimations?.[userRole] || {
      animation: userRole === UserRole.MEMBER ? "none" : (userRole === UserRole.MANAGER ? "bounce" : "pulse"),
      color: userRole === UserRole.ADMIN ? "text-rose-500" :
             userRole === UserRole.SUPERUSER ? "text-amber-500" :
             userRole === UserRole.ASSISTANT_SUPERUSER ? "text-sky-400" :
             userRole === UserRole.MANAGER ? "text-yellow-400" :
             userRole === UserRole.PARTIAL_MANAGER ? "text-emerald-400" : "text-slate-400",
      glow: userRole !== UserRole.MEMBER && userRole !== UserRole.PARTIAL_MANAGER
    };

    let animationClass = "";
    if (config.animation === "pulse") animationClass = "animate-pulse";
    else if (config.animation === "bounce") animationClass = "animate-bounce";

    let glowClass = "";
    if (config.glow) {
      glowClass = isDarkMode
        ? "shadow-[0_0_12px_rgba(34,211,238,0.2)] border-cyan-500/40 bg-cyan-500/10"
        : "shadow-[0_0_8px_rgba(34,211,238,0.12)] border-cyan-300 bg-cyan-50/50";
    } else {
      glowClass = isDarkMode
        ? "border-slate-800 bg-slate-900/30"
        : "border-slate-200 bg-slate-50";
    }

    const textColor = config.color || "text-slate-400";
    return `text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border transition-all ${animationClass} ${glowClass} ${textColor}`;
  };
  
  // Invite form states
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [occupation, setOccupation] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.MEMBER);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [assignedTaskState, setAssignedTaskState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for viewing individual meal history, deposits and market spends
  const [selectedMemberForMeals, setSelectedMemberForMeals] = useState<Member | null>(null);
  const [memberMeals, setMemberMeals] = useState<{ date: string; lunch: number; dinner: number }[]>([]);
  const [memberDeposits, setMemberDeposits] = useState<{ id: string; amount: number; date: string }[]>([]);
  const [memberMarkets, setMemberMarkets] = useState<{ id: string; amount: number; date: string; description: string }[]>([]);
  const [mealsLoading, setMealsLoading] = useState(false);

  const fetchMemberData = async (memberId: string) => {
    if (!currentMonthId) return;
    setMealsLoading(true);
    try {
      const authHeader = { "Authorization": `Bearer ${currentUser.id}` };
      const [mealsRes, depRes, marRes] = await Promise.all([
        fetch(`/api/meals/${currentMonthId}`, { headers: authHeader }),
        fetch(`/api/deposits/${currentMonthId}`, { headers: authHeader }),
        fetch(`/api/markets/${currentMonthId}`, { headers: authHeader })
      ]);

      if (mealsRes.ok) {
        const data = await mealsRes.json();
        const sortedMeals = (data.meals || [])
          .filter((m: any) => m.memberId === memberId)
          .sort((a: any, b: any) => b.date.localeCompare(a.date));
        setMemberMeals(sortedMeals);
      }

      if (depRes.ok) {
        const data = await depRes.json();
        const filteredDeps = (data.deposits || [])
          .filter((d: any) => d.memberId === memberId)
          .sort((a: any, b: any) => b.date.localeCompare(a.date));
        setMemberDeposits(filteredDeps);
      }

      if (marRes.ok) {
        const data = await marRes.json();
        const filteredMars = (data.markets || [])
          .filter((m: any) => m.memberId === memberId)
          .sort((a: any, b: any) => b.date.localeCompare(a.date));
        setMemberMarkets(filteredMars);
      }
    } catch (e) {
      console.error("Error fetching member detailed records:", e);
    } finally {
      setMealsLoading(false);
    }
  };
  
  // Permission levels check
  const isAuthorizedToEdit = currentUser.role === UserRole.ADMIN || 
                             currentUser.role === UserRole.SUPERUSER || 
                             currentUser.role === UserRole.ASSISTANT_SUPERUSER ||
                             currentUser.role === UserRole.MANAGER;

  // Handle Photo selection and base64 resizing
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_WIDTH = 200;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setPhoto(base64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetInviteForm = () => {
    setName("");
    setNickname("");
    setEmail("");
    setPhone("");
    setWhatsapp("");
    setBloodGroup("O+");
    setOccupation("");
    setRole(UserRole.MEMBER);
    setNotes("");
    setPhoto(null);
    setAssignedTaskState("");
    setError(null);
  };

  // Submit invite
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          name, nickname, email, phone, whatsapp, bloodGroup, occupation, role, notes, photo, assignedTask: assignedTaskState
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to invite member");
      }

      setShowInviteModal(false);
      resetInviteForm();
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  // Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setError(null);
    setLoading(true);

    try {
      const roleChangedToManager = (editingMember.role === UserRole.MANAGER || editingMember.role === UserRole.PARTIAL_MANAGER) && editingMember.role !== originalRole;
      
      if (roleChangedToManager) {
        if (!shiftReason || shiftReason.trim() === "") {
          throw new Error("A valid shift reason is required when promoting to MANAGER or PARTIAL MANAGER.");
        }

        const shiftResponse = await fetch("/api/members/shift-manager", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.id}`
          },
          body: JSON.stringify({
            targetMemberId: editingMember.id,
            isPartial: editingMember.role === UserRole.PARTIAL_MANAGER,
            shiftReason: shiftReason
          })
        });

        const shiftData = await shiftResponse.json();
        if (!shiftResponse.ok) {
          throw new Error(shiftData.error || "Failed to shift manager role on server");
        }
      }

      const response = await fetch(`/api/members/${editingMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify(editingMember)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update member");
      }

      setEditingMember(null);
      setOriginalRole(null);
      setShiftReason("");
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // Archive member
  const handleArchive = async (memberId: string) => {
    if (!confirm("Are you sure you want to archive this member? They can be restored later.")) return;
    try {
      const response = await fetch(`/api/members/${memberId}/archive`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to archive");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Restore member
  const handleRestore = async (memberId: string) => {
    try {
      const response = await fetch(`/api/members/${memberId}/restore`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete member (Admin Only)
  const handleDelete = async (memberId: string) => {
    if (!confirm("WARNING: Are you sure you want to PERMANENTLY delete this member? All login credentials will be lost. This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter members list based on search
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm)
  );

  const visibleMembers = filteredMembers.filter(m => {
    if (m.role === UserRole.ADMIN) {
      if (currentUser.role === UserRole.ADMIN) return true;
      return !!adminVisibility?.showAdminCard;
    }
    return true;
  });

  const activeMembers = visibleMembers.filter(m => 
    m.status !== MemberStatus.SUSPENDED && 
    m.status !== MemberStatus.LEFT && 
    m.status !== MemberStatus.ARCHIVED
  );

  const inactiveMembers = visibleMembers.filter(m => 
    m.status === MemberStatus.SUSPENDED || 
    m.status === MemberStatus.LEFT || 
    m.status === MemberStatus.ARCHIVED
  );

  return (
    <div className="space-y-6" id="members-wrapper">
      
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Users className="text-cyan-400" />
            Hostel Profiles & Members
          </h2>
          <p className="text-xs text-slate-400">Total registered and invited members count: {visibleMembers.length}</p>
        </div>

        {isAuthorizedToEdit && (
          <button
            id="invite-member-btn"
            onClick={() => { resetInviteForm(); setShowInviteModal(true); }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
          >
            <UserPlus size={15} />
            INVITE NEW MEMBER
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
        <input
          id="member-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, nickname, email, or phone..."
          className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
            isDarkMode 
              ? "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500" 
              : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
          }`}
        />
      </div>

      {/* Members Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="members-grid">
        {activeMembers.map((member) => {
          // Everyone can see contact info on cards (except masked admin info)
          const showFullDetails = true;

          const isTargetAdmin = member.role === UserRole.ADMIN;
          const maskAdmin = isTargetAdmin && currentUser.role !== UserRole.ADMIN;

          const showAdminRoleBadge = !maskAdmin || !!adminVisibility?.showAdminRole;
          const showAdminEmailText = !maskAdmin || !!adminVisibility?.showAdminEmail;
          const showAdminPhoneText = !maskAdmin || !!adminVisibility?.showAdminPhone;

          const displayRole = showAdminRoleBadge ? member.role : UserRole.MEMBER;
          const displayEmail = showAdminEmailText ? member.email : "••••••••••••";
          const displayPhone = showAdminPhoneText ? (member.phone || "No phone logged") : "••••••••••••";

          const config = roleAnimations?.[displayRole];
          const hasGlow = config?.glow && config?.glowStyle && config?.glowStyle !== "none";
          const cardGlowClass = hasGlow ? `glow-${config.glowStyle}` : "";

          return (
            <div 
              key={member.id} 
              onClick={() => { setSelectedMemberForMeals(member); fetchMemberData(member.id); }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] hover:shadow-lg hover:border-cyan-500/30 active:scale-[0.99] ${cardGlowClass} ${
                isDarkMode 
                  ? "bg-slate-900/40 border-cyan-500/10 text-white" 
                  : "bg-white border-slate-200 shadow-sm text-slate-800"
              }`}
            >
              <div className="flex gap-4 items-start">
                {/* Profile Photo */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  {member.photo ? (
                    <img 
                      src={member.photo} 
                      alt={member.nickname} 
                      className="w-16 h-16 rounded-xl object-cover border border-cyan-500/25"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg font-display uppercase">
                      {member.nickname.slice(0, 2)}
                    </div>
                  )}
                  
                  {/* Status Indicator bubble */}
                  <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold border uppercase tracking-wider ${
                    member.status === MemberStatus.ACTIVE ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    member.status === MemberStatus.PENDING ? "bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse" :
                    "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  }`}>
                    {member.status}
                  </span>
                </div>

                {/* Core Text details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <h3 className="font-extrabold text-sm truncate">{member.name}</h3>
                      <p className="text-xs text-cyan-400 font-semibold">@{member.nickname}</p>
                    </div>
                    <span className={getRoleStyle(displayRole)}>
                      {displayRole.replace("_", " ")}
                    </span>
                  </div>

                  {showFullDetails ? (
                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-400 font-mono">
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail size={12} className="text-cyan-500/60" />
                        {displayEmail}
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <Phone size={12} className="text-cyan-500/60" />
                        {displayPhone}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px]">
                        <Briefcase size={12} className="text-cyan-500/60" />
                        {member.occupation || "Independent"}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 p-2 bg-cyan-500/5 rounded border border-cyan-500/10 text-center">
                      <p className="text-[9px] font-bold text-cyan-400 tracking-wider uppercase animate-pulse">Click Profile to View Meals</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              {showFullDetails && member.notes && (
                <p className={`mt-4 p-2.5 rounded-lg text-[11px] leading-relaxed italic ${
                  isDarkMode ? "bg-slate-950/40 text-slate-400" : "bg-slate-50 text-slate-600"
                }`}>
                  &ldquo;{member.notes}&rdquo;
                </p>
              )}

              {/* Action buttons footer */}
              <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-cyan-500/10 justify-between animate-fade-in">
                
                <div className="flex gap-2">
                  {showFullDetails && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/15 font-mono text-cyan-300">
                      <Heart size={10} className="text-orange-500 fill-orange-500" />
                      {member.bloodGroup}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono">Join: {member.joiningDate}</span>
                </div>

                {isAuthorizedToEdit && (
                  <div className="flex gap-1.5">
                    {/* Super Users cannot modify Admins */}
                    {!(member.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) && (
                      <>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingMember(member); 
                            setOriginalRole(member.role);
                            setShiftReason("");
                          }}
                          className={`p-1.5 rounded-lg border cursor-pointer hover:border-cyan-400 hover:text-cyan-400 transition-all ${
                            isDarkMode ? "border-slate-800 text-slate-400 bg-slate-950/20" : "border-slate-200 text-slate-500"
                          }`}
                          title="Edit profile"
                        >
                          <Edit2 size={13} />
                        </button>

                        {member.status !== MemberStatus.ARCHIVED ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleArchive(member.id); }}
                            className={`p-1.5 rounded-lg border cursor-pointer hover:border-orange-500 hover:text-orange-500 transition-all ${
                              isDarkMode ? "border-slate-800 text-slate-400 bg-slate-950/20" : "border-slate-200 text-slate-500"
                            }`}
                            title="Archive member"
                          >
                            <Archive size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestore(member.id); }}
                            className={`p-1.5 rounded-lg border cursor-pointer hover:border-emerald-500 hover:text-emerald-500 transition-all ${
                              isDarkMode ? "border-slate-800 text-slate-400 bg-slate-950/20" : "border-slate-200 text-slate-500"
                            }`}
                            title="Restore member"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}

                        {currentUser.role === UserRole.ADMIN && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"
                            title="Permanently Delete member"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* Archived, Suspended & Departed Inactive Bucket */}
      {inactiveMembers.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-900/60" id="inactive-bucket-wrapper">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2 font-display">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Inactive Bucket (Suspended & Departed Profiles)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              These accounts are suspended or have left the mess. They are kept separated and have restricted access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="inactive-bucket-grid">
            {inactiveMembers.map((member) => {
              const isTargetAdmin = member.role === UserRole.ADMIN;
              const maskAdmin = isTargetAdmin && currentUser.role !== UserRole.ADMIN;

              const showAdminRoleBadge = !maskAdmin || !!adminVisibility?.showAdminRole;
              const showAdminEmailText = !maskAdmin || !!adminVisibility?.showAdminEmail;
              const showAdminPhoneText = !maskAdmin || !!adminVisibility?.showAdminPhone;

              const displayRole = showAdminRoleBadge ? member.role : UserRole.MEMBER;
              const displayEmail = showAdminEmailText ? member.email : "••••••••••••";
              const displayPhone = showAdminPhoneText ? (member.phone || "No phone logged") : "••••••••••••";

              const displayLeavingDate = member.leavingDate || "Unknown date";

              return (
                <div 
                  key={member.id} 
                  onClick={() => { setSelectedMemberForMeals(member); fetchMemberData(member.id); }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] opacity-75 grayscale-[20%] hover:grayscale-0 hover:opacity-100 ${
                    isDarkMode 
                      ? "bg-slate-950/40 border-rose-500/10 text-slate-300 hover:border-rose-500/30" 
                      : "bg-slate-100/50 border-slate-200 shadow-sm text-slate-600 hover:border-rose-300"
                  }`}
                >
                  <div className="flex gap-4 items-start">
                    {/* Profile Photo */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      {member.photo ? (
                        <img 
                          src={member.photo} 
                          alt={member.nickname} 
                          className="w-16 h-16 rounded-xl object-cover border border-rose-500/20"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-lg font-display uppercase">
                          {member.nickname.slice(0, 2)}
                        </div>
                      )}
                      
                      {/* Status Indicator bubble */}
                      <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold border uppercase tracking-wider ${
                        member.status === MemberStatus.SUSPENDED ? "bg-rose-500/15 text-rose-400 border-rose-500/25 animate-pulse" :
                        "bg-amber-500/15 text-amber-400 border-amber-500/25"
                      }`}>
                        {member.status}
                      </span>
                    </div>

                    {/* Core Text details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <h3 className="font-extrabold text-sm truncate text-slate-400 line-through decoration-slate-600">{member.name}</h3>
                          <p className="text-xs text-slate-500 font-semibold">@{member.nickname}</p>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900 text-slate-500">
                          {displayRole.replace("_", " ")}
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-1.5 text-xs text-slate-500 font-mono">
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail size={12} className="text-slate-600" />
                          {displayEmail}
                        </p>
                        <p className="flex items-center gap-1.5 truncate">
                          <Phone size={12} className="text-slate-600" />
                          {displayPhone}
                        </p>
                        <p className="flex items-center gap-1.5 text-[11px] text-rose-400/80 font-semibold font-sans mt-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Departed Mess: {displayLeavingDate}
                        </p>
                      </div>
                    </div>

                    {isAuthorizedToEdit && (
                      <div className="flex gap-1.5">
                        {/* Super Users cannot modify Admins */}
                        {!(member.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) && (
                          <>
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingMember(member); 
                                setOriginalRole(member.role);
                                setShiftReason("");
                              }}
                              className={`p-1.5 rounded-lg border cursor-pointer hover:border-cyan-400 hover:text-cyan-400 transition-all ${
                                isDarkMode ? "border-slate-800 text-slate-400 bg-slate-950/20" : "border-slate-200 text-slate-500"
                              }`}
                              title="Edit profile"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestore(member.id); }}
                              className={`p-1.5 rounded-lg border cursor-pointer hover:border-emerald-500 hover:text-emerald-500 transition-all ${
                                isDarkMode ? "border-slate-800 text-slate-400 bg-slate-950/20" : "border-slate-200 text-slate-500"
                              }`}
                              title="Restore member to active status"
                            >
                              <RotateCcw size={13} />
                            </button>

                            {currentUser.role === UserRole.ADMIN && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }}
                                className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"
                                title="Permanently Delete member"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-lg p-6 rounded-2xl border ${
            isDarkMode ? "glass-panel text-white" : "bg-white text-slate-800 border-slate-200 shadow-2xl"
          }`}>
            <div className="flex justify-between items-center mb-5 border-b border-cyan-500/10 pb-3">
              <h3 className="text-lg font-bold font-display flex items-center gap-1.5">
                <UserPlus size={18} className="text-cyan-400" />
                Invite New Mess Resident
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
              
              {/* Photo Upload Canvas */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Profile Photo</label>
                <div className="flex gap-3 items-center">
                  {photo ? (
                    <img src={photo} className="w-14 h-14 rounded-xl object-cover border border-cyan-500/20" alt="Preview" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400 text-xs font-bold">
                      EMPTY
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 file:cursor-pointer hover:file:bg-cyan-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mominur Rahman"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Nickname / Tag</label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Momin"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Email Address (Invited Key)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="momin@example.com"
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Occupation</label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Student / Engineer"
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                 <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <option value={UserRole.MEMBER}>MEMBER (Standard Access)</option>
                    <option value={UserRole.MANAGER}>MANAGER (Monthly Authority)</option>
                    {([UserRole.ADMIN, UserRole.SUPERUSER].includes(currentUser.role)) && (
                      <>
                        <option value={UserRole.ASSISTANT_SUPERUSER}>ASSISTANT SUPERUSER (Operational Assistant)</option>
                        <option value={UserRole.SUPERUSER}>SUPERUSER (Assistant Admin)</option>
                      </>
                    )}
                    {currentUser.role === UserRole.ADMIN && <option value={UserRole.ADMIN}>ADMIN (Full Authority)</option>}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assigned Work / Task (Duty)</label>
                <select
                  value={assignedTaskState}
                  onChange={(e) => setAssignedTaskState(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <option value="">-- No Work Assigned --</option>
                  {dropdownOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Bio notes / Details</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add details about joining terms or preferences..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-cyan-500/10">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs cursor-pointer"
                >
                  {loading ? "SENDING INVITE..." : "SEND INVITE"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-lg p-6 rounded-2xl border ${
            isDarkMode ? "glass-panel text-white" : "bg-white text-slate-800 border-slate-200 shadow-2xl"
          }`}>
            <div className="flex justify-between items-center mb-5 border-b border-cyan-500/10 pb-3">
              <h3 className="text-lg font-bold font-display flex items-center gap-1.5">
                <Edit2 size={18} className="text-cyan-400" />
                Edit Profile settings
              </h3>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingMember.name}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Nickname</label>
                  <input
                    type="text"
                    required
                    value={editingMember.nickname}
                    onChange={(e) => setEditingMember({ ...editingMember, nickname: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Phone</label>
                  <input
                    type="text"
                    value={editingMember.phone || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Occupation</label>
                  <input
                    type="text"
                    value={editingMember.occupation || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, occupation: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
              </div>

               {([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER].includes(currentUser.role)) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Role Level</label>
                      <select
                        value={editingMember.role}
                        disabled={originalRole === UserRole.ADMIN}
                        onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as UserRole })}
                        className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                          originalRole === UserRole.ADMIN ? "opacity-60 cursor-not-allowed" : ""
                        } ${
                          isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <option value={UserRole.MEMBER}>MEMBER</option>
                        <option value={UserRole.PARTIAL_MANAGER}>PARTIAL MANAGER</option>
                        <option value={UserRole.MANAGER}>MANAGER</option>
                        {([UserRole.ADMIN, UserRole.SUPERUSER].includes(currentUser.role)) && (
                          <>
                            <option value={UserRole.ASSISTANT_SUPERUSER}>ASSISTANT SUPERUSER</option>
                            <option value={UserRole.SUPERUSER}>SUPERUSER</option>
                          </>
                        )}
                        {currentUser.role === UserRole.ADMIN && (
                          <option value={UserRole.ADMIN}>ADMIN</option>
                        )}
                      </select>
                      {originalRole === UserRole.ADMIN && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1">Admin cannot demote themselves.</p>
                      )}
                    </div>
                    {([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER].includes(currentUser.role)) ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Status Code</label>
                        <select
                          value={editingMember.status}
                          disabled={originalRole === UserRole.ADMIN}
                          onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as MemberStatus })}
                          className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                            originalRole === UserRole.ADMIN ? "opacity-60 cursor-not-allowed" : ""
                          } ${
                            isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        >
                          <option value={MemberStatus.ACTIVE}>ACTIVE</option>
                          <option value={MemberStatus.PENDING}>PENDING</option>
                          <option value={MemberStatus.SUSPENDED}>SUSPENDED</option>
                          <option value={MemberStatus.LEFT}>LEFT MESS</option>
                          <option value={MemberStatus.ARCHIVED}>ARCHIVED</option>
                        </select>
                        {originalRole === UserRole.ADMIN && (
                          <p className="text-[9px] text-rose-500 font-bold mt-1">Admin cannot leave the mess.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Status Code</label>
                        <div className="px-3 py-2 border border-slate-800 rounded-lg text-xs bg-slate-900/40 text-slate-400">
                          {editingMember.status} (Locked for Managers)
                        </div>
                      </div>
                    )}
                  </div>

                  {((editingMember.role === UserRole.MANAGER || editingMember.role === UserRole.PARTIAL_MANAGER) && editingMember.role !== originalRole) && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/25 animate-pulse">
                      <label className="text-xs font-extrabold text-orange-400 uppercase tracking-wider block">Manager Shifting / Promotion Reason *</label>
                      <input
                        type="text"
                        required
                        value={shiftReason}
                        onChange={(e) => setShiftReason(e.target.value)}
                        placeholder="Provide reason (e.g., Rotation schedule, medical shift, specific duties...)"
                        className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                          isDarkMode ? "bg-slate-950 border-slate-850 text-white" : "bg-white border-slate-200 text-slate-850"
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assigned Work / Task (Duty)</label>
                {isAuthorizedToEdit ? (
                  <select
                    value={editingMember.assignedTask || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, assignedTask: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                      isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <option value="">-- No Work Assigned --</option>
                    {dropdownOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <div className={`px-3 py-2 rounded-lg border text-xs ${
                    isDarkMode ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}>
                    {editingMember.assignedTask || "No Work Assigned"}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Personal Notes</label>
                <textarea
                  value={editingMember.notes || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-cyan-500/10">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-xs cursor-pointer"
                >
                  SAVE CHANGES
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* UNIFIED MEMBER DETAILED PROFILE & AUDIT LOG MODAL */}
      {selectedMemberForMeals && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl p-6 my-8">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                  <UserCheck size={20} className="text-orange-500" />
                  Mess Resident Ledger: {selectedMemberForMeals.nickname}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed financial balances, verified contact info, and active meal charts.
                </p>
              </div>
              <button 
                onClick={() => { setSelectedMemberForMeals(null); setMemberMeals([]); setMemberDeposits([]); setMemberMarkets([]); }} 
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {mealsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-9 h-9 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                <p className="text-xs text-slate-400">Loading historical audit trails, deposits & meal grids...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMN 1: RESIDENT CONTACT PROFILE DETAILS CARD */}
                <div className="lg:col-span-1 p-4 rounded-xl bg-slate-950/40 border border-slate-850 space-y-4">
                  <div className="text-center space-y-2">
                    {selectedMemberForMeals.photo ? (
                      <img 
                        src={selectedMemberForMeals.photo} 
                        alt={selectedMemberForMeals.nickname} 
                        className="w-20 h-20 rounded-2xl mx-auto object-cover border border-cyan-500/20"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-2xl font-display uppercase mx-auto">
                        {selectedMemberForMeals.nickname.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-200">{selectedMemberForMeals.name}</h4>
                      <p className="text-xs text-cyan-400 font-bold">@{selectedMemberForMeals.nickname}</p>
                    </div>
                    <div className="flex justify-center gap-1.5">
                      {(() => {
                        const isSelAdmin = selectedMemberForMeals.role === UserRole.ADMIN;
                        const maskSelAdmin = isSelAdmin && currentUser.role !== UserRole.ADMIN;
                        const showSelAdminRole = !maskSelAdmin || !!adminVisibility?.showAdminRole;
                        const displaySelRole = showSelAdminRole ? selectedMemberForMeals.role : UserRole.MEMBER;
                        return (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            {displaySelRole.replace("_", " ")}
                          </span>
                        );
                      })()}
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                        {selectedMemberForMeals.status}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-850 pt-3 space-y-3 text-xs">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact Credentials</p>
                    
                    <div className="space-y-2 font-mono text-slate-300">
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-cyan-400 shrink-0" />
                        <span className="truncate" title={selectedMemberForMeals.email}>{selectedMemberForMeals.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN && !adminVisibility?.showAdminEmail ? "••••••••••••" : selectedMemberForMeals.email}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Phone size={13} className="text-cyan-400 shrink-0" />
                        <span>{selectedMemberForMeals.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN && !adminVisibility?.showAdminPhone ? "••••••••••••" : (selectedMemberForMeals.phone || "No phone number")}</span>
                      </div>
                      {selectedMemberForMeals.whatsapp && (!(selectedMemberForMeals.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN && !adminVisibility?.showAdminPhone)) && (
                        <div className="flex items-center gap-2 truncate text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className="font-sans">WhatsApp:</span>
                          <a 
                            href={`https://wa.me/${selectedMemberForMeals.whatsapp.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:text-emerald-300"
                          >
                            {selectedMemberForMeals.whatsapp}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Briefcase size={13} className="text-cyan-400 shrink-0" />
                        <span className="font-sans">{selectedMemberForMeals.occupation || "Student / Independent"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart size={13} className="text-rose-500 shrink-0" />
                        <span className="text-rose-400">Blood Group: {selectedMemberForMeals.bloodGroup || "O+"}</span>
                      </div>
                      {selectedMemberForMeals.assignedTask && (
                        <div className="flex items-center gap-2 text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0"></span>
                          <span className="font-sans text-[11px] uppercase tracking-wider">Duty:</span>
                          <span className="text-[11px]">{selectedMemberForMeals.assignedTask}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[9px] text-slate-500 pt-1 font-mono">
                      Joined mess on: {selectedMemberForMeals.joiningDate}
                    </p>
                  </div>

                  {selectedMemberForMeals.notes && (
                    <div className="border-t border-slate-850 pt-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Personal Bio Notes</p>
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        &ldquo;{selectedMemberForMeals.notes}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* COLUMN 2 & 3: DETAILED ACCOUNTING STATS & DAILY MEAL LOG TABLES */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Ledger summary row cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Total Deposits</span>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        ৳ {memberDeposits.reduce((sum, d) => sum + d.amount, 0)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Total Spends</span>
                      <span className="text-sm font-black font-mono text-cyan-400">
                        ৳ {memberMarkets.reduce((sum, m) => sum + m.amount, 0)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-orange-500/10 text-center">
                      <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider block mb-0.5">Total Meals</span>
                      <span className="text-sm font-black font-mono text-orange-500">
                        {memberMeals.reduce((sum, m) => sum + (m.lunch || 0) + (m.dinner || 0), 0)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Deposits List */}
                    <div className="space-y-2 p-3 rounded-xl bg-slate-950/30 border border-slate-850">
                      <p className="text-[10px] font-extrabold uppercase text-orange-500 tracking-wider flex items-center justify-between">
                        <span>Deposited Funds history</span>
                        <span className="text-emerald-400">৳ {memberDeposits.length} entries</span>
                      </p>
                      
                      <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5">
                        {memberDeposits.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic py-2">No deposits registered in this cycle.</p>
                        ) : (
                          memberDeposits.map((dep) => (
                            <div key={dep.id} className="flex justify-between items-center text-[11px] p-2 rounded bg-slate-900 border border-slate-850/60 font-mono">
                              <span className="font-extrabold text-slate-200">৳ {dep.amount}</span>
                              <span className="text-[9px] text-slate-500">Date: {dep.date}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Market Spends List */}
                    <div className="space-y-2 p-3 rounded-xl bg-slate-950/30 border border-slate-850">
                      <p className="text-[10px] font-extrabold uppercase text-orange-500 tracking-wider flex items-center justify-between">
                        <span>Market Spends history</span>
                        <span className="text-cyan-400">৳ {memberMarkets.length} logs</span>
                      </p>
                      
                      <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5">
                        {memberMarkets.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic py-2">No individual market buys logged.</p>
                        ) : (
                          memberMarkets.map((mar) => (
                            <div key={mar.id} className="text-[11px] p-2 rounded bg-slate-900 border border-slate-850/60 space-y-1">
                              <div className="flex justify-between font-mono">
                                <span className="font-extrabold text-slate-200">৳ {mar.amount}</span>
                                <span className="text-[9px] text-slate-500">{mar.date}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate leading-relaxed font-sans">{mar.description || "Groceries shopping list"}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Daily Meals Tracker Grid */}
                  <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-850 space-y-2">
                    <p className="text-[10px] font-extrabold uppercase text-orange-500 tracking-wider">
                      Daily Meal Counts (Lunch & Dinner)
                    </p>

                    <div className="border border-slate-850 rounded-lg overflow-hidden bg-slate-950/20">
                      <div className="max-h-[160px] overflow-y-auto pr-1">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[9px] uppercase font-bold text-slate-500 border-b border-slate-850 bg-slate-950/60 sticky top-0">
                            <tr>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3 text-center">Lunch</th>
                              <th className="py-2 px-3 text-center">Dinner</th>
                              <th className="py-2 px-3 text-center">Day Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850/60 font-mono">
                            {memberMeals.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-500 italic">
                                  No meal accounts posted for this month cycle.
                                </td>
                              </tr>
                            ) : (
                              memberMeals.map((m, index) => (
                                <tr key={index} className="hover:bg-slate-900/30">
                                  <td className="py-1.5 px-3 font-sans font-medium text-slate-300">{m.date}</td>
                                  <td className="py-1.5 px-3 text-center text-cyan-400 font-semibold">{m.lunch}</td>
                                  <td className="py-1.5 px-3 text-center text-cyan-400 font-semibold">{m.dinner}</td>
                                  <td className="py-1.5 px-3 text-center text-orange-400 font-bold">{(m.lunch || 0) + (m.dinner || 0)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => { setSelectedMemberForMeals(null); setMemberMeals([]); setMemberDeposits([]); setMemberMarkets([]); }}
                      className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer transition-all hover:scale-105"
                    >
                      CLOSE LEDGER
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
