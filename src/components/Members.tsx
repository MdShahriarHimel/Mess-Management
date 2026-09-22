/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Users, UserPlus, Search, Edit2, Archive, Trash2, Shield, 
  RotateCcw, Check, X, Phone, UserCheck, Heart, Briefcase, Mail,
  ChevronDown, ChevronUp, GraduationCap, Award, Home, DoorOpen, FlaskConical
} from "lucide-react";
import { Member, UserRole, MemberStatus, RespectSenioritySettings, RoomLabel } from "../types.js";
import { ColorPalettePicker } from "../App.tsx";
import { processProfilePhoto } from "../utils/imageOptimizer";
import { getRespectDisplayName } from "../utils/respectHelper.js";
import { RefreshButton } from "./RefreshButton.tsx";
import { getAuthToken } from "../lib/authHeader.ts";


const COLOR_PALETTES = [
  { name: "Sunset Orange", hex: "#ea580c" },
  { name: "Emerald Green", hex: "#16a34a" },
  { name: "Teal Glow", hex: "#0d9488" },
  { name: "Cyber Cyan", hex: "#22d3ee" },
  { name: "Vivid Violet", hex: "#8b5cf6" },
  { name: "Electric Indigo", hex: "#6366f1" },
  { name: "Ruby Rose", hex: "#e11d48" },
  { name: "Amber Gold", hex: "#d97706" },
  { name: "Slate Grey", hex: "#475569" },
  { name: "Deep Navy", hex: "#0f172a" },
  { name: "Ice Blue", hex: "#38bdf8" },
  { name: "Pure White", hex: "#ffffff" }
];

function MicroAnimationOverlay({ animationType }: { animationType?: string }) {
  if (!animationType || animationType === "none") return null;

  if (animationType === "sparkles") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <div className="absolute top-2 left-4 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-60" style={{ animationDuration: '2.5s' }} />
        <div className="absolute bottom-4 right-6 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-50" style={{ animationDuration: '1.8s' }} />
        <div className="absolute top-8 right-12 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
      </div>
    );
  }

  if (animationType === "confetti") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <div className="absolute top-1 left-1/4 w-1 h-2 bg-pink-500 rotate-12 animate-bounce opacity-40" />
        <div className="absolute top-3 right-1/4 w-1.5 h-1.5 bg-cyan-400 -rotate-45 animate-bounce opacity-50" />
        <div className="absolute bottom-2 left-1/3 w-2 h-1 bg-yellow-400 rotate-45 animate-bounce opacity-45" />
      </div>
    );
  }

  if (animationType === "bubbles") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <div className="absolute bottom-1 left-5 w-2 h-2 rounded-full border border-cyan-400/30 animate-pulse" style={{ animationDuration: '2s' }} />
        <div className="absolute bottom-5 right-8 w-3 h-3 rounded-full border border-teal-400/20 animate-pulse" style={{ animationDuration: '1.4s' }} />
        <div className="absolute bottom-10 left-1/2 w-1.5 h-1.5 rounded-full border border-sky-400/40 animate-pulse" style={{ animationDuration: '3s' }} />
      </div>
    );
  }

  if (animationType === "pulse") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden ring-1 ring-cyan-500/20 animate-pulse z-10" />
    );
  }

  const isUrl = animationType.startsWith("http://") || 
                animationType.startsWith("https://") || 
                animationType.startsWith("data:") ||
                animationType.includes("/") || 
                animationType.includes(".");

  if (isUrl) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-2xl">
        <div className="absolute inset-0 bg-slate-950/15 z-10 pointer-events-none" />
        <img 
          src={animationType} 
          alt="" 
          className="w-full h-full object-cover select-none pointer-events-none opacity-30 transition-opacity duration-300" 
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return null;
}

interface MembersProps {
  currentUser: Member;
  members: Member[];
  isDarkMode: boolean;
  onRefresh: () => void;
  currentMonthId: string;
  dropdownOptions?: string[];
  safeMode?: boolean;
  mealTypes?: any[];
  respectSenioritySettings?: RespectSenioritySettings;
  months?: any[];
}

export default function Members({ 
  currentUser, 
  members, 
  isDarkMode, 
  onRefresh, 
  currentMonthId, 
  dropdownOptions = [], 
  safeMode = false, 
  mealTypes, 
  respectSenioritySettings,
  months = []
}: MembersProps) {
  const authToken = getAuthToken(currentUser);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null);
  const [shiftReason, setShiftReason] = useState("");
  const [dutyTargetMonthId, setDutyTargetMonthId] = useState<string>(currentMonthId);
  const [roleAnimations, setRoleAnimations] = useState<any>(null);
  const [adminVisibility, setAdminVisibility] = useState<any>({
    showAdminCard: false,
    showAdminPhone: false,
    showAdminEmail: false,
    showAdminRole: false
  });

  const [deletedMembers, setDeletedMembers] = useState<{ member: Member; deletedAt: string; deletedBy: string }[]>([]);
  const [showDeletedMembers, setShowDeletedMembers] = useState(false);

  const fetchDeletedMembers = async () => {
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPERUSER) return;
    try {
      const response = await fetch("/api/members/deleted-list", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDeletedMembers(data.deletedMembers || []);
      }
    } catch (e) {
      console.error("Failed to fetch deleted members:", e);
    }
  };

  React.useEffect(() => {
    if (showDeletedMembers || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER) {
      fetchDeletedMembers();
    }
  }, [showDeletedMembers, members]);

  React.useEffect(() => {
    const handleGlobalRefresh = () => {
      onRefresh();
      fetchDeletedMembers();
    };
    window.addEventListener("app-global-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("app-global-refresh", handleGlobalRefresh);
  }, []);

  const handleUndoDelete = async (memberId: string) => {
    try {
      const response = await fetch(`/api/members/restore-deleted/${memberId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        onRefresh();
        fetchDeletedMembers();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to restore deleted member");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isEditingSelf = editingMember?.id === currentUser.id;
  const isUltimateAdminActor = currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
  const isTargetUltimateAdmin = editingMember?.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
  const canEditAcademicAndRespect = isEditingSelf || isUltimateAdminActor || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER;
  const disableRoleSelect = originalRole === UserRole.ADMIN && (isEditingSelf || isTargetUltimateAdmin || !isUltimateAdminActor);
  const disableStatusSelect = originalRole === UserRole.ADMIN && !isEditingSelf && !isUltimateAdminActor;

  const [roomLabels, setRoomLabels] = useState<RoomLabel[]>([]);

  React.useEffect(() => {
    fetch("/api/settings", {
      headers: { "Authorization": `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.roleAnimations) setRoleAnimations(data.roleAnimations);
          if (data.adminVisibility) setAdminVisibility(data.adminVisibility);
          if (Array.isArray(data.roomLabels)) setRoomLabels(data.roomLabels);
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
      const authHeader = { "Authorization": `Bearer ${authToken}` };
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
                             currentUser.role === UserRole.MANAGER ||
                             currentUser.role === UserRole.PARTIAL_MANAGER;

  // Handle Photo selection and optimized WebP resizing (Max 400x400, ~100KB max, preserves transparent PNG)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedWebP = await processProfilePhoto(file);
      setPhoto(optimizedWebP);
    } catch (err) {
      console.error("Profile photo processing error:", err);
    }
  };

  // Handle Edit Photo selection and optimized WebP resizing (Max 400x400, ~100KB max, preserves transparent PNG)
  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMember) return;

    try {
      const optimizedWebP = await processProfilePhoto(file);
      setEditingMember(prev => prev ? { ...prev, photo: optimizedWebP } : null);
    } catch (err) {
      console.error("Profile photo processing error:", err);
    }
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
          "Authorization": `Bearer ${authToken}`
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

    if (editingMember.role === UserRole.ADMIN && (editingMember.status === MemberStatus.SUSPENDED || editingMember.status === MemberStatus.PENDING)) {
      setError("Admin accounts cannot select 'suspend' or 'pending' for their ID and profile.");
      setLoading(false);
      return;
    }

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
            "Authorization": `Bearer ${authToken}`
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
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(editingMember)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update member");
      }

      // Sync duty assignment to the selected month's duty roster
      if (editingMember.assignedTask !== undefined) {
        try {
          await fetch("/api/duties/work-duty", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({
              monthId: dutyTargetMonthId || currentMonthId,
              memberId: editingMember.id,
              name: editingMember.assignedTask || "",
              task: ""
            })
          });
        } catch (dutyErr) {
          console.warn("Could not sync duty to duties table:", dutyErr);
        }
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

  // Quick activate pending member (Admin / Manager)
  const handleActivate = async (memberId: string) => {
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}` 
        },
        body: JSON.stringify({
          status: MemberStatus.ACTIVE,
          notes: ""
        })
      });
      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to activate member");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Archive member
  const handleArchive = async (memberId: string) => {
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] You are about to archive this member. Their status will change to ARCHIVED, but they can be restored later. Proceed?" 
      : "Are you sure you want to archive this member? They can be restored later.";
    if (!confirm(message)) return;
    try {
      const response = await fetch(`/api/members/${memberId}/archive`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
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
        headers: { "Authorization": `Bearer ${authToken}` }
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
    const message = safeMode 
      ? "🛡️ [SAFE MODE ACTIVE] DANGER: You are permanently deleting this member from the database. All login access, ratings, and records are gone forever! This CANNOT BE UNDONE. Proceed?" 
      : "WARNING: Are you sure you want to PERMANENTLY delete this member? All login credentials will be lost. This cannot be undone.";
    if (!confirm(message)) return;
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
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
    // Hide TESTING members from users who are neither ADMIN nor SUPERUSER (unless it is their own profile)
    if ((m.status === MemberStatus.TESTING || (m.status as string) === "TESTING") &&
        currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPERUSER && currentUser.id !== m.id) {
      return false;
    }
    // If hidden from directory by admin, only Admins can see them
    if (m.hideCardFromDirectoryByAdmin && currentUser.role !== UserRole.ADMIN) {
      return false;
    }
    if (m.role === UserRole.ADMIN) {
      if (currentUser.role === UserRole.ADMIN) return true;
      return !!adminVisibility?.showAdminCard;
    }
    return true;
  });

  const activeMembers = visibleMembers.filter(m => 
    m.status === MemberStatus.ACTIVE || 
    m.status === MemberStatus.AWAY || 
    (m.status === MemberStatus.TESTING && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER || currentUser.id === m.id))
  );

  const pendingMembers = visibleMembers.filter(m => 
    m.status === MemberStatus.PENDING
  );

  const inactiveMembers = visibleMembers.filter(m => 
    m.status === MemberStatus.SUSPENDED || 
    m.status === MemberStatus.LEFT || 
    m.status === MemberStatus.ARCHIVED ||
    m.status === MemberStatus.NOT_MEMBER
  );

  const renderMemberCard = (member: Member) => {
    // Everyone can see contact info on cards (except masked admin info or admin override)
    const showFullDetails = true;

    const isTargetAdmin = member.role === UserRole.ADMIN;
    const maskAdmin = isTargetAdmin && currentUser.role !== UserRole.ADMIN;
    const shouldMaskByAdminOverride = !!member.hideContactInfoByAdmin && currentUser.role !== UserRole.ADMIN;

    const showAdminRoleBadge = !maskAdmin || !!adminVisibility?.showAdminRole;
    const showAdminEmailText = !maskAdmin && !shouldMaskByAdminOverride || !!adminVisibility?.showAdminEmail;
    const showAdminPhoneText = !maskAdmin && !shouldMaskByAdminOverride || !!adminVisibility?.showAdminPhone;

    let displayRole = showAdminRoleBadge ? member.role : UserRole.MEMBER;
    if (member.hideAdminRole) {
      displayRole = UserRole.MEMBER;
    }
    const displayEmail = (!shouldMaskByAdminOverride && showAdminEmailText) ? member.email : "••••••••••••";
    const displayPhone = (!shouldMaskByAdminOverride && showAdminPhoneText) ? (member.phone || "No phone logged") : "••••••••••••";

    const config = roleAnimations?.[displayRole];
    const isRoleHidden = member.role === UserRole.ADMIN && displayRole === UserRole.MEMBER;
    const useMemberSettings = isRoleHidden && member.splitProfile;

    // Admin can disable glowing on other profiles
    const hasGlow = (member.glowEnabledByAdmin !== false) && (useMemberSettings 
      ? member.memberGlow 
      : (member.glow || (config?.glow && config?.glowStyle && config?.glowStyle !== "none")));

    const rawGlowStyle = useMemberSettings
      ? (member.memberGlowStyle || "")
      : (member.glowStyle || config?.glowStyle || "");

    const glowStyle = (hasGlow && (!rawGlowStyle || rawGlowStyle === "none")) ? "nitro-classic" : rawGlowStyle;

    const finalAnimation = useMemberSettings
      ? (member.memberAnimation || "none")
      : (member.animation || "none");

    let cardGlowStyle: React.CSSProperties = {};
    let cardGlowClass = "";
    if (hasGlow && glowStyle && glowStyle !== "none") {
      if (glowStyle.startsWith("#")) {
        cardGlowStyle = {
          boxShadow: isDarkMode 
            ? `0 0 24px ${glowStyle}85, 0 0 10px ${glowStyle}55, inset 0 0 12px ${glowStyle}35` 
            : `0 0 24px ${glowStyle}aa, 0 0 12px ${glowStyle}70, inset 0 0 12px ${glowStyle}30`,
          borderColor: isDarkMode ? `${glowStyle}dd` : glowStyle
        };
      } else {
        cardGlowClass = `glow-${glowStyle}`;
      }
    }

    return (
      <div 
        key={member.id} 
        onClick={() => { setSelectedMemberForMeals(member); fetchMemberData(member.id); }}
        className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] hover:shadow-lg hover:border-cyan-500/40 active:scale-[0.99] ${cardGlowClass} ${
          isDarkMode 
            ? "bg-slate-900/80 border-cyan-500/20 text-white shadow-md backdrop-blur-md" 
            : "bg-white/95 border-slate-300 shadow-md text-slate-900 backdrop-blur-md"
        }`}
        style={cardGlowStyle}
      >
        <MicroAnimationOverlay animationType={finalAnimation} />
        <div className="flex gap-4 items-start">
          {/* Profile Photo */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {member.photo ? (
              <img 
                src={member.photo} 
                alt={member.nickname} 
                className="w-16 h-16 rounded-xl object-cover border border-cyan-500/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={`w-16 h-16 rounded-xl border flex items-center justify-center font-bold text-lg font-display uppercase ${
                isDarkMode ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-cyan-100 border-cyan-400 text-cyan-900"
              }`}>
                {member.nickname.slice(0, 2)}
              </div>
            )}
            
            {/* Status Indicator bubble */}
            <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold border uppercase tracking-wider ${
              member.status === MemberStatus.ACTIVE ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
              member.status === MemberStatus.AWAY ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
              member.status === MemberStatus.TESTING ? "bg-purple-500/30 text-purple-300 border-purple-500/50" :
              member.status === MemberStatus.NOT_MEMBER ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" :
              member.status === MemberStatus.PENDING ? "bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse" :
              member.status === MemberStatus.LEFT ? "bg-rose-500/25 text-rose-300 border-rose-500/40" :
              "bg-slate-500/20 text-slate-300 border-slate-500/30"
            }`}>
              {member.status === MemberStatus.NOT_MEMBER ? "NOT MEMBER" : member.status === MemberStatus.LEFT ? "LEFT MESS" : member.status === MemberStatus.TESTING ? "SANDBOX / TEST" : member.status}
            </span>
          </div>

          {/* Core Text details */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-1">
              <div>
                <h3 className={`font-extrabold text-sm truncate flex items-center gap-1.5 ${
                  isDarkMode ? "text-slate-100" : "text-slate-900"
                }`}>
                  {member.name}
                  {member.id === currentUser.id && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase animate-pulse">Me</span>
                  )}
                  {member.status === MemberStatus.TESTING && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide bg-purple-500/25 text-purple-300 border border-purple-500/40 uppercase flex items-center gap-0.5">
                      <FlaskConical size={10} className="text-purple-400" />
                      TEST ACCOUNT
                    </span>
                  )}
                </h3>
                <p className={`text-xs font-bold ${isDarkMode ? "text-cyan-300" : "text-cyan-700"}`}>
                  @{getRespectDisplayName(currentUser, member, respectSenioritySettings)}
                </p>
              </div>
              <span className={member.id === currentUser.id ? "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border transition-all animate-pulse border-cyan-400/40 bg-cyan-500/20 text-cyan-300" : getRoleStyle(displayRole)}>
                {member.id === currentUser.id 
                  ? (displayRole === UserRole.MEMBER ? "ME" : `ME (${displayRole.replace("_", " ")})`) 
                  : displayRole.replace("_", " ")}
              </span>
            </div>

            {showFullDetails ? (
              <div className={`mt-3.5 space-y-1.5 text-xs font-mono font-medium ${
                isDarkMode ? "text-slate-200" : "text-slate-800"
              }`}>
                <p className="flex items-center gap-1.5 truncate">
                  <Mail size={13} className={isDarkMode ? "text-cyan-400 shrink-0" : "text-cyan-600 shrink-0"} />
                  <span>{displayEmail}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Phone size={13} className={isDarkMode ? "text-cyan-400 shrink-0" : "text-cyan-600 shrink-0"} />
                  <span>{displayPhone}</span>
                </p>
                <p className="flex items-center gap-1.5 text-[11px]">
                  <Briefcase size={13} className={isDarkMode ? "text-cyan-400 shrink-0" : "text-cyan-600 shrink-0"} />
                  <span>{member.occupation || "Independent"}</span>
                </p>
                {member.roomLabel && (
                  <p className="flex items-center justify-between text-[11px] font-sans font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 mt-1">
                    <span className="flex items-center gap-1.5 truncate">
                      <DoorOpen size={13} className="shrink-0 text-cyan-400" />
                      <span className="truncate">{member.roomLabel}</span>
                    </span>
                    <span className="font-mono text-emerald-400 shrink-0">
                      ৳{member.roomRent || 0}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 p-2 bg-cyan-500/10 rounded border border-cyan-500/20 text-center">
                <p className="text-[9px] font-extrabold text-cyan-500 tracking-wider uppercase animate-pulse">Click Profile to View Meals</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        {showFullDetails && member.notes && (
          <p className={`mt-4 p-2.5 rounded-lg text-[11px] leading-relaxed italic border ${
            isDarkMode ? "bg-slate-950/80 border-slate-800 text-slate-200" : "bg-slate-100 border-slate-300 text-slate-800 font-medium"
          }`}>
            &ldquo;{member.notes}&rdquo;
          </p>
        )}

        {/* Action buttons footer */}
        <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-cyan-500/10 justify-between animate-fade-in">
          
          <div className="flex gap-2 items-center">
            {showFullDetails && (
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${
                isDarkMode ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40" : "bg-cyan-100 text-cyan-900 border-cyan-300"
              }`}>
                <Heart size={10} className="text-orange-500 fill-orange-500" />
                {member.bloodGroup}
              </span>
            )}
            <span className={`text-[10px] font-mono font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              Join: {member.joiningDate}
            </span>
            {(member.leavingDate || member.status === MemberStatus.LEFT) && (
              <span className={`text-[10px] font-mono font-bold ${isDarkMode ? "text-rose-300 bg-rose-500/10 px-1 rounded border border-rose-500/20" : "text-rose-700 bg-rose-50 px-1 rounded border border-rose-200"}`}>
                Left: {member.leavingDate || "Unknown"}
              </span>
            )}
          </div>


          {(isAuthorizedToEdit || currentUser.id === member.id) && (
            <div className="flex items-center gap-1.5">
              {/* Super Users cannot modify Admins */}
              {!(member.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) && (
                <>
                  {member.status === MemberStatus.PENDING && isAuthorizedToEdit && (
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleActivate(member.id); 
                      }}
                      className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      title="Activate & Verify Member"
                    >
                      <UserCheck size={12} />
                      Activate
                    </button>
                  )}

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

                  {currentUser.role === UserRole.ADMIN && member.id !== currentUser.id && (
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
  };

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

        <div className="flex items-center gap-2">
          <RefreshButton 
            module="futureModules" 
            onRefresh={async () => {
              onRefresh();
              await fetchDeletedMembers();
            }} 
          />

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

      {/* Active Members Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 font-display">
          <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
          Active Members ({activeMembers.length})
        </h3>
        
        {activeMembers.length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-900/20 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
            <p className="text-xs font-semibold">No active members found matching your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="members-grid">
            {activeMembers.map((member) => renderMemberCard(member))}
          </div>
        )}
      </div>

      {/* Pending Members Grid (Invited & Activating) */}
      {pendingMembers.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-900/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2 font-display">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Pending Accounts & Pending Verification ({pendingMembers.length})
          </h3>
          <p className="text-[10px] text-slate-400">
            These accounts have been added by email but are awaiting activation by logging in and setting their credentials.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="pending-members-grid">
            {pendingMembers.map((member) => renderMemberCard(member))}
          </div>
        </div>
      )}

      {/* Archive Box (Suspended & Departed Inactive Bucket visible to everyone) */}
      {inactiveMembers.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-900/40" id="inactive-bucket-wrapper">
          <div 
            onClick={() => setShowArchives(!showArchives)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between shadow-sm select-none ${
              isDarkMode 
                ? "bg-slate-900/20 border-slate-800 text-slate-200 hover:bg-slate-900/40 hover:border-slate-700" 
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300"
            }`}
            id="archives-toggle-box"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <Archive size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider font-display flex items-center gap-2">
                  Archives
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isDarkMode ? "bg-rose-500/10 text-rose-400" : "bg-rose-100 text-rose-600"
                  }`}>
                    {inactiveMembers.length} Accounts
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Click to view archived, left, or suspended resident profiles
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              {showArchives ? <ChevronUp size={20} className="animate-pulse" /> : <ChevronDown size={20} />}
            </div>
          </div>

          {showArchives && (
            <div className="mt-5 space-y-4 animate-fade-in">
              <p className="text-[10px] text-slate-400 italic">
                These accounts are suspended, have left the mess, or are archived. They are kept in the archive for historical reference.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="inactive-bucket-grid">
                {inactiveMembers.map((member) => {
                  const isTargetAdmin = member.role === UserRole.ADMIN;
                  const maskAdmin = isTargetAdmin && currentUser.role !== UserRole.ADMIN;

                  const showAdminRoleBadge = !maskAdmin || !!adminVisibility?.showAdminRole;
                  const showAdminEmailText = !maskAdmin || !!adminVisibility?.showAdminEmail;
                  const showAdminPhoneText = !maskAdmin || !!adminVisibility?.showAdminPhone;

                  let displayRole = showAdminRoleBadge ? member.role : UserRole.MEMBER;
                  if (member.hideAdminRole) {
                    displayRole = UserRole.MEMBER;
                  }
                  const displayEmail = showAdminEmailText ? member.email : "••••••••••••";
                  const displayPhone = showAdminPhoneText ? (member.phone || "No phone logged") : "••••••••••••";

                  const displayLeavingDate = member.leavingDate || "Unknown date";

                  const config = roleAnimations?.[displayRole];
                  const isRoleHidden = member.role === UserRole.ADMIN && displayRole === UserRole.MEMBER;
                  const useMemberSettings = isRoleHidden && member.splitProfile;

                  const hasGlow = useMemberSettings 
                    ? member.memberGlow 
                    : (member.glow || (config?.glow && config?.glowStyle && config?.glowStyle !== "none"));

                  const rawGlowStyle = useMemberSettings
                    ? (member.memberGlowStyle || "")
                    : (member.glowStyle || config?.glowStyle || "");

                  const glowStyle = (hasGlow && (!rawGlowStyle || rawGlowStyle === "none")) ? "nitro-classic" : rawGlowStyle;

                  const finalAnimation = useMemberSettings
                    ? (member.memberAnimation || "none")
                    : (member.animation || "none");

                  let cardGlowStyle: React.CSSProperties = {};
                  let cardGlowClass = "";
                  if (hasGlow && glowStyle && glowStyle !== "none") {
                    if (glowStyle.startsWith("#")) {
                      cardGlowStyle = {
                        boxShadow: isDarkMode 
                          ? `0 0 24px ${glowStyle}85, 0 0 10px ${glowStyle}55, inset 0 0 12px ${glowStyle}35` 
                          : `0 0 24px ${glowStyle}aa, 0 0 12px ${glowStyle}70, inset 0 0 12px ${glowStyle}30`,
                        borderColor: isDarkMode ? `${glowStyle}dd` : glowStyle
                      };
                    } else {
                      cardGlowClass = `glow-${glowStyle}`;
                    }
                  }

                  const isSuspended = member.status === MemberStatus.SUSPENDED;
                  const dateLabel = isSuspended ? "Suspended Date" : "Departed Mess";

                  return (
                    <div 
                      key={member.id} 
                      onClick={() => { setSelectedMemberForMeals(member); fetchMemberData(member.id); }}
                      className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] opacity-75 grayscale-[20%] hover:grayscale-0 hover:opacity-100 ${cardGlowClass} ${
                        isDarkMode 
                          ? "bg-slate-950/40 border-rose-500/10 text-slate-300 hover:border-rose-500/30" 
                          : "bg-slate-100/50 border-slate-200 shadow-sm text-slate-600 hover:border-rose-300"
                      }`}
                      style={cardGlowStyle}
                    >
                      <MicroAnimationOverlay animationType={finalAnimation} />
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
                              <p className="text-xs text-slate-500 font-semibold">@{getRespectDisplayName(currentUser, member, respectSenioritySettings)}</p>
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
                              {dateLabel}: {displayLeavingDate}
                            </p>
                          </div>
                        </div>


                        {(isAuthorizedToEdit || currentUser.id === member.id) && (
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

                                {currentUser.role === UserRole.ADMIN && member.id !== currentUser.id && (
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
        </div>
      )}

      {/* Restoration Bin (Recently Deleted - Admin & Super User only) */}
      {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER) && (
        <div className="mt-8 pt-6 border-t border-slate-900/40" id="restoration-bin-wrapper">
          <div 
            onClick={() => setShowDeletedMembers(!showDeletedMembers)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between shadow-sm select-none ${
              isDarkMode 
                ? "bg-slate-900/20 border-slate-800 text-slate-200 hover:bg-slate-900/40 hover:border-slate-700" 
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300"
            }`}
            id="restoration-bin-toggle-box"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider font-display flex items-center gap-2">
                  Restoration Bin (Recently Deleted)
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isDarkMode ? "bg-orange-500/10 text-orange-400" : "bg-orange-100 text-orange-600"
                  }`}>
                    {deletedMembers.length} Accounts
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  View permanently deleted accounts and restore their profiles with a single click
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              {showDeletedMembers ? <ChevronUp size={20} className="animate-pulse" /> : <ChevronDown size={20} />}
            </div>
          </div>

          {showDeletedMembers && (
            <div className="mt-5 space-y-4 animate-fade-in" id="deleted-members-container">
              <p className="text-[10px] text-slate-400 italic">
                Restoring a deleted member fully recovers their account access, original passwords, and automatically re-associates all of their historic meals, deposits, bills, and activity.
              </p>

              {deletedMembers.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-800 rounded-2xl">
                  No recently deleted members in the bin. Everything is clean!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {deletedMembers.map(({ member, deletedAt, deletedBy }) => (
                    <div 
                      key={member.id} 
                      className={`relative overflow-hidden p-5 rounded-2xl border transition-all ${
                        isDarkMode 
                          ? "bg-slate-950/40 border-orange-500/10 text-slate-300 hover:border-orange-500/30" 
                          : "bg-slate-100/50 border-slate-200 shadow-sm text-slate-600 hover:border-orange-300"
                      }`}
                    >
                      <div className="flex gap-4 items-start">
                        {/* Profile Photo */}
                        <div>
                          {member.photo ? (
                            <img 
                              src={member.photo} 
                              alt={member.nickname} 
                              className="w-16 h-16 rounded-xl object-cover border border-orange-500/20 opacity-70"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-lg font-display uppercase">
                              {member.nickname.slice(0, 2)}
                            </div>
                          )}
                        </div>

                        {/* Core Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-sm truncate text-slate-400 line-through decoration-slate-600">{member.name}</h3>
                          <p className="text-xs text-slate-500 font-semibold">@{getRespectDisplayName(currentUser, member, respectSenioritySettings)}</p>

                          <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-500 font-mono">
                            <p className="truncate">Role: <span className="text-slate-400">{member.role}</span></p>
                            <p className="truncate">Deleted By: <span className="text-orange-400 font-semibold">{deletedBy}</span></p>
                            <p className="truncate">Deleted At: <span className="text-slate-400">{new Date(deletedAt).toLocaleString()}</span></p>
                          </div>
                        </div>

                        {/* Undo Restore Button */}
                        <div className="flex self-center">
                          <button
                            onClick={() => handleUndoDelete(member.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 hover:text-orange-300 border border-orange-500/20 text-xs font-bold cursor-pointer transition-all hover:scale-105"
                            title="Undo Deletion and Restore"
                          >
                            <RotateCcw size={13} />
                            Undo Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
              
              {/* Profile Photo Customizer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Profile Photo</label>
                <div className="flex gap-3 items-center">
                  {editingMember.photo ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={editingMember.photo} 
                        className="w-14 h-14 rounded-xl object-cover border border-cyan-500/20" 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingMember({ ...editingMember, photo: null })}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-500 text-white p-0.5 rounded-full border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center w-4 h-4"
                        title="Remove photo"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">
                      EMPTY
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditPhotoUpload}
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

               {([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER, UserRole.PARTIAL_MANAGER].includes(currentUser.role)) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Role Level</label>
                      <select
                        value={editingMember.role}
                        disabled={disableRoleSelect}
                        onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as UserRole })}
                        className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                          disableRoleSelect ? "opacity-60 cursor-not-allowed" : ""
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
                      {originalRole === UserRole.ADMIN && isEditingSelf && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1">Admin cannot demote themselves.</p>
                      )}
                      {originalRole === UserRole.ADMIN && !isEditingSelf && isTargetUltimateAdmin && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1">The ultimate Admin cannot be demoted.</p>
                      )}
                      {originalRole === UserRole.ADMIN && !isEditingSelf && !isTargetUltimateAdmin && !isUltimateAdminActor && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1">Only the ultimate Admin can demote other Admins.</p>
                      )}
                    </div>
                    {([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER].includes(currentUser.role)) ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Status Code</label>
                        <select
                          value={editingMember.status}
                          disabled={disableStatusSelect}
                          onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as MemberStatus })}
                          className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                            disableStatusSelect ? "opacity-60 cursor-not-allowed" : ""
                          } ${
                            isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        >
                          {editingMember.status === MemberStatus.PENDING && editingMember.role !== UserRole.ADMIN && (
                            <option value={MemberStatus.PENDING}>PENDING</option>
                          )}
                          <option value={MemberStatus.ACTIVE}>ACTIVE</option>
                          <option value={MemberStatus.AWAY}>AWAY</option>
                          {editingMember.role === UserRole.ADMIN && (
                            <option value={MemberStatus.NOT_MEMBER}>Not member (only for Admin)</option>
                          )}
                          {editingMember.role !== UserRole.ADMIN && (
                            <option value={MemberStatus.SUSPENDED}>SUSPENDED</option>
                          )}
                          <option value={MemberStatus.LEFT}>LEFT MESS</option>
                          <option value={MemberStatus.ARCHIVED}>ARCHIVED</option>
                          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER) && (
                            <option value={MemberStatus.TESTING}>TESTING (স্যান্ডবক্স / টেস্ট অ্যাকাউন্ট - নো ডেটা ইমপ্যাক্ট)</option>
                          )}
                        </select>
                        {editingMember.status === MemberStatus.TESTING && (
                          <p className="text-[10px] text-purple-400 font-semibold mt-1">
                            🧪 Sandbox Test Member: Fully functional account for testing features. Excluded from settlement sheets, meal rates, and invisible to regular members.
                          </p>
                        )}
                        {editingMember.status === MemberStatus.NOT_MEMBER && (
                          <p className="text-[10px] text-amber-400 font-medium mt-1">
                            Non-participating Admin: Excluded from all meal rates, shared bill splits, and mess calculations.
                          </p>
                        )}
                        {originalRole === UserRole.ADMIN && isEditingSelf && (
                          <p className="text-[9px] text-rose-500 font-bold mt-1">Admin cannot select 'suspend' or 'pending' for their ID/profile.</p>
                        )}
                        {originalRole === UserRole.ADMIN && !isEditingSelf && !isUltimateAdminActor && (
                          <p className="text-[9px] text-rose-500 font-bold mt-1">Admin status cannot be changed by others.</p>
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

                  {([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER].includes(currentUser.role)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Joining Date</label>
                        <input
                          type="date"
                          value={editingMember.joiningDate ? editingMember.joiningDate.split("T")[0] : ""}
                          onChange={(e) => setEditingMember({ ...editingMember, joiningDate: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                            isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        />
                        <p className="text-[10px] text-slate-500">Member's first day in the mess.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-rose-400 uppercase tracking-wider block">Leaving Date (If Left)</label>
                        <input
                          type="date"
                          value={editingMember.leavingDate ? editingMember.leavingDate.split("T")[0] : ""}
                          onChange={(e) => setEditingMember({ ...editingMember, leavingDate: e.target.value || null })}
                          className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-rose-400 ${
                            isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        />
                        <p className="text-[10px] text-slate-500">Limits member's monthly dropdown visibility after departure.</p>
                      </div>
                    </div>
                  )}

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

              <div className="space-y-2 p-3 rounded-xl border bg-slate-500/5 border-slate-500/15">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Assigned Work / Task (Duty)</label>
                  {isAuthorizedToEdit && months.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Cycle:</span>
                      <select
                        value={dutyTargetMonthId}
                        onChange={(e) => setDutyTargetMonthId(e.target.value)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          isDarkMode ? "bg-slate-900 border-slate-700 text-cyan-400" : "bg-white border-slate-300 text-cyan-600"
                        }`}
                      >
                        {months.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.id === currentMonthId ? "(Current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

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

              {/* Academic Information Section */}
              <div className="space-y-3 border-t border-cyan-500/10 pt-4 mt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold font-display text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                    <GraduationCap size={15} /> Academic Information
                  </h4>
                  {!canEditAcademicAndRespect && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
                      Read-Only (Admin / Super User)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Institution</label>
                    <input
                      type="text"
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.institution || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, institution: e.target.value })}
                      placeholder="e.g. University / College Name"
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50" : isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Department</label>
                    <input
                      type="text"
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.department || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, department: e.target.value })}
                      placeholder="e.g. Computer Science / BBA"
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50" : isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Education Type</label>
                    <input
                      type="text"
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.educationType || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, educationType: e.target.value })}
                      placeholder="e.g. Bachelor / Masters / Diploma"
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50" : isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Admission Session</label>
                    <input
                      type="text"
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.admissionSession || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, admissionSession: e.target.value })}
                      placeholder="e.g. 2019-2020 or 2021"
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50" : isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Respect Information Section */}
              <div className="space-y-3 border-t border-cyan-500/10 pt-4 mt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold font-display text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Award size={15} /> Respect Information
                  </h4>
                  {!canEditAcademicAndRespect && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
                      Read-Only (Admin / Super User)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Gender</label>
                    <select
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.gender || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, gender: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50" : isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="">-- Select Gender --</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Seniority Rank</label>
                    <input
                      type="text"
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.seniorityYear || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, seniorityYear: e.target.value })}
                      placeholder="e.g. 2019 or Rank Year"
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50" : isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-wider block">Manual Title</label>
                    <input
                      type="text"
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.manualTitle || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, manualTitle: e.target.value })}
                      placeholder="e.g. ভাই, আপু, Sir"
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50" : isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Room & Accommodation Allocation Section */}
              <div className="space-y-3 border-t border-cyan-500/10 pt-4 mt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold font-display text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    <DoorOpen size={15} /> Room & Accommodation Allocation
                  </h4>
                  {!canEditAcademicAndRespect && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
                      Read-Only (Admin / Super User)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Assigned Room Size / Label</label>
                    <select
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.roomLabelId || editingMember.roomLabel || ""}
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        if (!selectedVal) {
                          setEditingMember({
                            ...editingMember,
                            roomLabelId: "",
                            roomLabel: "",
                            roomRent: undefined
                          });
                          return;
                        }
                        const matchedRoom = roomLabels.find(r => r.id === selectedVal || r.label === selectedVal);
                        if (matchedRoom) {
                          setEditingMember({
                            ...editingMember,
                            roomLabelId: matchedRoom.id,
                            roomLabel: matchedRoom.label,
                            roomRent: matchedRoom.rent
                          });
                        } else {
                          setEditingMember({
                            ...editingMember,
                            roomLabel: selectedVal,
                            roomLabelId: ""
                          });
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50" : isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="">-- No Room Allocated --</option>
                      {roomLabels.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label} (Default Rent: ৳{r.rent.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Default Monthly Rent (৳)</label>
                    <input
                      type="number"
                      disabled={!canEditAcademicAndRespect}
                      value={editingMember.roomRent !== undefined && editingMember.roomRent !== null ? editingMember.roomRent : ""}
                      onChange={(e) => setEditingMember({ ...editingMember, roomRent: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="e.g. 3000"
                      className={`w-full px-3 py-2 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        !canEditAcademicAndRespect ? "opacity-60 cursor-not-allowed bg-slate-900/50 text-emerald-400" : isDarkMode ? "bg-slate-900 border-slate-800 text-emerald-400" : "bg-white border-slate-200 text-emerald-600"
                      }`}
                    />
                  </div>
                </div>
                {editingMember.roomLabel && (
                  <div className="flex items-center gap-2 text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg">
                    <Home size={13} className="shrink-0 text-cyan-400" />
                    <span>Allocated: <strong>{editingMember.roomLabel}</strong> with default monthly rent of <strong>৳ {editingMember.roomRent || 0}</strong></span>
                  </div>
                )}
              </div>

              {/* Profile Background GIF Customizer (Admin Only) */}
              {currentUser.role === UserRole.ADMIN && (
                <div className="space-y-2 border-t border-slate-800/40 pt-4 mt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold font-display text-cyan-400 uppercase tracking-wide flex items-center gap-1">
                      ✨ Profile Background GIF
                    </h4>
                    {editingMember.gifEnabledByAdmin === false && (
                      <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        Disabled by Admin
                      </span>
                    )}
                  </div>

                  {editingMember.gifEnabledByAdmin !== false ? (
                    <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800 space-y-3">
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Personalize your profile card background with an animated GIF. You can either paste a GIF link or upload an offline GIF file directly from your device.
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingMember.animation?.startsWith("data:")) {
                              if (!editingMember.animation) {
                                setEditingMember({ ...editingMember, animation: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Y2Zmxtb3ZqZHVpdjYwNzZpZGF5NDgxdHlyOTVqdDN5M2U5bmsxOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9DGF96g8Q09g97D1px/giphy.gif" });
                              }
                            }
                          }}
                          className={`flex-1 py-1 px-2 text-[10px] font-bold rounded transition-colors ${
                            !editingMember.animation?.startsWith("data:") 
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                              : "bg-slate-950 text-slate-400 border border-slate-800"
                          }`}
                        >
                          Web Link (URL)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            document.getElementById("gif-file-upload")?.click();
                          }}
                          className={`flex-1 py-1 px-2 text-[10px] font-bold rounded transition-colors ${
                            editingMember.animation?.startsWith("data:") 
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                              : "bg-slate-950 text-slate-400 border border-slate-800"
                          }`}
                        >
                          Upload Local GIF 📁
                        </button>
                      </div>

                      {/* Hidden file input for easy trigger */}
                      <input
                        id="gif-file-upload"
                        type="file"
                        accept="image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith("image/gif") && !file.name.toLowerCase().endsWith(".gif")) {
                            alert("Please select a valid .gif image file.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            setEditingMember({ ...editingMember, animation: base64 });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />

                      {editingMember.animation?.startsWith("data:") ? (
                        <div className="space-y-1.5 animate-fade-in">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                              Offline Uploaded GIF
                            </label>
                            <button
                              type="button"
                              onClick={() => setEditingMember({ ...editingMember, animation: "" })}
                              className="text-[9px] font-bold text-rose-400 hover:text-rose-300"
                            >
                              Remove GIF
                            </button>
                          </div>
                          <div className="p-3 border border-dashed border-slate-800 rounded-lg bg-slate-950 flex flex-col items-center justify-center gap-2">
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              ● GIF Stored Offline in Account
                            </span>
                            <span className="text-[9px] text-slate-500 text-center">
                              Size: {Math.round(editingMember.animation.length * 0.75 / 1024)} KB. Saved securely inside database.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 animate-fade-in">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                              GIF Link URL
                            </label>
                            {editingMember.animation && (
                              <button
                                type="button"
                                onClick={() => setEditingMember({ ...editingMember, animation: "" })}
                                className="text-[9px] font-bold text-rose-400 hover:text-rose-300"
                              >
                                Remove GIF
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="https://example.com/background.gif"
                            value={editingMember.animation || ""}
                            onChange={(e) => setEditingMember({ ...editingMember, animation: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                          />
                          
                          {/* Drag and drop offline target */}
                          <div 
                            className="mt-2 p-4 border border-dashed border-slate-800 rounded-lg bg-slate-950/40 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-900/30 transition-colors"
                            onClick={() => document.getElementById("gif-file-upload")?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                if (!file.type.startsWith("image/gif") && !file.name.toLowerCase().endsWith(".gif")) {
                                  alert("Please drop a valid .gif image file.");
                                  return;
                                };
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  setEditingMember({ ...editingMember, animation: base64 });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          >
                            <span className="text-xs text-cyan-400 font-medium">Or Drag & Drop your GIF file here</span>
                            <span className="text-[9px] text-slate-500">Supports offline storing in your account</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-rose-950/10 border border-rose-500/10 text-center">
                      <span className="text-xs text-rose-400 font-semibold block">
                        ⚠️ Custom GIF feature disabled
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1 leading-normal">
                        The admin has toggled off this premium GIF background capability for your profile. Please contact system admin.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {currentUser.role === UserRole.ADMIN && (
                <div className="space-y-4 border-t border-slate-800/60 pt-4 mt-2">
                  <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">
                    👑 Authority Profile Customizer (Admin Only)
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    As Admin, you can grant premium glowing cards and animation overlays for individual profiles.
                  </p>

                  {/* GIF Background Feature admin toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-200 block">GIF Background Feature Status</label>
                      <span className="text-[9px] text-slate-400">Turn on/off this custom background feature for this member individually.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingMember.gifEnabledByAdmin !== false}
                      onChange={(e) => setEditingMember({ ...editingMember, gifEnabledByAdmin: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-slate-950 border-slate-850 rounded focus:ring-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* Ultimate Admin (mdshahriarhimel@gmail.com) exclusive overrides or self ADMIN/SUPERUSER hide himself */}
                  {(currentUser.email.toLowerCase() === "mdshahriarhimel@gmail.com" || 
                    (editingMember.id === currentUser.id && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER))) && (
                    <div className="space-y-3 bg-cyan-950/20 p-3 rounded-xl border border-cyan-500/20">
                      <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                        🌟 {currentUser.email.toLowerCase() === "mdshahriarhimel@gmail.com" ? "Ultimate Admin Overrides" : "Profile Visibility (Self-Hide)"}
                      </p>
                      
                      {/* Hide Contact Info Toggle */}
                      {currentUser.email.toLowerCase() === "mdshahriarhimel@gmail.com" && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                          <div className="space-y-0.5">
                            <label className="text-xs font-bold text-slate-200 block">Hide Contact Info</label>
                            <span className="text-[9px] text-slate-400 block">Mask email, phone, and WhatsApp from standard members.</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={!!editingMember.hideContactInfoByAdmin}
                            onChange={(e) => setEditingMember({ ...editingMember, hideContactInfoByAdmin: e.target.checked })}
                            className="w-4 h-4 text-cyan-500 bg-slate-950 border-slate-850 rounded focus:ring-cyan-500 cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Hide Card From Directory Toggle */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                        <div className="space-y-0.5">
                          <label className="text-xs font-bold text-slate-200 block">Hide Profile Card from Directory</label>
                          <span className="text-[9px] text-slate-400 block">Completely hide card from members list for standard members.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!editingMember.hideCardFromDirectoryByAdmin}
                          onChange={(e) => setEditingMember({ ...editingMember, hideCardFromDirectoryByAdmin: e.target.checked })}
                          className="w-4 h-4 text-cyan-500 bg-slate-950 border-slate-850 rounded focus:ring-cyan-500 cursor-pointer"
                        />
                      </div>

                      {/* Enable/Disable Glowing Effect Toggle */}
                      {currentUser.email.toLowerCase() === "mdshahriarhimel@gmail.com" && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                          <div className="space-y-0.5">
                            <label className="text-xs font-bold text-slate-200 block">Enable Profile Glowing</label>
                            <span className="text-[9px] text-slate-400 block">Allow/Disallow this profile to show glowing styles. Default is enabled.</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={editingMember.glowEnabledByAdmin !== false}
                            onChange={(e) => setEditingMember({ ...editingMember, glowEnabledByAdmin: e.target.checked })}
                            className="w-4 h-4 text-cyan-500 bg-slate-950 border-slate-850 rounded focus:ring-cyan-500 cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Hide Admin Role Toggle for Ultimate Admin */}
                      {currentUser.email.toLowerCase() === "mdshahriarhimel@gmail.com" && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                          <div className="space-y-0.5">
                            <label className="text-xs font-bold text-slate-200 block">Show Self as Member (Hide Admin Role)</label>
                            <span className="text-[9px] text-slate-400 block">Individually turn off showing your Admin role and display as MEMBER instead.</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={!!editingMember.hideAdminRole}
                            onChange={(e) => setEditingMember({ ...editingMember, hideAdminRole: e.target.checked })}
                            className="w-4 h-4 text-cyan-500 bg-slate-950 border-slate-850 rounded focus:ring-cyan-500 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Real-time calculated glow mode */}
                  {(() => {
                    const glowMode = !editingMember.glow ? "none" : (editingMember.glowStyle && editingMember.glowStyle.startsWith("#") ? "custom-color" : "preset");
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                          <label className="text-xs text-slate-200 font-semibold block mb-1">Glow Effect Mode</label>
                          <select
                            value={glowMode}
                            onChange={(e) => {
                              const mode = e.target.value;
                              if (mode === "none") {
                                setEditingMember({ ...editingMember, glow: false, glowStyle: "" });
                              } else if (mode === "custom-color") {
                                setEditingMember({ ...editingMember, glow: true, glowStyle: "#22d3ee" });
                              } else {
                                setEditingMember({ ...editingMember, glow: true, glowStyle: "nitro-classic" });
                              }
                            }}
                            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                          >
                            <option value="none">No Glowing Effect</option>
                            <option value="custom-color">Custom Solid Color Palette</option>
                            <option value="preset">Discord Premium Animated Presets (20+)</option>
                          </select>

                          {glowMode === "custom-color" && (
                            <div className="pt-2 animate-fade-in">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Choose Color Palette</label>
                              <ColorPalettePicker
                                value={editingMember.glowStyle || "#22d3ee"}
                                onChange={(color) => setEditingMember({ ...editingMember, glowStyle: color })}
                              />
                            </div>
                          )}

                          {glowMode === "preset" && (
                            <div className="pt-2 animate-fade-in">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Choose Animated Preset</label>
                              <select
                                value={editingMember.glowStyle || "nitro-classic"}
                                onChange={(e) => setEditingMember({ ...editingMember, glowStyle: e.target.value })}
                                className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                              >
                                <option value="nitro-classic">Discord Nitro Classic 💗💙</option>
                                <option value="nitro-boost">Nitro Boost Crystal 🔮💖</option>
                                <option value="cyber-laser">Cyberpunk Laser Scanner 🟥🟦</option>
                                <option value="rainbow-shimmer">Prismatic Rainbow Shimmer 🌈</option>
                                <option value="frozen-frost">Frozen Ice Frostbite ❄️🧊</option>
                                <option value="royal-majesty">Royal Crown Gold Majesty 👑👑</option>
                                <option value="sakura-blossom">Sakura Blossom Wave 🌸🌸</option>
                                <option value="dark-matter">Cosmic Dark Matter 🌌🟣</option>
                                <option value="supernova">Supernova Flame Blast 💥💥</option>
                                <option value="matrix-rain">Emerald Matrix Code Rain 🟢🟢</option>
                                <option value="electric-storm">Indigo Electric Storm ⚡⚡</option>
                                <option value="retro-horizon">Retro Sunset Horizon 🌅🌅</option>
                                <option value="golden-aura">Classic Golden Aura ✨</option>
                                <option value="volcanic-flame">Classic Volcanic Flame 🔥</option>
                                <option value="cyberpunk-neon">Classic Cyberpunk Neon ⚡</option>
                                <option value="emerald-ripple">Classic Emerald Ripple 🟢</option>
                                <option value="cosmic-nebula">Classic Cosmic Nebula 🌌</option>
                                <option value="deep-ocean">Classic Deep Ocean 🌊</option>
                                <option value="ruby-laser">Classic Ruby Laser 🔴</option>
                                <option value="velvet-pulse">Classic Velvet Pulse 🟣</option>
                                <option value="amethyst-shimmer">Classic Amethyst Shimmer 🔮</option>
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                          <div>
                            <label className="text-xs text-slate-200 font-semibold block mb-1">Profile Animation Overlay</label>
                            <select
                              value={
                                !editingMember.animation || ["none", "sparkles", "confetti", "bubbles", "pulse"].includes(editingMember.animation)
                                  ? (editingMember.animation || "none")
                                  : "custom"
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "custom") {
                                  setEditingMember({ ...editingMember, animation: "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Y2Zmxtb3ZqZHVpdjYwNzZpZGF5NDgxdHlyOTVqdDN5M2U5bmsxOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9DGF96g8Q09g97D1px/giphy.gif" });
                                } else {
                                  setEditingMember({ ...editingMember, animation: val });
                                }
                              }}
                              className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            >
                              <option value="none">No Animation</option>
                              <option value="sparkles">Sparkles ✨</option>
                              <option value="confetti">Confetti 🎊</option>
                              <option value="bubbles">Floating Bubbles 🫧</option>
                              <option value="pulse">Aura Pulse 📳</option>
                              <option value="custom">Custom Image / GIF URL 🖼️</option>
                            </select>
                          </div>

                          {!["none", "sparkles", "confetti", "bubbles", "pulse"].includes(editingMember.animation || "none") && (
                            <div className="mt-2 space-y-1 animate-fade-in">
                              <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Custom Image or GIF URL</label>
                              <input
                                type="text"
                                placeholder="https://example.com/animation.gif"
                                value={editingMember.animation || ""}
                                onChange={(e) => setEditingMember({ ...editingMember, animation: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                              />
                              <span className="text-[9px] text-slate-500 block">
                                Enter any live web link to a static image, animated GIF, or web asset to style your profile card background.
                              </span>
                            </div>
                          )}

                          {editingMember.role === UserRole.ADMIN && (
                            <div className="space-y-3 pt-2 border-t border-slate-800/60 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-300">Dual-Profile Customization</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!editingMember.splitProfile} 
                                    onChange={(e) => setEditingMember({ ...editingMember, splitProfile: e.target.checked })}
                                    className="sr-only peer cursor-pointer"
                                  />
                                  <div className="w-8 h-4 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                              </div>

                              {editingMember.splitProfile && (
                                <div className="space-y-2 pt-1 animate-fade-in">
                                  <div>
                                    <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Hidden Member Glow</label>
                                    <select
                                      value={!editingMember.memberGlow ? "none" : (editingMember.memberGlowStyle?.startsWith("#") ? "color" : "preset")}
                                      onChange={(e) => {
                                        const mode = e.target.value;
                                        if (mode === "none") {
                                          setEditingMember({ ...editingMember, memberGlow: false });
                                        } else if (mode === "color") {
                                          setEditingMember({ ...editingMember, memberGlow: true, memberGlowStyle: "#e11d48" });
                                        } else {
                                          setEditingMember({ ...editingMember, memberGlow: true, memberGlowStyle: "nitro-classic" });
                                        }
                                      }}
                                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-white focus:outline-none"
                                    >
                                      <option value="none">No Glowing Card</option>
                                      <option value="color">Custom Solid Color Palette</option>
                                      <option value="preset">Discord Premium Animated Presets</option>
                                    </select>
                                  </div>

                                  {editingMember.memberGlow && editingMember.memberGlowStyle?.startsWith("#") && (
                                    <div className="pt-1">
                                      <ColorPalettePicker
                                        value={editingMember.memberGlowStyle}
                                        onChange={(color) => setEditingMember({ ...editingMember, memberGlowStyle: color })}
                                      />
                                    </div>
                                  )}

                                  {editingMember.memberGlow && !editingMember.memberGlowStyle?.startsWith("#") && (
                                    <div className="pt-1">
                                      <select
                                        value={editingMember.memberGlowStyle || "nitro-classic"}
                                        onChange={(e) => setEditingMember({ ...editingMember, memberGlowStyle: e.target.value })}
                                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-white focus:outline-none"
                                      >
                                        <option value="nitro-classic">Discord Nitro Classic 💗💙</option>
                                        <option value="nitro-boost">Nitro Boost Crystal 🔮💖</option>
                                        <option value="cyber-laser">Cyberpunk Laser Scanner 🟥🟦</option>
                                        <option value="rainbow-shimmer">Prismatic Rainbow Shimmer 🌈</option>
                                        <option value="frozen-frost">Frozen Ice Frostbite ❄️🧊</option>
                                        <option value="royal-majesty">Royal Crown Gold Majesty 👑👑</option>
                                        <option value="sakura-blossom">Sakura Blossom Wave 🌸🌸</option>
                                        <option value="dark-matter">Cosmic Dark Matter 🌌🟣</option>
                                        <option value="supernova">Supernova Flame Blast 💥💥</option>
                                        <option value="matrix-rain">Emerald Matrix Code Rain 🟢🟢</option>
                                        <option value="electric-storm">Indigo Electric Storm ⚡⚡</option>
                                        <option value="retro-horizon">Retro Sunset Horizon 🌅🌅</option>
                                        <option value="golden-aura">Classic Golden Aura ✨</option>
                                        <option value="volcanic-flame">Classic Volcanic Flame 🔥</option>
                                        <option value="cyberpunk-neon">Classic Cyberpunk Neon ⚡</option>
                                        <option value="emerald-ripple">Classic Emerald Ripple 🟢</option>
                                        <option value="cosmic-nebula">Classic Cosmic Nebula 🌌</option>
                                        <option value="deep-ocean">Classic Deep Ocean 🌊</option>
                                        <option value="ruby-laser">Classic Ruby Laser 🔴</option>
                                        <option value="velvet-pulse">Classic Velvet Pulse 🟣</option>
                                        <option value="amethyst-shimmer">Classic Amethyst Shimmer 🔮</option>
                                      </select>
                                    </div>
                                  )}

                                  <div>
                                    <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Hidden Member Animation</label>
                                    <select
                                      value={
                                        !editingMember.memberAnimation || ["none", "sparkles", "confetti", "bubbles", "pulse"].includes(editingMember.memberAnimation)
                                          ? (editingMember.memberAnimation || "none")
                                          : "custom"
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "custom") {
                                          setEditingMember({ ...editingMember, memberAnimation: "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Y2Zmxtb3ZqZHVpdjYwNzZpZGF5NDgxdHlyOTVqdDN5M2U5bmsxOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9DGF96g8Q09g97D1px/giphy.gif" });
                                        } else {
                                          setEditingMember({ ...editingMember, memberAnimation: val });
                                        }
                                      }}
                                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-white focus:outline-none"
                                    >
                                      <option value="none">No Animation</option>
                                      <option value="sparkles">Sparkles ✨</option>
                                      <option value="confetti">Confetti 🎊</option>
                                      <option value="bubbles">Floating Bubbles 🫧</option>
                                      <option value="pulse">Aura Pulse 📳</option>
                                      <option value="custom">Custom Image / GIF URL 🖼️</option>
                                    </select>
                                  </div>

                                  {!["none", "sparkles", "confetti", "bubbles", "pulse"].includes(editingMember.memberAnimation || "none") && (
                                    <div className="mt-1 space-y-1 animate-fade-in">
                                      <label className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Custom Member GIF URL</label>
                                      <input
                                        type="text"
                                        placeholder="https://example.com/animation.gif"
                                        value={editingMember.memberAnimation || ""}
                                        onChange={(e) => setEditingMember({ ...editingMember, memberAnimation: e.target.value })}
                                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-white focus:outline-none focus:border-cyan-500/50"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-3 border-t border-slate-850 mt-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/members/${editingMember.id}`, {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "Authorization": `Bearer ${authToken}`
                                    },
                                    body: JSON.stringify({
                                      glow: editingMember.glow,
                                      glowStyle: editingMember.glowStyle,
                                      animation: editingMember.animation,
                                      splitProfile: editingMember.splitProfile,
                                      memberGlow: editingMember.memberGlow,
                                      memberGlowStyle: editingMember.memberGlowStyle,
                                      memberAnimation: editingMember.memberAnimation
                                    })
                                  });
                                  if (!response.ok) {
                                    const d = await response.json();
                                    throw new Error(d.error || "Failed to update glow");
                                  }
                                  alert("Glow customizations applied successfully!");
                                  onRefresh();
                                } catch (err: any) {
                                  alert("Error applying glow changes: " + err.message);
                                }
                              }}
                              className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                            >
                              Apply Glow Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Real-Time Miniaturized Layout Preview */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-cyan-500/10 mt-3">
                    <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">
                      Real-Time Miniaturized Layout Preview
                    </h5>
                    <div className="flex justify-center">
                      {/* Mini Card */}
                      <div 
                        className={`relative overflow-hidden w-64 p-3 rounded-xl border bg-slate-900/90 text-white ${
                          editingMember.glow && (!editingMember.glowStyle || !editingMember.glowStyle.startsWith("#")) ? `glow-${editingMember.glowStyle}` : ""
                        }`}
                        style={{
                          boxShadow: editingMember.glow && editingMember.glowStyle && editingMember.glowStyle.startsWith("#") ? `0 0 22px ${editingMember.glowStyle}90, 0 0 10px ${editingMember.glowStyle}50` : undefined,
                          borderColor: editingMember.glow && editingMember.glowStyle && editingMember.glowStyle.startsWith("#") ? `${editingMember.glowStyle}dd` : undefined
                        }}
                      >
                        <MicroAnimationOverlay animationType={editingMember.animation} />
                        <div className="flex gap-3 items-center">
                          {editingMember.photo ? (
                            <img 
                              src={editingMember.photo} 
                              alt="Preview" 
                              className="w-10 h-10 rounded-lg object-cover border border-cyan-500/25"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs uppercase">
                              {(editingMember.nickname || "ME").slice(0, 2)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-xs truncate">{editingMember.name || "Full Name"}</h4>
                            <p className="text-[10px] text-cyan-400 font-semibold">@{editingMember.nickname || "nickname"}</p>
                            <span className="inline-block text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border mt-1 border-slate-700 bg-slate-800/40 text-slate-300">
                              {editingMember.role || "MEMBER"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  Mess Resident Ledger: {getRespectDisplayName(currentUser, selectedMemberForMeals, respectSenioritySettings)}
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
                      <p className="text-xs text-cyan-400 font-bold">@{getRespectDisplayName(currentUser, selectedMemberForMeals, respectSenioritySettings)}</p>
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
                        <span className="truncate" title={selectedMemberForMeals.email}>
                          {selectedMemberForMeals.hideContactInfoByAdmin && currentUser.role !== UserRole.ADMIN 
                            ? "••••••••••••" 
                            : (selectedMemberForMeals.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN && !adminVisibility?.showAdminEmail 
                              ? "••••••••••••" 
                              : selectedMemberForMeals.email)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Phone size={13} className="text-cyan-400 shrink-0" />
                        <span>
                          {selectedMemberForMeals.hideContactInfoByAdmin && currentUser.role !== UserRole.ADMIN 
                            ? "••••••••••••" 
                            : (selectedMemberForMeals.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN && !adminVisibility?.showAdminPhone 
                              ? "••••••••••••" 
                              : (selectedMemberForMeals.phone || "No phone number"))}
                        </span>
                      </div>
                      {selectedMemberForMeals.whatsapp && (!(selectedMemberForMeals.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN && !adminVisibility?.showAdminPhone)) && (!(selectedMemberForMeals.hideContactInfoByAdmin && currentUser.role !== UserRole.ADMIN)) && (
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
                      {(selectedMemberForMeals.roomLabel || selectedMemberForMeals.roomRent) && (
                        <div className="flex items-center justify-between text-cyan-300 font-bold bg-cyan-500/10 px-2.5 py-1.5 rounded-lg border border-cyan-500/20 mt-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <DoorOpen size={13} className="text-cyan-400 shrink-0" />
                            <span className="font-sans text-[11px] truncate">{selectedMemberForMeals.roomLabel || "Assigned Room"}</span>
                          </div>
                          <span className="text-[11px] font-mono font-black text-emerald-400 shrink-0">
                            ৳ {selectedMemberForMeals.roomRent ? selectedMemberForMeals.roomRent.toLocaleString() : 0}/mo
                          </span>
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
                        {(() => {
                          const activeMealTypes = mealTypes?.filter((t: any) => t.enabled) || [
                            { id: "lunch", name: "Lunch" },
                            { id: "dinner", name: "Dinner" }
                          ];
                          return memberMeals.reduce((sum, m) => {
                            let itemSum = 0;
                            activeMealTypes.forEach((type) => {
                              itemSum += (m as any)[type.id] || 0;
                            });
                            return sum + itemSum;
                          }, 0);
                        })()}
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
                    {(() => {
                      const activeMealTypes = mealTypes?.filter((t: any) => t.enabled) || [
                        { id: "lunch", name: "Lunch" },
                        { id: "dinner", name: "Dinner" }
                      ];
                      return (
                        <>
                          <p className="text-[10px] font-extrabold uppercase text-orange-500 tracking-wider">
                            Daily Meal Counts ({activeMealTypes.map(t => t.name).join(" & ")})
                          </p>

                          <div className="border border-slate-850 rounded-lg overflow-hidden bg-slate-950/20">
                            <div className="max-h-[160px] overflow-y-auto pr-1">
                              <table className="w-full text-xs text-left">
                                <thead className="text-[9px] uppercase font-bold text-slate-500 border-b border-slate-850 bg-slate-950/60 sticky top-0">
                                  <tr>
                                    <th className="py-2 px-3">Date</th>
                                    {activeMealTypes.map((type) => (
                                      <th key={type.id} className="py-2 px-3 text-center">{type.name}</th>
                                    ))}
                                    <th className="py-2 px-3 text-center">Day Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850/60 font-mono">
                                  {memberMeals.length === 0 ? (
                                    <tr>
                                      <td colSpan={2 + activeMealTypes.length} className="py-6 text-center text-slate-500 italic">
                                        No meal accounts posted for this month cycle.
                                      </td>
                                    </tr>
                                  ) : (
                                    memberMeals.map((m, index) => {
                                      let dayTotal = 0;
                                      return (
                                        <tr key={index} className="hover:bg-slate-900/30">
                                          <td className="py-1.5 px-3 font-sans font-medium text-slate-300">{m.date}</td>
                                          {activeMealTypes.map((type) => {
                                            const val = (m as any)[type.id] || 0;
                                            dayTotal += val;
                                            return (
                                              <td key={type.id} className="py-1.5 px-3 text-center text-cyan-400 font-semibold">{val}</td>
                                            );
                                          })}
                                          <td className="py-1.5 px-3 text-center text-orange-400 font-bold">{dayTotal}</td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      );
                    })()}
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
