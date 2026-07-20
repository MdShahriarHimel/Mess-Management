/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword,
  linkWithCredential
} from "firebase/auth";
import { auth } from "../lib/firebase.ts";
import { 
  Shield, Lock, KeyRound, Eye, EyeOff, Check, X, AlertTriangle, Loader2, CheckCircle2 
} from "lucide-react";
import { Member } from "../types.js";

interface SecuritySettingsProps {
  currentUser: Member;
  isDarkMode: boolean;
  sessionToken: string;
}

export default function SecuritySettings({ currentUser, isDarkMode, sessionToken }: SecuritySettingsProps) {
  // Account provider states
  const [isGoogleOnly, setIsGoogleOnly] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Email/Password user states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Determine auth provider on mount
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email || currentUser.email || "");
      const isGoogle = user.providerData.some(p => p.providerId === "google.com") && 
                       !user.providerData.some(p => p.providerId === "password");
      setIsGoogleOnly(isGoogle);
    }
  }, [currentUser]);

  // Password Validation Rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

  const validationRules = [
    { label: "At least 8 characters", met: hasMinLength },
    { label: "At least one uppercase letter (A-Z)", met: hasUppercase },
    { label: "At least one lowercase letter (a-z)", met: hasLowercase },
    { label: "At least one number (0-9)", met: hasNumber },
    { label: "At least one special character (@, $, #, etc.)", met: hasSpecialChar },
  ];

  const metCount = validationRules.filter(r => r.met).length;
  const isPasswordStrong = metCount === validationRules.length;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: "No Password Entered", color: "text-slate-500", barColor: "bg-slate-300" };
    if (metCount <= 2) return { label: "Weak", color: "text-red-500", barColor: "bg-red-500" };
    if (metCount <= 4) return { label: "Moderate", color: "text-amber-500", barColor: "bg-amber-500" };
    return { label: "Strong & Secure", color: "text-emerald-500", barColor: "bg-emerald-500" };
  };

  const strength = getStrengthLabel();

  // Create audit log on backend
  const triggerAuditLog = async () => {
    try {
      await fetch("/api/auth/change-password-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        }
      });
    } catch (e) {
      console.error("Failed to trigger audit log on backend:", e);
    }
  };

  // Submit password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const user = auth.currentUser;
    if (!user) {
      setError("No active authenticated session found. Please reload or sign in again.");
      return;
    }

    if (!isGoogleOnly && !currentPassword) {
      setError("Current Password is required.");
      return;
    }

    if (!isPasswordStrong) {
      setError("Please ensure all password strength requirements are met.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);

    try {
      if (isGoogleOnly) {
        // Link password credential (Set Password for Google account)
        const credential = EmailAuthProvider.credential(user.email!, newPassword);
        await linkWithCredential(user, credential);
        
        // Success
        await triggerAuditLog();
        setSuccess("Password has been set successfully! Your account is now linked with Email & Password credentials.");
        setIsGoogleOnly(false); // No longer Google-only, now has password
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        // Regular email/password change
        // 1. Re-authenticate
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        try {
          await reauthenticateWithCredential(user, credential);
        } catch (reauthErr: any) {
          console.error("Re-authentication failed:", reauthErr);
          if (reauthErr.code === "auth/wrong-password" || reauthErr.code === "auth/invalid-credential") {
            throw new Error("Current password is incorrect.");
          } else if (reauthErr.code === "auth/too-many-requests") {
            throw new Error("Too many failed attempts. Please try again later.");
          } else {
            throw new Error("Failed to re-authenticate: " + (reauthErr.message || "Invalid current credentials."));
          }
        }

        // 2. Update Password
        try {
          await updatePassword(user, newPassword);
        } catch (updateErr: any) {
          console.error("Password update failed:", updateErr);
          if (updateErr.code === "auth/weak-password") {
            throw new Error("The selected password is too weak according to Firebase security policies.");
          } else if (updateErr.code === "auth/requires-recent-login") {
            throw new Error("For security reasons, this operation requires a recent login. Please log out and log back in.");
          } else {
            throw new Error("Firebase password update failed: " + (updateErr.message || "Unknown error."));
          }
        }

        // 3. Trigger audit log and clear form
        await triggerAuditLog();
        setSuccess("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      console.error("Change Password Error:", err);
      // Ensure we display safe friendly messages and never raw Firebase crash exceptions
      setError(err.message || "An unexpected error occurred while updating your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="security-settings-card" className={`p-6 rounded-2xl border transition-all ${
      isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-cyan-500/5 pb-3">
        <Shield className="text-cyan-400" size={18} />
        <div>
          <h3 className="text-sm font-bold font-display text-cyan-300 uppercase tracking-wide">Security Settings</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Manage your credential credentials securely</p>
        </div>
      </div>

      {isGoogleOnly ? (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-400">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="shrink-0 mt-0.5" size={14} />
              <div>
                <p className="font-bold">Google Sign-In Active</p>
                <p className="opacity-90 mt-1 leading-relaxed">
                  This account uses Google Sign-In and does not have a local password configured.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-300 mb-4">Would you like to set a local password for offline/direct access?</p>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Error & Success Messages */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400 flex gap-2 items-center animate-fade-in">
                  <AlertTriangle className="shrink-0" size={14} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 flex gap-2 items-center animate-fade-in">
                  <CheckCircle2 className="shrink-0" size={14} />
                  <span>{success}</span>
                </div>
              )}

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">New Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Lock size={14} />
                    </span>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 chars"
                      disabled={loading}
                      className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950/40 border border-slate-800 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <KeyRound size={14} />
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      disabled={loading}
                      className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950/40 border border-slate-800 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Section */}
              {newPassword && (
                <div className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-850 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password Strength:</span>
                    <span className={`text-[10px] font-bold ${strength.color}`}>{strength.label}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${strength.barColor}`} 
                      style={{ width: `${(metCount / validationRules.length) * 100}%` }}
                    />
                  </div>

                  {/* Checklist */}
                  <div className="space-y-1">
                    {validationRules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                        {rule.met ? (
                          <Check className="text-emerald-500 shrink-0" size={10} />
                        ) : (
                          <X className="text-rose-500 shrink-0" size={10} />
                        )}
                        <span className={rule.met ? "text-slate-300 line-through opacity-70" : "text-slate-400"}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !isPasswordStrong || newPassword !== confirmPassword}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Linking Credentials...
                  </>
                ) : (
                  <>
                    <Shield size={13} />
                    Set Account Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400 flex gap-2 items-center animate-fade-in">
              <AlertTriangle className="shrink-0" size={14} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 flex gap-2 items-center animate-fade-in">
              <CheckCircle2 className="shrink-0" size={14} />
              <span>{success}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Current Password</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Lock size={14} />
              </span>
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password to re-authenticate"
                disabled={loading}
                required
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950/40 border border-slate-800 text-xs focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New Password & Confirm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">New Password</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Lock size={14} />
                </span>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 chars"
                  disabled={loading}
                  required
                  className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950/40 border border-slate-800 text-xs focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Confirm New Password</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <KeyRound size={14} />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  disabled={loading}
                  required
                  className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950/40 border border-slate-800 text-xs focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Strength Section */}
          {newPassword && (
            <div className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-850 space-y-3 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password Strength:</span>
                <span className={`text-[10px] font-bold ${strength.color}`}>{strength.label}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${strength.barColor}`} 
                  style={{ width: `${(metCount / validationRules.length) * 100}%` }}
                />
              </div>

              {/* Checklist */}
              <div className="space-y-1">
                {validationRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                    {rule.met ? (
                      <Check className="text-emerald-500 shrink-0" size={10} />
                    ) : (
                      <X className="text-rose-500 shrink-0" size={10} />
                    )}
                    <span className={rule.met ? "text-slate-300 line-through opacity-70" : "text-slate-400"}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match validation display if confirmed is filled */}
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[10px] text-rose-500 font-bold">Passwords do not match.</p>
          )}

          {confirmPassword && newPassword === confirmPassword && (
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <Check size={10} /> Passwords match perfectly.
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !isPasswordStrong || newPassword !== confirmPassword || !currentPassword}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Updating Security Credentials...
              </>
            ) : (
              <>
                <Shield size={13} />
                Change Password
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
