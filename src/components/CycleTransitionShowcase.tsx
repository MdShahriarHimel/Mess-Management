/**
 * CycleTransitionShowcase.tsx
 * High-octane gaming-style (Free Fire rank / season rollover inspired) modal
 * that announces when a previous monthly cycle has closed and a new cycle has begun.
 * Features:
 * - Fullscreen mystical particle clouds & solar energy flare canvas
 * - Diamond geometric badges for [Previous Month (Finalized)] >>> [New Month (Active)]
 * - Personalized greeting for the user
 * - Shooting star comet trajectory animation pointing to the top Month Cycle Selector
 * - LocalStorage tracking so it only triggers once per month rollover
 * - Admin controls for toggle and manual preview testing
 */

import React, { useEffect, useRef, useState } from "react";
import { 
  Sparkles, 
  ChevronsRight, 
  Calendar, 
  History, 
  ArrowRight, 
  ShieldCheck, 
  Flame, 
  X,
  Play
} from "lucide-react";
import { MessMonth, Member } from "../types";

export interface CycleTransitionShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member | null;
  previousMonth: MessMonth | null;
  currentMonth: MessMonth | null;
  onSelectPreviousMonth: (monthId: string) => void;
  onStayInCurrentMonth: () => void;
  isDarkMode?: boolean;
  isPreview?: boolean;
}

export function CycleTransitionShowcase({
  isOpen,
  onClose,
  currentUser,
  previousMonth,
  currentMonth,
  onSelectPreviousMonth,
  onStayInCurrentMonth,
  isDarkMode = true,
  isPreview = false
}: CycleTransitionShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const seeHistoryBtnRef = useRef<HTMLButtonElement | null>(null);
  const [cometActive, setCometActive] = useState(false);
  const [cometPos, setCometPos] = useState<{ x: number; y: number; trail: { x: number; y: number; alpha: number; size: number }[] }>({
    x: 0,
    y: 0,
    trail: []
  });
  const [isDismissing, setIsDismissing] = useState(false);

  // Background Canvas: Glowing nebulae, rotating sun rays, golden particles
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particles array
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
      maxAlpha: number;
      pulseSpeed: number;
    }[] = [];

    const colors = ["#f59e0b", "#fbbf24", "#06b6d4", "#22d3ee", "#ef4444", "#ec4899"];

    for (let i = 0; i < 75; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.4 - Math.random() * 0.8,
        radius: 1 + Math.random() * 2.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.6,
        maxAlpha: 0.4 + Math.random() * 0.5,
        pulseSpeed: 0.01 + Math.random() * 0.02
      });
    }

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Center solar burst gradient
      const centerX = width / 2;
      const centerY = height / 2;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        Math.max(width, height) * 0.65
      );
      gradient.addColorStop(0, "rgba(245, 158, 11, 0.22)");
      gradient.addColorStop(0.25, "rgba(236, 72, 153, 0.12)");
      gradient.addColorStop(0.55, "rgba(6, 182, 212, 0.09)");
      gradient.addColorStop(1, "rgba(2, 6, 23, 0.95)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Rotating energy flare rays (inspired by Free Fire gun / rank screen)
      angle += 0.003;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);

      const rayCount = 12;
      for (let i = 0; i < rayCount; i++) {
        const rayAngle = (i * 2 * Math.PI) / rayCount;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, Math.max(width, height) * 0.8, rayAngle - 0.08, rayAngle + 0.08);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? "rgba(245, 158, 11, 0.04)" : "rgba(6, 182, 212, 0.035)";
        ctx.fill();
      }
      ctx.restore();

      // 3. Floating stardust particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.pulseSpeed;
        if (p.alpha > p.maxAlpha || p.alpha < 0.1) {
          p.pulseSpeed = -p.pulseSpeed;
        }
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const userName = currentUser?.nickname || currentUser?.name?.split(" ")[0] || "Valued Member";
  const prevMonthName = previousMonth?.name || "Previous Cycle";
  const currMonthName = currentMonth?.name || "Current Cycle";

  // Handle "See Previous Month" with shooting star laser effect!
  const handleLaunchShootingStar = () => {
    if (cometActive) return;

    const btnEl = seeHistoryBtnRef.current;
    const targetEl = 
      document.getElementById("active-month-cycle-selector") || 
      document.querySelector("select[id*='month']") ||
      document.getElementById("month-cycle-dropdown");

    const startRect = btnEl?.getBoundingClientRect();
    const targetRect = targetEl?.getBoundingClientRect();

    const startX = startRect ? startRect.left + startRect.width / 2 : window.innerWidth / 2;
    const startY = startRect ? startRect.top + startRect.height / 2 : window.innerHeight / 2 + 100;

    // Target is top month selector dropdown
    const endX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth * 0.52;
    const endY = targetRect ? targetRect.top + targetRect.height / 2 : 40;

    setCometActive(true);

    const startTime = performance.now();
    const duration = 850; // ms
    const trailHistory: { x: number; y: number; alpha: number; size: number }[] = [];

    const animateComet = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Easing function (easeOutCubic)
      const ease = 1 - Math.pow(1 - progress, 3);

      // Arc trajectory upward
      const arcHeight = 70;
      const curX = startX + (endX - startX) * ease;
      const curY = startY + (endY - startY) * ease - Math.sin(ease * Math.PI) * arcHeight;

      // Update trail
      trailHistory.unshift({ x: curX, y: curY, alpha: 1, size: 14 * (1 - ease * 0.4) });
      if (trailHistory.length > 18) trailHistory.pop();
      trailHistory.forEach((t) => (t.alpha *= 0.85));

      setCometPos({
        x: curX,
        y: curY,
        trail: [...trailHistory]
      });

      if (progress < 1) {
        requestAnimationFrame(animateComet);
      } else {
        // Impact on the target element!
        if (targetEl) {
          targetEl.classList.add("ring-4", "ring-cyan-400", "scale-105", "transition-all", "duration-300");
          setTimeout(() => {
            targetEl.classList.remove("ring-4", "ring-cyan-400", "scale-105");
          }, 1200);
        }

        // Switch month to previous month cycle
        if (previousMonth?.id) {
          onSelectPreviousMonth(previousMonth.id);
        }

        setIsDismissing(true);
        setTimeout(() => {
          setCometActive(false);
          setIsDismissing(false);
          onClose();
        }, 300);
      }
    };

    requestAnimationFrame(animateComet);
  };

  const handleDismissCurrent = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setIsDismissing(false);
      onStayInCurrentMonth();
      onClose();
    }, 250);
  };

  const formatDateRange = (startStr?: string, endStr?: string) => {
    if (!startStr) return "Active Period";
    const formatSingle = (dt?: string) => {
      if (!dt) return "";
      try {
        const d = new Date(dt);
        if (isNaN(d.getTime())) return dt.split("T")[0];
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }).format(d);
      } catch {
        return dt.replace("T", " ").substring(0, 16);
      }
    };

    const s = formatSingle(startStr);
    const e = formatSingle(endStr);
    if (s && e) {
      return `${s} ➔ ${e}`;
    }
    return s || "Active Period";
  };

  return (
    <div 
      className={`fixed inset-0 z-[99990] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isDismissing ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
    >
      {/* Background Interactive Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Shooting Star Comet Layer */}
      {cometActive && (
        <div className="fixed inset-0 pointer-events-none z-[99999]">
          {/* Comet Tail Sparks */}
          {cometPos.trail.map((t, idx) => (
            <div
              key={idx}
              className="absolute rounded-full blur-[1px] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${t.x}px`,
                top: `${t.y}px`,
                width: `${t.size}px`,
                height: `${t.size}px`,
                backgroundColor: idx % 2 === 0 ? "#fbbf24" : "#22d3ee",
                opacity: t.alpha * 0.8,
                boxShadow: `0 0 12px ${idx % 2 === 0 ? "#f59e0b" : "#06b6d4"}`
              }}
            />
          ))}

          {/* Comet Head Glowing Orb */}
          <div
            className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse"
            style={{
              left: `${cometPos.x}px`,
              top: `${cometPos.y}px`,
              width: "24px",
              height: "24px",
              background: "radial-gradient(circle, #ffffff 15%, #fbbf24 60%, #06b6d4 100%)",
              boxShadow: "0 0 28px 8px #fbbf24, 0 0 50px 14px #06b6d4"
            }}
          />
        </div>
      )}

      {/* Main Container Card (Free Fire rank / diamond reclassification styled) */}
      <div 
        className={`relative z-10 w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          isDarkMode 
            ? "bg-slate-950/90 border-amber-500/30 shadow-amber-500/10 text-white" 
            : "bg-white/95 border-amber-400/50 shadow-2xl shadow-slate-900/20 text-slate-900"
        }`}
      >
        {/* Top Glowing Trim */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-400 animate-pulse" />

        {/* Close / Dismiss Button */}
        <button
          onClick={handleDismissCurrent}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-all cursor-pointer z-20 ${
            isDarkMode 
              ? "text-slate-400 hover:text-white hover:bg-slate-800/60" 
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
          title="Close / Stay in current month"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8 space-y-6 text-center">
          {/* Top Subtitle Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-cyan-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-300 text-xs font-black tracking-widest uppercase shadow-sm">
            <Flame size={14} className="text-amber-400 animate-bounce" />
            <span>Monthly Cycle Rollover</span>
            {isPreview && <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 px-1.5 py-0.5 rounded ml-1 font-bold">Preview</span>}
          </div>

          {/* User Personalized Greeting */}
          <div className="space-y-1.5">
            <h2 className={`text-2xl sm:text-3xl font-black font-display tracking-tight ${isDarkMode ? "text-white" : "text-slate-950"}`}>
              Hey, <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 bg-clip-text text-transparent">{userName}</span>! 👋
            </h2>
            <p className={`text-sm max-w-md mx-auto leading-relaxed font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              পূর্ববর্তী মাসের হিসাব সাইকেল সম্পন্ন হয়ে নতুন মাসের যাত্রা শুরু হয়েছে। আপনার ড্যাশবোর্ড প্রস্তুত!
            </p>
          </div>

          {/* Season Reclassification Rank Badges (Left >>> Right) */}
          <div className={`py-4 px-3 sm:px-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-2 ${
            isDarkMode 
              ? "bg-slate-900/60 border-slate-800/80" 
              : "bg-slate-50/90 border-slate-200/90 shadow-inner"
          }`}>
            {/* Left: Previous Month Badge */}
            <div className={`flex flex-col items-center p-3.5 rounded-2xl border w-full sm:w-44 text-center transition-all ${
              isDarkMode 
                ? "bg-slate-950/80 border-amber-500/30 text-white" 
                : "bg-white border-amber-400/70 shadow-sm text-slate-900"
            }`}>
              <div className="relative mb-2">
                {/* Diamond geometric glow frame */}
                <div className="w-12 h-12 rotate-45 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <div className="-rotate-45">
                    <History size={20} className="text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shadow">
                  Ended
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? "text-amber-400" : "text-amber-800"}`}>
                Previous Cycle
              </span>
              <span className={`text-base font-black mt-0.5 tracking-tight ${isDarkMode ? "text-white" : "text-slate-950"}`}>
                {prevMonthName}
              </span>
              <span className={`text-[11px] font-semibold mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                হিসাব ক্লোজ ও সমাপ্ত
              </span>
            </div>

            {/* Middle: Sonic Chevrons */}
            <div className="flex flex-col items-center justify-center text-cyan-500 px-2 animate-pulse">
              <ChevronsRight size={32} className="hidden sm:block text-cyan-500" />
              <div className={`sm:hidden text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Transited To
              </div>
            </div>

            {/* Right: Current Active Month Badge */}
            <div className={`flex flex-col items-center p-3.5 rounded-2xl border-2 w-full sm:w-44 text-center transition-all shadow-md ${
              isDarkMode 
                ? "bg-slate-950/90 border-cyan-400 shadow-cyan-500/20 text-white" 
                : "bg-cyan-50/90 border-cyan-500 shadow-cyan-500/15 text-cyan-950"
            }`}>
              <div className="relative mb-2">
                {/* Diamond geometric neon glow frame */}
                <div className="w-12 h-12 rotate-45 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 border border-cyan-300 flex items-center justify-center shadow-lg shadow-cyan-400/50">
                  <div className="-rotate-45">
                    <ShieldCheck size={22} className="text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-cyan-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase animate-pulse shadow">
                  Live
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? "text-cyan-400" : "text-cyan-800"}`}>
                Active Cycle
              </span>
              <span className={`text-base font-black mt-0.5 tracking-tight ${isDarkMode ? "text-white" : "text-cyan-950"}`}>
                {currMonthName}
              </span>
              <span className={`text-[11px] font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                isDarkMode 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                  : "bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold"
              }`}>
                চলমান সক্রিয় মাস
              </span>
            </div>
          </div>

          {/* Action Explanatory Notice */}
          <div className={`text-xs flex items-center justify-center gap-1.5 font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
            <Sparkles size={14} className="text-amber-500 shrink-0" />
            <span>আপনি যেকোনো সময় উপরের ড্রপডাউন থেকে পূর্বের মাসের বিবরণ দেখতে পারবেন।</span>
          </div>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {/* Button 1: See Previous Month's History */}
            <button
              ref={seeHistoryBtnRef}
              onClick={handleLaunchShootingStar}
              disabled={cometActive}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer ${
                cometActive
                  ? "bg-amber-600/50 text-white cursor-wait"
                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-black font-black shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <History size={16} />
              <span>See {prevMonthName}'s History</span>
              <ArrowRight size={16} className="ml-0.5" />
            </button>

            {/* Button 2: Stay in Current Month */}
            <button
              onClick={handleDismissCurrent}
              disabled={cometActive}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isDarkMode
                  ? "border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white"
                  : "border-slate-300 bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 shadow-sm"
              }`}
            >
              <span>Stay in Current ({currMonthName})</span>
            </button>
          </div>
        </div>

        {/* Bottom Status bar */}
        <div className={`px-6 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium ${
          isDarkMode 
            ? "bg-slate-950 border-slate-800 text-slate-300" 
            : "bg-slate-100 border-slate-200 text-slate-800"
        }`}>
          <span className="flex items-center gap-2 font-bold tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-xs"></span>
            <span className={isDarkMode ? "text-slate-200" : "text-slate-800"}>Mess Cycle Auto-Transition Engine</span>
          </span>
          <span className={`font-mono text-xs px-3 py-1 rounded-lg font-bold tracking-wide ${
            isDarkMode 
              ? "bg-slate-900 text-cyan-300 border border-cyan-500/40 shadow-sm" 
              : "bg-white text-cyan-900 border border-cyan-400 shadow-xs"
          }`}>
            {formatDateRange(currentMonth?.startDate, currentMonth?.endDate)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CycleTransitionShowcase;
