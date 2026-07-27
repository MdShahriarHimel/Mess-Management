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
  HelpCircle,
  Lock
} from "lucide-react";
import { THEME_TEMPLATES, ThemeTemplate } from "../themeTemplates";
import RgbColorPicker from "./RgbColorPicker";

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

  // State for 16-million RGB customization field
  const [selectedColorField, setSelectedColorField] = useState<string>("accentColor");
  const [previewMode, setPreviewMode] = useState<"dashboard" | "login">("dashboard");

  const colorFields = [
    { id: "accentColor", label: "Accent Glow Color (Main)", type: "customColor", description: "Primary action buttons, active tab indicators, focus rings, highlights and key controls." },
    { id: "sidebarBg", label: "Sidebar Background Color", type: "customColor", description: "Background of the entire left navigation sidebar panel." },
    { id: "sidebarTextColor", label: "Sidebar & Menu Text Color", type: "typography", description: "Typography font color for text and icons inside the navigation panel." },
    { id: "cardBg", label: "Container & Card Background", type: "customColor", description: "Background of standard modules, summary grids, detailed tables and popup forms." },
    { id: "headerBg", label: "Header & Navbar Background", type: "customColor", description: "The top navbar/header containing user profile and theme switchers." },
    { id: "primaryFontColor", label: "Global Primary Font Color", type: "typography", description: "Main text color for lists, transaction logs, statistics and primary tables." },
    { id: "secondaryFontColor", label: "Global Secondary Font Color", type: "typography", description: "Subheadings, footnotes, tooltips and description captions." },
    { id: "headingColor", label: "Global Heading Color", type: "typography", description: "All prominent page titles, main category labels and dashboard section headers." },
    { id: "inputBg", label: "Input Box Background", type: "customColor", description: "Background fill inside text, number, and search fields." },
    { id: "inputBorderColor", label: "Input Box Border Color", type: "customColor", description: "The border outline for input boxes, highlighting field boundaries." },
    { id: "inputTextColor", label: "Input Box Text Color", type: "customColor", description: "The font color of typed-in values and placeholders inside input fields." },
    { id: "cashDepositBg", label: "Cash Deposit Card Background", type: "customColor", description: "Background highlight tint for the active cash deposits panel." },
    { id: "cashDepositBorder", label: "Cash Deposit Card Border", type: "customColor", description: "Primary border framing cash deposit forms and items." },
    { id: "settlementBg", label: "Settlement Sheet Background", type: "customColor", description: "Background tint of active calculations and settlement details." },
    { id: "settlementBorder", label: "Settlement Sheet Border", type: "customColor", description: "Outline border framing settlement statuses and action sheets." },
  ];

  const getSelectedColorValue = () => {
    const field = colorFields.find(f => f.id === selectedColorField);
    if (!field) return "#22d3ee";
    if (field.type === "customColor") {
      const val = customColors?.[field.id];
      if (val) return val;
      // Fallbacks
      if (selectedColorField === "accentColor") return "#22d3ee";
      if (selectedColorField === "sidebarBg") return isDarkMode ? "#0f172a" : "#ecfeff";
      if (selectedColorField === "cardBg") return isDarkMode ? "#1e293b" : "#ffffff";
      if (selectedColorField === "headerBg") return isDarkMode ? "#0f172a" : "#ffffff";
      if (selectedColorField === "inputBg") return isDarkMode ? "#0f172a" : "#ecfeff";
      if (selectedColorField === "inputBorderColor") return isDarkMode ? "#334155" : "#cffafe";
      if (selectedColorField === "inputTextColor") return isDarkMode ? "#cbd5e1" : "#083344";
      if (selectedColorField === "cashDepositBg") return "#f973161a";
      if (selectedColorField === "cashDepositBorder") return "#f97316";
      if (selectedColorField === "settlementBg") return "#22c55e1a";
      if (selectedColorField === "settlementBorder") return "#22c55e";
      return "#22d3ee";
    } else {
      const val = typographySettings?.[field.id];
      if (val) return val;
      // Fallbacks
      if (selectedColorField === "primaryFontColor") return isDarkMode ? "#f8fafc" : "#0f172a";
      if (selectedColorField === "secondaryFontColor") return isDarkMode ? "#94a3b8" : "#475569";
      if (selectedColorField === "headingColor") return isDarkMode ? "#22d3ee" : "#0f172a";
      if (selectedColorField === "sidebarTextColor") return isDarkMode ? "#94a3b8" : "#0f172a";
      return "#22d3ee";
    }
  };

  const handleColorPickerChange = (newValue: string) => {
    const field = colorFields.find(f => f.id === selectedColorField);
    if (!field) return;
    if (field.type === "customColor") {
      setCustomColors((prev: any) => {
        const updated = { ...prev, [selectedColorField]: newValue };
        if (selectedColorField === "accentColor") {
          updated.siteAccentColorRgb = newValue;
          updated.typographyHighlightRgb = newValue;
        }
        return updated;
      });
    } else {
      setTypographySettings((prev: any) => ({
        ...prev,
        [selectedColorField]: newValue
      }));
    }
  };

  const handleSaveCustomizerChanges = async () => {
    try {
      await handleUpdateSettings({
        customColors,
        typographySettings
      });
      showStatus("success", "Customizer configuration successfully saved to the database!");
    } catch (err) {
      showStatus("error", "Failed to save configuration.");
    }
  };

  const handleResetField = (fieldId: string) => {
    const field = colorFields.find(f => f.id === fieldId);
    if (!field) return;
    
    const targetTheme = THEME_TEMPLATES.find(t => t.id === (messAnimations?.themeTemplate || "default-erp")) || THEME_TEMPLATES[0];
    
    if (field.type === "customColor") {
      let defaultVal = targetTheme.customColors?.[fieldId];
      if (!defaultVal) {
        // Fallbacks
        if (fieldId === "accentColor") defaultVal = "#3b82f6";
        else if (fieldId === "sidebarBg") defaultVal = isDarkMode ? "#020617" : "#f8fafc";
        else if (fieldId === "cardBg") defaultVal = isDarkMode ? "#0b1329" : "#ffffff";
        else if (fieldId === "headerBg") defaultVal = isDarkMode ? "#020617" : "#ffffff";
        else if (fieldId === "inputBg") defaultVal = isDarkMode ? "#0f172a" : "#f1f5f9";
        else if (fieldId === "inputBorderColor") defaultVal = isDarkMode ? "#1e293b" : "#e2e8f0";
        else if (fieldId === "inputTextColor") defaultVal = isDarkMode ? "#cbd5e1" : "#0f172a";
        else if (fieldId === "cashDepositBg") defaultVal = "#1d4ed81a";
        else if (fieldId === "cashDepositBorder") defaultVal = "#1d4ed8";
        else if (fieldId === "settlementBg") defaultVal = "#1e3a8a1a";
        else if (fieldId === "settlementBorder") defaultVal = "#1e3a8a";
        else defaultVal = "#3b82f6";
      }
      setCustomColors((prev: any) => ({
        ...prev,
        [fieldId]: defaultVal
      }));
      showStatus("success", `Reset "${field.label}" color inside preview state. Remember to click Save below!`);
    } else {
      let defaultVal = undefined;
      // Fallbacks
      if (fieldId === "primaryFontColor") defaultVal = isDarkMode ? "#f8fafc" : "#0f172a";
      else if (fieldId === "secondaryFontColor") defaultVal = isDarkMode ? "#94a3b8" : "#475569";
      else if (fieldId === "headingColor") defaultVal = isDarkMode ? "#22d3ee" : "#0f172a";
      else if (fieldId === "sidebarTextColor") defaultVal = isDarkMode ? "#94a3b8" : "#0f172a";
      else defaultVal = isDarkMode ? "#f8fafc" : "#0f172a";
      
      setTypographySettings((prev: any) => ({
        ...prev,
        [fieldId]: defaultVal
      }));
      showStatus("success", `Reset "${field.label}" typography color. Remember to click Save below!`);
    }
  };

  const handleResetAllFieldsToDefaults = () => {
    const targetTheme = THEME_TEMPLATES.find(t => t.id === (messAnimations?.themeTemplate || "default-erp")) || THEME_TEMPLATES[0];
    
    setCustomColors(targetTheme.customColors || {});
    setTypographySettings((prev: any) => ({
      ...prev,
      primaryFontColor: targetTheme.isDarkMode ? "#f8fafc" : "#0f172a",
      secondaryFontColor: targetTheme.isDarkMode ? "#94a3b8" : "#475569",
      headingColor: targetTheme.isDarkMode ? "#22d3ee" : "#0f172a",
      sidebarTextColor: targetTheme.isDarkMode ? "#94a3b8" : "#0f172a"
    }));
    
    showStatus("success", "All customizer inputs successfully reset to theme defaults! Click Save below to apply.");
  };

  const handleRevertToMidnightNavy = async () => {
    const targetTheme = THEME_TEMPLATES.find(t => t.id === "midnight");
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
          },
          typographySettings: {
            globalFontSize: 14,
            headingSize: 22,
            cardTitleSize: 15,
            tableFontSize: 12,
            inputFontSize: 12,
            buttonFontSize: 12,
            sidebarFontSize: 12,
            navigationFontSize: 12,
            primaryFontColor: "#f8fafc",
            secondaryFontColor: "#94a3b8",
            headingColor: "#22d3ee",
            sidebarTextColor: "#94a3b8"
          }
        };
        
        setIsDarkMode(true);
        setCustomColors(targetTheme.customColors);
        setTypographySettings(payload.typographySettings);
        setSiteColor(targetTheme.siteColor);
        setFontStyle(targetTheme.fontStyle);
        setMessAnimations((prev: any) => ({
          ...prev,
          backgroundTheme: targetTheme.backgroundTheme,
          themeTemplate: targetTheme.id
        }));

        await handleUpdateSettings(payload);
        setPreviewTemplateId(null);
        showStatus("success", `Successfully applied and restored the Midnight Navy theme! Dark mode contrast is fixed.`);
      } catch (e) {
        showStatus("error", "Failed to revert to Midnight Navy theme.");
      }
    }
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
      <div className={`flex flex-wrap gap-1.5 border-b pb-2 ${isDarkMode ? "border-slate-800/40" : "border-slate-200"}`}>
        <button
          onClick={() => setActiveTab("library")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "library"
              ? isDarkMode 
                ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow"
                : "bg-cyan-50 text-cyan-800 border border-cyan-200 shadow"
              : isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Palette size={14} />
          Theme Library ({allThemes.length})
        </button>
        <button
          onClick={() => setActiveTab("backgrounds")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "backgrounds"
              ? isDarkMode
                ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow"
                : "bg-cyan-50 text-cyan-800 border border-cyan-200 shadow"
              : isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles size={14} />
          Background Overlay Effects
        </button>
        <button
          onClick={() => setActiveTab("customizer")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "customizer"
              ? isDarkMode
                ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow"
                : "bg-cyan-50 text-cyan-800 border border-cyan-200 shadow"
              : isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sliders size={14} />
          Dynamic Theme Customizer
        </button>
        <button
          onClick={() => setActiveTab("presets")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "presets"
              ? isDarkMode
                ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow"
                : "bg-cyan-50 text-cyan-800 border border-cyan-200 shadow"
              : isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
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
        <div className="space-y-6 text-left">
          {/* Quick Troubleshooting / Revert to Navy Banner */}
          <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/25 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-blue-500/5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RotateCcw className="text-blue-400 animate-spin-slow shrink-0" size={16} />
                <h4 className="text-xs font-extrabold font-display text-blue-300 uppercase tracking-wider">Trouble customizing or lost your theme?</h4>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed max-w-2xl">
                If some colors are hard to read or dark mode feels disturbed, use this button to instantly restore the stable, high-contrast <strong>Midnight Navy Theme</strong> (yesterday's comfortable deep navy layout with perfect readability).
              </p>
            </div>
            <button
              onClick={handleRevertToMidnightNavy}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-blue-400/20"
            >
              <RotateCcw size={14} />
              Revert to Midnight Navy
            </button>
          </div>

          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 backdrop-blur-sm">
            <div>
              <h4 className="text-xs font-bold font-display text-cyan-300">Theme Customizer Actions</h4>
              <p className="text-[10px] text-slate-400">Apply individual changes or reset the whole customizer form back to current theme defaults.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetAllFieldsToDefaults}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                Reset Form Defaults
              </button>
              <button
                onClick={handleSaveCustomizerChanges}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 hover:text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                Save to ERP Database
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Controls Column (xl:col-span-7) */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* Typography Sizes */}
              <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-950/20 space-y-4">
                <h5 className="text-xs font-bold font-display text-cyan-300 flex items-center gap-1.5">
                  <Type size={14} className="text-cyan-400" />
                  Dynamic Typography Scale
                </h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Input Box Font Size ({typographySettings?.inputFontSize || 12}px)</label>
                    <input
                      type="range"
                      min="9"
                      max="16"
                      value={typographySettings?.inputFontSize || 12}
                      onChange={(e) => setTypographySettings((prev: any) => ({ ...prev, inputFontSize: Number(e.target.value) }))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Button Font Size ({typographySettings?.buttonFontSize || 12}px)</label>
                    <input
                      type="range"
                      min="9"
                      max="16"
                      value={typographySettings?.buttonFontSize || 12}
                      onChange={(e) => setTypographySettings((prev: any) => ({ ...prev, buttonFontSize: Number(e.target.value) }))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Sidebar Font Size ({typographySettings?.sidebarFontSize || 12}px)</label>
                    <input
                      type="range"
                      min="9"
                      max="16"
                      value={typographySettings?.sidebarFontSize || 12}
                      onChange={(e) => setTypographySettings((prev: any) => ({ ...prev, sidebarFontSize: Number(e.target.value) }))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Navigation Font Size ({typographySettings?.navigationFontSize || 12}px)</label>
                    <input
                      type="range"
                      min="9"
                      max="16"
                      value={typographySettings?.navigationFontSize || 12}
                      onChange={(e) => setTypographySettings((prev: any) => ({ ...prev, navigationFontSize: Number(e.target.value) }))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic 16M RGB Color Customizer */}
              <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-950/20 space-y-4">
                <h5 className="text-xs font-bold font-display text-cyan-300 flex items-center gap-1.5">
                  <Palette size={14} className="text-cyan-400" />
                  Dynamic 16-Million RGB Color customizer (Real-time updates)
                </h5>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Selector List */}
                  <div className="lg:col-span-5 space-y-2 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                    {colorFields.map((field) => {
                      const val = field.type === "customColor" ? customColors?.[field.id] : typographySettings?.[field.id];
                      const fallback = field.type === "customColor"
                        ? (field.id === "accentColor" ? "#22d3ee" : isDarkMode ? "#0f172a" : "#ecfeff")
                        : (field.id === "primaryFontColor" ? (isDarkMode ? "#f8fafc" : "#0f172a") : "#cbd5e1");
                      const activeVal = val || fallback;
                      const isSelected = selectedColorField === field.id;

                      return (
                        <button
                          key={field.id}
                          onClick={() => setSelectedColorField(field.id)}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 border cursor-pointer ${
                            isSelected
                              ? "bg-cyan-500/10 border-cyan-500 text-cyan-300"
                              : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700 text-slate-300"
                          }`}
                        >
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Circular preview swatch */}
                              <div
                                className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                                style={{ backgroundColor: activeVal }}
                              />
                              <span className="text-[10px] font-bold font-sans">{field.label}</span>
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-slate-500">{activeVal}</span>
                          </div>
                          {field.description && (
                            <span className="text-[9px] text-slate-400 pl-6 leading-tight font-normal line-clamp-1">
                              {field.description}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right RgbColorPicker Container */}
                  <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50">
                    <div className="w-full mb-3 text-center lg:text-left px-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customizing Field</span>
                      <span className="text-xs font-extrabold text-cyan-300 block">
                        {colorFields.find(f => f.id === selectedColorField)?.label || "Selected Color"}
                      </span>
                      {colorFields.find(f => f.id === selectedColorField)?.description && (
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal italic">
                          ℹ️ {colorFields.find(f => f.id === selectedColorField)?.description}
                        </p>
                      )}
                    </div>
                    
                    <RgbColorPicker
                      value={getSelectedColorValue()}
                      onChange={handleColorPickerChange}
                      isDarkMode={isDarkMode}
                    />

                    {/* Dedicated Reset and Save buttons for individual customization field */}
                    <div className="w-full mt-4 flex items-center justify-between gap-2 px-2 pt-3 border-t border-slate-800/60">
                      <button
                        onClick={() => handleResetField(selectedColorField)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-lg active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        title="Reset this specific field to its template default"
                      >
                        <RotateCcw size={12} />
                        Reset Field
                      </button>
                      <button
                        onClick={handleSaveCustomizerChanges}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                        title="Save all changes to the ERP database"
                      >
                        <Save size={12} />
                        Save Changes
                      </button>
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

                <div className="grid grid-cols-2 gap-3">
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

            {/* Right Interactive Live Sandbox Panel Column (xl:col-span-5) */}
            <div className="xl:col-span-5 xl:sticky xl:top-6 space-y-4">
              <div className="p-4 rounded-2xl border border-slate-800/40 bg-slate-950/40 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <h5 className="text-xs font-bold font-display text-cyan-300 flex items-center gap-1.5">
                    <Eye size={14} className="text-cyan-400" />
                    Real-time Sandbox
                  </h5>
                  <div className="flex bg-slate-900/60 rounded-lg p-0.5 border border-slate-800">
                    <button
                      onClick={() => setPreviewMode("dashboard")}
                      className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md cursor-pointer transition-all ${
                        previewMode === "dashboard"
                          ? "bg-cyan-500 text-slate-950 font-extrabold shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setPreviewMode("login")}
                      className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md cursor-pointer transition-all ${
                        previewMode === "login"
                          ? "bg-cyan-500 text-slate-950 font-extrabold shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Login Page
                    </button>
                  </div>
                </div>

                {previewMode === "login" ? (
                  /* MINI LIVE LOGIN CARD */
                  <div 
                    style={{
                      backgroundColor: customColors?.cardBg || (isDarkMode ? "#0b1329" : "#ffffff"),
                    }}
                    className={`p-6 rounded-2xl border border-slate-800/50 space-y-4 transition-all text-left max-w-sm mx-auto shadow-xl`}
                  >
                    <div className="text-center space-y-1">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-1" style={{ color: customColors?.accentColor || "#22d3ee" }}>
                        <Lock size={18} />
                      </div>
                      <h6 className="text-xs font-extrabold tracking-tight font-display" style={{ color: customColors?.accentColor || undefined }}>
                        BENGAL BACHELOR ERP
                      </h6>
                      <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                        SECURE HOSTEL PORTAL
                      </p>
                    </div>

                    {/* Email Input mock */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-orange-400 block uppercase">
                        Email Address
                      </label>
                      <input
                        type="text"
                        disabled
                        placeholder="member@mess.erp"
                        style={{
                          backgroundColor: customColors?.inputBg || (isDarkMode ? "#0f172a" : "#f1f5f9"),
                          borderColor: customColors?.inputBorderColor || (isDarkMode ? "#1e293b" : "#e2e8f0"),
                          color: customColors?.inputTextColor || (isDarkMode ? "#cbd5e1" : "#0f172a"),
                          fontSize: `${typographySettings?.inputFontSize || 12}px`
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border outline-none text-[10px] cursor-not-allowed"
                      />
                    </div>

                    {/* Password Input mock */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-orange-400 block uppercase">
                        Password
                      </label>
                      <input
                        type="password"
                        disabled
                        value="12345678"
                        style={{
                          backgroundColor: customColors?.inputBg || (isDarkMode ? "#0f172a" : "#f1f5f9"),
                          borderColor: customColors?.inputBorderColor || (isDarkMode ? "#1e293b" : "#e2e8f0"),
                          color: customColors?.inputTextColor || (isDarkMode ? "#cbd5e1" : "#0f172a"),
                          fontSize: `${typographySettings?.inputFontSize || 12}px`
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border outline-none text-[10px] cursor-not-allowed"
                      />
                    </div>

                    {/* Submit Button mock */}
                    <button 
                      style={{ 
                        background: `linear-gradient(to right, ${customColors?.accentColor || "#22d3ee"}, ${customColors?.accentColor || "#22d3ee"}dd)`,
                        boxShadow: messAnimations?.glowingButtons ? `0 0 12px ${customColors?.accentColor || "#22d3ee"}40` : undefined,
                        fontSize: `${typographySettings?.buttonFontSize || 12}px`
                      }} 
                      className="w-full text-slate-950 font-extrabold py-2 px-2.5 rounded-lg cursor-not-allowed mt-2 text-[10px] tracking-wide uppercase shadow"
                    >
                      ACCESS ENTERPRISE
                    </button>
                    
                    <div className="text-center pt-1">
                      <span className="text-[8px] text-slate-500 font-bold hover:underline cursor-not-allowed uppercase">
                        Forgot Password?
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Mini Header & Sidebar Layout */
                  <div className="rounded-xl border border-slate-800/60 overflow-hidden bg-slate-950/40 text-[11px] font-sans">
                    {/* Header */}
                    <div 
                      style={{ 
                        backgroundColor: customColors?.headerBg || (isDarkMode ? "#0f172a" : "#ffffff"),
                        borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`
                      }} 
                      className="p-2.5 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-1.5 font-bold" style={{ color: typographySettings?.headingColor || (isDarkMode ? "#22d3ee" : "#0f172a") }}>
                        <Sparkles size={11} className="text-cyan-400" style={{ color: customColors?.accentColor || "#22d3ee" }} />
                        <span>BENGAL BACHELOR ERP</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[9px] text-slate-500 font-bold">ACTIVE</span>
                      </div>
                    </div>
                    
                    {/* Main Grid: Sidebar + Content */}
                    <div className="grid grid-cols-12 min-h-[220px]">
                      {/* Sidebar */}
                      <div 
                        style={{ 
                          backgroundColor: customColors?.sidebarBg || (isDarkMode ? "#0f172a" : "#ecfeff"),
                          color: typographySettings?.sidebarTextColor || (isDarkMode ? "#94a3b8" : "#0f172a"),
                          fontSize: `${typographySettings?.sidebarFontSize || 12}px`
                        }} 
                        className="col-span-4 p-2 space-y-1.5 border-r border-slate-800/30 font-medium transition-all"
                      >
                        <div className="p-1.5 rounded bg-cyan-500/10 font-bold text-[9px] uppercase tracking-wider text-cyan-400 animate-pulse" style={{ color: customColors?.accentColor || undefined }}>
                          NAVIGATION
                        </div>
                        <div className="p-1.5 rounded flex items-center gap-1 hover:bg-slate-500/5 cursor-pointer">
                          <span>📊</span> Dashboard
                        </div>
                        <div className="p-1.5 rounded flex items-center gap-1 hover:bg-slate-500/5 cursor-pointer">
                          <span>👥</span> Members
                        </div>
                        <div className="p-1.5 rounded flex items-center gap-1 hover:bg-slate-500/5 cursor-pointer">
                          <span>⚙️</span> Settings
                        </div>
                      </div>
                      
                      {/* Page Content Area */}
                      <div className="col-span-8 p-3 space-y-3 bg-slate-950/60 overflow-y-auto max-h-[260px]">
                        {/* Sub card styled exactly with customized card background & colors */}
                        <div 
                          style={{ 
                            backgroundColor: customColors?.cardBg || (isDarkMode ? "#1e293b" : "#ffffff"),
                            color: typographySettings?.primaryFontColor || (isDarkMode ? "#f8fafc" : "#0f172a"),
                            boxShadow: messAnimations?.glowingCards ? `0 0 10px ${customColors?.accentColor || "#22d3ee"}1a` : undefined,
                            borderColor: messAnimations?.neonBorders ? `${customColors?.accentColor || "#22d3ee"}33` : undefined
                          }} 
                          className="p-2.5 rounded-lg border border-slate-800/50 space-y-2 transition-all"
                        >
                          <h6 
                            style={{ 
                              color: typographySettings?.headingColor || (isDarkMode ? "#22d3ee" : "#0f172a"),
                              fontSize: `${typographySettings?.cardTitleSize || 15}px`
                            }} 
                            className="font-bold tracking-tight"
                          >
                            Overview Summary
                          </h6>
                          <p 
                            style={{ 
                              color: typographySettings?.secondaryFontColor || (isDarkMode ? "#94a3b8" : "#475569"),
                              fontSize: `${typographySettings?.globalFontSize || 14}px`
                            }} 
                            className="leading-normal"
                          >
                            Welcome to your ERP system. This text block scales dynamically in real-time as you tweak typography settings.
                          </p>
                          
                          {/* Sample Input box with customization */}
                          <div className="space-y-1 text-left">
                            <span className="text-[8px] font-bold text-orange-400 block uppercase">Search Database</span>
                            <input 
                              type="text" 
                              disabled
                              placeholder="Type a query..." 
                              style={{
                                backgroundColor: customColors?.inputBg || (isDarkMode ? "#0f172a" : "#ecfeff"),
                                borderColor: customColors?.inputBorderColor || (isDarkMode ? "#334155" : "#cffafe"),
                                color: customColors?.inputTextColor || (isDarkMode ? "#cbd5e1" : "#083344"),
                                fontSize: `${typographySettings?.inputFontSize || 12}px`
                              }}
                              className="w-full px-2 py-1 rounded border outline-none font-medium cursor-not-allowed text-[10px]"
                            />
                          </div>

                          {/* Interactive Accent color button */}
                          <button 
                            style={{ 
                              background: `linear-gradient(to right, ${customColors?.accentColor || "#22d3ee"}, ${customColors?.accentColor || "#22d3ee"}dd)`,
                              fontSize: `${typographySettings?.buttonFontSize || 12}px`,
                              boxShadow: messAnimations?.glowingButtons ? `0 0 12px ${customColors?.accentColor || "#22d3ee"}40` : undefined
                            }} 
                            className="w-full text-slate-950 font-extrabold py-1 px-2.5 rounded cursor-not-allowed mt-1 text-[10px] tracking-wide"
                          >
                            SUBMIT REPORT
                          </button>
                        </div>

                        {/* Cash Deposit Card and Settlement sheet Card */}
                        <div className="grid grid-cols-2 gap-2">
                          <div 
                            style={{ 
                              backgroundColor: customColors?.cashDepositBg || "#f973161a",
                              borderColor: customColors?.cashDepositBorder || "#f97316"
                            }} 
                            className="p-2 rounded border text-left text-[10px]"
                          >
                            <span className="text-[8px] font-bold text-orange-400 block uppercase">Deposit Card</span>
                            <span className="font-extrabold text-slate-200 block">৳ 12,450 BDT</span>
                          </div>
                          <div 
                            style={{ 
                              backgroundColor: customColors?.settlementBg || "#22c55e1a",
                              borderColor: customColors?.settlementBorder || "#22c55e"
                            }} 
                            className="p-2 rounded border text-left text-[10px]"
                          >
                            <span className="text-[8px] font-bold text-emerald-400 block uppercase">Settled Balance</span>
                            <span className="font-extrabold text-slate-200 block">৳ 4,120 BDT</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
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
