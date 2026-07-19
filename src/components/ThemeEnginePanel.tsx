import React, { useState, useEffect } from "react";
import { 
  Palette, 
  Trash2, 
  Plus, 
  Copy, 
  Edit3, 
  RotateCcw, 
  AlertCircle, 
  Save, 
  Download, 
  Upload, 
  Check, 
  Sparkles, 
  Sliders, 
  Type, 
  Sun, 
  Moon, 
  FileJson,
  Eye,
  Settings,
  HelpCircle
} from "lucide-react";
import { THEME_TEMPLATES, ThemeTemplate } from "../themeTemplates";

interface ThemeEnginePanelProps {
  messAnimations: {
    enableEffect: boolean;
    effectType: string;
    animationSpeed: string;
    accentGlow: boolean;
    backgroundTheme: string;
    customBackgroundUrl?: string;
    backgroundOpacity?: number;
    themeTemplate: string;
    glowingLabels?: boolean;
    glowingButtons?: boolean;
    glowingIcons?: boolean;
    glowingCards?: boolean;
    neonBorders?: boolean;
    rgbHover?: boolean;
    animatedShadows?: boolean;
    glassCards?: boolean;
  };
  setMessAnimations: React.Dispatch<React.SetStateAction<any>>;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  siteColor: string;
  setSiteColor: (val: string) => void;
  fontStyle: string;
  setFontStyle: (val: string) => void;
  customColors: any;
  setCustomColors: (colors: any) => void;
  previewTemplateId: string | null;
  setPreviewTemplateId: (id: string | null) => void;
  handleUpdateSettings: (updates: any) => Promise<boolean>;
  typographySettings: any;
  setTypographySettings: React.Dispatch<React.SetStateAction<any>>;
}

export const ThemeEnginePanel: React.FC<ThemeEnginePanelProps> = ({
  messAnimations,
  setMessAnimations,
  isDarkMode,
  setIsDarkMode,
  siteColor,
  setSiteColor,
  fontStyle,
  setFontStyle,
  customColors,
  setCustomColors,
  previewTemplateId,
  setPreviewTemplateId,
  handleUpdateSettings,
  typographySettings,
  setTypographySettings
}) => {
  // Theme state
  const [customThemes, setCustomThemes] = useState<ThemeTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<"library" | "customizer" | "presets" | "backgrounds">("library");
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [themeNameInput, setThemeNameInput] = useState("");
  const [themeDescInput, setThemeDescInput] = useState("");
  const [jsonImportText, setJsonImportText] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load custom themes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("erp_custom_themes");
      if (stored) {
        setCustomThemes(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load custom themes from localStorage", e);
    }
  }, []);

  const saveCustomThemesToStorage = (themes: ThemeTemplate[]) => {
    try {
      localStorage.setItem("erp_custom_themes", JSON.stringify(themes));
      setCustomThemes(themes);
    } catch (e) {
      console.error("Failed to save custom themes", e);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Combine pre-defined themes with user-created themes
  const allThemes = [...THEME_TEMPLATES, ...customThemes];
  const currentThemeId = previewTemplateId || messAnimations?.themeTemplate || "default-erp";
  const currentTheme = allThemes.find(t => t.id === currentThemeId) || THEME_TEMPLATES[0];

  // Apply a theme as live preview
  const handlePreviewTheme = (themeId: string) => {
    setPreviewTemplateId(themeId);
    const targetTheme = allThemes.find(t => t.id === themeId);
    if (targetTheme) {
      // Temporarily inject values into variables/state
      setSiteColor(targetTheme.siteColor);
      setFontStyle(targetTheme.fontStyle);
      setCustomColors(targetTheme.customColors);
      setMessAnimations((prev: any) => ({
        ...prev,
        backgroundTheme: targetTheme.backgroundTheme,
        themeTemplate: targetTheme.id
      }));
    }
  };

  // Commit preview as the global saved theme
  const handleApplyGlobally = async () => {
    const targetId = previewTemplateId || currentThemeId;
    const targetTheme = allThemes.find(t => t.id === targetId);
    if (targetTheme) {
      try {
        const payload = {
          siteColor: targetTheme.siteColor,
          fontStyle: targetTheme.fontStyle,
          customColors: targetTheme.customColors,
          messAnimations: {
            ...messAnimations,
            backgroundTheme: targetTheme.backgroundTheme,
            themeTemplate: targetTheme.id
          }
        };
        
        setIsDarkMode(targetTheme.isDarkMode);
        setCustomColors(targetTheme.customColors);
        setMessAnimations((prev: any) => ({
          ...prev,
          backgroundTheme: targetTheme.backgroundTheme,
          themeTemplate: targetTheme.id
        }));

        await handleUpdateSettings(payload);
        setPreviewTemplateId(null);
        showStatus("success", `Successfully applied "${targetTheme.name}" globally!`);
      } catch (e) {
        showStatus("error", "Failed to apply theme globally.");
      }
    }
  };

  const handleCancelPreview = () => {
    setPreviewTemplateId(null);
    // Reload whatever is currently configured in backend settings
    window.location.reload(); // Quick reset of all state variables
  };

  // Save current dynamic customization as a new custom theme
  const handleSaveAsNewTheme = () => {
    if (!themeNameInput.trim()) {
      showStatus("error", "Please provide a valid name for the custom theme.");
      return;
    }

    const newId = `custom-theme-${Date.now()}`;
    const newTheme: ThemeTemplate = {
      id: newId,
      name: themeNameInput.trim(),
      desc: themeDescInput.trim() || "User created custom ERP theme",
      siteColor: siteColor,
      fontStyle: fontStyle,
      isDarkMode: isDarkMode,
      backgroundTheme: messAnimations.backgroundTheme || "default",
      customColors: { ...customColors },
      customStyles: `
        .theme-${newId} .glass-panel,
        .theme-${newId} .rounded-2xl {
          background-color: ${customColors.cardBg} !important;
          border: 1px solid ${customColors.accentColor}30 !important;
        }
      `
    };

    const updated = [...customThemes, newTheme];
    saveCustomThemesToStorage(updated);
    setThemeNameInput("");
    setThemeDescInput("");
    setPreviewTemplateId(newId);
    showStatus("success", `Created custom theme "${newTheme.name}" successfully!`);
  };

  // Duplicate an existing theme
  const handleDuplicateTheme = (themeToDup: ThemeTemplate) => {
    const newId = `custom-theme-${Date.now()}`;
    const duplicated: ThemeTemplate = {
      ...themeToDup,
      id: newId,
      name: `${themeToDup.name} (Copy)`,
      desc: `Duplicate of ${themeToDup.name}`
    };

    const updated = [...customThemes, duplicated];
    saveCustomThemesToStorage(updated);
    showStatus("success", `Duplicated theme into "${duplicated.name}"`);
  };

  // Delete a custom theme
  const handleDeleteCustomTheme = (themeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this custom theme permanently?")) {
      const updated = customThemes.filter(t => t.id !== themeId);
      saveCustomThemesToStorage(updated);
      if (previewTemplateId === themeId) {
        setPreviewTemplateId(null);
      }
      showStatus("success", "Custom theme removed successfully.");
    }
  };

  // Export theme template as JSON
  const handleExportTheme = (themeToExport: ThemeTemplate) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(themeToExport, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${themeToExport.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showStatus("success", "Theme exported successfully.");
    } catch (e) {
      showStatus("error", "Failed to export theme.");
    }
  };

  // Import theme template from JSON
  const handleImportTheme = () => {
    try {
      const parsed = JSON.parse(jsonImportText);
      if (!parsed.id || !parsed.name || !parsed.customColors) {
        showStatus("error", "Invalid theme format. Missing required theme fields.");
        return;
      }
      // Ensure unique ID
      parsed.id = `imported-${Date.now()}`;
      parsed.name = `${parsed.name} (Imported)`;
      const updated = [...customThemes, parsed];
      saveCustomThemesToStorage(updated);
      setJsonImportText("");
      setPreviewTemplateId(parsed.id);
      showStatus("success", `Imported theme "${parsed.name}" successfully!`);
    } catch (e) {
      showStatus("error", "Invalid JSON format. Please verify your file contents.");
    }
  };

  // Quick preset modifiers for GLOW
  const toggleGlowPreset = async (key: string, value: boolean) => {
    const updatedAnimations = {
      ...messAnimations,
      [key]: value
    };
    setMessAnimations(updatedAnimations);
    await handleUpdateSettings({ messAnimations: updatedAnimations });
    showStatus("success", `Glow setting "${key}" updated!`);
  };

  // Background animation presets
  const backgroundEffects = [
    { id: "none", name: "No Background Animation", desc: "Solid clean styling" },
    { id: "stars", name: "Stars & Trail Sparks", desc: "Twinkling star field with mouse trail particles" },
    { id: "snow", name: "Cozy Snowfall", desc: "Gentle falling winter snow crystal flakes" },
    { id: "rain", name: "Cyberpunk Rain", desc: "Matrix vertical digital raindrops and storms" },
    { id: "galaxy", name: "Cosmic Nebula", desc: "Rotating star field, solar dust and gas nebulae" },
    { id: "water-waves", name: "Teal Wave Ripple", desc: "Undulating ocean waves linear gradients" },
    { id: "smoke", name: "Ethereal Smoke", desc: "Drifting expanding hot air thermal particles" },
    { id: "clouds", name: "Soft Clouds", desc: "Puffy drifting background cumulus cloud systems" },
    { id: "hexagon", name: "Neon Hexagon Grid", desc: "Glowing geometric cyber hexagon network grid" },
    { id: "geometric", name: "Geometric Float", desc: "Floating spinning wireframe shapes" },
    { id: "circuit", name: "Circuit Board Node", desc: "Branching tech vector lines and spark signals" },
    { id: "light-rays", name: "God Ray Sunshine", desc: "Rotating ambient linear volumetric spotlights" },
    { id: "moving-gradients", name: "Liquid Gradients", desc: "Fluid moving abstract gradient color balls" },
    { id: "mesh-gradients", name: "Premium Mesh Blob", desc: "Stunning ambient blurred dynamic color blobs" },
    { id: "floating-polygons", name: "Constellation Graph", desc: "Floating interactive node points with linked lines" },
    { id: "matrix", name: "Matrix Cyan Digital", desc: "Retro green binary falling digital code" },
    { id: "matrix-red", name: "Matrix Inferno Code", desc: "Crimson falling digital hacker console text" },
    { id: "fireflies", name: "Summer Fireflies", desc: "Glowing biological fireflies drifting" },
    { id: "fire", name: "Volcanic Embers", desc: "Rising hot glowing ash particles" },
    { id: "pulse", name: "Interactive Ripple", desc: "Expanding circular mouse pulse rings" },
    { id: "particles", name: "Interactive Dust", desc: "Floating dust particles repelling mouse cursors" }
  ];

  const handleSelectBackgroundEffect = async (effectId: string) => {
    const updatedAnimations = {
      ...messAnimations,
      enableEffect: effectId !== "none",
      effectType: effectId
    };
    setMessAnimations(updatedAnimations);
    await handleUpdateSettings({ messAnimations: updatedAnimations });
    showStatus("success", `Active background effect set to "${effectId}"!`);
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
      {/* Dynamic Status Message Alert */}
      {statusMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2 animate-bounce ${
          statusMsg.type === "success" 
            ? "bg-emerald-950/90 border-emerald-500 text-emerald-200" 
            : "bg-rose-950/90 border-rose-500 text-rose-200"
        }`}>
          <AlertCircle size={16} />
          <span className="text-xs font-bold font-sans">{statusMsg.text}</span>
        </div>
      )}

      {/* Live Preview Persistent Banner */}
      {previewTemplateId && (
        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <Eye className="text-cyan-400 shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Active Live Preview Mode</p>
              <p className="text-[11px] text-slate-300">
                You are previewing <strong>{allThemes.find(t => t.id === previewTemplateId)?.name}</strong>. Feel free to browse pages.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleCancelPreview}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold uppercase transition-all border border-slate-700 cursor-pointer"
            >
              Cancel Preview
            </button>
            <button
              onClick={handleApplyGlobally}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              Apply Globally
            </button>
          </div>
        </div>
      )}

      {/* Navigation sub-tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800/40 pb-2">
        <button
          onClick={() => setActiveTab("library")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "library"
              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Palette size={14} />
          Theme Library ({allThemes.length})
        </button>
        <button
          onClick={() => setActiveTab("backgrounds")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "backgrounds"
              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles size={14} />
          Background Overlay Effects
        </button>
        <button
          onClick={() => setActiveTab("customizer")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "customizer"
              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders size={14} />
          Dynamic Theme Customizer
        </button>
        <button
          onClick={() => setActiveTab("presets")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "presets"
              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings size={14} />
          Presets & Export
        </button>
      </div>

      {/* Tab CONTENT: Themes library */}
      {activeTab === "library" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Available UI Themes</h4>
              <p className="text-[10px] text-slate-500">Every template fully restructures layouts, border curves, and fonts instantly.</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="px-2.5 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl hover:bg-slate-700/80 text-xs text-slate-300 flex items-center gap-1 transition-all cursor-pointer"
              >
                {isDarkMode ? <Sun size={12} className="text-yellow-400" /> : <Moon size={12} className="text-blue-400" />}
                Toggle {isDarkMode ? "Light" : "Dark"} Preset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {allThemes.map((t) => {
              const isSaved = (messAnimations?.themeTemplate || "default-erp") === t.id;
              const isCurrentlyPreviewed = previewTemplateId === t.id;
              const isSelected = previewTemplateId ? isCurrentlyPreviewed : isSaved;

              return (
                <div
                  key={t.id}
                  onClick={() => handlePreviewTheme(t.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between text-left relative overflow-hidden group hover:-translate-y-0.5 ${
                    isSelected
                      ? "border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-950/10"
                      : isDarkMode 
                      ? "border-slate-800/80 hover:border-slate-700 bg-slate-950/40" 
                      : "border-slate-200 hover:border-slate-300 bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors truncate max-w-[120px] dark:text-slate-200 text-slate-800">
                        {t.name}
                      </h4>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0 ${
                        t.isDarkMode 
                          ? "bg-slate-900 border border-slate-800 text-slate-400" 
                          : "bg-white border border-slate-200 text-slate-600"
                      }`}>
                        {t.isDarkMode ? "Dark" : "Light"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 mb-3 group-hover:text-slate-400 transition-colors">
                      {t.desc}
                    </p>
                  </div>

                  {/* Palette Indicators & Admin Actions */}
                  <div className="flex items-center justify-between border-t border-slate-800/20 dark:border-slate-800/40 pt-2 mt-auto">
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: t.customColors.siteAccentColorRgb }} title="Accent" />
                      <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: t.customColors.sidebarBg }} title="Sidebar" />
                      <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: t.customColors.cardBg }} title="Cards" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Copy / Duplicate button */}
                      <button
                        title="Duplicate Template"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateTheme(t);
                        }}
                        className="p-1 hover:bg-slate-800/80 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Copy size={11} />
                      </button>

                      {/* Delete Custom Theme */}
                      {customThemes.some(ct => ct.id === t.id) && (
                        <button
                          title="Delete Custom Theme"
                          onClick={(e) => handleDeleteCustomTheme(t.id, e)}
                          className="p-1 hover:bg-rose-950/40 rounded text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}

                      {/* Active Badges */}
                      {isSaved && !previewTemplateId && (
                        <span className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 animate-pulse">
                          Active
                        </span>
                      )}
                      {isCurrentlyPreviewed && (
                        <span className="text-[8px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md font-bold">
                          Previewing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab CONTENT: Backgrounds selection */}
      {activeTab === "backgrounds" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Atmospheric Background Overlay Library</h4>
            <p className="text-[10px] text-slate-500">Pick independent interactive ambient canvas rendering effects below. Blends gracefully with UI themes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {backgroundEffects.map((bg) => {
              const isActive = (messAnimations.effectType === bg.id) && messAnimations.enableEffect;
              const isNone = bg.id === "none" && !messAnimations.enableEffect;
              const isSelected = isActive || isNone;

              return (
                <div
                  key={bg.id}
                  onClick={() => handleSelectBackgroundEffect(bg.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between text-left ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/10 ring-2 ring-cyan-500/15"
                      : isDarkMode 
                      ? "border-slate-800/80 hover:border-slate-700 bg-slate-950/40"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-bold text-slate-200 dark:text-slate-200 text-slate-800">{bg.name}</h4>
                      {isSelected && (
                        <Check size={12} className="text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      {bg.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab CONTENT: Theme Customizer */}
      {activeTab === "customizer" && (
        <div className="space-y-6">
          {/* Typography Sizes */}
          <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-950/20 space-y-4">
            <h5 className="text-xs font-bold font-display text-cyan-300 flex items-center gap-1.5">
              <Type size={14} className="text-cyan-400" />
              Dynamic Typography Scale
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Global Base Size ({typographySettings?.globalFontSize || 14}px)</label>
                <input
                  type="range"
                  min="11"
                  max="18"
                  value={typographySettings?.globalFontSize || 14}
                  onChange={(e) => setTypographySettings((prev: any) => ({ ...prev, globalFontSize: Number(e.target.value) }))}
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Heading Size ({typographySettings?.headingSize || 22}px)</label>
                <input
                  type="range"
                  min="16"
                  max="32"
                  value={typographySettings?.headingSize || 22}
                  onChange={(e) => setTypographySettings((prev: any) => ({ ...prev, headingSize: Number(e.target.value) }))}
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Card Title Size ({typographySettings?.cardTitleSize || 15}px)</label>
                <input
                  type="range"
                  min="12"
                  max="22"
                  value={typographySettings?.cardTitleSize || 15}
                  onChange={(e) => setTypographySettings((prev: any) => ({ ...prev, cardTitleSize: Number(e.target.value) }))}
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Table Font Size ({typographySettings?.tableFontSize || 12}px)</label>
                <input
                  type="range"
                  min="9"
                  max="16"
                  value={typographySettings?.tableFontSize || 12}
                  onChange={(e) => setTypographySettings((prev: any) => ({ ...prev, tableFontSize: Number(e.target.value) }))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Core Colors customizer */}
          <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-950/20 space-y-4">
            <h5 className="text-xs font-bold font-display text-cyan-300 flex items-center gap-1.5">
              <Palette size={14} className="text-cyan-400" />
              Dynamic Color Pickers (Real-time updates)
            </h5>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase tracking-widest">Accent Glow Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={customColors?.accentColor || "#22d3ee"}
                    onChange={(e) => setCustomColors((prev: any) => ({ ...prev, accentColor: e.target.value }))}
                    className="w-8 h-8 rounded border border-slate-800 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono">{customColors?.accentColor || "#22d3ee"}</span>
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase tracking-widest">Sidebar Base</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={customColors?.sidebarBg || "#0f172a"}
                    onChange={(e) => setCustomColors((prev: any) => ({ ...prev, sidebarBg: e.target.value }))}
                    className="w-8 h-8 rounded border border-slate-800 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono">{customColors?.sidebarBg || "#0f172a"}</span>
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase tracking-widest">Container & Card Base</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={customColors?.cardBg || "#1e293b"}
                    onChange={(e) => setCustomColors((prev: any) => ({ ...prev, cardBg: e.target.value }))}
                    className="w-8 h-8 rounded border border-slate-800 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono">{customColors?.cardBg || "#1e293b"}</span>
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase tracking-widest">Header Bar Base</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={customColors?.headerBg || "#0f172a"}
                    onChange={(e) => setCustomColors((prev: any) => ({ ...prev, headerBg: e.target.value }))}
                    className="w-8 h-8 rounded border border-slate-800 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono">{customColors?.headerBg || "#0f172a"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Glow & Preset Effects */}
          <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-950/20 space-y-4">
            <h5 className="text-xs font-bold font-display text-cyan-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-cyan-400" />
              Special Premium Visual Effects
            </h5>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-xl cursor-pointer border border-slate-800/40 hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={!!messAnimations?.glowingLabels}
                  onChange={(e) => toggleGlowPreset("glowingLabels", e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-slate-300">Glowing Labels</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-xl cursor-pointer border border-slate-800/40 hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={!!messAnimations?.glowingButtons}
                  onChange={(e) => toggleGlowPreset("glowingButtons", e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-slate-300">Glowing Buttons</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-xl cursor-pointer border border-slate-800/40 hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={!!messAnimations?.glowingIcons}
                  onChange={(e) => toggleGlowPreset("glowingIcons", e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-slate-300">Glowing Icons</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-xl cursor-pointer border border-slate-800/40 hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={!!messAnimations?.glowingCards}
                  onChange={(e) => toggleGlowPreset("glowingCards", e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-slate-300">Glowing Cards</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-xl cursor-pointer border border-slate-800/40 hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={!!messAnimations?.neonBorders}
                  onChange={(e) => toggleGlowPreset("neonBorders", e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-slate-300">Neon Borders</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-xl cursor-pointer border border-slate-800/40 hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={!!messAnimations?.rgbHover}
                  onChange={(e) => toggleGlowPreset("rgbHover", e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-slate-300">RGB Hover Effects</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-xl cursor-pointer border border-slate-800/40 hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={!!messAnimations?.animatedShadows}
                  onChange={(e) => toggleGlowPreset("animatedShadows", e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-slate-300">Animated Shadows</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-xl cursor-pointer border border-slate-800/40 hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={!!messAnimations?.glassCards}
                  onChange={(e) => toggleGlowPreset("glassCards", e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-slate-300">Holo Glass Cards</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab CONTENT: Presets, Import, Export, Saves */}
      {activeTab === "presets" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section: Save Custom Theme as Template */}
          <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-950/20 space-y-4 text-left">
            <h5 className="text-xs font-bold font-display text-cyan-300 flex items-center gap-1.5">
              <Save size={14} className="text-cyan-400" />
              Save As New Theme Preset
            </h5>
            <p className="text-[10px] text-slate-500 leading-normal">
              Freeze all current custom font weights, custom sizes, color configurations, and background presets into a standalone theme template.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Theme Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sapphire Dream"
                  value={themeNameInput}
                  onChange={(e) => setThemeNameInput(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-800 bg-slate-950/60 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/10 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Brief Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Velvet dark luxury sapphire blue paired with light stars animation..."
                  value={themeDescInput}
                  onChange={(e) => setThemeDescInput(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-800 bg-slate-950/60 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/10 outline-none resize-none"
                />
              </div>

              <button
                onClick={handleSaveAsNewTheme}
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-extrabold text-[10px] text-white rounded-xl uppercase tracking-wider transition-all shadow cursor-pointer"
              >
                Create Custom Theme Template
              </button>
            </div>
          </div>

          {/* Section: Import & Export */}
          <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-950/20 space-y-4 text-left flex flex-col justify-between">
            <div>
              <h5 className="text-xs font-bold font-display text-cyan-300 flex items-center gap-1.5">
                <FileJson size={14} className="text-cyan-400" />
                Theme Portability (JSON Import/Export)
              </h5>
              <p className="text-[10px] text-slate-500 leading-normal mb-3">
                Download your dynamic theme profile as a portable JSON file to share, or paste a theme configuration below to import.
              </p>

              {/* Action buttons for active theme export */}
              <div className="mb-4">
                <button
                  onClick={() => handleExportTheme(currentTheme)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold uppercase border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={11} />
                  Export "{currentTheme.name}" (.json)
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Paste JSON Theme String</label>
                <textarea
                  rows={3}
                  placeholder='{"id":"custom-xxx","name":"Premium Gold"...}'
                  value={jsonImportText}
                  onChange={(e) => setJsonImportText(e.target.value)}
                  className="w-full text-[10px] font-mono p-2 rounded-xl border border-slate-800 bg-slate-950/60 text-emerald-400 focus:border-cyan-500 focus:ring-0 outline-none resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleImportTheme}
              className="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 font-extrabold text-[10px] text-white rounded-xl uppercase tracking-wider transition-all shadow mt-3 cursor-pointer"
            >
              Parse & Import Custom Theme
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
