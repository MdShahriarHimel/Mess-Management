import React, { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { deduplicateMembersList } from "../utils/memberUtils.ts";

interface Member {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

interface CreditConfig {
  showCreditPanel: boolean;
  text: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  alignment: "left" | "center" | "right";
  color: string;
  font: string;
  background: string;
  emojis: string;
  link: string;
}

interface CreditAndPermissionsProps {
  currentUser: {
    id: string;
    email: string;
    nickname: string;
    role: string;
  };
  settings: {
    creditConfig?: CreditConfig;
    appearancePermissions?: Record<string, string[]>;
  };
  membersList: Member[];
  isDarkMode: boolean;
  handleUpdateSettings: (updates: any) => Promise<boolean>;
}

const APPEARANCE_FEATURES = [
  "Theme", "Accent Color", "Background Color", "Card Style", "Glass Effect", 
  "Glow Effect", "Gradient", "Rounded Corners", "Shadow", "Animations", 
  "Icons", "Typography", "Sidebar", "Dashboard", "Charts", "Widgets", 
  "Tables", "Buttons", "Branding", "Credit", "Logo", "Banner", "Welcome Message"
];

const CREDIT_PERMISSIONS = [
  "Can View Credit", "Can Edit Credit", "Can Change Text", "Can Change Font", 
  "Can Change Color", "Can Change Background", "Can Add Emoji", "Can Preview", 
  "Can Enable/Disable Credit Panel"
];

export const CreditAndPermissions: React.FC<CreditAndPermissionsProps> = ({
  currentUser,
  settings,
  membersList,
  isDarkMode,
  handleUpdateSettings
}) => {
  const isUltimateAdmin = currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com";
  
  // Local active states for Credit Panel
  const defaultCredit: CreditConfig = {
    showCreditPanel: false,
    text: "Crafted with 💖 by our mess community",
    isBold: false,
    isItalic: false,
    isUnderline: false,
    alignment: "center",
    color: "#22d3ee",
    font: "sans",
    background: "#0f172a",
    emojis: "💖,✨,🚀,🌟",
    link: ""
  };

  const creditConfig = settings.creditConfig || defaultCredit;
  const appearancePermissions = settings.appearancePermissions || {};

  const [localText, setLocalText] = useState(creditConfig.text);
  const [localIsBold, setLocalIsBold] = useState(creditConfig.isBold);
  const [localIsItalic, setLocalIsItalic] = useState(creditConfig.isItalic);
  const [localIsUnderline, setLocalIsUnderline] = useState(creditConfig.isUnderline);
  const [localAlignment, setLocalAlignment] = useState(creditConfig.alignment);
  const [localColor, setLocalColor] = useState(creditConfig.color || "#22d3ee");
  const [localFont, setLocalFont] = useState(creditConfig.font || "sans");
  const [localBackground, setLocalBackground] = useState(creditConfig.background || "#0f172a");
  const [localEmojis, setLocalEmojis] = useState(creditConfig.emojis || "");
  const [localLink, setLocalLink] = useState(creditConfig.link || "");
  const [localShow, setLocalShow] = useState(creditConfig.showCreditPanel);

  // Selected member for permission management
  const uniqueMembersList = useMemo(() => {
    return deduplicateMembersList(membersList || []);
  }, [membersList]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(uniqueMembersList[0]?.id || "");
  const selectedMember = uniqueMembersList.find(m => m.id === selectedMemberId);
  const selectedPermissions = selectedMemberId ? (appearancePermissions[selectedMemberId] || []) : [];

  const [savingCredit, setSavingCredit] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Determine user permissions for Credit Actions
  const userPermissions = appearancePermissions[currentUser.id] || [];
  const canEditCredit = isUltimateAdmin || userPermissions.includes("Can Edit Credit") || userPermissions.includes("Credit");
  const canChangeText = canEditCredit || userPermissions.includes("Can Change Text");
  const canChangeFont = canEditCredit || userPermissions.includes("Can Change Font");
  const canChangeColor = canEditCredit || userPermissions.includes("Can Change Color");
  const canChangeBackground = canEditCredit || userPermissions.includes("Can Change Background");
  const canAddEmoji = canEditCredit || userPermissions.includes("Can Add Emoji");
  const canEnableDisable = isUltimateAdmin || userPermissions.includes("Can Enable/Disable Credit Panel");

  // Save Credit changes
  const handleSaveCredit = async () => {
    setSavingCredit(true);
    try {
      const payload: Partial<CreditConfig> = {};
      if (canChangeText) payload.text = localText;
      if (canEditCredit) {
        payload.isBold = localIsBold;
        payload.isItalic = localIsItalic;
        payload.isUnderline = localIsUnderline;
        payload.alignment = localAlignment;
      }
      if (canChangeColor) payload.color = localColor;
      if (canChangeFont) payload.font = localFont;
      if (canChangeBackground) payload.background = localBackground;
      if (canAddEmoji) payload.emojis = localEmojis;
      if (canEditCredit) payload.link = localLink;
      if (canEnableDisable) payload.showCreditPanel = localShow;

      const success = await handleUpdateSettings({
        creditConfig: {
          ...creditConfig,
          ...payload
        }
      });

      if (success) {
        showStatus("success", "Credit and Branding content updated successfully!");
      } else {
        showStatus("error", "Failed to update Credit & Branding settings.");
      }
    } catch (e) {
      console.error(e);
      showStatus("error", "An error occurred while saving.");
    } finally {
      setSavingCredit(false);
    }
  };

  // Save Permissions changes
  const handleTogglePermission = async (perm: string, checked: boolean) => {
    if (!selectedMemberId) return;
    const updatedUserPermissions = checked
      ? [...selectedPermissions, perm]
      : selectedPermissions.filter(p => p !== perm);

    setSavingPermissions(true);
    try {
      const updatedPermissionsObj = {
        ...appearancePermissions,
        [selectedMemberId]: updatedUserPermissions
      };

      const success = await handleUpdateSettings({
        appearancePermissions: updatedPermissionsObj
      });

      if (success) {
        showStatus("success", `Updated permissions for ${selectedMember?.nickname || "member"}!`);
      } else {
        showStatus("error", "Failed to update permissions.");
      }
    } catch (e) {
      console.error(e);
      showStatus("error", "Failed to save permissions.");
    } finally {
      setSavingPermissions(false);
    }
  };

  // Insert emoji helper
  const handleInsertEmoji = (emoji: string) => {
    setLocalText(prev => prev + emoji);
  };

  const getFontClass = (font: string) => {
    switch (font) {
      case "mono": return "font-mono";
      case "serif": return "font-serif";
      case "display": return "font-display";
      default: return "font-sans";
    }
  };

  const getAlignClass = (align: string) => {
    switch (align) {
      case "left": return "text-left";
      case "right": return "text-right";
      default: return "text-center";
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 animate-bounce ${
          statusMsg.type === "success" 
            ? "bg-emerald-950/90 border-emerald-500 text-emerald-200" 
            : "bg-rose-950/90 border-rose-500 text-rose-200"
        }`}>
          <LucideIcons.AlertCircle size={16} />
          <span className="text-xs font-bold font-sans">{statusMsg.text}</span>
        </div>
      )}

      {/* Credit Preview & Rendering (If Show Credit Panel is ON or Preview is allowed) */}
      {(creditConfig.showCreditPanel || isUltimateAdmin || userPermissions.includes("Can Preview") || userPermissions.includes("Can View Credit")) && (
        <div 
          className="p-5 rounded-2xl border transition-all text-left relative overflow-hidden shadow-lg flex flex-col justify-between"
          style={{ 
            backgroundColor: isDarkMode ? (localBackground || "#0f172a") : "#f8fafc",
            borderColor: isDarkMode ? `${localColor || "#22d3ee"}1f` : "#e2e8f0"
          }}
        >
          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-40">
            <LucideIcons.Sparkles size={12} style={{ color: localColor }} />
            <span className="text-[8px] font-bold uppercase tracking-wider font-mono">Credit Panel</span>
          </div>

          <div className={`space-y-2 mt-2 ${getAlignClass(localAlignment)}`}>
            <p 
              className={`text-xs whitespace-pre-wrap ${getFontClass(localFont)} ${localIsBold ? "font-bold" : ""} ${localIsItalic ? "italic" : ""} ${localIsUnderline ? "underline" : ""}`}
              style={{ color: localColor }}
            >
              {localText}
            </p>

            {localLink && (
              <div className="mt-1">
                <a 
                  href={localLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] inline-flex items-center gap-1 hover:underline font-bold transition-all"
                  style={{ color: localColor }}
                >
                  <LucideIcons.Link size={10} />
                  More Info
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid: Editor on left, Ultimate Admin Permissions on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Credit Editor Card */}
        <div className={`p-5 rounded-2xl border text-left ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold font-display text-cyan-300 flex items-center gap-2">
                <LucideIcons.Edit3 size={16} className="text-cyan-400" />
                Credit & Branding Editor
              </h3>
              <p className="text-[10px] text-slate-500 leading-normal">
                Customize rich credits, align headers, select typography, and embed micro-links safely.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Show Credit Toggle (If allowed) */}
            {canEnableDisable && (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/25">
                <span className="text-[11px] font-bold text-slate-300">Show Credit Panel globally inside Control Panel</span>
                <button
                  type="button"
                  onClick={() => setLocalShow(!localShow)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    localShow ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      localShow ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Rich Text Editor */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Credit Content Text</label>
              <textarea
                rows={3}
                disabled={!canChangeText}
                value={localText}
                onChange={(e) => setLocalText(e.target.value)}
                placeholder="Crafted with love by the Bengal Bachelor developer crew..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
              />
            </div>

            {/* Emoji Quick Picker */}
            {canAddEmoji && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Insert Quick Emojis</label>
                <div className="flex flex-wrap gap-1.5">
                  {["💖", "✨", "🚀", "🌟", "💻", "🔥", "👑", "👍", "☕", "🎉"].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleInsertEmoji(emoji)}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Styling Toolbar */}
            {canEditCredit && (
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-3">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Styling Toolbar</label>
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Bold */}
                  <button
                    type="button"
                    onClick={() => setLocalIsBold(!localIsBold)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      localIsBold ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                    title="Bold"
                  >
                    <LucideIcons.Bold size={13} />
                  </button>

                  {/* Italic */}
                  <button
                    type="button"
                    onClick={() => setLocalIsItalic(!localIsItalic)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      localIsItalic ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                    title="Italic"
                  >
                    <LucideIcons.Italic size={13} />
                  </button>

                  {/* Underline */}
                  <button
                    type="button"
                    onClick={() => setLocalIsUnderline(!localIsUnderline)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      localIsUnderline ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                    title="Underline"
                  >
                    <LucideIcons.Underline size={13} />
                  </button>

                  <div className="h-5 w-px bg-slate-800 mx-1" />

                  {/* Alignment options */}
                  <button
                    type="button"
                    onClick={() => setLocalAlignment("left")}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      localAlignment === "left" ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <LucideIcons.AlignLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalAlignment("center")}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      localAlignment === "center" ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <LucideIcons.AlignCenter size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalAlignment("right")}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      localAlignment === "right" ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <LucideIcons.AlignRight size={13} />
                  </button>

                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  {/* Font Style Selection */}
                  {canChangeFont && (
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Typography Preset</label>
                      <select
                        value={localFont}
                        onChange={(e) => setLocalFont(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-white focus:outline-none"
                      >
                        <option value="sans">Modern Sans (Outfit)</option>
                        <option value="mono">Technical (JetBrains Mono)</option>
                        <option value="serif">Elegant (Georgia)</option>
                        <option value="display">Clean Geometric (Space Grotesk)</option>
                      </select>
                    </div>
                  )}

                  {/* Hyperlink */}
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1">External Link URL</label>
                    <input
                      type="text"
                      value={localLink}
                      onChange={(e) => setLocalLink(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Text Color Selection */}
                  {canChangeColor && (
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Text Color (Hex)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={localColor}
                          onChange={(e) => setLocalColor(e.target.value)}
                          className="w-6 h-6 rounded border border-slate-800 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={localColor}
                          onChange={(e) => setLocalColor(e.target.value)}
                          className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Background Color Selection */}
                  {canChangeBackground && (
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1">Background Color (Hex)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={localBackground}
                          onChange={(e) => setLocalBackground(e.target.value)}
                          className="w-6 h-6 rounded border border-slate-800 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={localBackground}
                          onChange={(e) => setLocalBackground(e.target.value)}
                          className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Credit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={savingCredit}
                onClick={handleSaveCredit}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingCredit ? <LucideIcons.RefreshCw size={12} className="animate-spin" /> : <LucideIcons.Save size={12} />}
                Save Credit Settings
              </button>
            </div>
          </div>
        </div>

        {/* Permissions Configuration Card (Ultimate Admin Exclusive) */}
        <div className={`p-5 rounded-2xl border text-left flex flex-col justify-between ${
          isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div>
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold font-display text-cyan-300 flex items-center gap-2">
                  <LucideIcons.ShieldAlert size={16} className="text-cyan-400" />
                  🛡️ Granular Appearance Permissions
                </h3>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Configure specific UI customizers, themes, branding attributes, and credit editing overrides per user.
                </p>
              </div>
            </div>

            {isUltimateAdmin ? (
              <div className="space-y-4">
                {/* Member selection dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Select Member to Customize</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="" disabled>-- Select a Member --</option>
                    {uniqueMembersList.map(m => (
                      <option key={m.id} value={m.id}>{m.nickname} ({m.role})</option>
                    ))}
                  </select>
                </div>

                {selectedMember ? (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    
                    {/* Appearance Features Grid */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-800/40 pb-1">Appearance Customization Features</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {APPEARANCE_FEATURES.map(feature => {
                          const isChecked = selectedPermissions.includes(feature);
                          return (
                            <label key={feature} className="flex items-center gap-2 p-1.5 bg-slate-950/60 rounded-lg cursor-pointer hover:bg-slate-900 border border-slate-950 hover:border-slate-800 transition-all text-[11px] text-slate-300">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleTogglePermission(feature, e.target.checked)}
                                className="accent-cyan-500 cursor-pointer"
                              />
                              <span>{feature}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Credit panel sub-permissions */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-800/40 pb-1">Credit Panel Granular Overrides</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {CREDIT_PERMISSIONS.map(feature => {
                          const isChecked = selectedPermissions.includes(feature);
                          return (
                            <label key={feature} className="flex items-center gap-2 p-1.5 bg-slate-950/60 rounded-lg cursor-pointer hover:bg-slate-900 border border-slate-950 hover:border-slate-800 transition-all text-[11px] text-slate-300">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleTogglePermission(feature, e.target.checked)}
                                className="accent-cyan-500 cursor-pointer"
                              />
                              <span>{feature}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Please select a user above to modify custom granular permissions.</p>
                )}

              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/40 text-center text-xs text-slate-500">
                <LucideIcons.Lock size={20} className="mx-auto mb-2 text-slate-600" />
                These permissions are configured exclusively by the <strong className="text-cyan-400">Ultimate Admin (mdshahriarhimel@gmail.com)</strong>.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
