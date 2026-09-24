import React, { useState } from 'react';
import { Palette, Check, MonitorPlay, Type, Box, Zap, MousePointerClick, RefreshCw } from 'lucide-react';

export const THEME_PRESETS = [
  { id: "default", name: "Default System", description: "Matches global ERP theme", previewColors: ["#0f172a", "#22d3ee"] },
  { id: "glass-3d-ribbons", name: "3D Blue Ribbons", description: "3D coils & frosted glass on blue", previewColors: ["#0252cd", "#0a2540"] },
  { id: "magic-link-dark", name: "Better Stack Dark", description: "Ambient spotlight with magic link & SSO", previewColors: ["#0b0e14", "#4f46e5"] },
  { id: "lime-cyber-orb", name: "Cyber Lime Orb", description: "Dark canvas with glowing neon orb", previewColors: ["#080a0c", "#a3e635"] },
  { id: "softqa-split", name: "Enterprise QA Split", description: "Testimonial & partner wall split", previewColors: ["#ffffff", "#013833"] },
  { id: "ai-generative-dunes", name: "AI Generative Dunes", description: "Night dunes hero visual split", previewColors: ["#0a1a4a", "#3b82f6"] },
  { id: "glass-blue", name: "Glass Morphism", description: "Frosted glass on deep blue", previewColors: ["#1e3a8a", "#93c5fd"] },
  { id: "dark-minimal", name: "Dark Minimalist", description: "Pure black and stark white", previewColors: ["#000000", "#ffffff"] },
  { id: "neon-mobile", name: "Neon Mobile", description: "Cyberpunk inspired mobile view", previewColors: ["#171015", "#f472b6"] },
  { id: "split-testimonial", name: "Enterprise Split", description: "Brand left, login right", previewColors: ["#f8fafc", "#334155"] },
  { id: "split-image", name: "Showcase Image", description: "Hero image with login panel", previewColors: ["#020617", "#c084fc"] },
  { id: "aurora", name: "Aurora Borealis", description: "Animated northern lights", previewColors: ["#064e3b", "#34d399"] },
  { id: "cyberpunk", name: "Cyber Matrix", description: "Hacker aesthetics", previewColors: ["#022c22", "#10b981"] },
  { id: "crimson-velvet", name: "Crimson Velvet", description: "Luxurious deep reds", previewColors: ["#4c0519", "#fda4af"] },
  { id: "forest-glow", name: "Forest Glow", description: "Natural greens and browns", previewColors: ["#14532d", "#86efac"] },
  { id: "ocean-waves", name: "Ocean Waves", description: "Deep sea animated fluid", previewColors: ["#082f49", "#7dd3fc"] },
  { id: "monochrome-eligible", name: "Monochrome Elegant", description: "High contrast silver", previewColors: ["#171717", "#d4d4d4"] },
  { id: "sunset-gradient", name: "Sunset Gradient", description: "Warm evening tones", previewColors: ["#7c2d12", "#fdba74"] },
  { id: "holographic", name: "Holographic", description: "Iridescent shifting colors", previewColors: ["#4a044e", "#d8b4fe"] },
  { id: "abstract-shapes", name: "Abstract Shapes", description: "Geometric floating elements", previewColors: ["#312e81", "#a5b4fc"] },
  { id: "particles", name: "Quantum Particles", description: "Interactive particle network", previewColors: ["#0f172a", "#38bdf8"] },
];

interface LoginEnginePanelProps {
  loginCustomization?: any;
  setLoginCustomization?: React.Dispatch<React.SetStateAction<any>>;
  isDarkMode?: boolean;
  handleUpdateSettings?: (updates: any) => Promise<boolean>;
  sessionToken?: string;
}

export function LoginEnginePanel({ 
  loginCustomization, 
  setLoginCustomization, 
  isDarkMode,
  handleUpdateSettings,
  sessionToken
}: LoginEnginePanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const custom = loginCustomization || {};

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (handleUpdateSettings) {
        const success = await handleUpdateSettings({ loginCustomization: custom });
        if (success) {
          alert("Login engine configuration saved successfully!");
        }
      } else {
        const token = sessionToken || localStorage.getItem("mess_token") || localStorage.getItem("sessionToken");
        if (!token) {
          alert("Session token not found. Please re-login.");
          setIsSaving(false);
          return;
        }
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ loginCustomization: custom })
        });
        if (res.ok) {
          alert("Login engine configuration saved successfully!");
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Failed to save login engine settings.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = (updates: any) => {
    if (setLoginCustomization) {
      setLoginCustomization((prev: any) => ({ ...prev, ...updates }));
    }
  };

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"}`}>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDarkMode ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
            <MonitorPlay size={20} />
          </div>
          <div>
            <h2 className={`text-lg font-bold font-display tracking-wide ${isDarkMode ? "text-white" : "text-slate-800"}`}>
              Login Engine
            </h2>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Customize the entry portal for all members
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
        >
          {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
          {isSaving ? "SAVING..." : "SAVE LOGIN SETTINGS"}
        </button>
      </div>


      <div className="space-y-8">
        {/* Core Themes */}
        <div>
          <h3 className={`text-sm font-bold mb-4 uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
            <Palette size={16} />
            Pre-built Themes (15+)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {THEME_PRESETS.map(theme => (
              <div 
                key={theme.id}
                onClick={() => handleUpdate({ loginTheme: theme.id })}
                className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                  custom.loginTheme === theme.id || (!custom.loginTheme && theme.id === "default")
                    ? "border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500/50" 
                    : isDarkMode
                      ? "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                {custom.loginTheme === theme.id && (
                  <div className="absolute top-2 right-2 text-cyan-500">
                    <Check size={16} />
                  </div>
                )}
                <div className="flex space-x-1 mb-3">
                  <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: theme.previewColors[0] }}></div>
                  <div className="w-6 h-6 rounded-full border shadow-sm -ml-2" style={{ backgroundColor: theme.previewColors[1] }}></div>
                </div>
                <div className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}>{theme.name}</div>
                <div className={`text-[10px] mt-1 line-clamp-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{theme.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Text Customization */}
        <div>
          <h3 className={`text-sm font-bold mb-4 uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
            <Type size={16} />
            Copywriting & Typography
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Title Font Size</label>
              <input
                type="text"
                placeholder="e.g. 3xl, 4xl, 40px"
                value={custom.titleFontSize || ""}
                onChange={(e) => handleUpdate({ titleFontSize: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Subtitle Font Size</label>
              <input
                type="text"
                placeholder="e.g. sm, lg, 16px"
                value={custom.subtitleFontSize || ""}
                onChange={(e) => handleUpdate({ subtitleFontSize: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Main Title</label>
              <input
                type="text"
                value={custom.title || ""}
                onChange={(e) => handleUpdate({ title: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Subtitle / Catchphrase</label>
              <input
                type="text"
                value={custom.subtitle || ""}
                onChange={(e) => handleUpdate({ subtitle: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Button Text (Login)</label>
              <input
                type="text"
                value={custom.buttonTextLogin || "ACCESS ENTERPRISE"}
                onChange={(e) => handleUpdate({ buttonTextLogin: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Font Style</label>
              <select
                value={custom.fontStyle || "sans"}
                onChange={(e) => handleUpdate({ fontStyle: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              >
                <option value="sans">System Sans</option>
                <option value="serif">Elegant Serif</option>
                <option value="mono">Technical Mono</option>
                <option value="display">Bold Display</option>
              </select>
            </div>
          </div>
        </div>

        {/* Colors & Visuals */}
        <div>
          <h3 className={`text-sm font-bold mb-4 uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
            <Box size={16} />
            Logo, Colors & Visual Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={custom.accentColor || "#22d3ee"}
                  onChange={(e) => handleUpdate({ accentColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer p-1 border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={custom.accentColor || "#22d3ee"}
                  onChange={(e) => handleUpdate({ accentColor: e.target.value })}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                  } focus:outline-none`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Card Background (CSS / Hex / RGBA)</label>
              <input
                type="text"
                placeholder="e.g. rgba(15, 23, 42, 0.8) or #0f172a"
                value={custom.cardBg || ""}
                onChange={(e) => handleUpdate({ cardBg: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Text Color</label>
              <input
                type="text"
                placeholder="e.g. #ffffff or #0f172a"
                value={custom.textColor || ""}
                onChange={(e) => handleUpdate({ textColor: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Logo Icon Type</label>
              <select
                value={custom.logoType || "keyround"}
                onChange={(e) => handleUpdate({ logoType: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              >
                <option value="keyround">Key / Lock (Default)</option>
                <option value="shield">Security Shield</option>
                <option value="sparkles">Sparkles AI</option>
                <option value="coffee">Coffee / Bachelor</option>
                <option value="users">Community / Users</option>
                <option value="trophy">Trophy / Leader</option>
                <option value="lock">Security Lock</option>
                <option value="image">Custom Image URL</option>
              </select>
            </div>

            {custom.logoType === "image" && (
              <div className="space-y-1.5 md:col-span-2">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Custom Logo Direct Image URL (.png, .jpg, .svg, .webp)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="https://i.imgur.com/...png or https://...jpg"
                    value={custom.customLogoUrl || ""}
                    onChange={(e) => handleUpdate({ customLogoUrl: e.target.value })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                  />
                  {custom.customLogoUrl && (
                    <div className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-900/50 flex items-center justify-center overflow-hidden shrink-0">
                      <img 
                        src={custom.customLogoUrl} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) parent.innerHTML = '<span class="text-[9px] text-red-400 text-center leading-none">Invalid URL</span>';
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 <strong>টিপস:</strong> ড্রিমসটাইম বা পিন্টারেস্টের ওয়েবসাইটের লিংক (Webpage URL) কাজ করবে না। ছবির উপর <em>Right Click &gt; Copy Image Address</em> করে সরাসরি ছবির লিংক দিন (যেমন Imgur, PostImages, Cloudinary ইত্যাদি ফ্রি হোস্টিং)।
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Logo Animation</label>
              <select
                value={custom.animationType || "pulse"}
                onChange={(e) => handleUpdate({ animationType: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              >
                <option value="pulse">Pulse Glow</option>
                <option value="bounce">Bounce</option>
                <option value="none">Static (None)</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Custom Background Image URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={custom.backgroundImageUrl || ""}
                onChange={(e) => handleUpdate({ backgroundImageUrl: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
              />
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-slate-800/20">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={custom.showBrandingIcon !== false}
                onChange={(e) => handleUpdate({ showBrandingIcon: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
              />
              <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                Show Header Logo/Icon
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={custom.showGoogleLogin !== false}
                onChange={(e) => handleUpdate({ showGoogleLogin: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
              />
              <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                Show Google Sign-In Button
              </span>
            </label>
          </div>
        </div>
        
      </div>
    </div>
  );
}
