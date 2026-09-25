import React, { useState } from "react";
import { 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  Database, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Users,
  Award
} from "lucide-react";
import { UserRole } from "../types";

interface TenantAdminOnboardingProps {
  currentUser: {
    id: string;
    nickname: string;
    role: UserRole;
    email: string;
    isStandaloneTenantAdmin?: boolean;
    maxAllowedMesses?: number;
    allowedMesses?: string[];
  };
  onCreateMess: (name: string) => Promise<void>;
  isDarkMode: boolean;
}

export function TenantAdminOnboarding({
  currentUser,
  onCreateMess,
  isDarkMode
}: TenantAdminOnboardingProps) {
  const [messName, setMessName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQuota = currentUser.maxAllowedMesses || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messName.trim()) {
      setError("দয়া করে মেসের একটি নাম দিন।");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateMess(messName.trim());
    } catch (err: any) {
      setError(err?.message || "মেস তৈরি করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6" id="tenant-admin-onboarding-container">
      <div className={`w-full max-w-2xl rounded-2xl border p-6 sm:p-8 shadow-2xl transition-all ${
        isDarkMode 
          ? "bg-slate-900/90 border-cyan-500/30 text-slate-100 shadow-cyan-950/20" 
          : "bg-white border-slate-200 text-slate-800 shadow-slate-200"
      }`}>
        {/* Header Badge & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck size={14} className="text-cyan-400" />
            <span>Authorized Standalone Tenant Admin</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
            স্বাগতম! আপনার মেস ওয়ার্কস্পেস তৈরি করুন
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            আপনি ডিজিটাল মেস প্ল্যাটফর্মে একজন অনুমোদিত অ্যাডমিন হিসেবে যুক্ত হয়েছেন। এখন আপনার প্রথম মেসের নাম দিয়ে সম্পূর্ণ নিজস্ব ও নিরাপদ ওয়ার্কস্পেস শুরু করুন।
          </p>
        </div>

        {/* Admin Credential Summary Card */}
        <div className={`mt-6 p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono ${
          isDarkMode ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200"
        }`}>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Admin Email</span>
            <span className="font-bold text-cyan-400 truncate block">{currentUser.email}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Access Level</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Award size={12} /> Standalone Admin
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Allowed Quota</span>
            <span className="font-bold text-purple-400">সর্বোচ্চ {maxQuota} টি মেস</span>
          </div>
        </div>

        {/* Creation Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-slate-300 block">
              নতুন মেসের নাম (Mess Workspace Name) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                required
                value={messName}
                onChange={(e) => setMessName(e.target.value)}
                placeholder="যেমন: আল-ফালাহ মেস, নর্থ স্কয়ার হোস্টেল, ধানমন্ডি ছাত্রাবাস"
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border focus:outline-none transition-all ${
                  isDarkMode 
                    ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400" 
                    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              পরবর্তীতে মেস সেটিংসে গিয়ে যেকোনো সময় এই নাম ও লোগো পরিবর্তন করা যাবে।
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !messName.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>ওয়ার্কস্পেস ও ডেটাবেজ প্রস্তুত হচ্ছে...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>মেস তৈরি করুন এবং শুরু করুন (Create & Launch)</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Multi-Tenant Security & Isolation Highlights */}
        <div className={`mt-8 pt-6 border-t ${isDarkMode ? "border-slate-800/80" : "border-slate-200"}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-cyan-400 flex items-center gap-1.5 mb-3">
            <Lock size={13} />
            <span>১০০% স্বয়ংসম্পূর্ণ ও নিরাপদ মাল্টি-টেনেন্ট ডাটাবেজ</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>সম্পূর্ণ পৃথক ডাটাবেজ:</strong> আপনার মেসের সকল সদস্য, মিল, বাজার খরচ এবং জমা অন্য কোনো মেসের সাথে ওভারল্যাপ হবে না।</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>অনন্য আইডি ও এনক্রিপশন:</strong> প্রতিটি মেসের জন্য ইউনিক আইডেন্টিফায়ার দিয়ে সুরক্ষিত ব্যাকআপ তৈরি হয়।</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>স্বাধীন অ্যাডমিন নিয়ন্ত্রণ:</strong> আপনি ছাড়া অন্য কোনো মেসের অ্যাডমিন আপনার তথ্য দেখতে বা পরিবর্তন করতে পারবে না।</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>স্বয়ংক্রিয় মেম্বার ও মিল সাইকেল:</strong> মেস চালু হতেই বর্তমান চলতি মাসের মিল সাইকেল স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যাবে।</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
