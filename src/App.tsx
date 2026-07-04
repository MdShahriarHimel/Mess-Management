/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Home, Users, Coffee, Sparkles, ShoppingCart, DollarSign, 
  FileSpreadsheet, Bell, Shield, Settings, Sun, Moon, LogOut, Menu, X, Calendar, Download, RefreshCw, Trash2, Plus, Upload
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

const AmbientAnimationOverlay = ({ animations }: { animations: { enableEffect: boolean, effectType: string, animationSpeed: string } }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!animations.enableEffect || animations.effectType === "none" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const speedMultiplier = animations.animationSpeed === "slow" ? 0.5 : animations.animationSpeed === "fast" ? 2 : 1;

    if (animations.effectType === "matrix") {
      const columns = Math.floor(width / 20) + 1;
      const yPositions = Array(columns).fill(0);

      const render = () => {
        ctx.fillStyle = "rgba(10, 15, 30, 0.08)";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#22d3ee";
        ctx.font = "14px monospace";

        for (let i = 0; i < yPositions.length; i++) {
          const text = String.fromCharCode(33 + Math.floor(Math.random() * 93));
          const x = i * 20;
          const y = yPositions[i];
          ctx.fillText(text, x, y);

          if (y > 100 + Math.random() * 10000) {
            yPositions[i] = 0;
          } else {
            yPositions[i] += 15 * speedMultiplier;
          }
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "confetti") {
      const particleCount = 45;
      const particles: Array<{ x: number, y: number, r: number, d: number, color: string, tilt: number, tiltAngle: number }> = [];
      const colors = ["#22d3ee", "#f43f5e", "#10b981", "#fb923c", "#a78bfa", "#60a5fa"];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height - height,
          r: Math.random() * 4 + 4,
          d: Math.random() * particleCount,
          color: colors[Math.floor(Math.random() * colors.length)],
          tilt: Math.random() * 10 - 5,
          tiltAngle: 0
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
          ctx.stroke();

          p.tiltAngle += 0.05 * speedMultiplier;
          p.y += (Math.cos(p.d) + 3 + p.r / 2) * 0.3 * speedMultiplier;
          p.x += Math.sin(p.tiltAngle) * 0.5 * speedMultiplier;

          if (p.y > height) {
            particles[i] = {
              ...p,
              x: Math.random() * width,
              y: -20,
              tilt: Math.random() * 10 - 5,
              tiltAngle: 0
            };
          }
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [animations]);

  if (!animations.enableEffect || animations.effectType === "none" || animations.effectType === "neon") {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-[0.22]"
    />
  );
};

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

  // Custom RGB colors
  const [customColors, setCustomColors] = useState({
    cashDepositBg: "#f973161a",
    cashDepositBorder: "#f97316",
    settlementBg: "#22c55e1a",
    settlementBorder: "#22c55e",
    sidebarBg: "#0f172a",
    headerBg: "#0f172a",
    cardBg: "#1e293b",
    accentColor: "#22d3ee"
  });

  // Animations/Effects
  const [messAnimations, setMessAnimations] = useState({
    enableEffect: false,
    effectType: "none", // "none", "matrix", "neon", "confetti"
    animationSpeed: "normal",
    accentGlow: true
  });

  // Dashboard Visibility rules
  const [dashboardVisibility, setDashboardVisibility] = useState({
    showAuditLogs: true,
    showCashDeposit: true,
    showMealTracker: true,
    showFoodMenu: true,
    showNotices: true,
    showAnalytics: true
  });

  // Date restrictions config
  const [dateRestrictions, setDateRestrictions] = useState({
    allowFutureMeals: false,
    allowPreviousMeals: true,
    allowFutureDeposits: false,
    allowPreviousDeposits: true,
    allowFutureMarket: true,
    allowPreviousMarket: true,
    allowFutureMealPlanner: true,
    allowPreviousMealPlanner: true
  });

  const [messes, setMesses] = useState<{ id: string, name: string }[]>([]);
  const [activeMessId, setActiveMessId] = useState("default");

  // Dynamic UI configuration states
  const [siteColor, setSiteColor] = useState("cyan");
  const [fontSize, setFontSize] = useState("normal");
  const [fontStyle, setFontStyle] = useState("sans");
  const [logoText, setLogoText] = useState("Ababil mess");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>(["Rent/ভাড়া", "বুয়া বিল", "WiFi", "Electricity + Water"]);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const fetchMesses = async (token: string) => {
    try {
      const response = await fetch("/api/admin/messes", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.messes) setMesses(data.messes);
        if (data.activeMessId) setActiveMessId(data.activeMessId);
      }
    } catch (e) {
      console.error("Failed to fetch messes:", e);
    }
  };

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
        if (data.currencySymbol) setCurrencySymbol(data.currencySymbol);
        if (data.customColors) setCustomColors(prev => ({ ...prev, ...data.customColors }));
        if (data.messAnimations) setMessAnimations(prev => ({ ...prev, ...data.messAnimations }));
        if (data.dashboardVisibility) setDashboardVisibility(prev => ({ ...prev, ...data.dashboardVisibility }));
        if (data.dateRestrictions) setDateRestrictions(prev => ({ ...prev, ...data.dateRestrictions }));
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
          if (s.currencySymbol) setCurrencySymbol(s.currencySymbol);
          if (s.customColors) setCustomColors(s.customColors);
          if (s.messAnimations) setMessAnimations(s.messAnimations);
          if (s.dashboardVisibility) setDashboardVisibility(s.dashboardVisibility);
          if (s.dateRestrictions) setDateRestrictions(s.dateRestrictions);
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
      fetchMesses(sessionToken);
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
  const getMonthDefaults = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const startVal = `${year}-${pad(month + 1)}-01T12:00`;
    const nextMonthDate = new Date(year, month + 1, 1);
    const endVal = `${nextMonthDate.getFullYear()}-${pad(nextMonthDate.getMonth() + 1)}-01T12:00`;
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const nameVal = `${monthNames[month]} ${year}`;
    return { nameVal, startVal, endVal };
  };

  const [newMonthName, setNewMonthName] = useState(() => getMonthDefaults().nameVal);
  const [newMonthStart, setNewMonthStart] = useState(() => getMonthDefaults().startVal);
  const [newMonthEnd, setNewMonthEnd] = useState(() => getMonthDefaults().endVal);

  const [editingMonthId, setEditingMonthId] = useState<string | null>(null);
  const [editMonthName, setEditMonthName] = useState("");
  const [editMonthStart, setEditMonthStart] = useState("");
  const [editMonthEnd, setEditMonthEnd] = useState("");

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
        const defaults = getMonthDefaults();
        setNewMonthName(defaults.nameVal);
        setNewMonthStart(defaults.startVal);
        setNewMonthEnd(defaults.endVal);
        fetchMonthsAndMembers(sessionToken);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create cycle");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateMonthCycle = async (monthId: string) => {
    if (!sessionToken || !editMonthName || !editMonthStart || !editMonthEnd) return;
    try {
      const response = await fetch(`/api/months/${monthId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          name: editMonthName,
          startDate: editMonthStart,
          endDate: editMonthEnd
        })
      });

      if (response.ok) {
        alert("Success: Month cycle updated!");
        setEditingMonthId(null);
        fetchMonthsAndMembers(sessionToken);
        fetchReportSummary();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update cycle");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMonthCycle = async (monthId: string) => {
    if (!sessionToken) return;
    try {
      const response = await fetch(`/api/months/${monthId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${sessionToken}`
        }
      });

      if (response.ok) {
        alert("Success: Month cycle deleted!");
        fetchMonthsAndMembers(sessionToken);
        fetchReportSummary();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete cycle");
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

  const handleDownloadBackup = async () => {
    try {
      const response = await fetch("/admin/backup/export", {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (!response.ok) {
        throw new Error("Failed to export backup");
      }
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mess_erp_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error generating backup: make sure you are signed in as ADMIN.");
    }
  };

  const handleUploadBackup = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          
          const response = await fetch("/admin/backup/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${sessionToken}`
            },
            body: JSON.stringify(parsed)
          });
          
          if (response.ok) {
            alert("Database Backup Restored Successfully! The page will now reload.");
            window.location.reload();
          } else {
            const err = await response.json();
            alert(`Restore failed: ${err.error || "Unknown error"}`);
          }
        } catch (err) {
          alert("Invalid backup file: Not a valid JSON document.");
        }
      };
      reader.readAsText(file);
    } catch (e) {
      console.error(e);
      alert("Failed to read the backup file.");
    }
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

  const visibleNavItems = navItems.filter(item => {
    if (item.id === "audit" && dashboardVisibility && !dashboardVisibility.showAuditLogs) return false;
    if (item.id === "deposits" && dashboardVisibility && !dashboardVisibility.showCashDeposit) return false;
    if (item.id === "meals" && dashboardVisibility && !dashboardVisibility.showMealTracker) return false;
    if (item.id === "menu" && dashboardVisibility && !dashboardVisibility.showFoodMenu) return false;
    if (item.id === "notices" && dashboardVisibility && !dashboardVisibility.showNotices) return false;
    return true;
  });

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
          --custom-sidebar-bg: ${customColors?.sidebarBg || "#0f172a"};
          --custom-header-bg: ${customColors?.headerBg || "#0f172a"};
          --custom-card-bg: ${customColors?.cardBg || "#1e293b"};
          --custom-accent-color: ${customColors?.accentColor || "#22d3ee"};
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
          background-color: ${isDarkMode && customColors?.cardBg ? customColors.cardBg : "rgba(30, 41, 59, 0.4)"} !important;
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
        ${messAnimations?.enableEffect && messAnimations?.effectType === "neon" ? `
          .glass-panel, .rounded-2xl {
            box-shadow: 0 0 15px ${customColors?.accentColor || colors.c400}40 !important;
            border-color: ${customColors?.accentColor || colors.c400}60 !important;
          }
          button:hover {
            box-shadow: 0 0 12px ${customColors?.accentColor || colors.c400}80 !important;
          }
        ` : ""}
      `}</style>
      
      <AmbientAnimationOverlay animations={messAnimations} />
      
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
                {visibleNavItems.map(item => (
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
      <aside 
        style={{
          backgroundColor: isDarkMode ? customColors?.sidebarBg || undefined : undefined
        }}
        className={`hidden md:flex flex-col justify-between w-64 shrink-0 border-r h-screen sticky top-0 z-10 transition-all ${
          isDarkMode ? "border-slate-900" : "bg-white border-slate-200"
        }`}
      >
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
            {visibleNavItems.map(item => (
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
              dateRestrictions={dateRestrictions}
            />
          )}

          {activeTab === "menu" && (
            <FoodMenu 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              isDarkMode={isDarkMode}
              dateRestrictions={dateRestrictions}
            />
          )}

          {activeTab === "market" && (
            <MarketLogs 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              members={membersList}
              isDarkMode={isDarkMode}
              onRefresh={handleRefreshAll}
              dateRestrictions={dateRestrictions}
            />
          )}

          {activeTab === "deposits" && (
            <Deposits 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              members={membersList}
              isDarkMode={isDarkMode}
              onRefresh={handleRefreshAll}
              currencySymbol={currencySymbol}
              customColors={customColors}
              dateRestrictions={dateRestrictions}
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
              currencySymbol={currencySymbol}
              customColors={customColors}
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
                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER) && (
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
                    {months.map(m => {
                      const isEditing = editingMonthId === m.id;
                      const hasAdminPrivileges = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER;
                      
                      return (
                        <div key={m.id} className="p-3 rounded-lg bg-slate-950/20 border border-slate-900 text-xs space-y-3">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-orange-500 uppercase tracking-wide">Month Name</label>
                                <input
                                  type="text"
                                  value={editMonthName}
                                  onChange={(e) => setEditMonthName(e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-orange-500 uppercase tracking-wide">Starts</label>
                                  <input
                                    type="datetime-local"
                                    value={editMonthStart}
                                    onChange={(e) => setEditMonthStart(e.target.value)}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-orange-500 uppercase tracking-wide">Ends</label>
                                  <input
                                    type="datetime-local"
                                    value={editMonthEnd}
                                    onChange={(e) => setEditMonthEnd(e.target.value)}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingMonthId(null)}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMonthCycle(m.id)}
                                  className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-[10px] font-bold text-white"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-bold text-slate-200">{m.name}</p>
                                <p className="text-[10px] text-slate-500">
                                  {new Date(m.startDate).toLocaleDateString()} {new Date(m.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(m.endDate).toLocaleDateString()} {new Date(m.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {hasAdminPrivileges && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingMonthId(m.id);
                                        setEditMonthName(m.name);
                                        setEditMonthStart(m.startDate.slice(0, 16));
                                        setEditMonthEnd(m.endDate.slice(0, 16));
                                      }}
                                      className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-300 transition-all cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to delete the month cycle "${m.name}"? Previous logs/deposits will NOT be automatically purged, but the month cycle context will be removed.`)) {
                                          handleDeleteMonthCycle(m.id);
                                        }
                                      }}
                                      className="px-2 py-1 rounded bg-rose-950/35 border border-rose-900/40 hover:border-rose-600 text-[10px] text-rose-400 transition-all cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                                
                                {hasAdminPrivileges ? (
                                  <button
                                    onClick={() => handleToggleMonthLock(m.id, m.isLocked)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold tracking-wider cursor-pointer transition-all ${
                                      m.isLocked 
                                        ? "bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25" 
                                        : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                                    }`}
                                  >
                                    {m.isLocked ? "LOCKED" : "ACTIVE"}
                                  </button>
                                ) : (
                                  <span className={`px-2.5 py-0.5 rounded font-bold font-mono text-[10px] ${m.isLocked ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                    {m.isLocked ? "LOCKED" : "ACTIVE"}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Exports & backing-up details */}
                <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                  isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <h3 className="text-sm font-bold font-display text-cyan-300 mb-4">Exports & Ledger backing-up</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Audit and back up reports instantly. Use the file selection area to restore an existing JSON backup file directly back into the ERP workspace.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                      onClick={handleDownloadBackup}
                      className="p-4 rounded-xl border border-cyan-500/10 hover:border-cyan-400 bg-slate-950/20 text-center cursor-pointer transition-all hover:scale-105"
                    >
                      <Download className="mx-auto text-cyan-400 mb-2" size={24} />
                      <p className="text-xs font-bold text-slate-200">Download JSON Backup</p>
                      <p className="text-[10px] text-slate-500 mt-1">Saves raw databases, multi-mess snapshots, and custom styles.</p>
                    </button>
                  </div>

                  {currentUser.role === UserRole.ADMIN && (
                    <div className="border border-dashed border-slate-800/80 rounded-xl p-6 bg-slate-950/30 text-center">
                      <Upload className="mx-auto text-orange-500 mb-2" size={32} />
                      <h4 className="text-xs font-bold text-slate-200 mb-1">Restore Database from Backup File</h4>
                      <p className="text-[10px] text-slate-500 mb-3 max-w-md mx-auto">
                        Select your exported <code>.json</code> backup file to restore.
                      </p>
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (confirm(`Are you sure you want to completely overwrite the current database with the backup file "${file.name}"? This action is irreversible.`)) {
                              handleUploadBackup(file);
                            }
                          }
                        }}
                        className="hidden" 
                        id="backup-upload-input" 
                      />
                      <label 
                        htmlFor="backup-upload-input" 
                        className="inline-flex items-center gap-1 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-all uppercase tracking-wider"
                      >
                        <Upload size={14} /> Browse Backup File
                      </label>
                    </div>
                  )}
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

                {/* Multi-Mess Branch Management */}
                {currentUser.role === UserRole.ADMIN && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-3">Multi-Mess Branch Management</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Shift active dashboard context between different managed mess branches (e.g. Mess A, Mess B, or Ababil Mess). 
                      Each branch maintains independent databases, ledgers, and custom styles.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block font-display">Active Branch Context</label>
                        <select
                          value={activeMessId}
                          onChange={async (e) => {
                            const newId = e.target.value;
                            try {
                              const response = await fetch("/api/admin/messes/active", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${sessionToken}`
                                },
                                body: JSON.stringify({ messId: newId })
                              });
                              if (response.ok) {
                                const data = await response.json();
                                alert(`Active branch changed successfully to: ${data.name || newId}. Reloading workspace...`);
                                window.location.reload();
                              } else {
                                const err = await response.json();
                                alert(err.error || "Failed to switch active branch");
                              }
                            } catch (err) {
                              console.error(err);
                              alert("Error switching mess branch.");
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        >
                          {messes.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const newName = formData.get("newName") as string;
                          if (!newName || newName.trim() === "") return;
                          try {
                            const response = await fetch("/api/admin/messes", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${sessionToken}`
                              },
                              body: JSON.stringify({ name: newName })
                            });
                            if (response.ok) {
                              const data = await response.json();
                              alert(`Successfully created branch "${newName}"!`);
                              e.currentTarget.reset();
                              // Refresh messes list
                              if (sessionToken) {
                                const listResp = await fetch("/api/admin/messes", {
                                  headers: { "Authorization": `Bearer ${sessionToken}` }
                                });
                                if (listResp.ok) {
                                  const listData = await listResp.json();
                                  setMesses(listData);
                                }
                              }
                            } else {
                              const err = await response.json();
                              alert(err.error || "Failed to create branch");
                            }
                          } catch (err) {
                            console.error(err);
                            alert("Error creating branch.");
                          }
                        }}
                        className="flex gap-2"
                      >
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block font-display">Create New Branch / Mess</label>
                          <input
                            name="newName"
                            type="text"
                            placeholder="e.g. Mess D (Rajshahi)"
                            required
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                        </div>
                        <button
                          type="submit"
                          className="h-9 px-4 mt-auto bg-cyan-500 hover:bg-cyan-400 font-bold text-xs text-white rounded-lg transition-all shrink-0 cursor-pointer"
                        >
                          CREATE
                        </button>
                      </form>
                    </div>
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

                    <div className="flex flex-wrap gap-2">
                      {["৳", "Rs", "$", "€", "£", "¥", "zł", "Ksh", "AED", "CAD", "AUD", "SAR", "INR", "BDT"].map(curr => (
                        <button
                          key={curr}
                          onClick={async () => {
                            setCurrencySymbol(curr);
                            await handleUpdateSettings({ currencySymbol: curr });
                            alert(`Default currency symbol updated to ${curr}`);
                          }}
                          className={`h-9 px-4 rounded-xl font-mono font-bold text-xs cursor-pointer transition-all ${
                            currencySymbol === curr
                              ? "bg-cyan-500 text-white shadow-sm font-black"
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

                      {/* RGB Custom Colors Customizer */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                        <h4 className="text-xs font-bold font-display text-cyan-300 mb-3 uppercase tracking-wide">Granular RGB Color Palettes</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cash Deposit Section Bg</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={customColors?.cashDepositBg ? (customColors.cashDepositBg.startsWith("#") ? customColors.cashDepositBg.slice(0, 7) : "#ea580c") : "#ea580c"}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, cashDepositBg: e.target.value + "1a" }))}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={customColors?.cashDepositBg || ""}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, cashDepositBg: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cash Deposit Border</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={customColors?.cashDepositBorder ? (customColors.cashDepositBorder.startsWith("#") ? customColors.cashDepositBorder.slice(0, 7) : "#ea580c") : "#ea580c"}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, cashDepositBorder: e.target.value }))}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={customColors?.cashDepositBorder || ""}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, cashDepositBorder: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Settlement Sheet Bg</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={customColors?.settlementBg ? (customColors.settlementBg.startsWith("#") ? customColors.settlementBg.slice(0, 7) : "#16a34a") : "#16a34a"}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, settlementBg: e.target.value + "1a" }))}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={customColors?.settlementBg || ""}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, settlementBg: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Settlement Sheet Border</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={customColors?.settlementBorder ? (customColors.settlementBorder.startsWith("#") ? customColors.settlementBorder.slice(0, 7) : "#16a34a") : "#16a34a"}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, settlementBorder: e.target.value }))}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={customColors?.settlementBorder || ""}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, settlementBorder: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sidebar Background</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={customColors?.sidebarBg ? (customColors.sidebarBg.startsWith("#") ? customColors.sidebarBg.slice(0, 7) : "#0f172a") : "#0f172a"}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, sidebarBg: e.target.value }))}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={customColors?.sidebarBg || ""}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, sidebarBg: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Header Background</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={customColors?.headerBg ? (customColors.headerBg.startsWith("#") ? customColors.headerBg.slice(0, 7) : "#0f172a") : "#0f172a"}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, headerBg: e.target.value }))}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={customColors?.headerBg || ""}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, headerBg: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Card Background</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={customColors?.cardBg ? (customColors.cardBg.startsWith("#") ? customColors.cardBg.slice(0, 7) : "#1e293b") : "#1e293b"}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, cardBg: e.target.value }))}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={customColors?.cardBg || ""}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, cardBg: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Accent Glow Color</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={customColors?.accentColor ? (customColors.accentColor.startsWith("#") ? customColors.accentColor.slice(0, 7) : "#22d3ee") : "#22d3ee"}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, accentColor: e.target.value }))}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={customColors?.accentColor || ""}
                                onChange={(e) => setCustomColors(prev => ({ ...prev, accentColor: e.target.value }))}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dashboard Visibility Rules config */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                        <h4 className="text-xs font-bold font-display text-cyan-300 mb-3 uppercase tracking-wide">Dashboard Tab Visibility Rules (Per-Branch)</h4>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Define which tabs or sections are allowed to be seen in this specific mess branch. 
                          For example, you can hide the cash deposit section for Mess B, or hide the audit log logs for Mess A.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <input
                              type="checkbox"
                              checked={dashboardVisibility?.showAuditLogs}
                              onChange={(e) => setDashboardVisibility(prev => ({ ...prev, showAuditLogs: e.target.checked }))}
                              className="accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">Show Audit Logs</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <input
                              type="checkbox"
                              checked={dashboardVisibility?.showCashDeposit}
                              onChange={(e) => setDashboardVisibility(prev => ({ ...prev, showCashDeposit: e.target.checked }))}
                              className="accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">Show Cash Deposits</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <input
                              type="checkbox"
                              checked={dashboardVisibility?.showMealTracker}
                              onChange={(e) => setDashboardVisibility(prev => ({ ...prev, showMealTracker: e.target.checked }))}
                              className="accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">Show Meal Tracker</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <input
                              type="checkbox"
                              checked={dashboardVisibility?.showFoodMenu}
                              onChange={(e) => setDashboardVisibility(prev => ({ ...prev, showFoodMenu: e.target.checked }))}
                              className="accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">Show Meal Planner</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <input
                              type="checkbox"
                              checked={dashboardVisibility?.showNotices}
                              onChange={(e) => setDashboardVisibility(prev => ({ ...prev, showNotices: e.target.checked }))}
                              className="accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">Show Notices</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <input
                              type="checkbox"
                              checked={dashboardVisibility?.showAnalytics}
                              onChange={(e) => setDashboardVisibility(prev => ({ ...prev, showAnalytics: e.target.checked }))}
                              className="accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">Show Analytics Hub</span>
                          </label>
                        </div>
                      </div>

                      {/* Mess Animations/Effects config */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                        <h4 className="text-xs font-bold font-display text-cyan-300 mb-3 uppercase tracking-wide">Interactive Mess Animation Effects</h4>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Admins can activate custom ambient animation overlays on active branches (e.g. Dhaka or Chittagong) 
                          to personalize the branch's aesthetic experience.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                            <input
                              type="checkbox"
                              checked={messAnimations?.enableEffect}
                              onChange={(e) => setMessAnimations(prev => ({ ...prev, enableEffect: e.target.checked }))}
                              className="accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-300 font-medium">Enable Animated Overlay</span>
                          </label>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 block uppercase font-display">Effect Type</label>
                            <select
                              value={messAnimations?.effectType || "none"}
                              onChange={(e) => setMessAnimations(prev => ({ ...prev, effectType: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            >
                              <option value="none">None (Standard Flat UI)</option>
                              <option value="matrix">Digital Matrix Rain</option>
                              <option value="neon">Pulsing Cyberpunk Neon Glow</option>
                              <option value="confetti">Celebratory Confetti Fall</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 block uppercase font-display">Animation Speed</label>
                            <select
                              value={messAnimations?.animationSpeed || "normal"}
                              onChange={(e) => setMessAnimations(prev => ({ ...prev, animationSpeed: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            >
                              <option value="slow">Relaxed (Slow)</option>
                              <option value="normal">Standard (Normal)</option>
                              <option value="fast">Hyper (Fast)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Calendar & Date Access Rules config */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                        <h4 className="text-xs font-bold font-display text-cyan-300 mb-3 uppercase tracking-wide">Calendar Date & Input Permission Rules</h4>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Control how calendar dates behave. Specify which sections allow inputs on future or past dates. This restricts normal user actions while preserving admin flexibility where necessary.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          {/* Meals Tracker */}
                          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 space-y-2">
                            <p className="text-xs font-bold text-slate-200">Daily Meals Tracker</p>
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dateRestrictions?.allowFutureMeals}
                                  onChange={(e) => setDateRestrictions(prev => ({ ...prev, allowFutureMeals: e.target.checked }))}
                                  className="accent-cyan-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-300">Allow logging future meals</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dateRestrictions?.allowPreviousMeals}
                                  onChange={(e) => setDateRestrictions(prev => ({ ...prev, allowPreviousMeals: e.target.checked }))}
                                  className="accent-cyan-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-300">Allow modifying past meals</span>
                              </label>
                            </div>
                          </div>

                          {/* Deposits */}
                          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 space-y-2">
                            <p className="text-xs font-bold text-slate-200">Cash Deposits</p>
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dateRestrictions?.allowFutureDeposits}
                                  onChange={(e) => setDateRestrictions(prev => ({ ...prev, allowFutureDeposits: e.target.checked }))}
                                  className="accent-cyan-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-300">Allow future deposit dates</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dateRestrictions?.allowPreviousDeposits}
                                  onChange={(e) => setDateRestrictions(prev => ({ ...prev, allowPreviousDeposits: e.target.checked }))}
                                  className="accent-cyan-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-300">Allow past deposit dates</span>
                              </label>
                            </div>
                          </div>

                          {/* Market */}
                          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 space-y-2">
                            <p className="text-xs font-bold text-slate-200">Market Schedule & Expenses</p>
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dateRestrictions?.allowFutureMarket}
                                  onChange={(e) => setDateRestrictions(prev => ({ ...prev, allowFutureMarket: e.target.checked }))}
                                  className="accent-cyan-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-300">Allow future market scheduling</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dateRestrictions?.allowPreviousMarket}
                                  onChange={(e) => setDateRestrictions(prev => ({ ...prev, allowPreviousMarket: e.target.checked }))}
                                  className="accent-cyan-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-300">Allow past expense entries</span>
                              </label>
                            </div>
                          </div>

                          {/* Meal Planner */}
                          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 space-y-2">
                            <p className="text-xs font-bold text-slate-200">Meal Planner & Food Statistics</p>
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dateRestrictions?.allowFutureMealPlanner}
                                  onChange={(e) => setDateRestrictions(prev => ({ ...prev, allowFutureMealPlanner: e.target.checked }))}
                                  className="accent-cyan-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-300">Allow future meal planning</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={dateRestrictions?.allowPreviousMealPlanner}
                                  onChange={(e) => setDateRestrictions(prev => ({ ...prev, allowPreviousMealPlanner: e.target.checked }))}
                                  className="accent-cyan-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-300">Allow past menu views</span>
                              </label>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={async () => {
                          await handleUpdateSettings({ 
                            logoText, 
                            siteColor, 
                            fontStyle, 
                            fontSize, 
                            customColors, 
                            dashboardVisibility, 
                            messAnimations,
                            dateRestrictions
                          });
                          alert("UI Theme customisations, animations, color palettes, and dashboard visibility configurations applied successfully.");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold text-xs text-white rounded-xl cursor-pointer transition-all shrink-0 uppercase font-display tracking-wide"
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
