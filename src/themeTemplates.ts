export interface ThemeTemplate {
  id: string;
  name: string;
  desc: string;
  siteColor: string;
  fontStyle: string;
  isDarkMode: boolean;
  backgroundTheme: string;
  customColors: {
    sidebarBg: string;
    headerBg: string;
    cardBg: string;
    accentColor: string;
    siteAccentColorRgb: string;
    typographyHighlightRgb: string;
    layoutScaleColorRgb: string;
    cashDepositBg: string;
    cashDepositBorder: string;
    settlementBg: string;
    settlementBorder: string;
  };
  customStyles: string;
}

export const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: "default-erp",
    name: "Default ERP",
    desc: "Clean, high-contrast Enterprise layout with default slate and cyan accents",
    siteColor: "cyan",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#f973161a",
      cashDepositBorder: "#f97316",
      settlementBg: "#22c55e1a",
      settlementBorder: "#22c55e",
      sidebarBg: "#0f172a",
      headerBg: "#0f172a",
      cardBg: "#1e293b",
      accentColor: "#22d3ee",
      siteAccentColorRgb: "#22d3ee",
      typographyHighlightRgb: "#67e8f9",
      layoutScaleColorRgb: "#a78bfa"
    },
    customStyles: ""
  },
  {
    id: "modern-business",
    name: "Modern Business",
    desc: "Sleek, executive business design with indigo palettes and professional shadows",
    siteColor: "indigo",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "deep-space",
    customColors: {
      cashDepositBg: "#3b82f61a",
      cashDepositBorder: "#3b82f6",
      settlementBg: "#10b9811a",
      settlementBorder: "#10b981",
      sidebarBg: "#1e1b4b",
      headerBg: "#1e1b4b",
      cardBg: "#ffffff",
      accentColor: "#6366f1",
      siteAccentColorRgb: "#6366f1",
      typographyHighlightRgb: "#4f46e5",
      layoutScaleColorRgb: "#6366f1"
    },
    customStyles: `
      .theme-modern-business .glass-panel, 
      .theme-modern-business .rounded-2xl {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03) !important;
        border-radius: 16px !important;
      }
      .dark-mode-root.theme-modern-business .glass-panel, 
      .dark-mode-root.theme-modern-business .rounded-2xl {
        background-color: #0f172a !important;
        border-color: #1e293b !important;
        box-shadow: 0 4px 18px rgba(0,0,0,0.4) !important;
      }
      .theme-modern-business button {
        border-radius: 12px !important;
      }
      .theme-modern-business input, 
      .theme-modern-business select {
        border-radius: 10px !important;
        border-color: #cbd5e1 !important;
      }
    `
  },
  {
    id: "glassmorphism",
    name: "Glassmorphism",
    desc: "Super frosted glass panel interfaces with deep blurs and glowing borders",
    siteColor: "violet",
    fontStyle: "display",
    isDarkMode: true,
    backgroundTheme: "midnight-nebula",
    customColors: {
      cashDepositBg: "#8b5cf61a",
      cashDepositBorder: "#a78bfa",
      settlementBg: "#10b9811a",
      settlementBorder: "#34d399",
      sidebarBg: "rgba(15, 23, 42, 0.45)",
      headerBg: "rgba(15, 23, 42, 0.45)",
      cardBg: "rgba(30, 41, 59, 0.3)",
      accentColor: "#a78bfa",
      siteAccentColorRgb: "#8b5cf6",
      typographyHighlightRgb: "#c084fc",
      layoutScaleColorRgb: "#a78bfa"
    },
    customStyles: `
      .theme-glassmorphism .glass-panel,
      .theme-glassmorphism .rounded-2xl,
      .theme-glassmorphism aside,
      .theme-glassmorphism header {
        background: rgba(15, 23, 42, 0.78) !important;
        backdrop-filter: blur(25px) saturate(200%) !important;
        -webkit-backdrop-filter: blur(25px) saturate(200%) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
      }
      .light-mode-root.theme-glassmorphism .glass-panel,
      .light-mode-root.theme-glassmorphism .rounded-2xl,
      .light-mode-root.theme-glassmorphism aside,
      .light-mode-root.theme-glassmorphism header {
        background: rgba(255, 255, 255, 0.92) !important;
        border: 1px solid rgba(226, 232, 240, 0.9) !important;
        color: #0f172a !important;
        backdrop-filter: blur(25px) saturate(200%) !important;
        -webkit-backdrop-filter: blur(25px) saturate(200%) !important;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.08) !important;
      }
    `
  },
  {
    id: "macos-sonoma",
    name: "macOS Sonoma",
    desc: "Frosted elegant widgets, rich Sonoma gradients, organic curves, and traffic light signals",
    siteColor: "orange",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "sunset-glow",
    customColors: {
      cashDepositBg: "#f9731622",
      cashDepositBorder: "#f97316",
      settlementBg: "#10b98122",
      settlementBorder: "#10b981",
      sidebarBg: "rgba(255, 247, 237, 0.75)",
      headerBg: "rgba(255, 247, 237, 0.75)",
      cardBg: "rgba(255, 255, 255, 0.85)",
      accentColor: "#f97316",
      siteAccentColorRgb: "#f97316",
      typographyHighlightRgb: "#ea580c",
      layoutScaleColorRgb: "#f43f5e"
    },
    customStyles: `
      .theme-macos-sonoma .glass-panel,
      .theme-macos-sonoma .rounded-2xl {
        background: rgba(255, 255, 255, 0.85) !important;
        backdrop-filter: blur(30px) !important;
        border-radius: 20px !important;
        border: 1px solid rgba(0, 0, 0, 0.06) !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06) !important;
      }
      .dark-mode-root.theme-macos-sonoma .glass-panel,
      .dark-mode-root.theme-macos-sonoma .rounded-2xl {
        background: rgba(30, 20, 40, 0.55) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4) !important;
      }
      .theme-macos-sonoma button {
        border-radius: 12px !important;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      .theme-macos-sonoma input,
      .theme-macos-sonoma select {
        border-radius: 8px !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
      }
    `
  },
  {
    id: "macos-sequoia",
    name: "macOS Sequoia",
    desc: "Apple forest green depth, blurred glass controls, crisp SF shadows, and organic curves",
    siteColor: "emerald",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "forest-whisper",
    customColors: {
      cashDepositBg: "#10b98120",
      cashDepositBorder: "#10b981",
      settlementBg: "#04785720",
      settlementBorder: "#047857",
      sidebarBg: "rgba(6, 40, 30, 0.7)",
      headerBg: "rgba(6, 40, 30, 0.7)",
      cardBg: "rgba(10, 30, 25, 0.8)",
      accentColor: "#10b981",
      siteAccentColorRgb: "#10b981",
      typographyHighlightRgb: "#34d399",
      layoutScaleColorRgb: "#10b981"
    },
    customStyles: `
      .theme-macos-sequoia .glass-panel,
      .theme-macos-sequoia .rounded-2xl {
        background: rgba(15, 35, 30, 0.75) !important;
        backdrop-filter: blur(40px) !important;
        border-radius: 20px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        box-shadow: 0 12px 50px rgba(0, 0, 0, 0.45) !important;
      }
      .light-mode-root.theme-macos-sequoia .glass-panel,
      .light-mode-root.theme-macos-sequoia .rounded-2xl {
        background: rgba(240, 253, 244, 0.9) !important;
        border: 1px solid rgba(6, 95, 70, 0.15) !important;
        box-shadow: 0 12px 40px rgba(6, 95, 70, 0.08) !important;
      }
      .theme-macos-sequoia button {
        border-radius: 12px !important;
      }
    `
  },
  {
    id: "windows-fluent",
    name: "Windows 11 Fluent",
    desc: "Mica acrylic boards with slightly rounded card corners and Fluent shadows",
    siteColor: "blue",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "bento-grid-dark",
    customColors: {
      cashDepositBg: "#0078d41a",
      cashDepositBorder: "#0078d4",
      settlementBg: "#107c411a",
      settlementBorder: "#107c41",
      sidebarBg: "rgba(32, 32, 32, 0.85)",
      headerBg: "rgba(32, 32, 32, 0.85)",
      cardBg: "rgba(45, 45, 45, 0.55)",
      accentColor: "#60a5fa",
      siteAccentColorRgb: "#0078d4",
      typographyHighlightRgb: "#ffffff",
      layoutScaleColorRgb: "#60a5fa"
    },
    customStyles: `
      .theme-windows-fluent .glass-panel,
      .theme-windows-fluent .rounded-2xl {
        background: rgba(35, 35, 35, 0.65) !important;
        backdrop-filter: blur(40px) saturate(150%) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35) !important;
      }
      .light-mode-root.theme-windows-fluent .glass-panel,
      .light-mode-root.theme-windows-fluent .rounded-2xl {
        background: rgba(243, 243, 243, 0.85) !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05) !important;
      }
      .theme-windows-fluent button {
        border-radius: 4px !important;
      }
    `
  },
  {
    id: "windows-10-modern",
    name: "Windows 10 Modern",
    desc: "Rigid flat tile aesthetics, zero rounded corners, bold grids, and digital outlines",
    siteColor: "blue",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "bento-grid-dark",
    customColors: {
      cashDepositBg: "#0078d420",
      cashDepositBorder: "#0078d4",
      settlementBg: "#10b98120",
      settlementBorder: "#10b981",
      sidebarBg: "#101010",
      headerBg: "#101010",
      cardBg: "#1e1e1e",
      accentColor: "#0078d4",
      siteAccentColorRgb: "#0078d4",
      typographyHighlightRgb: "#0078d4",
      layoutScaleColorRgb: "#0078d4"
    },
    customStyles: `
      .theme-windows-10-modern .glass-panel,
      .theme-windows-10-modern .rounded-2xl,
      .theme-windows-10-modern button,
      .theme-windows-10-modern input,
      .theme-windows-10-modern select {
        border-radius: 0px !important;
        border: 1px solid #333333 !important;
      }
      .light-mode-root.theme-windows-10-modern .glass-panel,
      .light-mode-root.theme-windows-10-modern .rounded-2xl {
        background: #ffffff !important;
        border-color: #cccccc !important;
      }
    `
  },
  {
    id: "material-design-3",
    name: "Material Design 3",
    desc: "Fluid dynamic layouts, organic pill highlights, dynamic elevations and pastel tones",
    siteColor: "indigo",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#6750a41a",
      cashDepositBorder: "#6750a4",
      settlementBg: "#388e3c1a",
      settlementBorder: "#388e3c",
      sidebarBg: "#f3edf7",
      headerBg: "#f3edf7",
      cardBg: "#ffffff",
      accentColor: "#6750a4",
      siteAccentColorRgb: "#6750a4",
      typographyHighlightRgb: "#21005d",
      layoutScaleColorRgb: "#625b71"
    },
    customStyles: `
      .theme-material-design-3 .glass-panel,
      .theme-material-design-3 .rounded-2xl {
        background-color: #ffffff !important;
        border: none !important;
        border-radius: 28px !important;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08) !important;
      }
      .dark-mode-root.theme-material-design-3 .glass-panel,
      .dark-mode-root.theme-material-design-3 .rounded-2xl {
        background-color: #211f26 !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35) !important;
      }
      .theme-material-design-3 button {
        border-radius: 9999px !important;
      }
    `
  },
  {
    id: "corporate-pro",
    name: "Corporate Pro",
    desc: "Robust dark slate and steel gray structures, sharp executive borders, and ultimate clarity",
    siteColor: "slate-grey",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#33415520",
      cashDepositBorder: "#475569",
      settlementBg: "#0f172a20",
      settlementBorder: "#334155",
      sidebarBg: "#0f172a",
      headerBg: "#0f172a",
      cardBg: "#1e293b",
      accentColor: "#94a3b8",
      siteAccentColorRgb: "#64748b",
      typographyHighlightRgb: "#f8fafc",
      layoutScaleColorRgb: "#475569"
    },
    customStyles: `
      .theme-corporate-pro .glass-panel,
      .theme-corporate-pro .rounded-2xl {
        background-color: #1e293b !important;
        border: 1px solid #334155 !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
      }
      .light-mode-root.theme-corporate-pro .glass-panel,
      .light-mode-root.theme-corporate-pro .rounded-2xl {
        background-color: #ffffff !important;
        border-color: #cbd5e1 !important;
      }
    `
  },
  {
    id: "finance-dashboard",
    name: "Finance Dashboard",
    desc: "Highly optimized ledger balances, rich glowing values, and deep dark banking assets",
    siteColor: "emerald",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "cyber-emerald",
    customColors: {
      cashDepositBg: "#0596691a",
      cashDepositBorder: "#059669",
      settlementBg: "#10b9811a",
      settlementBorder: "#10b981",
      sidebarBg: "#040b14",
      headerBg: "#040b14",
      cardBg: "#09111e",
      accentColor: "#10b981",
      siteAccentColorRgb: "#10b981",
      typographyHighlightRgb: "#34d399",
      layoutScaleColorRgb: "#059669"
    },
    customStyles: `
      .theme-finance-dashboard .glass-panel,
      .theme-finance-dashboard .rounded-2xl {
        background-color: #09111e !important;
        border: 1px solid rgba(16, 185, 129, 0.2) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45) !important;
        border-radius: 12px !important;
      }
      .light-mode-root.theme-finance-dashboard .glass-panel,
      .light-mode-root.theme-finance-dashboard .rounded-2xl {
        background-color: #f0fdf4 !important;
        border-color: rgba(16, 185, 129, 0.3) !important;
      }
    `
  },
  {
    id: "banking-ui",
    name: "Banking UI",
    desc: "Secure deep imperial blue coupled with royal gold highlights, micro-borders and high contrast",
    siteColor: "orange",
    fontStyle: "display",
    isDarkMode: true,
    backgroundTheme: "deep-space",
    customColors: {
      cashDepositBg: "#d9770622",
      cashDepositBorder: "#d97706",
      settlementBg: "#b4530922",
      settlementBorder: "#b45309",
      sidebarBg: "#0a1329",
      headerBg: "#0a1329",
      cardBg: "#0e1a3a",
      accentColor: "#f59e0b",
      siteAccentColorRgb: "#d97706",
      typographyHighlightRgb: "#fbbf24",
      layoutScaleColorRgb: "#f59e0b"
    },
    customStyles: `
      .theme-banking-ui .glass-panel,
      .theme-banking-ui .rounded-2xl {
        background-color: #0e1a3a !important;
        border: 1px solid rgba(245, 158, 11, 0.25) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
        border-radius: 14px !important;
      }
      .light-mode-root.theme-banking-ui .glass-panel,
      .light-mode-root.theme-banking-ui .rounded-2xl {
        background-color: #fefbeb !important;
        border-color: rgba(217, 119, 6, 0.3) !important;
      }
    `
  },
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    desc: "Modern charts mesh interface, vivid neon violet accents, and dense data containers",
    siteColor: "violet",
    fontStyle: "mono",
    isDarkMode: true,
    backgroundTheme: "midnight-nebula",
    customColors: {
      cashDepositBg: "#8b5cf61a",
      cashDepositBorder: "#8b5cf6",
      settlementBg: "#d8b4fe1a",
      settlementBorder: "#d8b4fe",
      sidebarBg: "#0b0518",
      headerBg: "#0b0518",
      cardBg: "#110b24",
      accentColor: "#a78bfa",
      siteAccentColorRgb: "#8b5cf6",
      typographyHighlightRgb: "#c084fc",
      layoutScaleColorRgb: "#a78bfa"
    },
    customStyles: `
      .theme-analytics-dashboard .glass-panel,
      .theme-analytics-dashboard .rounded-2xl {
        background-color: #110b24 !important;
        border: 1px solid rgba(139, 92, 246, 0.35) !important;
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.1) !important;
        border-radius: 10px !important;
      }
      .light-mode-root.theme-analytics-dashboard .glass-panel,
      .light-mode-root.theme-analytics-dashboard .rounded-2xl {
        background-color: #faf5ff !important;
        border-color: rgba(139, 92, 246, 0.2) !important;
      }
    `
  },
  {
    id: "crm-dashboard",
    name: "CRM Dashboard",
    desc: "Responsive warm corporate design focusing on profile grids and custom labels",
    siteColor: "indigo",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#4f46e520",
      cashDepositBorder: "#4f46e5",
      settlementBg: "#10b98120",
      settlementBorder: "#10b981",
      sidebarBg: "#0f172a",
      headerBg: "#0f172a",
      cardBg: "#ffffff",
      accentColor: "#4f46e5",
      siteAccentColorRgb: "#4f46e5",
      typographyHighlightRgb: "#4338ca",
      layoutScaleColorRgb: "#6366f1"
    },
    customStyles: `
      .theme-crm-dashboard .glass-panel,
      .theme-crm-dashboard .rounded-2xl {
        background-color: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05) !important;
      }
      .dark-mode-root.theme-crm-dashboard .glass-panel,
      .dark-mode-root.theme-crm-dashboard .rounded-2xl {
        background-color: #1e1b4b !important;
        border-color: #2e2a75 !important;
      }
    `
  },
  {
    id: "minimal",
    name: "Minimal",
    desc: "Aesthetic high-contrast absolute simplicity, thin 1px lines, and vast breathing room",
    siteColor: "slate-grey",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#0000000a",
      cashDepositBorder: "#000000",
      settlementBg: "#0000000a",
      settlementBorder: "#000000",
      sidebarBg: "#ffffff",
      headerBg: "#ffffff",
      cardBg: "#ffffff",
      accentColor: "#000000",
      siteAccentColorRgb: "#000000",
      typographyHighlightRgb: "#000000",
      layoutScaleColorRgb: "#7f7f7f"
    },
    customStyles: `
      .theme-minimal .glass-panel,
      .theme-minimal .rounded-2xl {
        background-color: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 0px !important;
        box-shadow: none !important;
      }
      .dark-mode-root.theme-minimal .glass-panel,
      .dark-mode-root.theme-minimal .rounded-2xl {
        background-color: #0c0a0f !important;
        border-color: #1f1f1f !important;
      }
      .theme-minimal button {
        border-radius: 0px !important;
        border: 1px solid #000000 !important;
        background-color: transparent !important;
        color: #000000 !important;
      }
      .dark-mode-root.theme-minimal button {
        border-color: #ffffff !important;
        color: #ffffff !important;
      }
    `
  },
  {
    id: "elegant",
    name: "Elegant",
    desc: "Serif pairing display, deep ivory/champagne overlays and refined luxurious strokes",
    siteColor: "orange",
    fontStyle: "display",
    isDarkMode: false,
    backgroundTheme: "sunset-glow",
    customColors: {
      cashDepositBg: "#c2410c15",
      cashDepositBorder: "#c2410c",
      settlementBg: "#15803d15",
      settlementBorder: "#15803d",
      sidebarBg: "#fafaf9",
      headerBg: "#fafaf9",
      cardBg: "#f5f5f4",
      accentColor: "#78350f",
      siteAccentColorRgb: "#78350f",
      typographyHighlightRgb: "#451a03",
      layoutScaleColorRgb: "#9a3412"
    },
    customStyles: `
      .theme-elegant .glass-panel,
      .theme-elegant .rounded-2xl {
        background-color: #f5f5f4 !important;
        border: 1px solid #e7e5e4 !important;
        border-radius: 16px !important;
        font-family: Georgia, serif !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.02) !important;
      }
      .dark-mode-root.theme-elegant .glass-panel,
      .dark-mode-root.theme-elegant .rounded-2xl {
        background-color: #1c1917 !important;
        border-color: #2e2a24 !important;
      }
    `
  },
  {
    id: "premium-dark",
    name: "Premium Dark",
    desc: "Obsidian black base paired with elegant luxury velvet gold highlights",
    siteColor: "orange",
    fontStyle: "display",
    isDarkMode: true,
    backgroundTheme: "deep-space",
    customColors: {
      cashDepositBg: "#fbbf241a",
      cashDepositBorder: "#fbbf24",
      settlementBg: "#d977061a",
      settlementBorder: "#d97706",
      sidebarBg: "#050505",
      headerBg: "#050505",
      cardBg: "#0b0b0b",
      accentColor: "#fbbf24",
      siteAccentColorRgb: "#fbbf24",
      typographyHighlightRgb: "#fef08a",
      layoutScaleColorRgb: "#fbbf24"
    },
    customStyles: `
      .theme-premium-dark .glass-panel,
      .theme-premium-dark .rounded-2xl {
        background-color: #0c0c0c !important;
        border: 1px solid rgba(251, 191, 36, 0.3) !important;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.75) !important;
        border-radius: 16px !important;
      }
      .light-mode-root.theme-premium-dark .glass-panel,
      .light-mode-root.theme-premium-dark .rounded-2xl {
        background-color: #fffbeb !important;
        border-color: rgba(217, 119, 6, 0.4) !important;
      }
    `
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    desc: "Bold high-contrast radioactive yellow, neon blue lines and solid offsets",
    siteColor: "orange",
    fontStyle: "mono",
    isDarkMode: true,
    backgroundTheme: "cyberpunk-grid",
    customColors: {
      cashDepositBg: "#facc151a",
      cashDepositBorder: "#facc15",
      settlementBg: "#e9d5ff1a",
      settlementBorder: "#d8b4fe",
      sidebarBg: "#05000a",
      headerBg: "#05000a",
      cardBg: "#0f051d",
      accentColor: "#facc15",
      siteAccentColorRgb: "#facc15",
      typographyHighlightRgb: "#39ff14",
      layoutScaleColorRgb: "#ff007f"
    },
    customStyles: `
      .theme-cyberpunk .glass-panel,
      .theme-cyberpunk .rounded-2xl {
        background-color: #0f051d !important;
        border: 2px solid #ff007f !important;
        box-shadow: 4px 4px 0px #facc15 !important;
        border-radius: 0px !important;
      }
      .light-mode-root.theme-cyberpunk .glass-panel,
      .light-mode-root.theme-cyberpunk .rounded-2xl {
        background-color: #fef08a !important;
        border-color: #000000 !important;
        box-shadow: 4px 4px 0px #ff007f !important;
      }
    `
  },
  {
    id: "gaming",
    name: "Gaming Theme",
    desc: "High-octane RGB gaming layouts, metallic grids, and military green elements",
    siteColor: "emerald",
    fontStyle: "mono",
    isDarkMode: true,
    backgroundTheme: "cyber-emerald",
    customColors: {
      cashDepositBg: "#10b98122",
      cashDepositBorder: "#10b981",
      settlementBg: "#04785722",
      settlementBorder: "#047857",
      sidebarBg: "#080a0c",
      headerBg: "#080a0c",
      cardBg: "#11141b",
      accentColor: "#10b981",
      siteAccentColorRgb: "#10b981",
      typographyHighlightRgb: "#22c55e",
      layoutScaleColorRgb: "#10b981"
    },
    customStyles: `
      .theme-gaming .glass-panel,
      .theme-gaming .rounded-2xl {
        background-color: #11141b !important;
        border: 1px solid rgba(16, 185, 129, 0.4) !important;
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.15) !important;
        border-radius: 12px !important;
      }
      .light-mode-root.theme-gaming .glass-panel,
      .light-mode-root.theme-gaming .rounded-2xl {
        background-color: #ecfdf5 !important;
        border-color: #10b981 !important;
      }
    `
  },
  {
    id: "neon",
    name: "Neon Glow",
    desc: "Vaporwave glowing elements, cyan & magenta neon grids on absolute black",
    siteColor: "cyan",
    fontStyle: "mono",
    isDarkMode: true,
    backgroundTheme: "neon-shallows",
    customColors: {
      cashDepositBg: "#06b6d41a",
      cashDepositBorder: "#06b6d4",
      settlementBg: "#ec48991a",
      settlementBorder: "#ec4899",
      sidebarBg: "#000000",
      headerBg: "#000000",
      cardBg: "#05000c",
      accentColor: "#06b6d4",
      siteAccentColorRgb: "#06b6d4",
      typographyHighlightRgb: "#ec4899",
      layoutScaleColorRgb: "#a855f7"
    },
    customStyles: `
      .theme-neon .glass-panel,
      .theme-neon .rounded-2xl {
        background-color: #030008 !important;
        border: 1px solid #06b6d4 !important;
        box-shadow: 0 0 15px rgba(6, 182, 212, 0.35), inset 0 0 10px rgba(236, 72, 153, 0.1) !important;
      }
      .light-mode-root.theme-neon .glass-panel,
      .light-mode-root.theme-neon .rounded-2xl {
        background-color: #fdf2f8 !important;
        border-color: #ec4899 !important;
      }
    `
  },
  {
    id: "purple-galaxy",
    name: "Purple Galaxy",
    desc: "Cosmic stellar depths, starry outlines, nebula purple gas overlays",
    siteColor: "violet",
    fontStyle: "display",
    isDarkMode: true,
    backgroundTheme: "cosmic-void",
    customColors: {
      cashDepositBg: "#c084fc20",
      cashDepositBorder: "#c084fc",
      settlementBg: "#818cf820",
      settlementBorder: "#818cf8",
      sidebarBg: "#080315",
      headerBg: "#080315",
      cardBg: "#0e0722",
      accentColor: "#a78bfa",
      siteAccentColorRgb: "#a78bfa",
      typographyHighlightRgb: "#f472b6",
      layoutScaleColorRgb: "#c084fc"
    },
    customStyles: `
      .theme-purple-galaxy .glass-panel,
      .theme-purple-galaxy .rounded-2xl {
        background-color: #0d0521 !important;
        border: 1px solid rgba(167, 139, 250, 0.3) !important;
        box-shadow: 0 0 20px rgba(167, 139, 250, 0.15) !important;
      }
      .light-mode-root.theme-purple-galaxy .glass-panel,
      .light-mode-root.theme-purple-galaxy .rounded-2xl {
        background-color: #f5f3ff !important;
        border-color: rgba(167, 139, 250, 0.3) !important;
      }
    `
  },
  {
    id: "aurora",
    name: "Aurora Borealis",
    desc: "Northern lights dynamic glow, smooth organic green-blue atmospheric layers",
    siteColor: "emerald",
    fontStyle: "display",
    isDarkMode: true,
    backgroundTheme: "aurora-borealis",
    customColors: {
      cashDepositBg: "#0596691a",
      cashDepositBorder: "#059669",
      settlementBg: "#0891b21a",
      settlementBorder: "#0891b2",
      sidebarBg: "#01080a",
      headerBg: "#01080a",
      cardBg: "#031416",
      accentColor: "#22d3ee",
      siteAccentColorRgb: "#06b6d4",
      typographyHighlightRgb: "#34d399",
      layoutScaleColorRgb: "#22d3ee"
    },
    customStyles: `
      .theme-aurora .glass-panel,
      .theme-aurora .rounded-2xl {
        background-color: #031416 !important;
        border: 1px solid rgba(6, 182, 212, 0.25) !important;
        box-shadow: 0 8px 30px rgba(6, 182, 212, 0.1) !important;
      }
      .light-mode-root.theme-aurora .glass-panel,
      .light-mode-root.theme-aurora .rounded-2xl {
        background-color: #f0fdfa !important;
        border-color: rgba(20, 184, 166, 0.3) !important;
      }
    `
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    desc: "Teal marine deep gradient structures, aquatic overlays and fine sea outlines",
    siteColor: "cyan",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "ocean-depth",
    customColors: {
      cashDepositBg: "#0e74901a",
      cashDepositBorder: "#0e7490",
      settlementBg: "#0f766e1a",
      settlementBorder: "#0f766e",
      sidebarBg: "#01121c",
      headerBg: "#01121c",
      cardBg: "#031d2c",
      accentColor: "#38bdf8",
      siteAccentColorRgb: "#0ea5e9",
      typographyHighlightRgb: "#22d3ee",
      layoutScaleColorRgb: "#0ea5e9"
    },
    customStyles: `
      .theme-ocean-blue .glass-panel,
      .theme-ocean-blue .rounded-2xl {
        background-color: #031d2c !important;
        border: 1px solid rgba(56, 189, 248, 0.2) !important;
        box-shadow: 0 8px 32px rgba(1, 18, 28, 0.45) !important;
      }
      .light-mode-root.theme-ocean-blue .glass-panel,
      .light-mode-root.theme-ocean-blue .rounded-2xl {
        background-color: #f0f9ff !important;
        border-color: rgba(56, 189, 248, 0.3) !important;
      }
    `
  },
  {
    id: "emerald",
    name: "Emerald Luxury",
    desc: "Prestigious organic emerald and gold leaf highlights, elegant deep forest",
    siteColor: "emerald",
    fontStyle: "display",
    isDarkMode: true,
    backgroundTheme: "forest-whisper",
    customColors: {
      cashDepositBg: "#0596691a",
      cashDepositBorder: "#059669",
      settlementBg: "#15803d1a",
      settlementBorder: "#15803d",
      sidebarBg: "#02120b",
      headerBg: "#02120b",
      cardBg: "#041e12",
      accentColor: "#10b981",
      siteAccentColorRgb: "#10b981",
      typographyHighlightRgb: "#fbbf24",
      layoutScaleColorRgb: "#047857"
    },
    customStyles: `
      .theme-emerald .glass-panel,
      .theme-emerald .rounded-2xl {
        background-color: #041e12 !important;
        border: 1px solid rgba(251, 191, 36, 0.2) !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
      }
      .light-mode-root.theme-emerald .glass-panel,
      .light-mode-root.theme-emerald .rounded-2xl {
        background-color: #f0fdf4 !important;
        border-color: rgba(16, 185, 129, 0.3) !important;
      }
    `
  },
  {
    id: "sunset",
    name: "Sunset Velvet",
    desc: "Crimson volcanic orange gradients, warm golden embers and cozy shadows",
    siteColor: "orange",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "sunset-glow",
    customColors: {
      cashDepositBg: "#ea580c1a",
      cashDepositBorder: "#ea580c",
      settlementBg: "#9a34121a",
      settlementBorder: "#9a3412",
      sidebarBg: "#0f0502",
      headerBg: "#0f0502",
      cardBg: "#1f0c05",
      accentColor: "#fb923c",
      siteAccentColorRgb: "#f97316",
      typographyHighlightRgb: "#fed7aa",
      layoutScaleColorRgb: "#ea580c"
    },
    customStyles: `
      .theme-sunset .glass-panel,
      .theme-sunset .rounded-2xl {
        background-color: #1f0c05 !important;
        border: 1px solid rgba(249, 115, 22, 0.25) !important;
        box-shadow: 0 8px 30px rgba(249, 115, 22, 0.08) !important;
      }
      .light-mode-root.theme-sunset .glass-panel,
      .light-mode-root.theme-sunset .rounded-2xl {
        background-color: #fff7ed !important;
        border-color: rgba(249, 115, 22, 0.2) !important;
      }
    `
  },
  {
    id: "midnight",
    name: "Midnight Navy",
    desc: "Absolute dark twilight canvas, starry outline widgets and silver highlights",
    siteColor: "blue",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "deep-space",
    customColors: {
      cashDepositBg: "#1d4ed81a",
      cashDepositBorder: "#1d4ed8",
      settlementBg: "#1e3a8a1a",
      settlementBorder: "#1e3a8a",
      sidebarBg: "#020617",
      headerBg: "#020617",
      cardBg: "#0b1329",
      accentColor: "#3b82f6",
      siteAccentColorRgb: "#3b82f6",
      typographyHighlightRgb: "#93c5fd",
      layoutScaleColorRgb: "#1e3a8a"
    },
    customStyles: `
      .theme-midnight .glass-panel,
      .theme-midnight .rounded-2xl {
        background-color: #0b1329 !important;
        border: 1px solid rgba(59, 130, 246, 0.2) !important;
        box-shadow: 0 10px 30px rgba(1, 4, 15, 0.5) !important;
      }
      .light-mode-root.theme-midnight .glass-panel,
      .light-mode-root.theme-midnight .rounded-2xl {
        background-color: #eff6ff !important;
        border-color: rgba(59, 130, 246, 0.2) !important;
      }
    `
  },
  {
    id: "carbon-black",
    name: "Carbon Black",
    desc: "Tech carbon fiber grids, solid matte blacks and absolute dark-mode styling",
    siteColor: "slate-grey",
    fontStyle: "mono",
    isDarkMode: true,
    backgroundTheme: "bento-grid-dark",
    customColors: {
      cashDepositBg: "#1e293b22",
      cashDepositBorder: "#334155",
      settlementBg: "#0f172a22",
      settlementBorder: "#1e293b",
      sidebarBg: "#050505",
      headerBg: "#050505",
      cardBg: "#0c0c0c",
      accentColor: "#7f7f7f",
      siteAccentColorRgb: "#4b5563",
      typographyHighlightRgb: "#e5e7eb",
      layoutScaleColorRgb: "#374151"
    },
    customStyles: `
      .theme-carbon-black .glass-panel,
      .theme-carbon-black .rounded-2xl {
        background-color: #0a0a0a !important;
        border: 1px solid #1a1a1a !important;
        box-shadow: 0 10px 35px rgba(0,0,0,0.8) !important;
        border-radius: 4px !important;
      }
      .light-mode-root.theme-carbon-black .glass-panel,
      .light-mode-root.theme-carbon-black .rounded-2xl {
        background-color: #f5f5f5 !important;
        border-color: #d4d4d4 !important;
      }
    `
  },
  {
    id: "apple-inspired",
    name: "Apple Inspired",
    desc: "Crisp visual layouts, clean rounded curves, premium SF Pro alignment and shadows",
    siteColor: "blue",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#2563eb12",
      cashDepositBorder: "#2563eb",
      settlementBg: "#10b98112",
      settlementBorder: "#10b981",
      sidebarBg: "#fafafa",
      headerBg: "#fafafa",
      cardBg: "#ffffff",
      accentColor: "#0071e3",
      siteAccentColorRgb: "#0071e3",
      typographyHighlightRgb: "#1d1d1f",
      layoutScaleColorRgb: "#86868b"
    },
    customStyles: `
      .theme-apple-inspired .glass-panel,
      .theme-apple-inspired .rounded-2xl {
        background-color: #ffffff !important;
        border: 1px solid rgba(0, 0, 0, 0.05) !important;
        border-radius: 18px !important;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04) !important;
      }
      .dark-mode-root.theme-apple-inspired .glass-panel,
      .dark-mode-root.theme-apple-inspired .rounded-2xl {
        background-color: #1e1e1f !important;
        border-color: rgba(255, 255, 255, 0.06) !important;
      }
    `
  },
  {
    id: "google-material",
    name: "Google Material",
    desc: "Google Workspace flat cards, clean pastel dynamic palettes, and round widgets",
    siteColor: "indigo",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#1a73e815",
      cashDepositBorder: "#1a73e8",
      settlementBg: "#1e8e3e15",
      settlementBorder: "#1e8e3e",
      sidebarBg: "#f8f9fa",
      headerBg: "#ffffff",
      cardBg: "#ffffff",
      accentColor: "#1a73e8",
      siteAccentColorRgb: "#1a73e8",
      typographyHighlightRgb: "#202124",
      layoutScaleColorRgb: "#5f6368"
    },
    customStyles: `
      .theme-google-material .glass-panel,
      .theme-google-material .rounded-2xl {
        background-color: #ffffff !important;
        border: 1px solid #dadce0 !important;
        border-radius: 16px !important;
        box-shadow: none !important;
      }
      .dark-mode-root.theme-google-material .glass-panel,
      .dark-mode-root.theme-google-material .rounded-2xl {
        background-color: #202124 !important;
        border-color: #3c4043 !important;
      }
    `
  },
  {
    id: "microsoft-fluent",
    name: "Microsoft Fluent",
    desc: "Mica acrylic layouts, elegant Segoe typography and solid light selection indicators",
    siteColor: "blue",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "bento-grid-dark",
    customColors: {
      cashDepositBg: "#0078d415",
      cashDepositBorder: "#0078d4",
      settlementBg: "#107c4115",
      settlementBorder: "#107c41",
      sidebarBg: "#f3f3f3",
      headerBg: "#f3f3f3",
      cardBg: "#ffffff",
      accentColor: "#0078d4",
      siteAccentColorRgb: "#0078d4",
      typographyHighlightRgb: "#242424",
      layoutScaleColorRgb: "#616161"
    },
    customStyles: `
      .theme-microsoft-fluent .glass-panel,
      .theme-microsoft-fluent .rounded-2xl {
        background-color: #ffffff !important;
        border: 1px solid #e0e0e0 !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
      }
      .dark-mode-root.theme-microsoft-fluent .glass-panel,
      .dark-mode-root.theme-microsoft-fluent .rounded-2xl {
        background-color: #2d2d2d !important;
        border-color: #404040 !important;
      }
    `
  },
  {
    id: "dashboard-pro",
    name: "Dashboard Pro",
    desc: "Data-dense metrics containers, micro margin structures, and maximum contrast layout",
    siteColor: "cyan",
    fontStyle: "sans",
    isDarkMode: true,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#0ea5e915",
      cashDepositBorder: "#0ea5e9",
      settlementBg: "#10b98115",
      settlementBorder: "#10b981",
      sidebarBg: "#0b1329",
      headerBg: "#0b1329",
      cardBg: "#111a36",
      accentColor: "#00f2fe",
      siteAccentColorRgb: "#00f2fe",
      typographyHighlightRgb: "#ffffff",
      layoutScaleColorRgb: "#00f2fe"
    },
    customStyles: `
      .theme-dashboard-pro .glass-panel,
      .theme-dashboard-pro .rounded-2xl {
        background-color: #111a36 !important;
        border: 1px solid #1e293b !important;
        border-radius: 4px !important;
        box-shadow: 0 4px 6px rgba(0,0,0,0.15) !important;
      }
      .light-mode-root.theme-dashboard-pro .glass-panel,
      .light-mode-root.theme-dashboard-pro .rounded-2xl {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
    `
  },
  {
    id: "education-erp",
    name: "Education ERP",
    desc: "Playful student-friendly orange and purple highlights, rounded boards, and clear indicators",
    siteColor: "orange",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#f9731615",
      cashDepositBorder: "#f97316",
      settlementBg: "#8b5cf615",
      settlementBorder: "#8b5cf6",
      sidebarBg: "#fef8f5",
      headerBg: "#ffffff",
      cardBg: "#ffffff",
      accentColor: "#f97316",
      siteAccentColorRgb: "#f97316",
      typographyHighlightRgb: "#3b0764",
      layoutScaleColorRgb: "#f97316"
    },
    customStyles: `
      .theme-education-erp .glass-panel,
      .theme-education-erp .rounded-2xl {
        background-color: #ffffff !important;
        border: 2px solid #fed7aa !important;
        border-radius: 20px !important;
        box-shadow: 0 6px 12px rgba(249, 115, 22, 0.04) !important;
      }
      .dark-mode-root.theme-education-erp .glass-panel,
      .dark-mode-root.theme-education-erp .rounded-2xl {
        background-color: #1c0f0a !important;
        border-color: #4c1d0c !important;
      }
    `
  },
  {
    id: "hospital-erp",
    name: "Hospital ERP",
    desc: "Sterile antiseptic health blue & green structures, soft clinical card overlays",
    siteColor: "cyan",
    fontStyle: "sans",
    isDarkMode: false,
    backgroundTheme: "default",
    customColors: {
      cashDepositBg: "#0284c715",
      cashDepositBorder: "#0284c7",
      settlementBg: "#05966915",
      settlementBorder: "#059669",
      sidebarBg: "#f0fdfa",
      headerBg: "#ffffff",
      cardBg: "#ffffff",
      accentColor: "#0ea5e9",
      siteAccentColorRgb: "#0ea5e9",
      typographyHighlightRgb: "#0f172a",
      layoutScaleColorRgb: "#0ea5e9"
    },
    customStyles: `
      .theme-hospital-erp .glass-panel,
      .theme-hospital-erp .rounded-2xl {
        background-color: #ffffff !important;
        border: 1px solid #b2f5ea !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 15px rgba(13, 148, 136, 0.03) !important;
      }
      .dark-mode-root.theme-hospital-erp .glass-panel,
      .dark-mode-root.theme-hospital-erp .rounded-2xl {
        background-color: #0b1a1c !important;
        border-color: #17383a !important;
      }
    `
  },
  {
    id: "luxury-gold",
    name: "Luxury Gold",
    desc: "Ultimate royalty platinum-black and pure champagne gold leaf borders",
    siteColor: "orange",
    fontStyle: "display",
    isDarkMode: true,
    backgroundTheme: "sahara-sand",
    customColors: {
      cashDepositBg: "#fbbf2415",
      cashDepositBorder: "#fbbf24",
      settlementBg: "#78350f15",
      settlementBorder: "#78350f",
      sidebarBg: "#050402",
      headerBg: "#050402",
      cardBg: "#110f0a",
      accentColor: "#fbbf24",
      siteAccentColorRgb: "#fbbf24",
      typographyHighlightRgb: "#fef08a",
      layoutScaleColorRgb: "#b45309"
    },
    customStyles: `
      .theme-luxury-gold .glass-panel,
      .theme-luxury-gold .rounded-2xl {
        background-color: #110f0a !important;
        border: 1px solid rgba(251, 191, 36, 0.45) !important;
        box-shadow: 0 12px 40px rgba(0,0,0,0.85) !important;
        border-radius: 16px !important;
      }
      .light-mode-root.theme-luxury-gold .glass-panel,
      .light-mode-root.theme-luxury-gold .rounded-2xl {
        background-color: #fffbeb !important;
        border-color: rgba(217, 119, 6, 0.4) !important;
      }
    `
  },
  {
    id: "developer-theme",
    name: "Developer Theme",
    desc: "Dark developer IDE console with green output syntax, line highlights",
    siteColor: "emerald",
    fontStyle: "mono",
    isDarkMode: true,
    backgroundTheme: "cyber-emerald",
    customColors: {
      cashDepositBg: "#10b98115",
      cashDepositBorder: "#10b981",
      settlementBg: "#064e3b15",
      settlementBorder: "#064e3b",
      sidebarBg: "#18181b",
      headerBg: "#18181b",
      cardBg: "#09090b",
      accentColor: "#22c55e",
      siteAccentColorRgb: "#22c55e",
      typographyHighlightRgb: "#4ade80",
      layoutScaleColorRgb: "#27272a"
    },
    customStyles: `
      .theme-developer-theme .glass-panel,
      .theme-developer-theme .rounded-2xl {
        background-color: #09090b !important;
        border: 1px solid #27272a !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
      }
      .light-mode-root.theme-developer-theme .glass-panel,
      .light-mode-root.theme-developer-theme .rounded-2xl {
        background-color: #f4f4f5 !important;
        border-color: #d4d4d8 !important;
      }
    `
  },
  {
    id: "terminal-theme",
    name: "Terminal Theme",
    desc: "Monochrome phosphor retro console CRT glow, blinking cursor, scanlines",
    siteColor: "emerald",
    fontStyle: "mono",
    isDarkMode: true,
    backgroundTheme: "cyber-emerald",
    customColors: {
      cashDepositBg: "#22c55e20",
      cashDepositBorder: "#22c55e",
      settlementBg: "#15803d20",
      settlementBorder: "#15803d",
      sidebarBg: "#020402",
      headerBg: "#020402",
      cardBg: "#000000",
      accentColor: "#22c55e",
      siteAccentColorRgb: "#22c55e",
      typographyHighlightRgb: "#39ff14",
      layoutScaleColorRgb: "#15803d"
    },
    customStyles: `
      .theme-terminal-theme .glass-panel,
      .theme-terminal-theme .rounded-2xl,
      .theme-terminal-theme button,
      .theme-terminal-theme input,
      .theme-terminal-theme select {
        background-color: #000000 !important;
        border: 2px solid #22c55e !important;
        border-radius: 0px !important;
        color: #39ff14 !important;
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.25) !important;
        text-shadow: 0 0 4px rgba(57, 255, 20, 0.5) !important;
      }
      .light-mode-root.theme-terminal-theme .glass-panel,
      .light-mode-root.theme-terminal-theme .rounded-2xl {
        background-color: #f0fdf4 !important;
        border-color: #15803d !important;
        color: #14532d !important;
      }
      .light-mode-root.theme-terminal-theme button,
      .light-mode-root.theme-terminal-theme input,
      .light-mode-root.theme-terminal-theme select {
        background-color: #ffffff !important;
        border: 2px solid #16a34a !important;
        color: #14532d !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
    `
  }
];
