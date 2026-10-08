/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, Mail, Send, CheckCircle2, AlertTriangle, ShieldCheck, 
  Settings, RefreshCw, Calendar, Sparkles, Check, Clock, User
} from "lucide-react";
import { Member, UserRole } from "../types.js";

interface MarketReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  authToken: string;
  isDarkMode: boolean;
  messName?: string;
}

export default function MarketReminderModal({
  isOpen,
  onClose,
  currentUser,
  authToken,
  isDarkMode,
  messName = "মেস"
}: MarketReminderModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "setup" | "logs">("overview");

  // Test email state
  const [testEmail, setTestEmail] = useState(currentUser.email || "");
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Manual trigger state
  const [triggeringManual, setTriggeringManual] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  // SMTP Setup form state
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpSuccess, setSmtpSuccess] = useState<string | null>(null);
  const [smtpError, setSmtpError] = useState<string | null>(null);

  const isPrivileged = [
    UserRole.SUPERUSER,
    UserRole.ASSISTANT_SUPERUSER,
    UserRole.MANAGER,
    UserRole.ADMIN
  ].includes(currentUser.role);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market-reminders/status", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch market reminder status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setTestEmail(currentUser.email || "");
      setTestSuccess(null);
      setTestError(null);
      setManualMessage(null);
      setSmtpSuccess(null);
      setSmtpError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes("@")) {
      setTestError("অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন");
      return;
    }
    setSendingTest(true);
    setTestSuccess(null);
    setTestError(null);

    try {
      const res = await fetch("/api/market-reminders/send-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestSuccess(data.message || "টেস্ট রিমাইন্ডার সফলভাবে পাঠানো হয়েছে! ইনবক্স চেক করুন।");
      } else {
        setTestError(data.error || "টেস্ট ইমেইল পাঠানো সম্ভব হয়নি। অনুগ্রহ করে SMTP সেটিংস যাচাই করুন।");
      }
    } catch (err: any) {
      setTestError(err.message || "নেটওয়ার্ক এরর");
    } finally {
      setSendingTest(false);
    }
  };

  const handleTriggerManualSend = async () => {
    setTriggeringManual(true);
    setManualMessage(null);

    try {
      const res = await fetch("/api/market-reminders/check-and-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ forceAll: true })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setManualMessage(`সম্পন্ন হয়েছে! ${data.remindersSent} টি স্বয়ংক্রিয় বাজার রিমাইন্ডার পাঠানো হয়েছে।`);
        fetchStatus();
      } else {
        setManualMessage(data.error || "রিমাইন্ডার পাঠানোর সময় সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      setManualMessage(err.message || "নেটওয়ার্ক এরর");
    } finally {
      setTriggeringManual(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpUser || !smtpPass) {
      setSmtpError("জিমেইল অ্যাকাউন্ট এবং অ্যাপ পাসওয়ার্ড উভয়ই পূরণ করা বাধ্যতামূলক");
      return;
    }
    setSavingSmtp(true);
    setSmtpSuccess(null);
    setSmtpError(null);

    try {
      const res = await fetch("/api/market-reminders/smtp-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          user: smtpUser,
          pass: smtpPass,
          host: "smtp.gmail.com",
          port: 587
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSmtpSuccess("জিমেইল SMTP সফলভাবে সংরক্ষিত হয়েছে! এখন আপনি টেস্ট মেইল পাঠাতে পারেন।");
        setSmtpPass("");
        fetchStatus();
        setActiveTab("overview");
      } else {
        setSmtpError(data.error || "SMTP ক্রেডেনশিয়াল সংরক্ষণ ব্যর্থ হয়েছে");
      }
    } catch (err: any) {
      setSmtpError(err.message || "নেটওয়ার্ক এরর");
    } finally {
      setSavingSmtp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Mail size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  স্বয়ংক্রিয় বাজার নোটিফিকেশন ইঞ্জিন
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  PUSH MAIL ⚡
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                যার যেদিন বাজার তার আগের দিন স্বয়ংক্রিয়ভাবে আকর্ষণীয় রঙিন মেইল যাবে
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles size={14} />
            ওভারভিউ ও শিডিউল
          </button>
          {isPrivileged && (
            <button
              onClick={() => setActiveTab("setup")}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "setup"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Settings size={14} />
              ইমেইল / Gmail কনফিগারেশন
            </button>
          )}
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock size={14} />
            পাঠানো মেইল লগ ({status?.recentLogs?.length || 0})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          
          {/* TAB 1: OVERVIEW & SCHEDULE */}
          {activeTab === "overview" && (
            <>
              {/* System Status Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full animate-pulse ${
                    status?.configured ? "bg-emerald-400" : "bg-amber-400"
                  }`} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      ইমেইল ডেলিভারি স্ট্যাটাস:
                    </div>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {status?.configured ? (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          🟢 সক্রিয় (Active) • জিমেইল সংযুক্ত ({status?.smtpUser || "Configured"})
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1.5">
                          🟡 সেটআপ প্রয়োজন (Setup Required)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isPrivileged && !status?.configured && (
                  <button
                    onClick={() => setActiveTab("setup")}
                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                  >
                    সেটিংস কনফিগার করুন
                  </button>
                )}
              </div>

              {/* Tomorrow's Market Duties */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-cyan-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      আগামীকালকের বাজার শিডিউল (তারিখ: {status?.tomorrowStr || "Checking..."})
                    </span>
                  </div>
                  {isPrivileged && (
                    <button
                      onClick={handleTriggerManualSend}
                      disabled={triggeringManual || !status?.configured}
                      className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow"
                    >
                      {triggeringManual ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                      কালকের মেইল এখনই পাঠান
                    </button>
                  )}
                </div>

                {manualMessage && (
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
                    {manualMessage}
                  </div>
                )}

                {status?.tomorrowDuties && status.tomorrowDuties.length > 0 ? (
                  <div className="space-y-2">
                    {status.tomorrowDuties.map((d: any) => (
                      <div key={d.id} className="p-3 rounded-xl bg-slate-900 border border-slate-750 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                            🛒
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-xs">
                              {d.memberName} {d.memberNickname ? `(${d.memberNickname})` : ""}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {d.memberEmail ? `ইমেইল: ${d.memberEmail}` : "⚠️ কোনো ইমেইল সেট নেই"}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          নির্ধারিত
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500 italic">
                    আগামীকালকের জন্য এখনও কোনো মেম্বারের বাজার ডিউটি শিডিউল করা হয়নি।
                    <br />
                    (Market Logs-এর Calendar-এ ক্লিক করে যেকোনো তারিখে মেম্বার অ্যাসাইন করতে পারবেন)
                  </div>
                )}
              </div>

              {/* Instant Test Email Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <span>🧪 টেস্ট রিমাইন্ডার প্রিভিউ (Instant Test)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    ইনবক্সে কেমন দেখাবে তা পরীক্ষা করুন
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  নিচের ইমেইলে ১-ক্লিকে একটি টেস্ট বাজার রিমাইন্ডার পাঠিয়ে দেখতে পারেন কেমন রঙিন কার্ড ও ইমোজি আসে।
                </p>

                <form onSubmit={handleSendTest} className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="আপনার জিমেইল বা ইমেইল ঠিকানা"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={sendingTest}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  >
                    {sendingTest ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    টেস্ট মেইল পাঠান
                  </button>
                </form>

                {testSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{testSuccess}</span>
                  </div>
                )}

                {testError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{testError}</span>
                  </div>
                )}
              </div>

              {/* How it works info */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-2 text-xs text-slate-400 leading-relaxed">
                <div className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  কীভাবে এই স্বয়ংক্রিয় পুশ মেইল কাজ করে:
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong>আইসোলেটেড মাল্টি-টেন্যান্ট:</strong> প্রতিটি মেসের সদস্যদের বাজার শিডিউল ও তথ্য সম্পূর্ণ পৃথক থাকে।</li>
                  <li><strong>চোখ ধাঁধানো ইমোজি:</strong> বিষয় ও শিরোনামে <code>🛒 🥦 🚨 🍗 🧺</code> থাকায় হাজারো মেইলের ভিড়ে সহজেই চোখে পড়বে।</li>
                  <li><strong>ডুপ্লিকেট প্রতিরোধ:</strong> একই সদস্যকে একই তারিখের জন্য দিনে একাধিকবার বিরক্তিকর মেইল যাবে না।</li>
                </ul>
              </div>
            </>
          )}

          {/* TAB 2: SMTP SETUP (GMAIL) */}
          {activeTab === "setup" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="font-bold text-cyan-400 text-sm flex items-center gap-1.5">
                  <span>🔑 আপনার জিমেইল দিয়ে ফ্রি ইমেইল নোটিফিকেশন সেটআপ (২ মিনিটের কাজ)</span>
                </div>
                <p>
                  জিমেইলের মাধ্যমে সম্পূর্ণ বিনামূল্যে মেসের বাজার রিমাইন্ডার পাঠাতে নিচের সহজ ৩টি ধাপ অনুসরণ করুন:
                </p>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 font-mono text-[11px] text-slate-300">
                  <p><strong>ধাপ ১:</strong> আপনার গুগল অ্যাকাউন্টের <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Security সেকশনে</a> যান। 2-Step Verification অন থাকতে হবে।</p>
                  <p><strong>ধাপ ২:</strong> সার্চ বারে <strong>"App passwords"</strong> লিখে সার্চ করুন (অথবা 2-Step Verification এর ভেতর খুঁজুন)।</p>
                  <p><strong>ধাপ ৩:</strong> App Name দিন <strong>"Mess ERP"</strong> এবং <strong>Create</strong> চাপুন। গুগল আপনাকে ১৬ অক্ষরের একটি কোড দিবে (যেমন: <code>abcd efgh ijkl mnop</code>)।</p>
                </div>
              </div>

              <form onSubmit={handleSaveSmtp} className="space-y-3.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    আপনার জিমেইল এড্রেস (Sender Email)
                  </label>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    গুগল ১৬ অক্ষরের অ্যাপ পাসওয়ার্ড (App Password)
                  </label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="১৬ অক্ষরের পাসওয়ার্ড (স্পেস ছাড়া বা স্পেস সহ)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    (এটি আপনার আসল জিমেইল লগইন পাসওয়ার্ড নয়, গুগল সিকিউরিটির ১৬ অক্ষরের App Password)
                  </span>
                </div>

                {smtpSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{smtpSuccess}</span>
                  </div>
                )}

                {smtpError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{smtpError}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    {savingSmtp ? "সংরক্ষণ করা হচ্ছে..." : "ক্রেডেনশিয়াল সংরক্ষণ করুন (SAVE SMTP)"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                সর্বশেষ প্রেরিত বাজার রিমাইন্ডারসমূহ
              </div>

              {status?.recentLogs && status.recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {status.recentLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          log.status === "success" ? "bg-emerald-400" : "bg-rose-400"
                        }`} />
                        <div>
                          <div className="font-bold text-white">
                            {log.memberName} ({log.recipientEmail})
                          </div>
                          <div className="text-[11px] text-slate-400">
                            বাজার তারিখ: {log.marketDate} • {new Date(log.sentAt).toLocaleString("bn-BD")}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        log.status === "success"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      }`}>
                        {log.status === "success" ? "ডেলিভারি সফল" : "ব্যর্থ"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  এখনও কোনো রিমাইন্ডার পাঠানো হয়নি।
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>মেস: <strong className="text-white">{messName}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>
        </div>

      </div>
    </div>
  );
}
