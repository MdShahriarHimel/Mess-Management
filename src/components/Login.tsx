/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Lock, Mail, ChevronRight, Eye, EyeOff, KeyRound, Shield, Sparkles, Coffee, Users, Trophy, RefreshCw, X } from "lucide-react";
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
    loginTheme?: string;
    titleFontSize?: string;
    subtitleFontSize?: string;
    buttonTextLogin?: string;
    backgroundImageUrl?: string;
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
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [liveCustomization?.customLogoUrl]);

  useEffect(() => {
    if (customization) {
      setLiveCustomization(customization);
    }
    const fetchPublicSettings = async () => {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.loginCustomization) {
            setLiveCustomization((prev: any) => ({
              ...data.loginCustomization,
              ...(prev || {}),
              ...(customization || {})
            }));
          }
        }
      } catch (e) {
        console.warn("Notice: Failed to fetch public settings:", e);
      }
    };
    fetchPublicSettings();

    // Register Native Android Google Sign-In Callbacks
    (window as any).onNativeGoogleLoginSuccess = async (email: string, displayName: string, photoUrl: string, idToken: string) => {
      setLoading(true);
      setError(null);
      try {
        if (idToken) {
          try {
            const { signInWithCredential, GoogleAuthProvider } = await import("firebase/auth");
            const { auth } = await import("../lib/firebase.ts");
            const credential = GoogleAuthProvider.credential(idToken);
            const result = await signInWithCredential(auth, credential);
            const token = await result.user.getIdToken();
            const response = await fetch("/api/auth/me", {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json().catch(() => ({}));
              onLoginSuccess(token, data.user, rememberMe);
              return;
            }
          } catch (fbErr) {
            console.warn("[Native Auth] Firebase token fallback to backend auth:", fbErr);
          }
        }

        // Direct native backend auth with verified device Google account
        const res = await fetch("/api/auth/google-native", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name: displayName, photo: photoUrl, idToken })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to authenticate with server. Make sure you are an invited member.");
        }

        const data = await res.json().catch(() => ({}));
        onLoginSuccess(data.token, data.user, rememberMe);
      } catch (err: any) {
        console.warn("[Native Auth] Notice:", err?.message || err);
        setError(err.message || "Failed to log in with selected Google account.");
      } finally {
        setLoading(false);
      }
    };

    (window as any).onNativeGoogleLoginFallback = () => {
      console.log("[Native Auth] Falling back to Web Google Auth");
      handleGoogleLogin(true);
    };

    (window as any).onNativeGoogleLoginError = (errMsg: string) => {
      console.warn("[Native Auth] Native auth failed, falling back to Web Auth:", errMsg);
      handleGoogleLogin(true);
    };

    (window as any).onNativeGoogleLoginCancel = () => {
      setLoading(false);
    };
  }, [customization, rememberMe, onLoginSuccess]);

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

  const handleResendOtp = async () => {
    if (!email) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }
      setSuccess(data.message);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification OTP.");
    } finally {
      setLoading(false);
    }
  };

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
          const data = await response.json().catch(() => ({}));
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
          const data = await response.json().catch(() => ({}));
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
        credentials: "include",
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      if (activeTab === "login") {
        onLoginSuccess(data.token, data.user, rememberMe);
      } else {
        setSuccess("Account activated successfully! Logging you in...");
        setTimeout(() => {
          onLoginSuccess(data.token, data.user, true);
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || "Connection failure");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (forceWeb = false) => {
    setError(null);
    setSuccess(null);

    // If inside Android app and not forced to web, try native Google Account Chooser
    if (!forceWeb && (window as any).AndroidAuthBridge && typeof (window as any).AndroidAuthBridge.launchGoogleSignIn === "function") {
      setLoading(true);
      (window as any).AndroidAuthBridge.launchGoogleSignIn();
      return;
    }

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

      const data = await response.json().catch(() => ({}));
      onLoginSuccess(idToken, data.user, rememberMe);
    } catch (err: any) {
      console.warn("[Auth] Google Sign-In notice:", err?.message || err);
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

      const isPopupRestricted = 
        errCode === "auth/popup-blocked" || 
        errMessage.includes("popup-blocked") ||
        errCode === "auth/network-request-failed" || 
        errMessage.includes("network-request-failed") ||
        errCode === "auth/internal-error" ||
        errCode === "auth/unauthorized-domain";

      if (isPopupRestricted) {
        if (errCode === "auth/popup-blocked" || errMessage.includes("popup-blocked")) {
          setError("Google Sign-In popup was blocked by your browser. Please allow popups for this site, or enter your email and password above.");
        } else {
          setError("Unable to complete Google Sign-In at this moment. Please sign in using your email and password.");
        }
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

  const loginFormContent = (
    <div className="w-full max-w-md mx-auto" id="login-container">
      <style dangerouslySetInnerHTML={{ __html: `
        #login-container input:focus {
          border-color: ${accentColor} !important;
          box-shadow: 0 0 0 1px ${accentColor} !important;
        }
        #login-container .text-cyan-500, 
        #login-container .text-cyan-400 {
          color: ${accentColor} !important;
        }
        #login-container .border-cyan-500, 
        #login-container .border-cyan-400 {
          border-color: ${accentColor} !important;
        }
        #login-container .bg-cyan-500 {
          background-color: ${accentColor} !important;
        }
        #login-container .hover\\:text-cyan-400:hover {
          color: ${accentColor} !important;
        }
      `}} />
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
              {liveCustomization?.logoType === "shield" ? (
                <Shield size={32} />
              ) : liveCustomization?.logoType === "sparkles" ? (
                <Sparkles size={32} />
              ) : liveCustomization?.logoType === "coffee" ? (
                <Coffee size={32} />
              ) : liveCustomization?.logoType === "users" ? (
                <Users size={32} />
              ) : liveCustomization?.logoType === "trophy" ? (
                <Trophy size={32} />
              ) : liveCustomization?.logoType === "lock" ? (
                <Lock size={32} />
              ) : liveCustomization?.logoType === "image" && liveCustomization?.customLogoUrl && !logoError ? (
                <img 
                  src={liveCustomization.customLogoUrl} 
                  alt="Logo" 
                  className="w-12 h-12 object-contain rounded-lg" 
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)} 
                />
              ) : (
                <KeyRound size={32} />
              )}
            </div>
          )}
          <h1 
            style={{ 
              color: liveCustomization?.accentColor || undefined,
              backgroundImage: liveCustomization?.accentColor ? "none" : undefined,
              fontSize: liveCustomization?.titleFontSize?.includes("px") || liveCustomization?.titleFontSize?.includes("rem") ? liveCustomization.titleFontSize : undefined
            }}
            className={`font-bold ${!liveCustomization?.titleFontSize?.includes("px") && !liveCustomization?.titleFontSize?.includes("rem") && liveCustomization?.titleFontSize ? "text-" + liveCustomization.titleFontSize : (liveCustomization?.titleFontSize ? "" : "text-3xl")} tracking-tight font-display ${
              liveCustomization?.accentColor ? "" : "bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent"
            }`}
          >
            {title}
          </h1>
          <p 
            style={{ fontSize: liveCustomization?.subtitleFontSize?.includes("px") || liveCustomization?.subtitleFontSize?.includes("rem") ? liveCustomization.subtitleFontSize : undefined }}
            className={`${!liveCustomization?.subtitleFontSize?.includes("px") && !liveCustomization?.subtitleFontSize?.includes("rem") && liveCustomization?.subtitleFontSize ? "text-" + liveCustomization.subtitleFontSize : (liveCustomization?.subtitleFontSize ? "" : "text-xs")} mt-1 font-mono ${!isCardLight ? "text-cyan-300/60" : "text-slate-500"}`}>
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
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2.5 animate-fade-in" id="auth-error-alert">
            <span className="flex-1 leading-relaxed text-left">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-500/20 cursor-pointer transition-colors shrink-0"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2.5 animate-fade-in" id="auth-success-alert">
            <span className="flex-1 leading-relaxed text-left">{success}</span>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20 cursor-pointer transition-colors shrink-0"
              title="Dismiss"
            >
              <X size={15} />
            </button>
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
                    disabled={loading}
                    onClick={handleResendOtp}
                    className="text-cyan-500 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
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
                  {activeTab === "login" ? (liveCustomization?.buttonTextLogin || "ACCESS ENTERPRISE") : "ACTIVATE HOSTEL ACCESS"}
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



  const theme = liveCustomization?.loginTheme || 'default';
  
  // Theme Backgrounds
  switch(theme) {
    case 'glass-3d-ribbons':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 30%, #0056d6 0%, #0036a8 60%, #001c57 100%)" }}>
          {/* 3D Coils & Floating Ribbon Vector Graphics */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Top Ring coil */}
            <svg className="absolute top-[5%] left-[38%] w-32 h-32 md:w-44 md:h-44 opacity-80 animate-pulse" viewBox="0 0 100 100" fill="none">
              <path d="M 20 50 A 30 30 0 1 1 80 50" stroke="url(#blue-grad-1)" strokeWidth="12" strokeLinecap="round" />
              <defs>
                <linearGradient id="blue-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0040a8" />
                </linearGradient>
              </defs>
            </svg>
            {/* Left S-ribbon */}
            <svg className="absolute top-[25%] left-[8%] w-48 h-48 md:w-64 md:h-64 opacity-80" viewBox="0 0 120 120" fill="none">
              <path d="M 10 30 C 40 10, 80 50, 110 30 C 80 70, 40 30, 10 70" stroke="url(#blue-grad-2)" strokeWidth="16" strokeLinecap="round" />
              <defs>
                <linearGradient id="blue-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
            </svg>
            {/* Right spiral coil ribbon */}
            <svg className="absolute top-[18%] right-[8%] w-60 h-80 opacity-75" viewBox="0 0 140 200" fill="none">
              <path d="M 20 20 C 120 10, 130 90, 40 100 C -20 110, 20 180, 120 170" stroke="url(#blue-grad-3)" strokeWidth="18" strokeLinecap="round" />
              <defs>
                <linearGradient id="blue-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#002b80" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center-bottom ring tube */}
            <svg className="absolute bottom-[10%] left-[25%] w-52 h-52 opacity-80" viewBox="0 0 120 120" fill="none">
              <path d="M 30 90 A 40 40 0 1 1 90 90" stroke="url(#blue-grad-4)" strokeWidth="18" strokeLinecap="round" />
              <defs>
                <linearGradient id="blue-grad-4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0a2540" />
                </linearGradient>
              </defs>
            </svg>
            {/* Bottom-right wavy tube */}
            <svg className="absolute bottom-[-5%] right-[-2%] w-80 h-48 opacity-80" viewBox="0 0 200 100" fill="none">
              <path d="M 10 80 C 60 20, 140 100, 190 40" stroke="url(#blue-grad-5)" strokeWidth="22" strokeLinecap="round" />
              <defs>
                <linearGradient id="blue-grad-5" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0036a8" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Outer frosted container frame */}
          <div className="z-10 relative max-w-5xl w-full bg-blue-600/10 backdrop-blur-2xl border border-blue-400/20 rounded-3xl p-6 md:p-12 shadow-2xl flex items-center justify-center min-h-[560px]">
            <div className="w-full max-w-md">{loginFormContent}</div>
          </div>
        </div>
      );

    case 'magic-link-dark':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0b0e14] text-white">
          {/* Ambient top spotlight ray */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none opacity-60" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99, 102, 241, 0.25), transparent)" }}></div>
          
          {/* Top-left back pill button */}
          <div className="absolute top-6 left-6 z-20">
            <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer">
              ← Back to Mess ERP
            </button>
          </div>

          <div className="z-10 relative w-full max-w-md">{loginFormContent}</div>

          {/* Floating bottom-right chat widget icon */}
          <div className="fixed bottom-6 right-6 z-20">
            <div className="w-10 h-10 bg-slate-800/90 border border-slate-700/80 rounded-xl flex items-center justify-center text-slate-300 shadow-xl hover:scale-105 transition-all cursor-pointer">
              💬
            </div>
          </div>
        </div>
      );

    case 'lime-cyber-orb':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#08090c] text-white">
          {/* Matrix Dot Grid Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "28px 28px" }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-lime-500/10 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="z-10 relative w-full max-w-md">
            {/* Glowing Lime Orb header */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-lime-300 via-emerald-600 to-black rounded-full shadow-[0_0_50px_rgba(190,242,100,0.5)] border border-lime-400/40 relative flex items-center justify-center animate-pulse">
                <div className="w-10 h-10 rounded-full border border-lime-200/50 bg-lime-400/20 blur-xs"></div>
              </div>
            </div>
            {loginFormContent}
          </div>
        </div>
      );

    case 'softqa-split':
      return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
          {/* Left Column - Clean White Login Form */}
          <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col justify-center items-center">
            <div className="w-full max-w-md">
              {loginFormContent}
            </div>
          </div>

          {/* Right Column - Deep Forest Teal Testimonial & Partner Wall */}
          <div className="hidden lg:flex w-1/2 p-12 lg:p-16 flex-col justify-between text-white relative overflow-hidden" style={{ background: "linear-gradient(145deg, #013833 0%, #00221e 100%)" }}>
            <div className="z-10">
              <h2 className="text-3xl xl:text-4xl font-bold tracking-tight mb-4 font-display">
                Revolutionize Operations with Smarter Automation
              </h2>
              <p className="text-teal-200/80 text-sm max-w-md">
                Enterprise cooperative management system built for high efficiency, complete audit isolation, and precision scaling.
              </p>
            </div>

            {/* Testimonial Quote Card */}
            <div className="z-10 my-8">
              <div className="text-4xl text-teal-400 font-serif leading-none mb-2">“</div>
              <p className="text-lg italic text-slate-100 font-light mb-6">
                "SoftQA & Mess ERP have completely transformed our operational testing process. It's reliable, efficient, and ensures our releases are always top-notch."
              </p>
              <div className="flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop" className="w-12 h-12 rounded-full object-cover border-2 border-teal-400/50" alt="Avatar" />
                <div>
                  <div className="font-bold text-white text-sm">Michael Carter</div>
                  <div className="text-xs text-teal-300">Software Engineer at DevCore</div>
                </div>
              </div>
            </div>

            {/* Partner Logos Wall */}
            <div className="z-10 pt-6 border-t border-teal-800/60">
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-4">JOIN 1K TEAMS</div>
              <div className="grid grid-cols-4 gap-4 items-center opacity-70 text-xs font-semibold text-slate-200">
                <div className="flex items-center gap-1.5"><span className="text-base">🎮</span> Discord</div>
                <div className="flex items-center gap-1.5"><span className="text-base">🐒</span> Mailchimp</div>
                <div className="flex items-center gap-1.5"><span className="text-base">G</span> Grammarly</div>
                <div className="flex items-center gap-1.5"><span className="text-base">⚡</span> Attentive</div>
                <div className="flex items-center gap-1.5"><span className="text-base">✍️</span> HelloSign</div>
                <div className="flex items-center gap-1.5"><span className="text-base">💬</span> Intercom</div>
                <div className="flex items-center gap-1.5"><span className="text-base">⬛</span> Square</div>
                <div className="flex items-center gap-1.5"><span className="text-base">📦</span> Dropbox</div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'ai-generative-dunes':
      return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#050a18] text-white">
          {/* Left Column - Art Showcase Frame */}
          <div className="hidden lg:flex w-1/2 p-6 flex-col justify-between relative">
            <div className="w-full h-full rounded-3xl overflow-hidden relative border border-blue-900/40 bg-slate-900 flex flex-col justify-end p-10 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1000&auto=format&fit=crop" 
                className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-luminosity" 
                alt="Night Dunes Visual" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050a18] via-[#050a18]/40 to-transparent"></div>
              
              <div className="z-10 relative">
                <div className="text-xs font-mono uppercase tracking-widest text-blue-400 mb-2">AI Generative</div>
                <h1 className="text-4xl font-bold text-white mb-2 font-display">Anything you can Imagine</h1>
                <p className="text-sm text-slate-300">Generate any type of artwork or intelligence with Openartistic</p>
              </div>
            </div>
          </div>

          {/* Right Column - Deep Royal Blue Login Box */}
          <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col justify-center items-center">
            <div className="w-full max-w-md">
              {loginFormContent}
            </div>
          </div>
        </div>
      );

    case 'glass-blue':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)" }}>
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[100px]"></div>
          </div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'dark-minimal':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ backgroundColor: "#000000" }}>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'neon-mobile':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg bg-pink-500/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'split-testimonial':
      return (
        <div className="min-h-screen w-full flex bg-slate-50">
          <div className="hidden lg:flex w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden text-white">
            <div className="absolute inset-0 bg-cyan-500/10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            <div className="z-10">
              <h1 className="text-4xl font-bold mb-4 font-display">{liveCustomization?.title || "Enterprise Portal"}</h1>
              <p className="text-cyan-400 text-xl max-w-md">{liveCustomization?.subtitle || "Access the cooperative ecosystem."}</p>
            </div>
            <div className="z-10">
              <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <p className="italic mb-4">"The absolute best management system we have ever used for our hostel operations."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-bold">SA</div>
                  <div>
                    <div className="font-bold">System Admin</div>
                    <div className="text-xs text-slate-300">Cooperative Board</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
            {loginFormContent}
          </div>
        </div>
      );
    case 'split-image':
      return (
        <div className="min-h-screen w-full flex bg-slate-950">
          <div className="hidden lg:block w-1/2 relative bg-slate-900">
            <img src={liveCustomization?.backgroundImageUrl || "https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop"} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity" alt="Background" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
            <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
              <h1 className="text-5xl font-bold mb-4">{liveCustomization?.title || "Enterprise"}</h1>
              <p className="text-xl text-slate-300">{liveCustomization?.subtitle || "Welcome back"}</p>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm lg:hidden z-0"></div>
            <div className="z-10 relative">{loginFormContent}</div>
          </div>
        </div>
      );
    case 'aurora':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-500/20 blur-[120px] animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: "2s" }}></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'cyberpunk':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950" style={{ backgroundImage: "radial-gradient(circle at center, #022c22 0%, #020617 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #10b981 2px, #10b981 4px)", backgroundSize: "100% 4px" }}></div>
          <div className="z-10 relative border-l-4 border-emerald-500 pl-4">{loginFormContent}</div>
        </div>
      );
    case 'crimson-velvet':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950" style={{ background: "linear-gradient(135deg, #2e020f 0%, #000000 100%)" }}>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'forest-glow':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950" style={{ background: "linear-gradient(to bottom, #064e3b 0%, #020617 100%)" }}>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'ocean-waves':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-sky-900/20" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath fill=%22%230284c7%22 fill-opacity=%220.05%22 d=%22M45.7,-76.4C58.9,-69.3,69.1,-56,76.5,-41.5C83.9,-27,88.5,-11.3,87,-4.3C85.5,2.7,77.9,10,72.4,18.7C66.9,27.4,63.5,37.5,56.7,45.4C49.9,53.3,39.7,59,28.8,63.3C17.9,67.6,6.3,70.5,-5.5,70.5C-17.3,70.5,-29.3,67.6,-38.7,60.8C-48.1,54,-54.9,43.3,-62.4,32.3C-69.9,21.3,-78.1,10.6,-80.4,-1.3C-82.7,-13.2,-79.1,-26.4,-71.5,-36.8C-63.9,-47.2,-52.3,-54.8,-39.9,-62.2C-27.5,-69.6,-13.8,-76.8,1.4,-78.5C16.6,-80.2,32.5,-83.5,45.7,-76.4Z%22 transform=%22translate(100 100)%22 /%3E%3C/svg%3E')", backgroundSize: "cover", backgroundPosition: "center" }}></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'monochrome-elegant':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-neutral-900">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
          <div className="z-10 relative grayscale">{loginFormContent}</div>
        </div>
      );
    case 'sunset-gradient':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-rose-600/10 to-purple-900/40"></div>
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'holographic':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="z-10 relative backdrop-blur-xl bg-white/5 p-2 rounded-3xl border border-white/10 shadow-2xl">{loginFormContent}</div>
        </div>
      );
    case 'abstract-shapes':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-500/30 rounded-lg rotate-12 blur-xl animate-pulse"></div>
          <div className="absolute bottom-10 right-20 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }}></div>
          <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-blue-500/20 rotate-45 blur-lg animate-pulse" style={{ animationDelay: "2s" }}></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'particles':
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle, #38bdf8 1px, transparent 1px)", backgroundSize: "30px 30px", backgroundPosition: "0 0, 15px 15px" }}></div>
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
    case 'default':
    default:
      return (
        <div className={`min-h-screen w-full transition-all flex items-center justify-center p-4 relative ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
          {/* Glow backgrounds for default theme */}
          <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-radial-gradient opacity-20 animate-pulse pointer-events-none"></div>
          <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-radial-gradient opacity-25 animate-pulse pointer-events-none"></div>
          
          <div className="z-10 relative">{loginFormContent}</div>
        </div>
      );
  }
}
