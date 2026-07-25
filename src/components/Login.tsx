/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Lock, Mail, ChevronRight, Eye, EyeOff, KeyRound, Shield, Sparkles, Coffee, Users, Trophy } from "lucide-react";
import { Member } from "../types.js";

interface LoginProps {
  onLoginSuccess: (token: string, user: Member, rememberMe?: boolean) => void;
  isDarkMode: boolean;
  customization?: {
    title: string;
    subtitle: string;
    fontStyle: string;
    showBrandingIcon: boolean;
    showGoogleLogin: boolean;
    cardBg?: string;
    textColor?: string;
    accentColor?: string;
    animationType?: string;
    logoType?: string;
    customLogoUrl?: string;
  };
}

export default function Login({ onLoginSuccess, isDarkMode, customization }: LoginProps) {
  const [activeTab, setActiveTab] = useState<"login" | "activate" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState<"send" | "verify">("send");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [liveCustomization, setLiveCustomization] = useState<any>(customization || null);

  useEffect(() => {
    if (customization) {
      setLiveCustomization(customization);
      return;
    }
    const fetchPublicSettings = async () => {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          if (data.loginCustomization) {
            setLiveCustomization(data.loginCustomization);
          }
        }
      } catch (e) {
        console.error("Failed to fetch public settings:", e);
      }
    };
    fetchPublicSettings();
  }, [customization]);

  const title = liveCustomization?.title || "Mess ERP";
  const subtitle = liveCustomization?.subtitle || "BENGAL BACHELOR ERP ENGINE";
  const fontStyle = liveCustomization?.fontStyle || "sans";
  const showBrandingIcon = liveCustomization?.showBrandingIcon !== false;
  const showGoogleLogin = liveCustomization?.showGoogleLogin !== false;
  const accentColor = liveCustomization?.accentColor || "#22d3ee";
  const animationType = liveCustomization?.animationType || "pulse";

  const fontClass = 
    fontStyle === "mono" ? "font-mono" : 
    fontStyle === "serif" ? "font-serif" : 
    fontStyle === "display" ? "font-display" : "font-sans";

  const animationClass = 
    animationType === "pulse" ? "animate-pulse" : 
    animationType === "bounce" ? "animate-bounce" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (activeTab === "forgot") {
      if (forgotStep === "send") {
        try {
          const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to process request");
          }
          setSuccess(data.message);
          setForgotStep("verify");
        } catch (err: any) {
          setError(err.message || "Something went wrong.");
        } finally {
          setLoading(false);
        }
      } else {
        if (newPassword !== confirmNewPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        if (newPassword.length < 8) {
          setError("Password must be at least 8 characters long");
          setLoading(false);
          return;
        }
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) && !/[^A-Za-z0-9]/.test(newPassword))) {
          setError("Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.");
          setLoading(false);
          return;
        }
        try {
          const response = await fetch("/api/auth/verify-forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, newPassword })
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Incorrect OTP code");
          }
          setSuccess(data.message);
          setActiveTab("login");
          setPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
          setOtp("");
        } catch (err: any) {
          setError(err.message || "Failed to reset password.");
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    if (activeTab === "activate") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        setLoading(false);
        return;
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) && !/[^A-Za-z0-9]/.test(password))) {
        setError("Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.");
        setLoading(false);
        return;
      }
    }

    const url = activeTab === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      if (activeTab === "login") {
        onLoginSuccess(data.token, data.user, rememberMe);
      } else {
        setSuccess("Account activated successfully! You can now log in using the Login tab.");
        setActiveTab("login");
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message || "Connection failure");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const { auth, googleAuthProvider } = await import("../lib/firebase.ts");
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to authenticate with server. Make sure you are an invited member.");
      }

      const data = await response.json();
      onLoginSuccess(idToken, data.user, rememberMe);
    } catch (err: any) {
      console.error("[Auth] Google Sign-In Error:", err);
      const errCode = err?.code || "";
      const errMessage = err?.message || "";

      // Gracefully handle user closing or cancelling the popup without showing red error alert
      if (
        errCode === "auth/popup-closed-by-user" ||
        errCode === "auth/cancelled-popup-request" ||
        errMessage.includes("popup-closed-by-user") ||
        errMessage.includes("cancelled-popup-request")
      ) {
        // User closed or cancelled popup - quietly cancel loading state
        return;
      }

      if (errCode === "auth/popup-blocked" || errMessage.includes("popup-blocked")) {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
        return;
      }

      if (errCode === "auth/account-exists-with-different-credential") {
        setError("An account already exists with the same email address using a different sign-in method.");
        return;
      }

      let displayMsg = errMessage || "Google Authentication failed.";
      if (displayMsg.startsWith("Firebase: Error (") && displayMsg.endsWith(").")) {
        displayMsg = displayMsg.slice(17, -2);
      }
      setError(displayMsg);
    } finally {
      setLoading(false);
    }
  };

  const isColorLight = (colorStr: string): boolean => {
    if (!colorStr) return false;
    const cleanColor = colorStr.trim();
    if (cleanColor.startsWith("rgba") || cleanColor.startsWith("rgb")) {
      const matches = cleanColor.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128;
      }
    }
    if (cleanColor.startsWith("#")) {
      const hex = cleanColor.replace("#", "");
      let r = 0, g = 0, b = 0;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128;
    }
    return false;
  };

  const isCardLight = liveCustomization?.cardBg ? isColorLight(liveCustomization.cardBg) : !isDarkMode;
  const resolvedTextColor = liveCustomization?.textColor || (isCardLight ? "#0f172a" : "#ffffff");

  return (
    <div className="w-full max-w-md mx-auto" id="login-container">
      <div 
        style={{
          backgroundColor: liveCustomization?.cardBg || undefined,
          color: resolvedTextColor
        }}
        className={`p-8 rounded-2xl border transition-all duration-300 ${fontClass} ${
          isCardLight 
            ? "glass-panel-light shadow-xl text-slate-800" 
            : "glass-panel cyan-glow text-white"
        }`}
      >
        
        {/* Header branding */}
        <div className="text-center mb-8" id="login-header">
          {showBrandingIcon && (
            <div 
              style={{ borderColor: `${accentColor}40`, color: accentColor }}
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border mb-4 ${animationClass}`}
            >
              {customization?.logoType === "shield" ? (
                <Shield size={32} />
              ) : customization?.logoType === "sparkles" ? (
                <Sparkles size={32} />
              ) : customization?.logoType === "coffee" ? (
                <Coffee size={32} />
              ) : customization?.logoType === "users" ? (
                <Users size={32} />
              ) : customization?.logoType === "trophy" ? (
                <Trophy size={32} />
              ) : customization?.logoType === "lock" ? (
                <Lock size={32} />
              ) : customization?.logoType === "image" && customization?.customLogoUrl ? (
                <img src={customization.customLogoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg" referrerPolicy="no-referrer" />
              ) : (
                <KeyRound size={32} />
              )}
            </div>
          )}
          <h1 
            style={{ 
              color: liveCustomization?.accentColor || undefined,
              backgroundImage: liveCustomization?.accentColor ? "none" : undefined
            }}
            className={`text-3xl font-bold tracking-tight font-display ${
              liveCustomization?.accentColor ? "" : "bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent"
            }`}
          >
            {title}
          </h1>
          <p className={`text-xs mt-1 font-mono ${!isCardLight ? "text-cyan-300/60" : "text-slate-500"}`}>
            {subtitle}
          </p>
        </div>

        {/* Tabs */}
        {activeTab !== "forgot" ? (
          <div className="flex border-b border-cyan-500/10 mb-6" id="login-tabs">
            <button
              id="tab-login-btn"
              onClick={() => { setActiveTab("login"); setError(null); setSuccess(null); }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all text-center ${
                activeTab === "login"
                  ? "border-cyan-400 text-cyan-400 font-bold"
                  : `border-transparent ${!isCardLight ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`
              }`}
              style={{
                borderColor: activeTab === "login" ? accentColor : undefined,
                color: activeTab === "login" ? accentColor : undefined,
              }}
            >
              SIGN IN
            </button>
            <button
              id="tab-activate-btn"
              onClick={() => { setActiveTab("activate"); setError(null); setSuccess(null); }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all text-center ${
                activeTab === "activate"
                  ? "border-cyan-400 text-cyan-400 font-bold"
                  : `border-transparent ${!isCardLight ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`
              }`}
              style={{
                borderColor: activeTab === "activate" ? accentColor : undefined,
                color: activeTab === "activate" ? accentColor : undefined,
              }}
            >
              ACTIVATE ACCOUNT
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3 mb-6" id="forgot-header-tab">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-display" style={{ color: accentColor }}>
              RESET PASSWORD
            </h2>
            <button
              type="button"
              onClick={() => { setActiveTab("login"); setError(null); setSuccess(null); }}
              className={`text-xs hover:underline cursor-pointer ${!isCardLight ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* Feedback alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs text-center" id="auth-error-alert">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs text-center" id="auth-success-alert">
            {success}
          </div>
        )}

        {activeTab === "forgot" ? (
          <form onSubmit={handleSubmit} className="space-y-5" id="forgot-auth-form">
            {forgotStep === "send" ? (
              <>
                <p className={`text-xs leading-relaxed ${!isCardLight ? "text-slate-400" : "text-slate-500"}`}>
                  Enter your registered email address below. We will generate and send a 6-digit secure Verification OTP to your email inbox (or printed in the server logs if SMTP is not configured) to verify your account and allow you to set a new password.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-orange-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
                    <input
                      id="forgot-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="member@mess.erp"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isCardLight 
                          ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                          : "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500"
                      }`}
                    />
                  </div>
                </div>
                <button
                  id="forgot-send-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-white font-bold tracking-wide text-sm shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`
                  }}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      SEND VERIFICATION OTP
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <p className={`text-xs leading-relaxed p-2.5 rounded-lg border ${
                  isCardLight 
                    ? "bg-cyan-50 border-cyan-200 text-cyan-800"
                    : "bg-cyan-500/5 border-cyan-500/10 text-cyan-300"
                }`}>
                  We have generated a Verification OTP code. Please check your email inbox and enter it below along with your new password.
                </p>
                
                {/* OTP input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-orange-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    6-Digit OTP Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
                    <input
                      id="forgot-otp-input"
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 6-digit OTP"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all text-center tracking-[0.25em] font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isCardLight 
                          ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                          : "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500"
                      }`}
                    />
                  </div>
                </div>

                {/* New Password input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-orange-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
                    <input
                      id="forgot-new-password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isCardLight 
                          ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                          : "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-orange-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
                    <input
                      id="forgot-confirm-password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                        isCardLight 
                          ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                          : "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => { setForgotStep("send"); setError(null); setSuccess(null); }}
                    className="text-cyan-500 hover:underline cursor-pointer"
                  >
                    Resend Code (OTP)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("login"); setError(null); setSuccess(null); }}
                    className={`hover:underline cursor-pointer ${!isCardLight ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Cancel
                  </button>
                </div>

                <button
                  id="forgot-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-white font-bold tracking-wide text-sm shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`
                  }}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      RESET PASSWORD
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" id="auth-form">
            {/* Email input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-orange-500">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@mess.erp"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isCardLight 
                      ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                      : "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500"
                  }`}
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-orange-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  {activeTab === "login" ? "Password" : "Create Password"}
                </label>
                {activeTab === "login" && (
                  <button
                    type="button"
                    onClick={() => { setActiveTab("forgot"); setForgotStep("send"); setError(null); setSuccess(null); }}
                    className="text-[10px] text-cyan-500 hover:underline cursor-pointer font-bold"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" size={18} />
                <input
                  id="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={activeTab === "login" ? "••••••••" : "Minimum 6 characters"}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                    isCardLight 
                      ? "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                      : "bg-slate-900/60 border-cyan-500/20 text-white placeholder-slate-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me checkbox */}
            {activeTab === "login" && (
              <div className="flex items-center justify-between py-1" id="remember-me-container">
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-900 border-cyan-500/30 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer accent-cyan-500 h-4 w-4"
                  />
                  <span className={`text-xs font-medium transition-colors ${
                    !isCardLight ? "text-slate-300 group-hover:text-cyan-400" : "text-slate-600 group-hover:text-cyan-600"
                  }`}>
                    Remember me for 10 days
                  </span>
                </label>
              </div>
            )}

            {/* Guidelines & Password requirements for activate tab */}
            {activeTab === "activate" && (
              <div className="space-y-2">
                <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${isCardLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-cyan-500/20"}`}>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-orange-500 block mb-1">
                    Password Requirements:
                  </span>
                  <div className="grid grid-cols-1 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-emerald-400 font-medium" : !isCardLight ? "text-slate-400" : "text-slate-500"}`}>
                      <span className="text-[10px]">{password.length >= 8 ? "✓" : "•"}</span>
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? "text-emerald-400 font-medium" : !isCardLight ? "text-slate-400" : "text-slate-500"}`}>
                      <span className="text-[10px]">{/[A-Z]/.test(password) ? "✓" : "•"}</span>
                      <span>At least 1 uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[a-z]/.test(password) ? "text-emerald-400 font-medium" : !isCardLight ? "text-slate-400" : "text-slate-500"}`}>
                      <span className="text-[10px]">{/[a-z]/.test(password) ? "✓" : "•"}</span>
                      <span>At least 1 lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? "text-emerald-400 font-medium" : !isCardLight ? "text-slate-400" : "text-slate-500"}`}>
                      <span className="text-[10px]">{/[0-9]/.test(password) ? "✓" : "•"}</span>
                      <span>At least 1 number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) || /[^A-Za-z0-9]/.test(password)) ? "text-emerald-400 font-medium" : !isCardLight ? "text-slate-400" : "text-slate-500"}`}>
                      <span className="text-[10px]">{(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) || /[^A-Za-z0-9]/.test(password)) ? "✓" : "•"}</span>
                      <span>At least 1 special character (@, #, $, etc.)</span>
                    </div>
                  </div>
                </div>
                <p className={`text-[11px] leading-relaxed italic ${!isCardLight ? "text-slate-400" : "text-slate-500"}`}>
                  * Activation requires that your email has already been invited by the Administrator. If not invited, activation will fail.
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white font-bold tracking-wide text-sm shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`
              }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  {activeTab === "login" ? "ACCESS ENTERPRISE" : "ACTIVATE HOSTEL ACCESS"}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Google Sign-In button for login tab */}
        {activeTab === "login" && showGoogleLogin && (
          <>
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-cyan-500/10"></div>
              <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold">OR</span>
              <div className="flex-1 border-t border-cyan-500/10"></div>
            </div>

            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`w-full py-2.5 rounded-xl border text-sm transition-all font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                isDarkMode 
                  ? "bg-slate-900/40 border-cyan-500/20 text-white hover:bg-slate-900/60" 
                  : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.33 0 3.322 2.641 1.34 6.514l3.926 3.25z"
                />
                <path
                  fill="#FBBC05"
                  d="M16.04 15.345c-1.018.673-2.42 1.09-4.04 1.09a4.898 4.898 0 0 1-4.663-3.398L3.411 16.29A11.947 11.947 0 0 0 12 24c3.045 0 5.753-1.036 7.64-2.827l-3.6-2.828z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.275c0-.818-.082-1.61-.218-2.373H12v4.51h6.463a5.547 5.547 0 0 1-2.4 3.636l3.6 2.828c2.103-1.941 3.827-5.114 3.827-8.6z"
                />
                <path
                  fill="#34A853"
                  d="M3.41 7.71A11.936 11.936 0 0 0 1.34 12c0 3.237 1.282 6.182 3.41 8.39l3.6-2.827A7.072 7.072 0 0 1 7.102 12c0-1.545.5-2.973 1.34-4.136L4.84 4.61z"
                />
              </svg>
              SIGN IN WITH GOOGLE
            </button>
          </>
        )}

      </div>
    </div>
  );
}
