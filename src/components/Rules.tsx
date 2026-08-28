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
  Filter, 
  Printer, 
  Copy, 
  Check, 
  Users, 
  HelpCircle, 
  Info, 
  Scale, 
  RefreshCw, 
  HeartHandshake, 
  Flame, 
  Moon, 
  Coffee, 
  Utensils, 
  DollarSign, 
  UserCheck, 
  X,
  VolumeX,
  Bed,
  Bath,
  Smartphone,
  Zap,
  ChevronDown,
  Award
} from "lucide-react";
import { Member, MessRule, RuleType, RuleSeverity, UserRole } from "../types.js";
import { RefreshButton } from "./RefreshButton.tsx";

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

const PRESET_TEMPLATES = [
  {
    type: "MESS" as RuleType,
    title: "Meal Change Cutoff Times",
    titleBn: "মিল অন/অফ করার সময়সীমা",
    category: "Dining & Meal",
    severity: "CRITICAL" as RuleSeverity,
    description: "Lunch meal cutoff is 08:00 AM and Dinner cutoff is 04:00 PM. No meal changes are accepted after cutoff without manager permission.",
    descriptionBn: "দুপুরের মিল অফ/অন সকাল ৮:০০ টা ও রাতের জন্য বিকাল ৪:০০ টা। এরপর কোনো পরিবর্তন গ্রহণযোগ্য নয়।",
    penalty: "Meal charge will be billed"
  },
  {
    type: "MESS" as RuleType,
    title: "Monthly Deposit Deadline",
    titleBn: "মাসিক ডিপোজিট পরিশোধের শেষ সময়",
    category: "Bills & Payments",
    severity: "STRICT" as RuleSeverity,
    description: "All members must deposit the required mess advance money and utility dues by the 5th of every active month.",
    descriptionBn: "প্রতি মাসের ৫ তারিখের মধ্যে নির্ধারিত ডিপোজিট ও ইউটিলিটি বিল পরিশোধ বাধ্যতামূলক।",
    penalty: "Tk 50/day late fine"
  },
  {
    type: "MESS" as RuleType,
    title: "Late Night Silence Policy",
    titleBn: "রাত্রিকালীন নীরবতা ও গেট নিয়ম",
    category: "Quiet Hours & Noise",
    severity: "CRITICAL" as RuleSeverity,
    description: "Strict quiet hours from 11:30 PM to 07:00 AM. Loud music, noise, or late-night room gathering is strictly forbidden.",
    descriptionBn: "রাত ১১:৩০ টা থেকে সকাল ৭:০০ টা পর্যন্ত নীরবতা আবশ্যক। উচ্চশব্দে গান বাজানো বা আড্ডা সম্পূর্ণ নিষিদ্ধ।",
    penalty: "Manager warning"
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
    title: "Roommate Privacy & Personal Belongings",
    titleBn: "রুমমেটের গোপনীয়তা ও জিনিসপত্রের সম্মান",
    category: "Room & Privacy",
    severity: "CRITICAL" as RuleSeverity,
    description: "Do not borrow, use, or touch another roommate's clothes, laptop, chargers, or personal items without explicit permission.",
    descriptionBn: "অন্যের অনুমতি ছাড়া রুমমেটের জামাকাপড়, ডিভাইস বা ব্যক্তিগত জিনিস ব্যবহার করবেন না।",
    penalty: "Direct verbal accountability"
  },
  {
    type: "PERSONAL" as RuleType,
    title: "Headphone & Late Night Phone Calls",
    titleBn: "দেরিতে ফোনে কথা বলা ও হেডফোন ব্যবহার",
    category: "Personal Conduct",
    severity: "STRICT" as RuleSeverity,
    description: "Use headphones when watching videos or playing games in shared rooms. Take late-night phone calls outside in the balcony.",
    descriptionBn: "ভিডিও বা গান শোনার সময় হেডফোন ব্যবহার করুন। রাত ১০ টার পর ফোন কল ব্যালকনি বা বাইরে গিয়ে করুন।",
    penalty: "Room etiquette notice"
  }
];

export default function Rules({ currentUser, isDarkMode, members, isPlatformOwner = false }: RulesProps) {
  const [rules, setRules] = useState<MessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "MESS" | "PERSONAL">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [onlyMyPending, setOnlyMyPending] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<MessRule | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);

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

  const isUltimateAdmin = currentUser?.email && currentUser.email.toLowerCase() === "mdshahriarhimel@gmail.com";
  const canManage = currentUser.role === UserRole.ADMIN || 
                    currentUser.role === UserRole.SUPERUSER || 
                    currentUser.role === UserRole.ASSISTANT_SUPERUSER || 
                    currentUser.role === UserRole.MANAGER || 
                    currentUser.role === UserRole.PARTIAL_MANAGER || 
                    isPlatformOwner || 
                    isUltimateAdmin;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rules", {
        headers: { "Authorization": `Bearer ${currentUser.id}` }
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
    setFormCategory(presetType === "MESS" ? MESS_CATEGORIES[0] : PERSONAL_CATEGORIES[0]);
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
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        showToast(editingRule ? "Rule updated successfully!" : "New rule added successfully!");
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
    if (!window.confirm("Are you sure you want to delete this rule permanently?")) return;
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (res.ok) {
        showToast("Rule deleted successfully.");
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
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ pinned: !rule.pinned })
      });
      if (res.ok) {
        fetchRules();
        showToast(rule.pinned ? "Rule unpinned" : "Rule pinned to top!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (rule: MessRule) => {
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ isActive: !rule.isActive })
      });
      if (res.ok) {
        fetchRules();
        showToast(rule.isActive ? "Rule deactivated" : "Rule activated");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAgree = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/rules/${ruleId}/agree`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, agreedMembers: data.agreedMembers } : r));
        showToast(data.agreed ? "Acknowledged & Agreed! (আমি মেনে চলব)" : "Agreement status updated.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const res = await fetch("/api/rules/seed-defaults", {
        method: "POST",
        headers: { "Authorization": `Bearer ${currentUser.id}` }
      });
      if (res.ok) {
        setShowSeedModal(false);
        showToast("Standard guidelines package loaded successfully!");
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyRuleToClipboard = (rule: MessRule) => {
    const text = `📌 [${rule.type === "MESS" ? "MESS RULE" : "PERSONAL REGULATION"}] ${rule.title} (${rule.category})
${rule.description}
${rule.titleBn ? `\n🇧🇩 ${rule.titleBn}\n${rule.descriptionBn || ""}` : ""}
${rule.penalty ? `⚠️ Consequence: ${rule.penalty}` : ""}`;

    navigator.clipboard.writeText(text);
    setCopiedRuleId(rule.id);
    showToast("Rule copied to clipboard!");
    setTimeout(() => setCopiedRuleId(null), 2000);
  };

  const copyAllRules = () => {
    const messRulesList = rules.filter(r => r.type === "MESS" && r.isActive !== false);
    const personalRulesList = rules.filter(r => r.type === "PERSONAL" && r.isActive !== false);

    let doc = `========================================================\n🏛️ OFFICIAL MESS RULES & REGULATIONS\n========================================================\n\n`;
    doc += `--- 🏢 SECTION 1: MESS RULES ---\n\n`;
    messRulesList.forEach((r, idx) => {
      doc += `${idx + 1}. ${r.title} [${r.severity}]\n   ${r.description}\n`;
      if (r.titleBn) doc += `   বাংলা: ${r.titleBn} - ${r.descriptionBn || ""}\n`;
      if (r.penalty) doc += `   ⚠️ Penalty: ${r.penalty}\n`;
      doc += `\n`;
    });

    doc += `\n--- 🤝 SECTION 2: PERSONAL RULES & ETIQUETTE ---\n\n`;
    personalRulesList.forEach((r, idx) => {
      doc += `${idx + 1}. ${r.title} [${r.severity}]\n   ${r.description}\n`;
      if (r.titleBn) doc += `   বাংলা: ${r.titleBn} - ${r.descriptionBn || ""}\n`;
      if (r.penalty) doc += `   ⚠️ Penalty: ${r.penalty}\n`;
      doc += `\n`;
    });

    navigator.clipboard.writeText(doc);
    setAllCopied(true);
    showToast("All mess and personal rules copied to clipboard!");
    setTimeout(() => setAllCopied(false), 2500);
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      // Tab filter
      if (activeTab === "MESS" && rule.type !== "MESS") return false;
      if (activeTab === "PERSONAL" && rule.type !== "PERSONAL") return false;

      // Category filter
      if (selectedCategory !== "ALL" && rule.category !== selectedCategory) return false;

      // Severity filter
      if (selectedSeverity !== "ALL" && rule.severity !== selectedSeverity) return false;

      // Pinned filter
      if (onlyPinned && !rule.pinned) return false;

      // My Pending Agreement filter
      if (onlyMyPending) {
        const hasAgreed = rule.agreedMembers && rule.agreedMembers.includes(currentUser.id);
        if (hasAgreed) return false;
      }

      // Search Query
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
  }, [rules, activeTab, selectedCategory, selectedSeverity, onlyPinned, onlyMyPending, searchQuery, currentUser.id]);

  // Statistics
  const totalCount = rules.length;
  const messCount = rules.filter(r => r.type === "MESS").length;
  const personalCount = rules.filter(r => r.type === "PERSONAL").length;
  const criticalCount = rules.filter(r => r.severity === "CRITICAL").length;
  const myAgreedCount = rules.filter(r => r.agreedMembers && r.agreedMembers.includes(currentUser.id)).length;
  const agreementPercentage = totalCount > 0 ? Math.round((myAgreedCount / totalCount) * 100) : 0;

  const availableCategories = useMemo(() => {
    if (activeTab === "MESS") return MESS_CATEGORIES;
    if (activeTab === "PERSONAL") return PERSONAL_CATEGORIES;
    return Array.from(new Set([...MESS_CATEGORIES, ...PERSONAL_CATEGORIES]));
  }, [activeTab]);

  const getSeverityBadge = (severity: RuleSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30">
            <ShieldAlert size={12} className="shrink-0" />
            Critical / জরুরি
          </span>
        );
      case "STRICT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <AlertTriangle size={12} className="shrink-0" />
            Strict / কঠোর
          </span>
        );
      case "STANDARD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
            <Scale size={12} className="shrink-0" />
            Standard / সাধারণ
          </span>
        );
      case "RECOMMENDATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <HeartHandshake size={12} className="shrink-0" />
            Advice / পরামর্শ
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Dining & Meal":
        return <Utensils size={14} className="text-cyan-400" />;
      case "Bills & Payments":
        return <DollarSign size={14} className="text-emerald-400" />;
      case "Market & Duties":
        return <Coffee size={14} className="text-orange-400" />;
      case "Quiet Hours & Noise":
        return <VolumeX size={14} className="text-indigo-400" />;
      case "Personal Hygiene":
        return <Bath size={14} className="text-cyan-400" />;
      case "Room & Privacy":
        return <Bed size={14} className="text-violet-400" />;
      case "Appliances & Electricity":
        return <Zap size={14} className="text-amber-400" />;
      default:
        return <BookOpen size={14} className="text-cyan-400" />;
    }
  };

  return (
    <div className={`space-y-6 transition-colors duration-200 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`} id="rules-system-root">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-cyan-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-fade-in text-sm font-medium border border-cyan-400/40">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HERO BANNER */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border transition-all ${
        isDarkMode 
          ? "bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border-slate-800 shadow-2xl shadow-cyan-950/20" 
          : "bg-gradient-to-br from-cyan-50/80 via-white to-indigo-50/50 border-cyan-100 shadow-xl shadow-cyan-100/40"
      }`}>
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Scale size={13} />
              Mess Governance & Etiquette Code
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-display flex items-center gap-3">
              <BookOpen className="text-cyan-500" size={32} />
              Rules & Regulations
              <span className="text-xs sm:text-sm font-normal text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-700/50">
                মেস ও ব্যক্তিগত নিয়মাবলী
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Official operational constitution and shared room etiquette for a harmonious, disciplined, and transparent bachelor living experience.
            </p>
          </div>

          {/* QUICK ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canManage && (
              <>
                <button
                  onClick={() => openAddModal("MESS")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
                >
                  <Plus size={16} />
                  Add Rule (নতুন নিয়ম)
                </button>
                <button
                  onClick={() => setShowSeedModal(true)}
                  title="Seed recommended standard mess guidelines"
                  className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    isDarkMode 
                      ? "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200" 
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                  }`}
                >
                  <Sparkles size={14} className="text-amber-400" />
                  Standard Pack
                </button>
              </>
            )}

            <button
              onClick={() => setShowPrintModal(true)}
              title="Printable Charter Document"
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                isDarkMode 
                  ? "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200" 
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
              }`}
            >
              <Printer size={14} className="text-cyan-400" />
              Print / Sheet
            </button>

            <button
              onClick={copyAllRules}
              title="Copy all rules text"
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                isDarkMode 
                  ? "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200" 
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
              }`}
            >
              {allCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
              {allCopied ? "Copied!" : "Copy All"}
            </button>

            <RefreshButton 
              onRefresh={fetchRules}
              title="Refresh Rules"
              ariaLabel="Refresh mess rules list"
            />
          </div>
        </div>

        {/* METRICS & MY COMMITMENT TRACKER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/40">
          <div className={`p-3.5 rounded-2xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800/80" : "bg-white/80 border-slate-200/80"}`}>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Total Guidelines</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-400">{totalCount}</span>
              <span className="text-xs text-slate-500">Rules</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800/80" : "bg-white/80 border-slate-200/80"}`}>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Mess Operations</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-400">{messCount}</span>
              <span className="text-xs text-slate-500">Official</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800/80" : "bg-white/80 border-slate-200/80"}`}>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Personal Conduct</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-violet-400">{personalCount}</span>
              <span className="text-xs text-slate-500">Etiquette</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800/80" : "bg-white/80 border-slate-200/80"}`}>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">My Agreement</span>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-400">{agreementPercentage}%</span>
                <span className="text-[10px] text-slate-500">({myAgreedCount}/{totalCount})</span>
              </div>
              {agreementPercentage === 100 && (
                <Award size={18} className="text-emerald-400 animate-bounce" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABS & FILTERS BAR */}
      <div className={`p-4 rounded-2xl border space-y-4 ${
        isDarkMode ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200 shadow-sm"
      }`}>
        {/* PRIMARY SECTION TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className={`inline-flex p-1 rounded-xl border ${
            isDarkMode ? "bg-slate-950/70 border-slate-800" : "bg-slate-100 border-slate-200"
          }`}>
            <button
              onClick={() => { setActiveTab("ALL"); setSelectedCategory("ALL"); }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "ALL"
                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen size={14} />
              All Rules ({totalCount})
            </button>
            <button
              onClick={() => { setActiveTab("MESS"); setSelectedCategory("ALL"); }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "MESS"
                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Scale size={14} />
              Mess Rules ({messCount})
            </button>
            <button
              onClick={() => { setActiveTab("PERSONAL"); setSelectedCategory("ALL"); }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === "PERSONAL"
                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <HeartHandshake size={14} />
              Personal Regulations ({personalCount})
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search rule keywords, penalty, বাংলা..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                isDarkMode 
                  ? "bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500" 
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* CATEGORY & SEVERITY PILLS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/40">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={12} />
            Filter:
          </span>

          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedCategory === "ALL"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : isDarkMode ? "bg-slate-800/50 text-slate-400 hover:bg-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Categories
          </button>

          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : isDarkMode ? "bg-slate-800/50 text-slate-400 hover:bg-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {getCategoryIcon(cat)}
              {cat}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-700/50 mx-1 hidden sm:block" />

          {/* SEVERITY DROPDOWN OR TOGGLE */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer focus:outline-none ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">🚨 Critical</option>
              <option value="STRICT">⚠️ Strict</option>
              <option value="STANDARD">⚖️ Standard</option>
              <option value="RECOMMENDATION">💡 Recommendation</option>
            </select>

            <button
              onClick={() => setOnlyPinned(!onlyPinned)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                onlyPinned
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold"
                  : isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              <Pin size={11} className={onlyPinned ? "fill-amber-400" : ""} />
              Pinned
            </button>

            <button
              onClick={() => setOnlyMyPending(!onlyMyPending)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                onlyMyPending
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold"
                  : isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              <Circle size={11} />
              Unread / Pending Agreement
            </button>
          </div>
        </div>
      </div>

      {/* RULES LIST CONTAINER */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="animate-spin text-cyan-400 mx-auto" size={32} />
          <p className="text-sm text-slate-400 font-mono">Synchronizing Mess Governance Rules...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${
          isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <BookOpen size={48} className="mx-auto text-slate-600 mb-4 stroke-1" />
          <h3 className="text-lg font-bold text-slate-300">No matching rules found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Try adjusting your search query or filter tags, or add your first official guideline.
          </p>
          {canManage && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => openAddModal("MESS")}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-400 transition-all"
              >
                + Add Mess Rule
              </button>
              <button
                onClick={() => openAddModal("PERSONAL")}
                className="px-4 py-2 rounded-xl bg-violet-500 text-white text-xs font-semibold hover:bg-violet-400 transition-all"
              >
                + Add Personal Rule
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule, idx) => {
            const hasAgreed = rule.agreedMembers && rule.agreedMembers.includes(currentUser.id);
            const agreedCount = rule.agreedMembers?.length || 0;
            const agreedMemberNames = (rule.agreedMembers || [])
              .map(id => members.find(m => m.id === id)?.nickname || members.find(m => m.id === id)?.name || "Member")
              .join(", ");

            return (
              <div
                key={rule.id}
                className={`relative group rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                  isDarkMode 
                    ? `bg-slate-900/80 hover:bg-slate-900 ${rule.pinned ? "border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20" : "border-slate-800 hover:border-slate-700"}`
                    : `bg-white hover:shadow-md ${rule.pinned ? "border-amber-400 shadow-md ring-1 ring-amber-400/30" : "border-slate-200 hover:border-slate-300"}`
                }`}
              >
                {/* PINNED RIBBON / BADGE */}
                {rule.pinned && (
                  <div className="absolute top-0 right-8 -translate-y-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                    <Pin size={10} className="fill-current" />
                    Pinned Directive
                  </div>
                )}

                <div className="space-y-3">
                  {/* HEADER BADGES */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        rule.type === "MESS" 
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" 
                          : "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                      }`}>
                        {rule.type === "MESS" ? <Scale size={11} /> : <HeartHandshake size={11} />}
                        {rule.type === "MESS" ? "Mess Rule" : "Personal Etiquette"}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] ${
                        isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                      }`}>
                        {getCategoryIcon(rule.category)}
                        {rule.category}
                      </span>
                    </div>

                    {getSeverityBadge(rule.severity)}
                  </div>

                  {/* TITLE & BENGALI TITLE */}
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-slate-100 flex items-start gap-2">
                      <span className="text-cyan-400 font-mono text-sm font-black">#{idx + 1}</span>
                      <span className={isDarkMode ? "text-slate-100" : "text-slate-900"}>{rule.title}</span>
                    </h3>
                    {rule.titleBn && (
                      <p className="text-xs font-medium text-cyan-400/90 mt-0.5 ml-6">
                        🇧🇩 {rule.titleBn}
                      </p>
                    )}
                  </div>

                  {/* DESCRIPTION */}
                  <div className={`p-3.5 rounded-xl text-xs sm:text-sm leading-relaxed ${
                    isDarkMode ? "bg-slate-950/60 text-slate-300 border border-slate-800/60" : "bg-slate-50 text-slate-700 border border-slate-200/60"
                  }`}>
                    <p className="whitespace-pre-line">{rule.description}</p>
                    {rule.descriptionBn && (
                      <p className="mt-2 pt-2 border-t border-slate-800/40 text-xs text-slate-400 whitespace-pre-line">
                        <strong className="text-cyan-400 font-normal">বাংলা বিবরণ:</strong> {rule.descriptionBn}
                      </p>
                    )}
                  </div>

                  {/* PENALTY / CONSEQUENCE WARNING */}
                  {rule.penalty && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <strong className="font-bold uppercase tracking-wider text-[10px] block text-amber-300">Penalty / শাস্তিমূলক ব্যবস্থা:</strong>
                        <span>{rule.penalty}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD FOOTER & ACTIONS */}
                <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
                  {/* MEMBER AGREEMENT BUTTON */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAgree(rule.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all transform active:scale-95 ${
                        hasAgreed
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                          : isDarkMode 
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {hasAgreed ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Circle size={14} />}
                      {hasAgreed ? "Agreed (মেনে চলছি)" : "I Agree (আমি মানবো)"}
                    </button>

                    {agreedCount > 0 && (
                      <div 
                        title={`Agreed by: ${agreedMemberNames}`}
                        className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-700/40 cursor-help"
                      >
                        <Users size={12} className="text-cyan-400" />
                        <span>{agreedCount}/{members.length}</span>
                      </div>
                    )}
                  </div>

                  {/* QUICK CONTROLS & SUPERUSER BUTTONS */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyRuleToClipboard(rule)}
                      title="Copy this rule"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                    >
                      {copiedRuleId === rule.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => handleTogglePin(rule)}
                          title={rule.pinned ? "Unpin rule" : "Pin to top"}
                          className={`p-1.5 rounded-lg transition-all ${
                            rule.pinned ? "text-amber-400 hover:bg-amber-500/20" : "text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                          }`}
                        >
                          <Pin size={14} className={rule.pinned ? "fill-current" : ""} />
                        </button>

                        <button
                          onClick={() => openEditModal(rule)}
                          title="Edit rule"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          title="Delete rule"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                        >
                          <Trash2 size={14} />
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

      {/* ADD / EDIT RULE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-6 space-y-5 my-8 ${
            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="text-cyan-400" size={20} />
                <h2 className="text-lg font-bold font-display">
                  {editingRule ? "Edit Rule Directive" : "Create New Rule Directive"}
                </h2>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* PRESET TEMPLATES SELECTOR (WHEN ADDING) */}
            {!editingRule && (
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-400" />
                  Quick Preset Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                        isDarkMode 
                          ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300" 
                          : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                      }`}
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* RULE TYPE SELECTOR (MESS vs PERSONAL) */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Section Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType("MESS");
                      if (!MESS_CATEGORIES.includes(formCategory)) setFormCategory(MESS_CATEGORIES[0]);
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      formType === "MESS"
                        ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 ring-2 ring-cyan-500/20"
                        : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Scale size={20} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm block">Mess Rule</span>
                      <span className="text-[11px] opacity-80">General mess operations, meals, bills, quiet hours</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType("PERSONAL");
                      if (!PERSONAL_CATEGORIES.includes(formCategory)) setFormCategory(PERSONAL_CATEGORIES[0]);
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      formType === "PERSONAL"
                        ? "bg-violet-500/15 border-violet-500 text-violet-400 ring-2 ring-violet-500/20"
                        : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <HeartHandshake size={20} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm block">Personal Regulation</span>
                      <span className="text-[11px] opacity-80">Roommate hygiene, privacy, device usage, conduct</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* TITLE (ENGLISH & BENGALI) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Rule Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meal Cutoff Timings"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Rule Title (বাংলা)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. মিল অন/অফ করার সময়সীমা"
                    value={formTitleBn}
                    onChange={(e) => setFormTitleBn(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              {/* CATEGORY & SEVERITY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    {(formType === "MESS" ? MESS_CATEGORIES : PERSONAL_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Severity / Priority *
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as RuleSeverity)}
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="CRITICAL">🚨 Critical / জরুরি (Must follow strictly)</option>
                    <option value="STRICT">⚠️ Strict / কঠোর (High priority)</option>
                    <option value="STANDARD">⚖️ Standard / সাধারণ (Regular rule)</option>
                    <option value="RECOMMENDATION">💡 Recommendation / পরামর্শ (Good practice)</option>
                  </select>
                </div>
              </div>

              {/* DESCRIPTION (ENGLISH) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description / Detailed Guideline (English) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain the specific rules, deadlines, conditions, or responsibilities..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* DESCRIPTION (BENGALI) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description (বাংলা অনুবাদ বা বিস্তারিত)
                </label>
                <textarea
                  rows={2}
                  placeholder="নিয়মটির বাংলা বিবরণ..."
                  value={formDescBn}
                  onChange={(e) => setFormDescBn(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* PENALTY / FINE */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Penalty / Consequence (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ৳১০০ জরিমানা / Tk 100 fine or manager notice"
                  value={formPenalty}
                  onChange={(e) => setFormPenalty(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* PINNED & ACTIVE CHECKBOXES */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span>Pin this rule to top</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span>Active Rule</span>
                </label>
              </div>

              {/* SUBMIT BUTTONS */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-400 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEED STANDARD PACK CONFIRMATION MODAL */}
      {showSeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center gap-3 text-amber-400">
              <Sparkles size={24} />
              <h3 className="text-lg font-bold">Seed Recommended Guidelines?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will load the official standard Bengali Bachelor Mess rules package (13+ comprehensive rules covering meal turn on/off schedules, deposit deadlines, night gate hours, kitchen fire safety, bathroom hygiene, and roommate privacy).
            </p>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSeedDefaults}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25"
              >
                Load Standard Pack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE CHARTER SHEET MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-3xl p-8 space-y-6 my-8 print:p-0 print:m-0 print:border-none shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-cyan-600" size={22} />
                <h2 className="text-lg font-bold">Official Mess Rules Charter (Print Preview)</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} />
                  Print Now
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE BODY */}
            <div className="space-y-6 text-slate-900 font-sans">
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
                <h1 className="text-2xl font-black uppercase tracking-wider">OFFICIAL MESS RULES & PERSONAL REGULATIONS</h1>
                <p className="text-sm font-semibold text-slate-600">মেস ও ব্যক্তিগত আচরণবিধি এবং পরিচালনা নীতিমালা</p>
                <p className="text-xs text-slate-500">Effective Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>

              {/* MESS RULES SECTION */}
              <div className="space-y-3">
                <h2 className="text-base font-extrabold uppercase tracking-wide bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
                  SECTION 1: MESS OPERATIONAL RULES (মেস পরিচালনা নিয়মাবলী)
                </h2>
                <div className="space-y-2.5">
                  {rules.filter(r => r.type === "MESS" && r.isActive !== false).map((r, i) => (
                    <div key={r.id} className="text-xs p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{i + 1}. {r.title} {r.titleBn ? `(${r.titleBn})` : ""}</span>
                        <span className="text-slate-600 uppercase text-[10px]">[{r.category}]</span>
                      </div>
                      <p className="text-slate-700">{r.description}</p>
                      {r.penalty && (
                        <p className="text-rose-700 text-[11px] font-semibold">⚠️ Penalty: {r.penalty}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* PERSONAL RULES SECTION */}
              <div className="space-y-3 pt-2">
                <h2 className="text-base font-extrabold uppercase tracking-wide bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
                  SECTION 2: PERSONAL HYGIENE & ROOMMATE ETIQUETTE (ব্যক্তিগত পরিচ্ছন্নতা ও শিষ্টাচার)
                </h2>
                <div className="space-y-2.5">
                  {rules.filter(r => r.type === "PERSONAL" && r.isActive !== false).map((r, i) => (
                    <div key={r.id} className="text-xs p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{i + 1}. {r.title} {r.titleBn ? `(${r.titleBn})` : ""}</span>
                        <span className="text-slate-600 uppercase text-[10px]">[{r.category}]</span>
                      </div>
                      <p className="text-slate-700">{r.description}</p>
                      {r.penalty && (
                        <p className="text-rose-700 text-[11px] font-semibold">⚠️ Penalty: {r.penalty}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SIGNATURE SECTION */}
              <div className="pt-8 border-t-2 border-slate-900 space-y-4">
                <p className="text-xs font-bold text-slate-700">
                  By living in this mess, all residents acknowledge and solemnly agree to uphold the rules above.
                </p>
                <div className="grid grid-cols-2 gap-8 pt-6">
                  <div className="border-t border-slate-400 pt-2 text-center text-xs font-bold text-slate-600">
                    Mess Superuser / Manager Signature
                  </div>
                  <div className="border-t border-slate-400 pt-2 text-center text-xs font-bold text-slate-600">
                    Mess Committee & Members Representative
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
