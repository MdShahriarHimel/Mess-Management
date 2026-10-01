/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  Plus, 
  Pin, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Search, 
  Printer, 
  Copy, 
  Check, 
  Users, 
  Scale, 
  RefreshCw, 
  HeartHandshake, 
  Coffee, 
  Utensils, 
  DollarSign, 
  X,
  VolumeX,
  Bed,
  Bath,
  Zap,
  HelpCircle,
  Laptop,
  ShieldCheck,
  Calendar,
  Layers,
  Info
} from "lucide-react";
import { Member, MessRule, RuleType, RuleSeverity, UserRole } from "../types.js";
import { RefreshButton } from "./RefreshButton.tsx";
import { getAuthToken } from "../lib/authHeader.ts";

interface RulesProps {
  currentUser: Member;
  isDarkMode: boolean;
  members: Member[];
  isPlatformOwner?: boolean;
}

const MESS_CATEGORIES = [
  "Dining & Meal",
  "Bills & Payments",
  "Market & Duties",
  "Quiet Hours & Noise",
  "Guest Policy",
  "Hygiene & Cleanliness",
  "Safety & Security",
  "General Conduct"
];

const PERSONAL_CATEGORIES = [
  "Personal Hygiene",
  "Room & Privacy",
  "Personal Conduct",
  "Appliances & Electricity",
  "Study & Sleep Hours",
  "Belongings & Shared Items",
  "Conflict Resolution"
];

const MANUAL_CATEGORIES = [
  "Meals & Dining Manual",
  "Finance & Accounts Manual",
  "Market & Duties Manual",
  "Roles & Security Manual",
  "General Website Guidelines"
];

const PRESET_TEMPLATES = [
  {
    type: "MESS" as RuleType,
    title: "Meal Change Cutoff Times",
    titleBn: "মিল অন/অফ করার সময়সীমা",
    category: "Dining & Meal",
    severity: "CRITICAL" as RuleSeverity,
    description: "Lunch meal cutoff is 08:00 AM and Dinner cutoff is 04:00 PM. No meal changes are accepted after cutoff without manager permission.",
    descriptionBn: "দুপুরের মিল অফ/অন সকাল ৮:০০ টা ও রাতের জন্য বিকাল ৪:০০ টা। এরপর কোনো পরিবর্তন গ্রহণযোগ্য নয়।",
    penalty: "Meal charge will be billed (মিল চার্জ কর্তন হবে)"
  },
  {
    type: "MESS" as RuleType,
    title: "Monthly Deposit Deadline",
    titleBn: "মাসিক ডিপোজিট পরিশোধের শেষ সময়",
    category: "Bills & Payments",
    severity: "STRICT" as RuleSeverity,
    description: "All members must deposit the required mess advance money and utility dues by the 5th of every active month.",
    descriptionBn: "প্রতি মাসের ৫ তারিখের মধ্যে নির্ধারিত ডিপোজিট ও ইউটিলিটি বিল পরিশোধ বাধ্যতামূলক।",
    penalty: "Tk 50/day late fine (দৈনিক ৫০ টাকা জরিমানা)"
  },
  {
    type: "MESS" as RuleType,
    title: "Late Night Silence Policy",
    titleBn: "রাত্রিকালীন নীরবতা ও গেট নিয়ম",
    category: "Quiet Hours & Noise",
    severity: "CRITICAL" as RuleSeverity,
    description: "Strict quiet hours from 11:30 PM to 07:00 AM. Loud music, noise, or late-night room gathering is strictly forbidden.",
    descriptionBn: "রাত ১১:৩০ টা থেকে সকাল ৭:০০ টা পর্যন্ত নীরবতা আবশ্যক। উচ্চশব্দে গান বাজানো বা আড্ডা সম্পূর্ণ নিষিদ্ধ।",
    penalty: "Manager warning & accountability"
  },
  {
    type: "PERSONAL" as RuleType,
    title: "Washroom Cleanliness & Dryness",
    titleBn: "ওয়াশরুম পরিচ্ছন্নতা ও শুকনো রাখা",
    category: "Personal Hygiene",
    severity: "CRITICAL" as RuleSeverity,
    description: "Washroom must be flushed thoroughly and left dry & tidy after every use. Keep personal toiletries in designated spots.",
    descriptionBn: "টয়লেট ব্যবহারের পর পর্যাপ্ত পানি ঢালুন ও পরিষ্কার রাখুন। নিজস্ব প্রসাধন নির্দিষ্ট স্থানে রাখুন।",
    penalty: "Assigned washroom cleaning duty"
  },
  {
    type: "PERSONAL" as RuleType,
    title: "Roommate Privacy & Belongings",
    titleBn: "রুমমেটের গোপনীয়তা ও জিনিসপত্রের সম্মান",
    category: "Room & Privacy",
    severity: "CRITICAL" as RuleSeverity,
    description: "Do not borrow, use, or touch another roommate's clothes, laptop, chargers, or personal items without explicit permission.",
    descriptionBn: "অন্যের অনুমতি ছাড়া রুমমেটের জামাকাপড়, ডিভাইস বা ব্যক্তিগত জিনিস ব্যবহার করবেন না।",
    penalty: "Direct verbal accountability"
  },
  {
    type: "MANUAL" as RuleType,
    title: "How to Book & Change Daily Meals",
    titleBn: "দৈনিক মিল অন/অফ করার ওয়েবসাইট গাইড",
    category: "Meals & Dining Manual",
    severity: "CRITICAL" as RuleSeverity,
    description: "Go to the 'Meals' tab, locate your name row, and click the meal slot before the cutoff deadline. For special off-time changes, use the 'Request Meal Change' button.",
    descriptionBn: "'মিল ট্র্যাকার' ট্যাবে গিয়ে আপনার নামের সারিতে মিল অন বা অফ করুন। সময় শেষ হওয়ার পর পরিবর্তন করতে রিকোয়েস্ট পাঠান।",
    penalty: "স্বয়ংক্রিয় লাইভ হিসাব (Automated calculation)"
  },
  {
    type: "MANUAL" as RuleType,
    title: "Tracking Deposits & Settlement Balance",
    titleBn: "ডিপোজিট জমা ও নিজের ব্যালেন্স চেক করার গাইড",
    category: "Finance & Accounts Manual",
    severity: "STRICT" as RuleSeverity,
    description: "After paying monthly advance to the manager, check your updated deposit and live balance on your personal dashboard overview.",
    descriptionBn: "ম্যানেজারকে ডিপোজিট প্রদানের পর ড্যাশবোর্ডে আপনার ডিপোজিট এন্ট্রি এবং রিমেইনিং ব্যালেন্স ভেরিফাই করুন।",
    penalty: "স্বচ্ছ ডিজিটাল লেজার (Transparent ledger)"
  }
];

export default function Rules({ currentUser, isDarkMode, members, isPlatformOwner = false }: RulesProps) {
  const authToken = getAuthToken(currentUser);
  const [rules, setRules] = useState<MessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "MESS" | "PERSONAL" | "MANUAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<MessRule | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<RuleType>("MESS");
  const [formTitle, setFormTitle] = useState("");
  const [formTitleBn, setFormTitleBn] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDescBn, setFormDescBn] = useState("");
  const [formCategory, setFormCategory] = useState(MESS_CATEGORIES[0]);
  const [formSeverity, setFormSeverity] = useState<RuleSeverity>("STANDARD");
  const [formPenalty, setFormPenalty] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isUltimateAdmin = Boolean(isPlatformOwner || currentUser?.isUltimateAdmin || currentUser?.isPlatformOwner);
  // STRICT RULE: Normal members and managers CANNOT edit or delete rules or manual.
  // ONLY Super User, Assistant Super User, Admin, and Platform Owner can add, edit, or delete.
  const canManage = currentUser.role === UserRole.SUPERUSER || 
                    currentUser.role === UserRole.ASSISTANT_SUPERUSER || 
                    currentUser.role === UserRole.ADMIN || 
                    isPlatformOwner || 
                    isUltimateAdmin;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rules", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const openAddModal = (presetType: RuleType = "MESS") => {
    setEditingRule(null);
    setFormType(presetType);
    setFormTitle("");
    setFormTitleBn("");
    setFormDesc("");
    setFormDescBn("");
    if (presetType === "MESS") setFormCategory(MESS_CATEGORIES[0]);
    else if (presetType === "PERSONAL") setFormCategory(PERSONAL_CATEGORIES[0]);
    else setFormCategory(MANUAL_CATEGORIES[0]);
    setFormSeverity("STANDARD");
    setFormPenalty("");
    setFormPinned(false);
    setFormActive(true);
    setShowAddModal(true);
  };

  const openEditModal = (rule: MessRule) => {
    setEditingRule(rule);
    setFormType(rule.type);
    setFormTitle(rule.title);
    setFormTitleBn(rule.titleBn || "");
    setFormDesc(rule.description);
    setFormDescBn(rule.descriptionBn || "");
    setFormCategory(rule.category);
    setFormSeverity(rule.severity);
    setFormPenalty(rule.penalty || "");
    setFormPinned(!!rule.pinned);
    setFormActive(rule.isActive !== false);
    setShowAddModal(true);
  };

  const applyTemplate = (tmpl: typeof PRESET_TEMPLATES[0]) => {
    setFormType(tmpl.type);
    setFormTitle(tmpl.title);
    setFormTitleBn(tmpl.titleBn);
    setFormDesc(tmpl.description);
    setFormDescBn(tmpl.descriptionBn);
    setFormCategory(tmpl.category);
    setFormSeverity(tmpl.severity);
    setFormPenalty(tmpl.penalty);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) {
      showToast("Title and description are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: formType,
        title: formTitle.trim(),
        titleBn: formTitleBn.trim() || undefined,
        description: formDesc.trim(),
        descriptionBn: formDescBn.trim() || undefined,
        category: formCategory,
        severity: formSeverity,
        penalty: formPenalty.trim() || undefined,
        pinned: formPinned,
        isActive: formActive
      };

      const url = editingRule ? `/api/rules/${editingRule.id}` : "/api/rules";
      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        showToast(editingRule ? "সফলভাবে আপডেট করা হয়েছে!" : "সফলভাবে যুক্ত হয়েছে!");
        fetchRules();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to save rule");
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই আইটেমটি মুছে ফেলতে চান?")) return;
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        showToast("মুছে ফেলা হয়েছে।");
        setRules(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to delete rule");
    }
  };

  const handleTogglePin = async (rule: MessRule) => {
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ pinned: !rule.pinned })
      });
      if (res.ok) {
        fetchRules();
        showToast(rule.pinned ? "Unpinned" : "Pinned to top!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAgree = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/rules/${ruleId}/agree`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, agreedMembers: data.agreedMembers } : r));
        showToast(data.agreed ? "আমি মেনে চলবো (Agreed)" : "সম্মতি বাতিল করা হয়েছে");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await fetch("/api/rules/seed-defaults", {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        setShowSeedModal(false);
        showToast("স্ট্যান্ডার্ড মেস রুলস ও ওয়েবসাইট ম্যানুয়াল প্যাক যুক্ত হয়েছে!");
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyRuleToClipboard = (rule: MessRule) => {
    const text = `📌 ${rule.titleBn || rule.title}
${rule.descriptionBn || rule.description}
${rule.penalty ? `⚠️ বিবরণ/শাস্তি: ${rule.penalty}` : ""}`;

    navigator.clipboard.writeText(text);
    setCopiedRuleId(rule.id);
    showToast("কপি করা হয়েছে!");
    setTimeout(() => setCopiedRuleId(null), 2000);
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      if (activeTab === "MESS" && rule.type !== "MESS") return false;
      if (activeTab === "PERSONAL" && rule.type !== "PERSONAL") return false;
      if (activeTab === "MANUAL" && rule.type !== "MANUAL") return false;
      if (selectedCategory !== "ALL" && rule.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rule.title.toLowerCase().includes(q);
        const matchTitleBn = rule.titleBn?.toLowerCase().includes(q);
        const matchDesc = rule.description.toLowerCase().includes(q);
        const matchDescBn = rule.descriptionBn?.toLowerCase().includes(q);
        const matchCat = rule.category.toLowerCase().includes(q);
        const matchPenalty = rule.penalty?.toLowerCase().includes(q);
        if (!matchTitle && !matchTitleBn && !matchDesc && !matchDescBn && !matchCat && !matchPenalty) {
          return false;
        }
      }

      return true;
    });
  }, [rules, activeTab, selectedCategory, searchQuery]);

  const totalCount = rules.length;
  const messCount = rules.filter(r => r.type === "MESS").length;
  const personalCount = rules.filter(r => r.type === "PERSONAL").length;
  const manualCount = rules.filter(r => r.type === "MANUAL").length;

  const getSeverityBadge = (severity: RuleSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30">
            <ShieldAlert size={12} className="shrink-0" />
            জরুরি
          </span>
        );
      case "STRICT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <AlertTriangle size={12} className="shrink-0" />
            কঠোর
          </span>
        );
      case "STANDARD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
            <Scale size={12} className="shrink-0" />
            সাধারণ
          </span>
        );
      case "RECOMMENDATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <HeartHandshake size={12} className="shrink-0" />
            পরামর্শ
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string, type: RuleType) => {
    if (type === "MANUAL") {
      switch (category) {
        case "Meals & Dining Manual":
          return <Utensils size={13} className="text-cyan-400" />;
        case "Finance & Accounts Manual":
          return <DollarSign size={13} className="text-emerald-400" />;
        case "Market & Duties Manual":
          return <Coffee size={13} className="text-orange-400" />;
        case "Roles & Security Manual":
          return <ShieldCheck size={13} className="text-violet-400" />;
        default:
          return <Laptop size={13} className="text-blue-400" />;
      }
    }

    switch (category) {
      case "Dining & Meal":
        return <Utensils size={13} className="text-cyan-400" />;
      case "Bills & Payments":
        return <DollarSign size={13} className="text-emerald-400" />;
      case "Market & Duties":
        return <Coffee size={13} className="text-orange-400" />;
      case "Quiet Hours & Noise":
        return <VolumeX size={13} className="text-indigo-400" />;
      case "Personal Hygiene":
        return <Bath size={13} className="text-cyan-400" />;
      case "Room & Privacy":
        return <Bed size={13} className="text-violet-400" />;
      case "Appliances & Electricity":
        return <Zap size={13} className="text-amber-400" />;
      default:
        return <BookOpen size={13} className="text-cyan-400" />;
    }
  };

  return (
    <div className={`space-y-5 transition-colors duration-200 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`} id="rules-section-root">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl animate-fade-in text-xs font-semibold border border-slate-700">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className={`rounded-2xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDarkMode 
          ? "bg-slate-900/90 border-slate-800" 
          : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
              <BookOpen size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  মেসের নিয়মাবলী ও ওয়েবসাইট নির্দেশিকা
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Rules & Manual
                </span>
              </div>
              <p className="text-xs text-slate-400">
                মেস পরিচালনা, সুন্দর সহাবস্থান ও ওয়েবসাইট ব্যবহারের সম্পূর্ণ অফিসিয়াল গাইড।
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS (ONLY ADMIN/SUPERUSER CAN ADD/SEED) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {canManage && (
            <>
              <button
                onClick={() => openAddModal(activeTab === "MANUAL" ? "MANUAL" : activeTab === "PERSONAL" ? "PERSONAL" : "MESS")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus size={15} />
                {activeTab === "MANUAL" ? "নতুন নির্দেশিকা যোগ" : "নতুন নিয়ম যোগ"}
              </button>

              <button
                onClick={() => setShowSeedModal(true)}
                title="স্ট্যান্ডার্ড রুলস ও ম্যানুয়াল লোড করুন"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isDarkMode 
                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                <Sparkles size={14} className="text-amber-400" />
                স্ট্যান্ডার্ড প্যাক
              </button>
            </>
          )}

          <button
            onClick={() => setShowPrintModal(true)}
            title="প্রিন্ট বা চার্টার ভিউ"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              isDarkMode 
                ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300" 
                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <Printer size={14} className="text-slate-400" />
            প্রিন্ট শিট
          </button>

          <RefreshButton 
            onRefresh={fetchRules}
            title="Refresh"
            ariaLabel="Refresh mess rules list"
          />
        </div>
      </div>

      {/* NAVIGATION TABS & SEARCH BAR */}
      <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
        isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
      }`}>
        {/* SEGMENTED TAB SWITCHER */}
        <div className={`inline-flex p-1 rounded-xl border shrink-0 flex-wrap gap-1 ${
          isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-slate-100 border-slate-200"
        }`}>
          <button
            onClick={() => { setActiveTab("ALL"); setSelectedCategory("ALL"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ALL"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            সকল ({totalCount})
          </button>
          <button
            onClick={() => { setActiveTab("MESS"); setSelectedCategory("ALL"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "MESS"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🏢 মেস পরিচালনা ({messCount})
          </button>
          <button
            onClick={() => { setActiveTab("PERSONAL"); setSelectedCategory("ALL"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "PERSONAL"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🤝 ব্যক্তিগত শিষ্টাচার ({personalCount})
          </button>
          <button
            onClick={() => { setActiveTab("MANUAL"); setSelectedCategory("ALL"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "MANUAL"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Laptop size={13} className={activeTab === "MANUAL" ? "text-white" : "text-blue-400"} />
            <span>📖 ওয়েবসাইট ম্যানুয়াল ({manualCount})</span>
          </button>
        </div>

        {/* SEARCH INPUT */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="নিয়ম বা ম্যানুয়াল খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-8 py-1.5 rounded-xl text-xs border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
              isDarkMode 
                ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500" 
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
            }`}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* SPECIAL WEBSITE MANUAL HIGHLIGHT BANNER WHEN ON MANUAL TAB */}
      {activeTab === "MANUAL" && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
          isDarkMode 
            ? "bg-blue-950/20 border-blue-900/40 text-blue-200" 
            : "bg-blue-50 border-blue-200 text-blue-900"
        }`}>
          <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold">ওয়েবসাইট ব্যবহারের নিয়ম ও সহায়িকা (Website System Manual)</h3>
            <p className="opacity-80">
              মেসের প্রতিটি সদস্য কীভাবে মিল বুকিং, বাজার এন্ট্রি, মাসিক ডিপোজিট ট্র্যাক করবেন এবং ওয়েবসাইট পরিচালনা করবেন তার বিস্তারিত নির্দেশিকা নিচে দেওয়া হলো।
              {canManage && <span className="font-semibold block mt-1 text-cyan-400">অ্যাডমিন হিসেবে আপনি নিচের নির্দেশিকাগুলো পরিবর্তন বা নতুন নির্দেশিকা যুক্ত করতে পারবেন।</span>}
            </p>
          </div>
        </div>
      )}

      {/* RULES LIST CONTAINER */}
      {loading ? (
        <div className="py-16 text-center space-y-2">
          <RefreshCw className="animate-spin text-cyan-400 mx-auto" size={26} />
          <p className="text-xs text-slate-400">নিয়মাবলী ও ম্যানুয়াল লোড হচ্ছে...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className={`p-10 text-center rounded-2xl border ${
          isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <BookOpen size={40} className="mx-auto text-slate-500 mb-3 stroke-1" />
          <h3 className="text-base font-bold text-slate-300">কোনো নিয়ম বা নির্দেশিকা পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            খোঁজের সাথে কোনো তথ্য মিলেনি অথবা এখনও কোনো গাইড যুক্ত করা হয়নি।
          </p>
          {canManage && (
            <button
              onClick={() => openAddModal(activeTab === "MANUAL" ? "MANUAL" : "MESS")}
              className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 transition-all"
            >
              + নতুন তথ্য যুক্ত করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRules.map((rule, idx) => {
            const hasAgreed = rule.agreedMembers && rule.agreedMembers.includes(currentUser.id);
            const agreedCount = rule.agreedMembers?.length || 0;
            const agreedMemberNames = (rule.agreedMembers || [])
              .map(id => members.find(m => m.id === id)?.nickname || members.find(m => m.id === id)?.name || "Member")
              .join(", ");

            const isManualItem = rule.type === "MANUAL";

            return (
              <div
                key={rule.id}
                className={`relative rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                  isDarkMode 
                    ? `bg-slate-900/90 ${rule.pinned ? "border-amber-500/40 ring-1 ring-amber-500/20" : isManualItem ? "border-blue-900/40" : "border-slate-800"}`
                    : `bg-white ${rule.pinned ? "border-amber-400 shadow-sm ring-1 ring-amber-400/30" : isManualItem ? "border-blue-200 shadow-sm" : "border-slate-200 shadow-sm"}`
                }`}
              >
                {/* PINNED BADGE */}
                {rule.pinned && (
                  <div className="absolute top-0 right-6 -translate-y-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                    <Pin size={9} className="fill-current" />
                    পিন করা
                  </div>
                )}

                <div className="space-y-2.5">
                  {/* BADGES ROW */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        rule.type === "MANUAL"
                          ? "bg-blue-500/15 text-blue-400"
                          : rule.type === "MESS" 
                            ? "bg-cyan-500/15 text-cyan-400" 
                            : "bg-violet-500/15 text-violet-400"
                      }`}>
                        {rule.type === "MANUAL" ? <Laptop size={11} /> : rule.type === "MESS" ? <Scale size={11} /> : <HeartHandshake size={11} />}
                        {rule.type === "MANUAL" ? "ওয়েবসাইট নির্দেশিকা" : rule.type === "MESS" ? "মেস নিয়ম" : "ব্যক্তিগত শিষ্টাচার"}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] ${
                        isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                      }`}>
                        {getCategoryIcon(rule.category, rule.type)}
                        {rule.category}
                      </span>
                    </div>

                    {getSeverityBadge(rule.severity)}
                  </div>

                  {/* TITLE */}
                  <div>
                    <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-100 flex items-start gap-2">
                      <span className={`${isManualItem ? "text-blue-400" : "text-cyan-400"} font-mono text-xs font-black shrink-0 mt-0.5`}>
                        #{idx + 1}
                      </span>
                      <span className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
                        {rule.titleBn || rule.title}
                      </span>
                    </h3>
                    {rule.titleBn && rule.title && rule.titleBn !== rule.title && (
                      <p className="text-[11px] text-slate-400 ml-5">
                        {rule.title}
                      </p>
                    )}
                  </div>

                  {/* DESCRIPTION */}
                  <div className={`p-3 rounded-xl text-xs sm:text-sm leading-relaxed ${
                    isDarkMode 
                      ? isManualItem ? "bg-blue-950/20 text-slate-200 border border-blue-900/30" : "bg-slate-950/60 text-slate-300 border border-slate-800/60" 
                      : isManualItem ? "bg-blue-50/50 text-slate-800 border border-blue-100" : "bg-slate-50 text-slate-700 border border-slate-200/60"
                  }`}>
                    <p className="whitespace-pre-line font-medium">
                      {rule.descriptionBn || rule.description}
                    </p>
                    {rule.descriptionBn && rule.description && rule.descriptionBn !== rule.description && (
                      <p className="mt-1.5 pt-1.5 border-t border-slate-800/40 text-[11px] text-slate-400 whitespace-pre-line">
                        <span className="text-slate-500">English:</span> {rule.description}
                      </p>
                    )}
                  </div>

                  {/* PENALTY / SYSTEM NOTE */}
                  {rule.penalty && (
                    <div className={`flex items-start gap-1.5 p-2 rounded-xl border text-xs ${
                      isManualItem 
                        ? "bg-blue-500/10 border-blue-500/25 text-blue-300"
                        : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                    }`}>
                      {isManualItem ? <Info size={13} className="shrink-0 mt-0.5 text-blue-400" /> : <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />}
                      <div>
                        <strong className="font-semibold text-[10px] uppercase block opacity-90">
                          {isManualItem ? "সিস্টেম রিমাইন্ডার / ফলাফল:" : "শাস্তি / জরিমানা:"}
                        </strong>
                        <span className="text-[11px]">{rule.penalty}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* FOOTER */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-800/50 flex items-center justify-between gap-2 flex-wrap">
                  {/* MEMBER AGREEMENT BUTTON */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAgree(rule.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        hasAgreed
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isDarkMode 
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {hasAgreed ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Circle size={13} />}
                      {hasAgreed ? "আমি অবগত ও মেনে চলছি" : isManualItem ? "পড়েছি ও বুঝেছি" : "আমি মানবো"}
                    </button>

                    {agreedCount > 0 && (
                      <span 
                        title={`সম্মতি দিয়েছেন: ${agreedMemberNames}`}
                        className="text-[11px] text-slate-400 flex items-center gap-1 cursor-help"
                      >
                        <Users size={11} className="text-cyan-400" />
                        <span>{agreedCount}/{members.length}</span>
                      </span>
                    )}
                  </div>

                  {/* QUICK CONTROLS: ONLY SUPER USER & ADMIN HAVE EDIT / DELETE / PIN */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyRuleToClipboard(rule)}
                      title="কপি করুন"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    >
                      {copiedRuleId === rule.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => handleTogglePin(rule)}
                          title={rule.pinned ? "আনপিন করুন" : "পিন করুন"}
                          className={`p-1 rounded-lg transition-all ${
                            rule.pinned ? "text-amber-400 bg-amber-500/10" : "text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                          }`}
                        >
                          <Pin size={13} className={rule.pinned ? "fill-current" : ""} />
                        </button>

                        <button
                          onClick={() => openEditModal(rule)}
                          title="সম্পাদনা করুন"
                          className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          title="ডিলিট করুন"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT MODAL (ONLY ACCESSIBLE BY ADMIN / SUPER USER) */}
      {showAddModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl p-5 space-y-4 my-8 ${
            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="text-cyan-400" size={18} />
                <h2 className="text-base font-bold">
                  {editingRule 
                    ? `সম্পাদনা করুন (${editingRule.type === "MANUAL" ? "ওয়েবসাইট ম্যানুয়াল" : "মেস নিয়ম"})` 
                    : `নতুন বিষয় যোগ করুন (${formType === "MANUAL" ? "ওয়েবসাইট ম্যানুয়াল" : "মেস নিয়ম"})`}
                </h2>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* PRESET TEMPLATES */}
            {!editingRule && (
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" />
                  দ্রুত টেমপ্লেট নির্বাচন:
                </span>
                <div className="flex flex-wrap gap-1">
                  {PRESET_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] border transition-all ${
                        isDarkMode 
                          ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300" 
                          : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                      }`}
                    >
                      {tmpl.titleBn || tmpl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveRule} className="space-y-3">
              {/* TYPE SELECTOR (3 TYPES: MESS, PERSONAL, MANUAL) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  শাখা / টাইপ নির্বাচন *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("MESS");
                      if (!MESS_CATEGORIES.includes(formCategory)) setFormCategory(MESS_CATEGORIES[0]);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      formType === "MESS"
                        ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 font-bold"
                        : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Scale size={16} className="shrink-0" />
                    <div>
                      <span className="text-xs block">মেস পরিচালনা</span>
                      <span className="text-[9px] opacity-70">মিল, বিল, নাইট রুলস</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType("PERSONAL");
                      if (!PERSONAL_CATEGORIES.includes(formCategory)) setFormCategory(PERSONAL_CATEGORIES[0]);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      formType === "PERSONAL"
                        ? "bg-violet-500/15 border-violet-500 text-violet-400 font-bold"
                        : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <HeartHandshake size={16} className="shrink-0" />
                    <div>
                      <span className="text-xs block">ব্যক্তিগত শিষ্টাচার</span>
                      <span className="text-[9px] opacity-70">রুমমেট, হাইজিন</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType("MANUAL");
                      if (!MANUAL_CATEGORIES.includes(formCategory)) setFormCategory(MANUAL_CATEGORIES[0]);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      formType === "MANUAL"
                        ? "bg-blue-500/15 border-blue-500 text-blue-400 font-bold"
                        : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Laptop size={16} className="shrink-0" />
                    <div>
                      <span className="text-xs block">ওয়েবসাইট ম্যানুয়াল</span>
                      <span className="text-[9px] opacity-70">সিস্টেম গাইড</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* TITLE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    শিরোনাম (বাংলা) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মিল অন/অফ করার সময়সীমা"
                    value={formTitleBn}
                    onChange={(e) => setFormTitleBn(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Title (English)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meal Cutoff Timings"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              {/* CATEGORY & SEVERITY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ক্যাটাগরি *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    {(formType === "MESS" 
                      ? MESS_CATEGORIES 
                      : formType === "PERSONAL" 
                        ? PERSONAL_CATEGORIES 
                        : MANUAL_CATEGORIES
                    ).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    গুরুত্ব / Severity *
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as RuleSeverity)}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="CRITICAL">🚨 জরুরি (Critical - Must follow)</option>
                    <option value="STRICT">⚠️ কঠোর (Strict)</option>
                    <option value="STANDARD">⚖️ সাধারণ (Standard)</option>
                    <option value="RECOMMENDATION">💡 পরামর্শ (Recommendation)</option>
                  </select>
                </div>
              </div>

              {/* DESCRIPTION BENGALI */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  বিবরণ / ব্যবহারের নির্দেশিকা (বাংলা) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="ধাপ বা শর্তসমূহ লিখুন..."
                  value={formDescBn}
                  onChange={(e) => setFormDescBn(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* DESCRIPTION ENGLISH */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description / Workflow (English)
                </label>
                <textarea
                  rows={2}
                  placeholder="English instructions..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* PENALTY / OUTCOME NOTE */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {formType === "MANUAL" ? "সিস্টেম ফলাফল / রিমাইন্ডার নোট" : "শাস্তি / জরিমানা (Penalty - Optional)"}
                </label>
                <input
                  type="text"
                  placeholder={formType === "MANUAL" ? "যেমন: স্বয়ংক্রিয় ব্যালেন্স সমন্বয়" : "যেমন: ৫০ টাকা জরিমানা বা সতর্কতা"}
                  value={formPenalty}
                  onChange={(e) => setFormPenalty(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* PINNED */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>উপরে পিন করে রাখুন (Pin to top)</span>
                </label>
              </div>

              {/* SUBMIT BUTTONS */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 transition-all disabled:opacity-50"
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : editingRule ? "আপডেট করুন" : "সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEED MODAL */}
      {showSeedModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-3 ${
            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles size={20} />
              <h3 className="text-base font-bold">স্ট্যান্ডার্ড রুলস ও ম্যানুয়াল লোড করবেন?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              এটি মেস পরিচালনার স্ট্যান্ডার্ড নিয়মাবলী এবং ওয়েবসাইট ব্যবহারের সম্পূর্ণ ম্যানুয়াল (মিল বুকিং, ডিপোজিট ট্র্যাকিং, বাজার হিসাব ও পারমিশন গাইড) লোড করবে।
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSeedModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                বাতিল
              </button>
              <button
                onClick={handleSeedDefaults}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all"
              >
                লোড করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE CHARTER SHEET MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded-2xl p-6 space-y-4 my-8 print:p-0 print:m-0 print:border-none shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-cyan-600" size={18} />
                <h2 className="text-base font-bold">মেসের অফিসিয়াল নিয়মাবলী ও নির্দেশিকা চার্টার</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 flex items-center gap-1 shadow-sm"
                >
                  <Printer size={13} />
                  প্রিন্ট করুন
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* PRINTABLE BODY */}
            <div className="space-y-4 text-slate-900 font-sans">
              <div className="text-center space-y-1 pb-3 border-b border-slate-900">
                <h1 className="text-xl font-black uppercase">মেসের অফিসিয়াল নিয়মাবলী ও আচরণবিধি</h1>
                <p className="text-xs text-slate-600">Effective Date: {new Date().toLocaleDateString("bn-BD")}</p>
              </div>

              {/* MESS RULES */}
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                  ১. মেস পরিচালনা নিয়মাবলী (Mess Operational Rules)
                </h2>
                <div className="space-y-1.5">
                  {rules.filter(r => r.type === "MESS" && r.isActive !== false).map((r, i) => (
                    <div key={r.id} className="text-xs p-2 rounded border border-slate-200 space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{i + 1}. {r.titleBn || r.title}</span>
                        <span className="text-slate-500 text-[10px]">[{r.category}]</span>
                      </div>
                      <p className="text-slate-700">{r.descriptionBn || r.description}</p>
                      {r.penalty && (
                        <p className="text-rose-700 text-[10px] font-semibold">⚠️ শাস্তি/জরিমানা: {r.penalty}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* PERSONAL RULES */}
              <div className="space-y-2 pt-2">
                <h2 className="text-xs font-bold uppercase bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                  ২. ব্যক্তিগত পরিচ্ছন্নতা ও রুমমেট শিষ্টাচার (Personal Etiquette)
                </h2>
                <div className="space-y-1.5">
                  {rules.filter(r => r.type === "PERSONAL" && r.isActive !== false).map((r, i) => (
                    <div key={r.id} className="text-xs p-2 rounded border border-slate-200 space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{i + 1}. {r.titleBn || r.title}</span>
                        <span className="text-slate-500 text-[10px]">[{r.category}]</span>
                      </div>
                      <p className="text-slate-700">{r.descriptionBn || r.description}</p>
                      {r.penalty && (
                        <p className="text-rose-700 text-[10px] font-semibold">⚠️ শাস্তি/জরিমানা: {r.penalty}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* WEBSITE MANUAL */}
              <div className="space-y-2 pt-2">
                <h2 className="text-xs font-bold uppercase bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                  ৩. ওয়েবসাইট ব্যবহারের নিয়মাবলি ও সহায়িকা (Website Manual)
                </h2>
                <div className="space-y-1.5">
                  {rules.filter(r => r.type === "MANUAL" && r.isActive !== false).map((r, i) => (
                    <div key={r.id} className="text-xs p-2 rounded border border-slate-200 space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{i + 1}. {r.titleBn || r.title}</span>
                        <span className="text-slate-500 text-[10px]">[{r.category}]</span>
                      </div>
                      <p className="text-slate-700">{r.descriptionBn || r.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
