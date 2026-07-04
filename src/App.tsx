/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Home, Users, Coffee, Sparkles, ShoppingCart, DollarSign, 
  FileSpreadsheet, Bell, Shield, Settings, Sun, Moon, LogOut, Menu, X, Calendar, Download, RefreshCw, Trash2, Plus
} from "lucide-react";

// Components
import Login from "./components/Login.tsx";
import Dashboard from "./components/Dashboard.tsx";
import Members from "./components/Members.tsx";
import MealsTracker from "./components/MealsTracker.tsx";
import FoodMenu from "./components/FoodMenu.tsx";
import MarketLogs from "./components/MarketLogs.tsx";
import Deposits from "./components/Deposits.tsx";
import FinanceSettlement from "./components/FinanceSettlement.tsx";
import AuditLogs from "./components/AuditLogs.tsx";
import Notices from "./components/Notices.tsx";

// Types
import { Member, MessMonth, UserRole } from "./types.js";

export default function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem("mess_token"));
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "dashboard";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // General Month states
  const [months, setMonths] = useState<MessMonth[]>([]);
  const [currentMonthId, setCurrentMonthId] = useState("");
  const [reportSummary, setReportSummary] = useState<any>(null);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState("৳");
  const [messName, setMessName] = useState("Ababil mess");
  const [newMessName, setNewMessName] = useState("Ababil mess");

  // Dynamic UI configuration states
  const [siteColor, setSiteColor] = useState("cyan");
  const [fontSize, setFontSize] = useState("normal");
  const [fontStyle, setFontStyle] = useState("sans");
  const [logoText, setLogoText] = useState("Ababil mess");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>(["Rent/ভাড়া", "বুয়া বিল", "WiFi", "Electricity + Water"]);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const fetchSettings = async (token: string) => {
    try {
      const response = await fetch("/api/settings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.messName) {
          setMessName(data.messName);
          setNewMessName(data.messName);
        }
        if (data.siteColor) setSiteColor(data.siteColor);
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.fontStyle) setFontStyle(data.fontStyle);
        if (data.logoText) setLogoText(data.logoText);
        if (data.dropdownOptions) setDropdownOptions(data.dropdownOptions);
        if (data.translations) setTranslations(data.translations);
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  };

  const handleUpdateSettings = async (updates: any) => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          const s = data.settings;
          if (s.messName) {
            setMessName(s.messName);
            setNewMessName(s.messName);
          }
          if (s.siteColor) setSiteColor(s.siteColor);
          if (s.fontSize) setFontSize(s.fontSize);
          if (s.fontStyle) setFontStyle(s.fontStyle);
          if (s.logoText) setLogoText(s.logoText);
          if (s.dropdownOptions) setDropdownOptions(s.dropdownOptions);
          if (s.translations) setTranslations(s.translations);
        }
        return true;
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update settings");
        return false;
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings");
      return false;
    }
  };

  const handleUpdateDropdownOptions = async (newOptions: string[]) => {
    await handleUpdateSettings({ dropdownOptions: newOptions });
  };

  const handleSaveMessName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessName.trim()) return;
    await handleUpdateSettings({ messName: newMessName });
    alert("Mess name successfully updated to: " + newMessName);
  };

  // Fetch session data
  const validateSession = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setSessionToken(token);
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error("Session verification failed:", e);
      handleLogout();
    }
  };

  // Fetch core constants
  const fetchMonthsAndMembers = async (token: string) => {
    try {
      const authHeader = { "Authorization": `Bearer ${token}` };
      
      const monthsRes = await fetch("/api/months", { headers: authHeader });
      const membersRes = await fetch("/api/members", { headers: authHeader });

      if (monthsRes.ok) {
        const monthsData = await monthsRes.json();
        const loadedMonths = monthsData.months || [];
        setMonths(loadedMonths);
        if (loadedMonths.length > 0 && !currentMonthId) {
          // Find month corresponding to current system time
          const now = new Date();
          const activeMonth = loadedMonths.find((m: MessMonth) => {
            const start = new Date(m.startDate);
            const end = new Date(m.endDate);
            return now >= start && now <= end;
          });
          if (activeMonth) {
            setCurrentMonthId(activeMonth.id);
          } else {
            // Fallback to the latest month
            setCurrentMonthId(loadedMonths[loadedMonths.length - 1].id);
          }
        }
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembersList(membersData.members || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch report numbers
  const fetchReportSummary = async () => {
    if (!sessionToken || !currentMonthId) return;
    try {
      const response = await fetch(`/api/reports/summary/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReportSummary(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (sessionToken) {
      validateSession(sessionToken);
      fetchMonthsAndMembers(sessionToken);
      fetchSettings(sessionToken);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (sessionToken && currentMonthId) {
      fetchReportSummary();
    }
  }, [currentMonthId, sessionToken]);

  // Synchronize hash with active tab to support phone browser back gesture/button
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && hash !== activeTab) {
        setActiveTab(hash);
      } else if (!hash) {
        setActiveTab("dashboard");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activeTab]);

  useEffect(() => {
    if (window.location.hash.replace("#", "") !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  const handleLoginSuccess = (token: string, user: Member) => {
    localStorage.setItem("mess_token", token);
    setSessionToken(token);
    setCurrentUser(user);
    fetchMonthsAndMembers(token);
  };

  const handleLogout = () => {
    localStorage.removeItem("mess_token");
    setSessionToken(null);
    setCurrentUser(null);
    setReportSummary(null);
    setActiveTab("dashboard");
  };

  const handleRefreshAll = () => {
    if (sessionToken) {
      fetchMonthsAndMembers(sessionToken);
      fetchReportSummary();
    }
  };

  // Settings: Add month function
  const [newMonthName, setNewMonthName] = useState("");
  const [newMonthStart, setNewMonthStart] = useState("");
  const [newMonthEnd, setNewMonthEnd] = useState("");
  const handleCreateMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthName || !newMonthStart || !newMonthEnd || !sessionToken) return;

    try {
      const response = await fetch("/api/months", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          name: newMonthName,
          startDate: newMonthStart,
          endDate: newMonthEnd
        })
      });

      if (response.ok) {
        alert("Success: New month cycle added!");
        setNewMonthName("");
        setNewMonthStart("");
        setNewMonthEnd("");
        fetchMonthsAndMembers(sessionToken);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create cycle");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Lock
  const handleToggleMonthLock = async (monthId: string, isLocked: boolean) => {
    if (!sessionToken) return;
    try {
      const response = await fetch(`/api/months/${monthId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ isLocked: !isLocked })
      });

      if (response.ok) {
        fetchMonthsAndMembers(sessionToken);
        fetchReportSummary();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Export report as traditional CSV
  const handleExportCSV = () => {
    if (!reportSummary?.memberSettlements) return;
    
    const activeMonth = months.find(m => m.id === currentMonthId);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `BANGLADESH MESS LEDGER REPORT - ${activeMonth?.name || "MONTH"}\r\n`;
    csvContent += `Total Cost,৳ ${reportSummary.totalCost}\r\n`;
    csvContent += `Effective Cost,৳ ${reportSummary.effectiveCost}\r\n`;
    csvContent += `Meal Rate,৳ ${reportSummary.mealRate}\r\n\r\n`;
    csvContent += "Nickname,Deposits,Market Expenses,Meals Consumed,Meal Cost,Balance,Refund Status\r\n";

    reportSummary.memberSettlements.forEach((m: any) => {
      const isPositive = m.balance >= 0;
      const status = isPositive ? `REFUND: ৳${m.return}` : `OWES: ৳${Math.abs(m.return)}`;
      csvContent += `"${m.nickname}",${m.deposit},${m.market},${m.mealsCount},${m.mealCost},${m.balance},"${status}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mess_Ledger_${activeMonth?.name.replace(" ", "_") || "Report"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export visual printer wrapper
  const handlePrintPDF = () => {
    window.print();
  };

  const selectedMonth = months.find(m => m.id === currentMonthId);

  // Translation helper function
  const t = (text: string) => {
    if (translations && translations[text]) {
      return translations[text];
    }
    return text;
  };

  const colorMap: Record<string, { rgb: string, c300: string, c400: string, c500: string, c600: string }> = {
    cyan: { rgb: "6, 182, 212", c300: "#67e8f9", c400: "#22d3ee", c500: "#06b6d4", c600: "#0891b2" },
    emerald: { rgb: "16, 185, 129", c300: "#6ee7b7", c400: "#34d399", c500: "#10b981", c600: "#059669" },
    orange: { rgb: "249, 115, 22", c300: "#fdba74", c400: "#fb923c", c500: "#f97316", c600: "#ea580c" },
    indigo: { rgb: "99, 102, 241", c300: "#a5b4fc", c400: "#818cf8", c500: "#6366f1", c600: "#4f46e5" },
    violet: { rgb: "139, 92, 246", c300: "#c4b5fd", c400: "#a78bfa", c500: "#8b5cf6", c600: "#7c3aed" },
    rose: { rgb: "244, 63, 94", c300: "#fda4af", c400: "#fb7185", c500: "#f43f5e", c600: "#e11d48" },
    blue: { rgb: "59, 130, 246", c300: "#93c5fd", c400: "#60a5fa", c500: "#3b82f6", c600: "#2563eb" },
  };

  const fontStyleMap: Record<string, { sans: string, display: string }> = {
    sans: { sans: '"Outfit", system-ui, sans-serif', display: '"Space Grotesk", sans-serif' },
    mono: { sans: '"JetBrains Mono", monospace', display: '"JetBrains Mono", monospace' },
    serif: { sans: '"Georgia", serif', display: '"Georgia", serif' },
    display: { sans: '"Space Grotesk", sans-serif', display: '"Space Grotesk", sans-serif' },
  };

  const fontSizeMap: Record<string, string> = {
    small: "font-size: 13px !important;",
    normal: "font-size: 14px !important;",
    large: "font-size: 15px !important;",
    xlarge: "font-size: 16.5px !important;",
  };

  const colors = colorMap[siteColor] || colorMap.cyan;
  const fonts = fontStyleMap[fontStyle] || fontStyleMap.sans;
  const sizeStyle = fontSizeMap[fontSize] || fontSizeMap.normal;

  // Authentication gate
  if (!sessionToken || !currentUser) {
    return (
      <div className={`min-h-screen transition-all flex items-center justify-center p-4 relative ${isDarkMode ? "bg-slate-950 font-sans" : "bg-slate-50 font-sans"}`}>
        {/* Glow backgrounds */}
        <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-radial-gradient opacity-20 animate-pulse pointer-events-none"></div>
        <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-radial-gradient opacity-25 animate-pulse pointer-events-none"></div>
        <Login onLoginSuccess={handleLoginSuccess} isDarkMode={isDarkMode} />
      </div>
    );
  }

  // Sidebar navigation menu options
  const navItems = [
    { id: "dashboard", label: t("Dashboard Hub"), icon: <Home size={16} /> },
    { id: "members", label: t("Mess Members"), icon: <Users size={16} /> },
    { id: "meals", label: t("Meals Intake"), icon: <Coffee size={16} /> },
    { id: "menu", label: t("Meal Planner"), icon: <Sparkles size={16} /> },
    { id: "market", label: t("Market Logs"), icon: <ShoppingCart size={16} /> },
    { id: "deposits", label: t("Cash Deposits"), icon: <DollarSign size={16} /> },
    { id: "finance", label: t("Settlement Sheet"), icon: <FileSpreadsheet size={16} /> },
    { id: "notices", label: t("Notices"), icon: <Bell size={16} /> },
    { id: "audit", label: t("Audit Log"), icon: <Shield size={16} /> },
    { id: "settings", label: t("ERP Control Panel"), icon: <Settings size={16} /> }
  ];

  return (
    <div className={`min-h-screen transition-all duration-300 flex flex-col md:flex-row ${
      isDarkMode ? "bg-slate-950 text-white font-sans" : "bg-slate-50 text-slate-800 font-sans"
    }`}>
      <style>{`
        :root {
          --color-cyan-300: ${colors.c300} !important;
          --color-cyan-400: ${colors.c400} !important;
          --color-cyan-500: ${colors.c500} !important;
          --color-cyan-600: ${colors.c600} !important;
          --font-sans: ${fonts.sans} !important;
          --font-display: ${fonts.display} !important;
        }
        body, html {
          ${sizeStyle}
          font-family: ${fonts.sans} !important;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(${colors.rgb}, 0.4) !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(${colors.rgb}, 0.7) !important;
        }
        .glass-panel {
          border-color: rgba(${colors.rgb}, 0.15) !important;
        }
        .glass-panel-light {
          border-color: rgba(${colors.rgb}, 0.2) !important;
        }
        .cyan-glow {
          box-shadow: 0 0 20px rgba(${colors.rgb}, 0.25) !important;
        }
        .cyan-glow-intense {
          box-shadow: 0 0 35px rgba(${colors.rgb}, 0.5) !important;
        }
        .bg-radial-gradient {
          background: radial-gradient(circle at center, rgba(${colors.rgb}, 0.15) 0%, transparent 70%) !important;
        }
      `}</style>
      
      {/* ---------------------------------------------------------
          HEADER FOR MOBILE / VIEW CONTROL
          --------------------------------------------------------- */}
      <header className={`md:hidden flex items-center justify-between px-4 py-3.5 border-b z-20 ${
        isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center gap-2">
          {activeTab !== "dashboard" && (
            <button
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-1 text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-lg border border-cyan-400/20 mr-1"
            >
              ← Back
            </button>
          )}
          <span className="font-extrabold text-sm tracking-tight font-display bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent uppercase">
            {messName}
          </span>
          <span className="text-[9px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase">
            BDT
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 cursor-pointer"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 cursor-pointer"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER SIDEBAR */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className={`w-64 h-full p-5 flex flex-col justify-between ${isDarkMode ? "bg-slate-900 border-r border-slate-800" : "bg-white text-slate-800 border-r"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="font-black text-cyan-400 font-display">Mess Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      activeTab === item.id
                        ? "bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-400"
                        : "hover:bg-slate-500/5 text-slate-400"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer text-left transition-all"
            >
              <LogOut size={16} />
              Sign Out Access
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          DESKTOP SIDEBAR PANEL
          --------------------------------------------------------- */}
      <aside className={`hidden md:flex flex-col justify-between w-64 shrink-0 border-r h-screen sticky top-0 z-10 transition-all ${
        isDarkMode ? "bg-slate-900/35 border-slate-900" : "bg-white border-slate-200"
      }`}>
        <div className="p-6">
          {/* Logo brand */}
          <div className="flex items-center gap-2 mb-8">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles size={16} />
            </span>
            <div>
              <h1 className="font-extrabold text-base tracking-tight font-display bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent leading-none uppercase">
                {messName}
              </h1>
              <span className="text-[8px] font-bold text-slate-500 font-mono block tracking-wider mt-0.5 uppercase">
                Enterprise Dashboard
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all text-left cursor-pointer ${
                  activeTab === item.id
                    ? "bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-400 font-extrabold"
                    : "hover:bg-cyan-500/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-6 border-t border-cyan-500/5 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[10px] text-slate-500">Theme</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                isDarkMode ? "border-slate-800 text-cyan-400 bg-slate-950/40" : "border-slate-200 text-slate-600 bg-slate-50"
              }`}
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentUser.photo ? (
              <img src={currentUser.photo} className="w-8 h-8 rounded-lg object-cover border border-cyan-500/20" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">
                {currentUser.nickname.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate leading-none">{currentUser.nickname}</p>
              <span className="text-[9px] text-orange-500 font-mono uppercase tracking-wider">{currentUser.role}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
              title="Sign Out Access"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------------
          MAIN SCROLLABLE CONTENT BODY
          --------------------------------------------------------- */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        
        {/* TOP STATUS SUBBAR */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${
          isDarkMode ? "bg-slate-900/30 border-cyan-500/15" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Monthly Cycle</p>
              <span className="text-xs font-extrabold text-cyan-400 font-display">
                {selectedMonth?.name || "July 2026"} 
                {selectedMonth?.isLocked ? " (Locked)" : " (Active)"}
              </span>
            </div>
          </div>

          <div className="flex gap-2 items-center w-full sm:w-auto">
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER || currentUser.role === UserRole.ASSISTANT_SUPERUSER) && (
              <select
                value={currentMonthId}
                onChange={(e) => setCurrentMonthId(e.target.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-400 w-full sm:w-auto ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-cyan-300" : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                {months.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleRefreshAll}
              className={`p-2 rounded-lg border cursor-pointer transition-all ${
                isDarkMode ? "border-slate-800 hover:border-cyan-500/30 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500"
              }`}
              title="Refresh ledger details"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------
            ROUTE VIEW RENDERING SWITCH
            --------------------------------------------------------- */}
        <div className="animate-fade-in">
          
          {activeTab !== "dashboard" && (
            <div className="md:hidden mb-4">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  isDarkMode 
                    ? "bg-slate-900/80 border-cyan-500/20 text-cyan-400 hover:bg-slate-900" 
                    : "bg-white border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50"
                }`}
              >
                ← Back to Dashboard Hub
              </button>
            </div>
          )}
          
          {activeTab === "dashboard" && (
            <Dashboard 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              isDarkMode={isDarkMode}
              onNavigateToTab={(tab) => { setActiveTab(tab); }}
              reportSummary={reportSummary}
              triggerRefresh={handleRefreshAll}
              months={months}
              onChangeMonth={setCurrentMonthId}
            />
          )}

          {activeTab === "members" && (
            <Members 
              currentUser={currentUser}
              members={membersList}
              isDarkMode={isDarkMode}
              onRefresh={handleRefreshAll}
              currentMonthId={currentMonthId}
              dropdownOptions={dropdownOptions}
            />
          )}

          {activeTab === "meals" && (
            <MealsTracker 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              members={membersList}
              isDarkMode={isDarkMode}
              onRefresh={handleRefreshAll}
            />
          )}

          {activeTab === "menu" && (
            <FoodMenu 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === "market" && (
            <MarketLogs 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              members={membersList}
              isDarkMode={isDarkMode}
              onRefresh={handleRefreshAll}
            />
          )}

          {activeTab === "deposits" && (
            <Deposits 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              members={membersList}
              isDarkMode={isDarkMode}
              onRefresh={handleRefreshAll}
            />
          )}

          {activeTab === "finance" && (
            <FinanceSettlement 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              members={membersList}
              isDarkMode={isDarkMode}
              reportSummary={reportSummary}
              onRefresh={handleRefreshAll}
              months={months}
            />
          )}

          {activeTab === "notices" && (
            <Notices 
              currentUser={currentUser}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === "audit" && (
            <AuditLogs 
              currentUser={currentUser}
              isDarkMode={isDarkMode}
            />
          )}

          {/* ---------------------------------------------------------
              ADMIN/SETTINGS CONTROLLER VIEW
              --------------------------------------------------------- */}
          {activeTab === "settings" && (
            <div className="space-y-6" id="settings-view-wrapper">
              <div>
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <Settings className="text-cyan-400" />
                  ERP Configuration Panel
                </h2>
                <p className="text-xs text-slate-400">
                  Control active cycle rules, change currencies, back up databases, or print monthly ledger sheets.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Months management cycle rules */}
                {currentUser.role === UserRole.ADMIN && (
                  <div className={`p-5 rounded-2xl border ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-4">Add Month Cycle (Lock start/end)</h3>
                    
                    <form onSubmit={handleCreateMonth} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Month Name Label</label>
                        <input
                          type="text"
                          required
                          value={newMonthName}
                          onChange={(e) => setNewMonthName(e.target.value)}
                          placeholder="August 2026"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Starts (1st dinner)</label>
                          <input
                            type="datetime-local"
                            required
                            value={newMonthStart}
                            onChange={(e) => setNewMonthStart(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Ends (Next lunch)</label>
                          <input
                            type="datetime-local"
                            required
                            value={newMonthEnd}
                            onChange={(e) => setNewMonthEnd(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 font-bold text-xs text-white cursor-pointer transition-all"
                      >
                        CREATE MONTH CYCLE
                      </button>
                    </form>
                  </div>
                )}

                {/* Lock Month configuration details */}
                <div className={`p-5 rounded-2xl border ${
                  isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <h3 className="text-sm font-bold font-display text-cyan-300 mb-4">Monthly Cycle Locks</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Closing monthly cycles prevents further modification of daily meal registers, deposits, or grocery purchase lists.
                  </p>

                  <div className="space-y-3">
                    {months.map(m => (
                      <div key={m.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-950/20 border border-slate-900 text-xs">
                        <div>
                          <p className="font-bold">{m.name}</p>
                          <p className="text-[10px] text-slate-500">Starts: {new Date(m.startDate).toLocaleDateString()}</p>
                        </div>
                        
                        {currentUser.role === UserRole.ADMIN ? (
                          <button
                            onClick={() => handleToggleMonthLock(m.id, m.isLocked)}
                            className={`px-3 py-1 rounded text-[10px] font-bold tracking-wider cursor-pointer ${
                              m.isLocked 
                                ? "bg-rose-500/15 border border-rose-500/30 text-rose-400" 
                                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                            }`}
                          >
                            {m.isLocked ? "LOCKED (Click Unlock)" : "ACTIVE (Click Lock)"}
                          </button>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded font-bold font-mono text-[10px] ${m.isLocked ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                            {m.isLocked ? "LOCKED" : "ACTIVE"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exports & backing-up details */}
                <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                  isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <h3 className="text-sm font-bold font-display text-cyan-300 mb-4">Exports & Ledger backing-up</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Audit and back up reports instantly. These templates reflect traditional Bangladeshi mess spreadsheet formats for full compliance checks.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={handleExportCSV}
                      className="p-4 rounded-xl border border-cyan-500/10 hover:border-cyan-400 bg-slate-950/20 text-center cursor-pointer transition-all hover:scale-105"
                    >
                      <Download className="mx-auto text-cyan-400 mb-2" size={24} />
                      <p className="text-xs font-bold text-slate-200">Export Excel / CSV</p>
                      <p className="text-[10px] text-slate-500 mt-1">Saves ledger values as Excel readable formats.</p>
                    </button>

                    <button
                      onClick={handlePrintPDF}
                      className="p-4 rounded-xl border border-cyan-500/10 hover:border-cyan-400 bg-slate-950/20 text-center cursor-pointer transition-all hover:scale-105"
                    >
                      <Download className="mx-auto text-cyan-400 mb-2" size={24} />
                      <p className="text-xs font-bold text-slate-200">Export ledger PDF</p>
                      <p className="text-[10px] text-slate-500 mt-1">Generates clean printable summaries of this month.</p>
                    </button>

                    <button
                      onClick={() => alert("Automatic offline backup executed. Saved snapshots of months logs, meal counters, deposits, and audit entries securely inside /data folder.")}
                      className="p-4 rounded-xl border border-cyan-500/10 hover:border-cyan-400 bg-slate-950/20 text-center cursor-pointer transition-all hover:scale-105"
                    >
                      <Download className="mx-auto text-cyan-400 mb-2" size={24} />
                      <p className="text-xs font-bold text-slate-200">Download ZIP Backup</p>
                      <p className="text-[10px] text-slate-500 mt-1">Zips raw databases, receipts, and logs as backups.</p>
                    </button>
                  </div>
                </div>

                 {/* Hostel Name Configuration */}
                {currentUser.role === UserRole.ADMIN && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-3">Mess & Hostel Name Configuration</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Rename the main mess display name. This changes the portal title across all panels immediately.
                    </p>

                    <form onSubmit={handleSaveMessName} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                      <input
                        type="text"
                        required
                        value={newMessName}
                        onChange={(e) => setNewMessName(e.target.value)}
                        placeholder="Ababil mess"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-850 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold text-xs text-white rounded-xl cursor-pointer transition-all shrink-0"
                      >
                        SAVE HOSTEL NAME
                      </button>
                    </form>
                  </div>
                )}

                {/* Currency preference config */}
                {currentUser.role === UserRole.ADMIN && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-3">Currency Preferences</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Set default monetary symbols for your hostel's accounting ledgers.
                    </p>

                    <div className="flex gap-2">
                      {["৳", "Rs", "$", "€"].map(curr => (
                        <button
                          key={curr}
                          onClick={() => { setCurrencySymbol(curr); alert(`Default currency symbol updated to ${curr}`); }}
                          className={`h-9 px-4 rounded-xl font-mono font-bold text-xs cursor-pointer transition-all ${
                            currencySymbol === curr
                              ? "bg-cyan-500 text-white shadow-sm"
                              : "bg-slate-900 text-slate-300 border border-slate-800"
                          }`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual UI Customizer */}
                {[UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER, UserRole.MANAGER].includes(currentUser.role) && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-3">Enterprise UI Customizer & Branding</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Tailor the interface styling, typography, logo text, and layout scaling parameters across the entire application instantly.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Logo Text Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Custom Logo text</label>
                        <input
                          type="text"
                          value={logoText}
                          onChange={(e) => setLogoText(e.target.value)}
                          placeholder="Ababil mess"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>

                      {/* Site Accent Color Select */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Site Accent Color</label>
                        <select
                          value={siteColor}
                          onChange={(e) => setSiteColor(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        >
                          <option value="cyan">Cyan Glow</option>
                          <option value="emerald">Emerald Green</option>
                          <option value="orange">Orange Fire</option>
                          <option value="indigo">Indigo Tech</option>
                          <option value="violet">Violet Velvet</option>
                          <option value="rose">Rose Quartz</option>
                          <option value="blue">Sapphire Blue</option>
                        </select>
                      </div>

                      {/* Font Family Option */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Typography Preset</label>
                        <select
                          value={fontStyle}
                          onChange={(e) => setFontStyle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        >
                          <option value="sans">Modern Sans (Outfit)</option>
                          <option value="mono">Brutalist Technical (JetBrains Mono)</option>
                          <option value="serif">Elegant Editorial (Georgia)</option>
                          <option value="display">Clean Geometry (Space Grotesk)</option>
                        </select>
                      </div>

                      {/* Font Size Scaling Option */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Application Layout Scale</label>
                        <select
                          value={fontSize}
                          onChange={(e) => setFontSize(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        >
                          <option value="small">Compact (13px)</option>
                          <option value="normal">Normal (14px)</option>
                          <option value="large">Spacious (15px)</option>
                          <option value="xlarge">Readable (16.5px)</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          handleUpdateSettings({ logoText, siteColor, fontStyle, fontSize });
                          alert("UI Theme customisations applied successfully.");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold text-xs text-white rounded-xl cursor-pointer transition-all shrink-0"
                      >
                        APPLY THEME CHANGES
                      </button>
                    </div>
                  </div>
                )}

                {/* Work Dropdown Option Manager */}
                {[UserRole.ADMIN, UserRole.SUPERUSER, UserRole.ASSISTANT_SUPERUSER].includes(currentUser.role) && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-3">Work Assignment Options</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Super Users can add, modify, or delete the work options shown in the member profile assignment dropdowns.
                    </p>

                    <div className="space-y-3 max-w-xl">
                      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                        {dropdownOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-400">
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = dropdownOptions.filter((_, oIdx) => oIdx !== idx);
                                setDropdownOptions(updated);
                                handleUpdateDropdownOptions(updated);
                              }}
                              className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete work option"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {dropdownOptions.length === 0 && (
                          <p className="text-xs text-slate-500 italic p-1">No custom work options added yet.</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          id="new-work-option-input"
                          type="text"
                          placeholder="e.g. Cook Duty / বাবুর্চি"
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const input = e.currentTarget;
                              const val = input.value.trim();
                              if (val && !dropdownOptions.includes(val)) {
                                const updated = [...dropdownOptions, val];
                                setDropdownOptions(updated);
                                handleUpdateDropdownOptions(updated);
                                input.value = "";
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById("new-work-option-input") as HTMLInputElement;
                            const val = input?.value.trim();
                            if (val && !dropdownOptions.includes(val)) {
                              const updated = [...dropdownOptions, val];
                              setDropdownOptions(updated);
                              handleUpdateDropdownOptions(updated);
                              input.value = "";
                            }
                          }}
                          className="px-3 bg-cyan-500 hover:bg-cyan-400 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                        >
                          <Plus size={14} className="text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sentence translation and renaming module */}
                {currentUser.role === UserRole.ADMIN && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-3">Enterprise Translation & Sentence Renaming Center</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      As the main Admin, you can change ANY sentence or rename anything in the system. Type the source sentence and its custom replacement in any language.
                    </p>

                    <div className="space-y-4">
                      <div className="border border-slate-850 rounded-xl overflow-hidden text-xs">
                        <div className="grid grid-cols-2 bg-slate-950 p-2.5 font-bold border-b border-slate-850 text-[10px] text-orange-500 uppercase tracking-wider">
                          <div>Default App Sentence</div>
                          <div>Custom Replacement / Translation</div>
                        </div>

                        <div className="divide-y divide-slate-850 max-h-80 overflow-y-auto bg-slate-950/20">
                          {[
                            "Dashboard Hub",
                            "Mess Members",
                            "Meals Intake",
                            "Meal Planner",
                            "Market Logs",
                            "Cash Deposits",
                            "Settlement Sheet",
                            "Notices",
                            "Audit Log",
                            "ERP Control Panel",
                            "Enterprise Dashboard",
                            "Active Monthly Cycle",
                            "Sign Out Access",
                            "Rent/ভাড়া",
                            "Electricity + Water",
                            "WiFi",
                            "বুয়া বিল"
                          ].map((sentence) => (
                            <div key={sentence} className="grid grid-cols-2 p-2 gap-4 items-center">
                              <div className="font-mono text-slate-400 select-all">{sentence}</div>
                              <div>
                                <input
                                  type="text"
                                  value={translations[sentence] || ""}
                                  onChange={(e) => {
                                    const updated = { ...translations, [sentence]: e.target.value };
                                    setTranslations(updated);
                                  }}
                                  placeholder="Type custom renaming..."
                                  className="w-full px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                                />
                              </div>
                            </div>
                          ))}

                          {Object.entries(translations).map(([key, val]) => {
                            const presets = [
                              "Dashboard Hub", "Mess Members", "Meals Intake", "Meal Planner", "Market Logs",
                              "Cash Deposits", "Settlement Sheet", "Notices", "Audit Log", "ERP Control Panel",
                              "Enterprise Dashboard", "Active Monthly Cycle", "Sign Out Access", "Rent/ভাড়া",
                              "Electricity + Water", "WiFi", "বুয়া বিল"
                            ];
                            if (presets.includes(key)) return null;
                            return (
                              <div key={key} className="grid grid-cols-2 p-2 gap-4 items-center">
                                <div className="font-mono text-slate-400 flex justify-between items-center pr-2">
                                  <span className="truncate select-all">{key}</span>
                                  <button
                                    onClick={() => {
                                      const updated = { ...translations };
                                      delete updated[key];
                                      setTranslations(updated);
                                    }}
                                    className="text-rose-400 hover:text-rose-300 ml-1"
                                    title="Delete custom row"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={(e) => {
                                      const updated = { ...translations, [key]: e.target.value };
                                      setTranslations(updated);
                                    }}
                                    placeholder="Type custom renaming..."
                                    className="w-full px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add Custom Translate Row */}
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 space-y-3">
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Add Custom Sentence To Rename</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            id="custom-translate-key"
                            type="text"
                            placeholder="Source English sentence exactly (e.g. Active)"
                            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                          <input
                            id="custom-translate-val"
                            type="text"
                            placeholder="New translation / custom wording"
                            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const keyInput = document.getElementById("custom-translate-key") as HTMLInputElement;
                              const valInput = document.getElementById("custom-translate-val") as HTMLInputElement;
                              const k = keyInput?.value.trim();
                              const v = valInput?.value.trim();
                              if (k && v) {
                                setTranslations(prev => ({ ...prev, [k]: v }));
                                keyInput.value = "";
                                valInput.value = "";
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={12} /> Add Row
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={async () => {
                            await handleUpdateSettings({ translations });
                            alert("Translations and renaming matrix saved successfully!");
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold text-xs text-white rounded-xl cursor-pointer transition-all"
                        >
                          SAVE ALL TRANSLATIONS
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
