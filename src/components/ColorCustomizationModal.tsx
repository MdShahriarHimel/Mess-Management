import React from "react";
import RgbColorPicker from "./RgbColorPicker.tsx";
import { X, Save, Eye, Palette } from "lucide-react";

interface ColorCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (colors: any) => void;
  customColors: any;
  setPreviewColors: (colors: any) => void;
  previewColors: any;
}

const COLOR_METADATA: Record<string, { label: string; desc: string; defaultVal: string }> = {
  primaryColor: { label: "Primary Color", desc: "Accent background and primary theme accents", defaultVal: "#0891b2" },
  secondaryColor: { label: "Secondary Color", desc: "Secondary accents, secondary buttons and badges", defaultVal: "#4f46e5" },
  accentColor: { label: "Accent Glow Color", desc: "Neon active highlights and custom shadow glows", defaultVal: "#22d3ee" },
  sidebarBg: { label: "Sidebar Background", desc: "Background color of the side navigation drawer", defaultVal: "#0f172a" },
  sidebarText: { label: "Sidebar Text", desc: "Typography color for navigation links", defaultVal: "#94a3b8" },
  navbarBg: { label: "Navbar Background", desc: "Top header navigation strip color", defaultVal: "#0f172a" },
  navbarText: { label: "Navbar Text & Icons", desc: "Color for top header labels and icon buttons", defaultVal: "#ffffff" },
  cardBg: { label: "Card Background", desc: "Surface color of widgets and structural panels", defaultVal: "#1e293b" },
  cardBorder: { label: "Card Border", desc: "Outline outline borders framing UI panels", defaultVal: "#334155" },
  pageBg: { label: "Page Background", desc: "Core canvas background behind all content", defaultVal: "#020617" },
  textColor: { label: "Body Text Color", desc: "Default color for standard system paragraph copy", defaultVal: "#cbd5e1" },
  headingColor: { label: "Heading Text Color", desc: "Bold headers, titles and visual indicators", defaultVal: "#ffffff" },
  buttonBg: { label: "Primary Button Background", desc: "Background for primary interactive action items", defaultVal: "#0891b2" },
  buttonHover: { label: "Button Hover State", desc: "Color of action buttons on cursor hover", defaultVal: "#06b6d4" },
  successColor: { label: "Success Accent Color", desc: "Status markers signifying active, safe, or complete", defaultVal: "#22c55e" },
  warningColor: { label: "Warning Accent Color", desc: "Status markers highlighting pending or alert states", defaultVal: "#eab308" },
  dangerColor: { label: "Danger Accent Color", desc: "Status markers indicating negative, blocked or deleted", defaultVal: "#ef4444" },
  infoColor: { label: "Info Accent Color", desc: "Neutral notifications and highlight details", defaultVal: "#3b82f6" },
  chartsColor: { label: "Charts Key Line", desc: "Stroke color of trend charts, bars, and line graphs", defaultVal: "#22d3ee" },
  tablesHeaderBg: { label: "Tables Header Surface", desc: "Header row background inside database lists", defaultVal: "#1e293b" },
  linksColor: { label: "Interactive Link Text", desc: "Color for clickable hyperlinks and subtexts", defaultVal: "#06b6d4" },
  cashDepositBg: { label: "Cash Deposit Block BG", desc: "Background highlighting the Cash Deposit widget", defaultVal: "#f973161a" },
  cashDepositBorder: { label: "Cash Deposit Border", desc: "Border styling framing the Cash Deposit widget", defaultVal: "#f97316" },
  settlementBg: { label: "Settlement Block BG", desc: "Background highlighting the Settlement panel", defaultVal: "#22c55e1a" },
  settlementBorder: { label: "Settlement Border", desc: "Border styling framing the Settlement sheet", defaultVal: "#22c55e" }
};

export default function ColorCustomizationModal({
  isOpen,
  onClose,
  onSave,
  customColors,
  setPreviewColors,
  previewColors
}: ColorCustomizationModalProps) {
  const [selectedKey, setSelectedKey] = React.useState<string>("primaryColor");

  if (!isOpen) return null;

  const handleColorChange = (newHex: string) => {
    setPreviewColors((prev: any) => ({
      ...prev,
      [selectedKey]: newHex
    }));
  };

  const handleResetToDefault = () => {
    const meta = COLOR_METADATA[selectedKey];
    if (meta) {
      setPreviewColors((prev: any) => ({
        ...prev,
        [selectedKey]: meta.defaultVal
      }));
    }
  };

  const handleResetAllToDefault = () => {
    const defaults: Record<string, string> = {};
    Object.keys(COLOR_METADATA).forEach(k => {
      defaults[k] = COLOR_METADATA[k].defaultVal;
    });
    setPreviewColors((prev: any) => ({
      ...prev,
      ...defaults
    }));
  };

  const activeColorValue = previewColors[selectedKey] || COLOR_METADATA[selectedKey]?.defaultVal || "#ffffff";

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between shrink-0 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <Palette className="text-cyan-400" size={22} />
            <div>
              <h2 className="text-sm font-black font-display text-white uppercase tracking-wider">Granular System-Wide Color Studio</h2>
              <p className="text-[10px] text-slate-400 font-medium">Click and customize any color in the ERP instantly with a live interactive preview</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* COLUMN 1: VARIABLES LIST (4 cols) */}
          <div className="md:col-span-3 flex flex-col gap-2 h-full min-h-[250px]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Color Palette Elements</h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 border-r border-slate-900/60 max-h-[50vh] md:max-h-none">
              {Object.keys(COLOR_METADATA).map((key) => {
                const meta = COLOR_METADATA[key];
                const isSelected = selectedKey === key;
                const val = previewColors[key] || meta.defaultVal;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer active:scale-98 ${
                      isSelected 
                        ? "bg-cyan-950/30 border-cyan-500 text-white" 
                        : "bg-slate-900/30 border-slate-850 hover:bg-slate-900 text-slate-300"
                    }`}
                  >
                    {/* Circle preview swatch */}
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0" 
                      style={{ backgroundColor: val }}
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold truncate uppercase tracking-wide leading-none">{meta.label}</div>
                      <div className="text-[8px] text-slate-400 truncate mt-0.5 font-medium">{val}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: ACTIVE PICKER (4 cols) */}
          <div className="md:col-span-5 flex flex-col gap-3.5 border-r border-slate-900/60 pr-2">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active RGB Picker</h3>
              <p className="text-[9px] text-slate-400 font-semibold mt-1">
                Customizing <span className="text-cyan-400 font-extrabold uppercase">{COLOR_METADATA[selectedKey]?.label}</span>
              </p>
            </div>

            <RgbColorPicker
              value={activeColorValue}
              onChange={handleColorChange}
              isDarkMode={true}
            />

            <div className="flex gap-2 text-[10px] font-bold mt-1">
              <button
                onClick={handleResetToDefault}
                className="flex-1 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer"
              >
                Reset to Default
              </button>
              <button
                onClick={handleResetAllToDefault}
                className="flex-1 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer"
              >
                Reset All
              </button>
            </div>
          </div>

          {/* COLUMN 3: HIGH-FIDELITY LIVE PREVIEW CONTAINER (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Eye size={12} className="text-cyan-400" />
                Live Mockup Preview
              </h3>
              <span className="text-[8px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                Instant Updates
              </span>
            </div>

            {/* MOCKUP CONTAINER */}
            <div 
              className="flex-1 rounded-2xl border flex flex-col overflow-hidden text-slate-300 font-sans shadow-md select-none min-h-[300px]"
              style={{ backgroundColor: previewColors.pageBg || "#020617" }}
            >
              {/* TOP HEADER */}
              <div 
                className="px-3 py-2 border-b flex items-center justify-between text-[10px] shrink-0 font-extrabold"
                style={{ 
                  backgroundColor: previewColors.navbarBg || "#0f172a",
                  borderColor: previewColors.cardBorder || "#334155",
                  color: previewColors.navbarText || "#ffffff"
                }}
              >
                <span className="tracking-wide">ERP Control Panel</span>
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: previewColors.successColor || "#22c55e" }} />
                  <span className="text-[8px]">Live Connection</span>
                </div>
              </div>

              {/* MAIN BODY AREA */}
              <div className="flex-1 flex overflow-hidden text-[9px] font-bold">
                
                {/* SIDEBAR */}
                <div 
                  className="w-16 border-r p-1.5 flex flex-col gap-1.5 shrink-0"
                  style={{ 
                    backgroundColor: previewColors.sidebarBg || "#0f172a",
                    borderColor: previewColors.cardBorder || "#334155",
                    color: previewColors.sidebarText || "#94a3b8"
                  }}
                >
                  <div className="w-full h-2 rounded-full opacity-60" style={{ backgroundColor: previewColors.sidebarText || "#94a3b8" }} />
                  <div className="w-10 h-1.5 rounded-full opacity-30 mt-1" style={{ backgroundColor: previewColors.sidebarText || "#94a3b8" }} />
                  <div className="w-8 h-1.5 rounded-full opacity-30" style={{ backgroundColor: previewColors.sidebarText || "#94a3b8" }} />
                  <div className="w-11 h-1.5 rounded-full opacity-30" style={{ backgroundColor: previewColors.sidebarText || "#94a3b8" }} />
                </div>

                {/* CONTENT PREVIEW */}
                <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
                  {/* Headline & Link */}
                  <div className="flex items-center justify-between">
                    <h4 
                      className="text-[10px] font-black uppercase tracking-wide leading-none"
                      style={{ color: previewColors.headingColor || "#ffffff" }}
                    >
                      Dashboard Overview
                    </h4>
                    <span className="text-[7px]" style={{ color: previewColors.linksColor || "#06b6d4" }}>
                      Refresh data
                    </span>
                  </div>

                  {/* Sample widget card */}
                  <div 
                    className="p-2 rounded-lg border space-y-1.5"
                    style={{ 
                      backgroundColor: previewColors.cardBg || "#1e293b",
                      borderColor: previewColors.cardBorder || "#334155"
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span style={{ color: previewColors.textColor || "#cbd5e1" }}>System Balance</span>
                      <span className="text-[7px] px-1 rounded" style={{ backgroundColor: previewColors.infoColor || "#3b82f6", color: "#fff" }}>Active</span>
                    </div>
                    <div className="text-[12px] font-black leading-none" style={{ color: previewColors.headingColor || "#ffffff" }}>
                      $24,850.00
                    </div>

                    {/* Miniature Chart Line */}
                    <div className="h-4 w-full flex items-end gap-1 pt-1.5">
                      {[30, 60, 45, 90, 75, 100].map((h, i) => (
                        <div 
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{ 
                            height: `${h}%`,
                            backgroundColor: previewColors.chartsColor || "#22d3ee"
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Buttons and badging row */}
                  <div className="flex items-center gap-1.5">
                    <button 
                      className="px-2 py-1 rounded text-[8px] font-black text-white hover:opacity-90 active:scale-95 transition-transform"
                      style={{ backgroundColor: previewColors.buttonBg || "#0891b2" }}
                    >
                      Primary Action
                    </button>
                    <span 
                      className="px-1.5 py-0.5 rounded text-[7px]"
                      style={{ 
                        backgroundColor: (previewColors.successColor || "#22c55e") + "20",
                        color: previewColors.successColor || "#22c55e",
                        border: `1px solid ${previewColors.successColor || "#22c55e"}30`
                      }}
                    >
                      Verified
                    </span>
                    <span 
                      className="px-1.5 py-0.5 rounded text-[7px]"
                      style={{ 
                        backgroundColor: (previewColors.dangerColor || "#ef4444") + "20",
                        color: previewColors.dangerColor || "#ef4444",
                        border: `1px solid ${previewColors.dangerColor || "#ef4444"}30`
                      }}
                    >
                      Alert
                    </span>
                  </div>

                  {/* Mini custom widgets preview */}
                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      className="p-1.5 rounded-md border text-[7px]"
                      style={{ 
                        backgroundColor: previewColors.cashDepositBg || "#f973161a", 
                        borderColor: previewColors.cashDepositBorder || "#f97316",
                        color: previewColors.cashDepositBorder || "#f97316"
                      }}
                    >
                      Deposit: $520
                    </div>
                    <div 
                      className="p-1.5 rounded-md border text-[7px]"
                      style={{ 
                        backgroundColor: previewColors.settlementBg || "#22c55e1a", 
                        borderColor: previewColors.settlementBorder || "#22c55e",
                        color: previewColors.settlementBorder || "#22c55e"
                      }}
                    >
                      Settled: $340
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-850 flex items-center justify-between shrink-0 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(previewColors)}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/30 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Save size={14} className="stroke-[2.5px]" />
            Apply & Save Colors
          </button>
        </div>

      </div>
    </div>
  );
}
