import React, { useState } from "react";
import { Download, Upload, ShieldCheck, AlertTriangle, X, CheckCircle, RefreshCw, FileText, Calendar, Users, Database } from "lucide-react";
import { getAuthToken } from "../lib/authHeader";

interface MessBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMessId: string;
  activeMessName?: string;
  currentUser: {
    role: string;
    email?: string;
    nickname?: string;
  };
  isPlatformOwner?: boolean;
  sessionToken?: string;
  isDarkMode?: boolean;
  onRestoreSuccess?: () => void;
}

interface BackupFilePreview {
  raw: any;
  messId?: string;
  messName?: string;
  scope?: string;
  exportedAt?: string;
  integrityKey?: string;
  counts: {
    members: number;
    months: number;
    meals: number;
    deposits: number;
    marketEntries: number;
  };
  isMismatch: boolean;
  isZeroDataWarning: boolean;
}

export const MessBackupModal: React.FC<MessBackupModalProps> = ({
  isOpen,
  onClose,
  activeMessId,
  activeMessName = "বর্তমান মেস",
  currentUser,
  isPlatformOwner = false,
  sessionToken,
  isDarkMode,
  onRestoreSuccess
}) => {
  const effectiveIsDark = isDarkMode ?? (typeof document !== "undefined" && !!document.querySelector(".dark-mode-root"));
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [exportScope, setExportScope] = useState<"single_mess" | "full_system">("single_mess");
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingToday, setIsDownloadingToday] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [preview, setPreview] = useState<BackupFilePreview | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === "ADMIN" || isPlatformOwner;
  const isSuperUser = currentUser.role === "SUPERUSER";
  const effectiveAuthToken = sessionToken || getAuthToken(currentUser);

  // 1. Download Today's Automated Backup
  const handleDownloadTodayBackup = async () => {
    setIsDownloadingToday(true);
    setRestoreStatus(null);
    try {
      const res = await fetch("/api/admin/backup/daily/today", {
        headers: { Authorization: `Bearer ${effectiveAuthToken}` }
      });

      const contentType = res.headers.get("content-type") || "";
      const rawText = await res.text();

      if (!res.ok) {
        let errMsg = "আজকের ব্যাকআপ ডাউনলোড করতে সমস্যা হয়েছে";
        try {
          const err = JSON.parse(rawText);
          if (err?.error) errMsg = err.error;
        } catch {}
        throw new Error(errMsg);
      }

      if (contentType.includes("text/html") || rawText.trim().startsWith("<")) {
        throw new Error("সার্ভার রিস্টার্ট হচ্ছে বা ব্যাকআপ রেডি নয়। কয়েক সেকেন্ড পর আবার চেষ্টা করুন।");
      }

      try {
        JSON.parse(rawText);
      } catch {
        throw new Error("ডাউনলোড করা ফাইলটি সঠিক JSON ব্যাকআপ নয়। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }

      const blob = new Blob([rawText], { type: "application/json" });
      const contentDisposition = res.headers.get("Content-Disposition");
      let downloadFilename = `daily_backup_${activeMessId}_${new Date().toISOString().split("T")[0]}.json`;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename=([^;]+)/);
        if (match && match[1]) {
          downloadFilename = match[1].trim().replace(/^["']|["']$/g, "");
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setRestoreStatus({
        type: "success",
        text: `আজকের স্বয়ংক্রিয় ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে (${downloadFilename})!`
      });
    } catch (e: any) {
      setRestoreStatus({
        type: "error",
        text: e.message || "আজকের ব্যাকআপ ডাউনলোড করতে ব্যর্থ হয়েছে"
      });
    } finally {
      setIsDownloadingToday(false);
    }
  };

  // 2. Export Live Backup
  const handleExport = async () => {
    setIsExporting(true);
    setRestoreStatus(null);
    try {
      const url = exportScope === "full_system" && isPlatformOwner
        ? "/api/admin/backup/export?scope=full_system"
        : "/api/admin/backup/export?scope=single_mess";

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${effectiveAuthToken}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "ব্যাকআপ এক্সপোর্ট করতে সমস্যা হয়েছে");
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      
      const safeMess = (activeMessName || activeMessId).replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = exportScope === "full_system"
        ? `full_system_erp_backup_${dateStr}.json`
        : `mess_${safeMess}_${activeMessId}_backup_${dateStr}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setRestoreStatus({
        type: "success",
        text: `ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে (${link.download})!`
      });
    } catch (e: any) {
      setRestoreStatus({
        type: "error",
        text: e.message || "ব্যাকআপ তৈরিতে সমস্যা হয়েছে।"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Select and analyze JSON file for import
  const handleFileSelect = (file: File) => {
    setRestoreStatus(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        const isFullSystem = parsed.scope === "FULL_SYSTEM" || parsed.exportType === "FULL_SYSTEM_BACKUP";
        const db = parsed.db || parsed;
        const fileMessId = parsed.messId || db?.messId;
        const fileMessName = parsed.messName || fileMessId || "অজানা মেস";
        const allowedMessIds = parsed.allowedMessIds || (fileMessId ? [fileMessId] : []);

        // Mismatch check: if it's a single mess backup and does not match activeMessId
        const isMismatch = !isFullSystem && !!fileMessId && fileMessId !== activeMessId && !allowedMessIds.includes(activeMessId);

        const membersCount = Array.isArray(db?.members) ? db.members.length : 0;
        const monthsCount = Array.isArray(db?.months) ? db.months.length : 0;
        const mealsCount = Array.isArray(db?.meals) ? db.meals.length : 0;
        const depositsCount = Array.isArray(db?.deposits) ? db.deposits.length : 0;
        const marketEntriesCount = Array.isArray(db?.marketEntries) ? db.marketEntries.length : 0;

        const isZeroDataWarning = mealsCount === 0 || depositsCount === 0;

        setPreview({
          raw: parsed,
          messId: fileMessId,
          messName: fileMessName,
          scope: isFullSystem ? "FULL_SYSTEM" : "SINGLE_MESS",
          exportedAt: parsed.exportedAt,
          integrityKey: parsed.integrityKey,
          counts: {
            members: membersCount,
            months: monthsCount,
            meals: mealsCount,
            deposits: depositsCount,
            marketEntries: marketEntriesCount
          },
          isMismatch,
          isZeroDataWarning
        });
      } catch (err) {
        setRestoreStatus({
          type: "error",
          text: "অবৈধ ফাইল: এটি কোনো সঠিক JSON ব্যাকআপ ফাইল নয়।"
        });
      }
    };
    reader.readAsText(file);
  };

  // 3. Execute Restore
  const handleRestoreExecute = async (mode: "smart_merge" | "full_replace") => {
    if (!preview) return;

    if (preview.isMismatch) {
      alert("❌ মেস মিসম্যাচ! এই ব্যাকআপ অন্য মেসের জন্য নির্ধারিত। এটি বর্তমান মেসে রিস্টোর করা যাবে না।");
      return;
    }

    if (mode === "full_replace" && !isAdmin) {
      alert("শুধুমাত্র মেস অ্যাডমিন বা প্ল্যাটফর্ম ওনার 'ফুল রিপ্লেস' করতে পারবেন।");
      return;
    }

    const confirmText = mode === "smart_merge"
      ? `আপনি কি "স্মার্ট মার্জ" (Smart Merge) করতে চান?\n\n• ব্যাকআপের তারিখের পরের কোনো নতুন এন্ট্রি মুছে যাবে না।\n• পূর্ববর্তী মিসিং ডেটা আপডেট হবে।`
      : `⚠️ সতর্কতা: আপনি কি "ফুল রিপ্লেস" (Full Replace) করতে চান?\n\n• বর্তমান মেসের সমস্ত ডেটা হুবহু ব্যাকআপের পয়েন্টে ফিরিয়ে নেওয়া হবে।\n• ব্যাকআপের পরের সমস্ত নতুন এন্ট্রি মুছে যাবে!`;

    if (!window.confirm(confirmText)) {
      return;
    }

    setIsRestoring(true);
    setRestoreStatus(null);

    try {
      const payload = {
        ...preview.raw,
        mode
      };

      const res = await fetch("/api/admin/backup/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveAuthToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "রিস্টোর সম্পন্ন করা যায়নি।");
      }

      setRestoreStatus({
        type: "success",
        text: data.message || "ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!"
      });

      setTimeout(() => {
        if (onRestoreSuccess) {
          onRestoreSuccess();
        } else {
          window.location.reload();
        }
      }, 1200);
    } catch (e: any) {
      setRestoreStatus({
        type: "error",
        text: e.message || "রিস্টোর ব্যর্থ হয়েছে।"
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh] border ${
          effectiveIsDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          effectiveIsDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              effectiveIsDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
            }`}>
              <Database size={20} />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${effectiveIsDark ? "text-slate-100" : "text-slate-900"}`}>
                মেস ডেটা ব্যাকআপ ও রিস্টোর ইঞ্জিন
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                  effectiveIsDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-cyan-50 text-cyan-800 border-cyan-300"
                }`}>
                  {activeMessName} ({activeMessId})
                </span>
              </h2>
              <p className={`text-xs ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>
                স্বতন্ত্র মেস আইসোলেশন ও ক্রিপ্টোগ্রাফিক কিউ দ্বারা সুরক্ষিত
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition cursor-pointer ${
              effectiveIsDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b px-6 ${
          effectiveIsDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-100"
        }`}>
          <button
            onClick={() => { setActiveTab("export"); setRestoreStatus(null); }}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "export"
                ? effectiveIsDark
                  ? "border-cyan-400 text-cyan-400"
                  : "border-cyan-600 text-cyan-800 bg-white/70"
                : effectiveIsDark
                  ? "border-transparent text-slate-400 hover:text-slate-200"
                  : "border-transparent text-slate-700 hover:text-slate-950"
            }`}
          >
            <Download size={14} />
            ব্যাকআপ ডাউনলোড (Export)
          </button>
          <button
            onClick={() => { setActiveTab("import"); setRestoreStatus(null); }}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "import"
                ? effectiveIsDark
                  ? "border-cyan-400 text-cyan-400"
                  : "border-cyan-600 text-cyan-800 bg-white/70"
                : effectiveIsDark
                  ? "border-transparent text-slate-400 hover:text-slate-200"
                  : "border-transparent text-slate-700 hover:text-slate-950"
            }`}
          >
            <Upload size={14} />
            ব্যাকআপ রিস্টোর (Smart Merge / Full Replace)
          </button>
        </div>

        {/* Status Message */}
        {restoreStatus && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            restoreStatus.type === "success"
              ? effectiveIsDark
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-emerald-50 border-emerald-300 text-emerald-900"
              : effectiveIsDark
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-rose-50 border-rose-300 text-rose-900"
          }`}>
            {restoreStatus.type === "success" ? (
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            )}
            <div className="font-medium leading-relaxed">{restoreStatus.text}</div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === "export" ? (
            <div className="space-y-4">
              {/* Today's Cron Backup Card */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                effectiveIsDark
                  ? "bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border-cyan-500/30"
                  : "bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-200"
              }`}>
                <div className="space-y-0.5">
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${effectiveIsDark ? "text-cyan-400" : "text-cyan-800"}`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    দৈনিক স্বয়ংক্রিয় ব্যাকআপ (Today's Automated Backup)
                  </div>
                  <p className={`text-[11px] ${effectiveIsDark ? "text-slate-300" : "text-slate-700"}`}>
                    আজকের স্বয়ংক্রিয় ক্রন ডাটাবেজ ডাম্প সরাসরি ১-ক্লিকে ডাউনলোড করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTodayBackup}
                  disabled={isDownloadingToday}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isDownloadingToday ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>{isDownloadingToday ? "ডাউনলোড হচ্ছে..." : "Download Today's Backup"}</span>
                </button>
              </div>

              <div className={`p-4 rounded-xl border space-y-3 ${
                effectiveIsDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className={`text-sm font-semibold ${effectiveIsDark ? "text-slate-200" : "text-slate-900"}`}>
                      বর্তমান মেসের জন্য সুরক্ষিত ব্যাকআপ
                    </h3>
                    <p className={`text-xs ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>
                      সদস্য তালিকা, মিল ইনটেক, বাজার খরচ, ডিপোজিট এবং সেটিংস JSON ফাইলে এনকোড করা হবে।
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                    effectiveIsDark ? "bg-slate-800 text-cyan-400 border-slate-700" : "bg-white text-cyan-800 border-cyan-300"
                  }`}>
                    ID: {activeMessId}
                  </span>
                </div>

                {/* Platform Owner Full System Option */}
                {isPlatformOwner && (
                  <div className={`mt-3 pt-3 border-t flex items-center justify-between ${effectiveIsDark ? "border-slate-800" : "border-slate-200"}`}>
                    <label className={`text-xs flex items-center gap-2 font-semibold ${effectiveIsDark ? "text-slate-300" : "text-slate-800"}`}>
                      <input
                        type="checkbox"
                        checked={exportScope === "full_system"}
                        onChange={(e) => setExportScope(e.target.checked ? "full_system" : "single_mess")}
                        className="rounded border-slate-400 text-cyan-600 focus:ring-0 cursor-pointer"
                      />
                      <span>সম্পূর্ণ প্ল্যাটফর্ম ব্যাকআপ (সমস্ত মেস একত্রিত - Founder Only)</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-cyan-900/30 disabled:opacity-50 cursor-pointer"
                >
                  {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  {isExporting ? "ব্যাকআপ তৈরি হচ্ছে..." : "এখনই ব্যাকআপ ডাউনলোড করুন"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Upload Zone */}
              <div className={`p-4 rounded-xl border-2 border-dashed hover:border-cyan-500/60 transition text-center space-y-2 ${
                effectiveIsDark ? "bg-slate-950/60 border-slate-700" : "bg-slate-50 border-slate-300"
              }`}>
                <Upload size={24} className={`mx-auto ${effectiveIsDark ? "text-slate-400" : "text-slate-500"}`} />
                <div className={`text-xs font-semibold ${effectiveIsDark ? "text-slate-200" : "text-slate-900"}`}>
                  রিস্টোর করার ব্যাকআপ ফাইল নির্বাচন করুন
                </div>
                <p className={`text-[11px] ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>
                  শুধুমাত্র এই মেসের জন্য সংরক্ষিত valid .json ফাইল আপলোড করুন
                </p>
                <label className={`inline-block mt-2 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition border ${
                  effectiveIsDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    : "bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-xs"
                }`}>
                  ফাইল ব্রাউজ করুন
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Preview & Validation Card */}
              {preview && (
                <div className={`p-4 rounded-xl border space-y-4 animate-fadeIn ${
                  effectiveIsDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  {/* Mismatch Alert */}
                  {preview.isMismatch ? (
                    <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                      effectiveIsDark ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-rose-50 border-rose-300 text-rose-900"
                    }`}>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <AlertTriangle size={16} className={effectiveIsDark ? "text-rose-400 shrink-0" : "text-rose-700 shrink-0"} />
                        মেস মিসম্যাচ শনাক্ত হয়েছে (Cross-Mess Conflict Blocked)!
                      </div>
                      <p className={`text-[11px] leading-relaxed ${effectiveIsDark ? "text-slate-300" : "text-slate-800"}`}>
                        এই ব্যাকআপ ফাইলটি মেস <span className={`font-bold ${effectiveIsDark ? "text-rose-300" : "text-rose-800"}`}>"{preview.messName}" ({preview.messId})</span> এর জন্য তৈরি।
                        আপনার বর্তমান সক্রিয় মেস <span className={`font-bold ${effectiveIsDark ? "text-cyan-300" : "text-cyan-800"}`}>"{activeMessName}" ({activeMessId})</span>।
                        অন্য মেসের ব্যাকআপ এখানে রিস্টোর করা সম্পূর্ণ নিষিদ্ধ ও ব্লক করা হয়েছে।
                      </p>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                      effectiveIsDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-300 text-emerald-900"
                    }`}>
                      <ShieldCheck size={16} className={effectiveIsDark ? "shrink-0 text-emerald-400" : "shrink-0 text-emerald-700"} />
                      <div>
                        মেস ভেরিফিকেশন সফল! ব্যাকআপ ফাইলটি বর্তমান মেসের জন্য বৈধ।
                      </div>
                    </div>
                  )}

                  {/* Empty Data Alert */}
                  {preview.isZeroDataWarning && !preview.isMismatch && (
                    <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                      effectiveIsDark ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-900"
                    }`}>
                      <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${effectiveIsDark ? "text-amber-400" : "text-amber-700"}`} />
                      <div>
                        <strong>সতর্কতা:</strong> এই ব্যাকআপ ফাইলে কোনো মিল (Meals) বা ক্যাশ ডিপোজিট নেই। এটি ইমপোর্ট করলে বর্তমান মেসের মিল বা ব্যালেন্স ফাঁকা হয়ে যেতে পারে।
                      </div>
                    </div>
                  )}

                  {/* Backup Stats */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                    <div className={`p-2.5 rounded-lg border ${effectiveIsDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                      <div className={`text-xs ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>সদস্য</div>
                      <div className={`text-sm font-bold ${effectiveIsDark ? "text-slate-200" : "text-slate-900"}`}>{preview.counts.members}</div>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${effectiveIsDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                      <div className={`text-xs ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>মাস/সাইকেল</div>
                      <div className={`text-sm font-bold ${effectiveIsDark ? "text-slate-200" : "text-slate-900"}`}>{preview.counts.months}</div>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${effectiveIsDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                      <div className={`text-xs ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>মিল রেকর্ড</div>
                      <div className={`text-sm font-bold ${effectiveIsDark ? "text-slate-200" : "text-slate-900"}`}>{preview.counts.meals}</div>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${effectiveIsDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                      <div className={`text-xs ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>ডিপোজিট</div>
                      <div className={`text-sm font-bold ${effectiveIsDark ? "text-slate-200" : "text-slate-900"}`}>{preview.counts.deposits}</div>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${effectiveIsDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                      <div className={`text-xs ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>বাজার খরচ</div>
                      <div className={`text-sm font-bold ${effectiveIsDark ? "text-slate-200" : "text-slate-900"}`}>{preview.counts.marketEntries}</div>
                    </div>
                  </div>

                  {preview.exportedAt && (
                    <div className={`text-[11px] flex items-center gap-1.5 ${effectiveIsDark ? "text-slate-400" : "text-slate-600"}`}>
                      <Calendar size={12} />
                      ব্যাকআপ নেওয়ার সময়: {new Date(preview.exportedAt).toLocaleString("bn-BD")}
                    </div>
                  )}

                  {/* Restore Action Options */}
                  {!preview.isMismatch && (
                    <div className={`pt-3 border-t space-y-3 ${effectiveIsDark ? "border-slate-800" : "border-slate-200"}`}>
                      <div className={`text-xs font-bold ${effectiveIsDark ? "text-slate-300" : "text-slate-800"}`}>
                        রিস্টোর অপশন নির্বাচন করুন:
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Option 1: Smart Merge */}
                        <div className={`p-3.5 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                          effectiveIsDark
                            ? "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10"
                            : "border-cyan-300 bg-cyan-50/70 hover:bg-cyan-50"
                        }`}>
                          <div>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold flex items-center gap-1.5 ${effectiveIsDark ? "text-cyan-300" : "text-cyan-900"}`}>
                                <CheckCircle size={14} className={effectiveIsDark ? "text-cyan-400" : "text-cyan-700"} />
                                স্মার্ট মার্জ (Smart Merge)
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                                effectiveIsDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-cyan-100 text-cyan-900 border-cyan-300"
                              }`}>
                                প্রস্তাবিত
                              </span>
                            </div>
                            <p className={`text-[11px] mt-1.5 leading-relaxed ${effectiveIsDark ? "text-slate-400" : "text-slate-700"}`}>
                              ব্যাকআপ নেওয়ার তারিখের পরের কোনো নতুন এন্ট্রি (যেমন আজকের ২১ তারিখের মিল বা টাকা জমা) অক্ষত থাকবে। কেবল পূর্বের তথ্যগুলো আপডেট হবে।
                            </p>
                          </div>
                          <button
                            onClick={() => handleRestoreExecute("smart_merge")}
                            disabled={isRestoring}
                            className="w-full mt-2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isRestoring ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            স্মার্ট মার্জ করুন
                          </button>
                        </div>

                        {/* Option 2: Full Replace */}
                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                          isAdmin
                            ? effectiveIsDark
                              ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition"
                              : "border-amber-300 bg-amber-50/70 hover:bg-amber-50 transition"
                            : effectiveIsDark
                              ? "border-slate-800 bg-slate-900/40 opacity-60"
                              : "border-slate-200 bg-slate-100 opacity-70"
                        }`}>
                          <div>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold flex items-center gap-1.5 ${effectiveIsDark ? "text-amber-300" : "text-amber-900"}`}>
                                <AlertTriangle size={14} className={effectiveIsDark ? "text-amber-400" : "text-amber-700"} />
                                ফুল রিপ্লেস (Full Replace)
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                                effectiveIsDark ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-amber-100 text-amber-900 border-amber-300"
                              }`}>
                                অ্যাডমিন অনলি
                              </span>
                            </div>
                            <p className={`text-[11px] mt-1.5 leading-relaxed ${effectiveIsDark ? "text-slate-400" : "text-slate-700"}`}>
                              পুরো মেস হুবহু ব্যাকআপের পয়েন্টে ফিরে যাবে। ব্যাকআপের পরের সমস্ত নতুন এন্ট্রি মুছে যাবে।
                            </p>
                          </div>
                          <button
                            onClick={() => handleRestoreExecute("full_replace")}
                            disabled={isRestoring || !isAdmin}
                            className={`w-full mt-2 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                              isAdmin
                                ? "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                                : effectiveIsDark
                                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
                            }`}
                            title={!isAdmin ? "শুধুমাত্র মূল অ্যাডমিন বা ফাউন্ডার ফুল রিপ্লেস করতে পারবেন" : "হুবহু ব্যাকআপ ফিরিয়ে নিন"}
                          >
                            {isRestoring ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            ফুল রিপ্লেস করুন
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
          effectiveIsDark ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
        }`}>
          <div>
            রিস্টোরের পূর্বে স্বয়ংক্রিয়ভাবে একটি সেফটি স্ন্যাপশট সংরক্ষিত থাকে।
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
              effectiveIsDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700" : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300"
            }`}
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
