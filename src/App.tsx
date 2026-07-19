/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase.ts";
import { 
  Home, Users, Coffee, Sparkles, ShoppingCart, DollarSign, 
  FileSpreadsheet, Bell, Shield, Settings, Sun, Moon, LogOut, Menu, X, Calendar, Download, RefreshCw, Trash2, Plus, Upload, Vote, Award, Save
} from "lucide-react";
import * as LucideIcons from "lucide-react";

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
import Democracy from "./components/Democracy.tsx";
import { AdminControlsPanel } from "./components/AdminControlsPanel.tsx";
import RgbColorPicker from "./components/RgbColorPicker.tsx";
import { ThemeEnginePanel } from "./components/ThemeEnginePanel.tsx";
import { THEME_TEMPLATES } from "./themeTemplates.ts";

// Types
import { Member, MessMonth, UserRole } from "./types.js";

const COLOR_PALETTES = [
  { name: "Sunset Orange", hex: "#ea580c" },
  { name: "Emerald Green", hex: "#16a34a" },
  { name: "Teal Glow", hex: "#0d9488" },
  { name: "Cyber Cyan", hex: "#22d3ee" },
  { name: "Vivid Violet", hex: "#8b5cf6" },
  { name: "Electric Indigo", hex: "#6366f1" },
  { name: "Ruby Rose", hex: "#e11d48" },
  { name: "Amber Gold", hex: "#d97706" },
  { name: "Slate Grey", hex: "#475569" },
  { name: "Deep Navy", hex: "#0f172a" },
  { name: "Ice Blue", hex: "#38bdf8" },
  { name: "Pure White", hex: "#ffffff" }
];

export const VISUAL_THEMES = [
  { id: "default", name: "Default Slate", icon: "LayoutGrid", desc: "Clean, high-contrast structural theme", bg: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", lightBg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" },
  { id: "cosmic-void", name: "Cosmic Purple", icon: "Sparkles", desc: "Deep cosmic purple and indigo blend", bg: "radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020005 100%)", lightBg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" },
  { id: "midnight-nebula", name: "Midnight Nebula", icon: "Moon", desc: "Nebulous violet cosmic depths", bg: "linear-gradient(135deg, #020617 0%, #581c87 100%)", lightBg: "linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 100%)" },
  { id: "cyberpunk-grid", name: "Cyberpunk Grid", icon: "Cpu", desc: "Retro-futuristic cyan-pink grid", bg: "linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)", lightBg: "linear-gradient(rgba(14,116,144,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.03) 1px, transparent 1px)" },
  { id: "sunset-glow", name: "Sunset Velvet", icon: "Sun", desc: "Warm rich golden amber gradients", bg: "linear-gradient(135deg, #180020 0%, #9a3412 100%)", lightBg: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)" },
  { id: "ocean-depth", name: "Ocean Depths", icon: "Waves", desc: "Teal marine evergreen waters", bg: "linear-gradient(180deg, #022c22 0%, #064e3b 100%)", lightBg: "linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)" },
  { id: "forest-whisper", name: "Forest Whisper", icon: "Trees", desc: "Peaceful sage evergreen woodland", bg: "linear-gradient(135deg, #022c22 0%, #052e16 100%)", lightBg: "linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)" },
  { id: "aurora-borealis", name: "Aurora Glow", icon: "Compass", desc: "Dynamic green-blue polar glow", bg: "linear-gradient(135deg, #020617 0%, #043530 100%)", lightBg: "linear-gradient(135deg, #f0fdfa 0%, #99f6e4 100%)" },
  { id: "neon-shallows", name: "Neon Shallows", icon: "Zap", desc: "High-contrast cyan-pink cyber aura", bg: "linear-gradient(135deg, #020617 0%, #4c0519 100%)", lightBg: "linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)" },
  { id: "sahara-sand", name: "Sahara Dune", icon: "Flame", desc: "Cozy warm dunes golden sand", bg: "linear-gradient(135deg, #0f0502 0%, #451a03 100%)", lightBg: "linear-gradient(135deg, #fefce8 0%, #fef08a 100%)" },
  { id: "deep-space", name: "Deep Space", icon: "Globe", desc: "Pure deep space absolute obsidian", bg: "radial-gradient(circle, #030712 0%, #020202 100%)", lightBg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" },
  { id: "electric-indigo", name: "Electric Indigo", icon: "Radio", desc: "High voltage deep electric indigo", bg: "linear-gradient(180deg, #03000a 0%, #1e1b4b 100%)", lightBg: "linear-gradient(135deg, #f5f3ff 0%, #c7d2fe 100%)" },
  { id: "magma-flow", name: "Magma Flow", icon: "Activity", desc: "Molten volcanic lava crimson glow", bg: "linear-gradient(135deg, #000000 0%, #450a0a 100%)", lightBg: "linear-gradient(135deg, #fff5f5 0%, #fca5a5 100%)" },
  { id: "cyber-emerald", name: "Matrix Cyber", icon: "Terminal", desc: "System console emerald matrix grids", bg: "radial-gradient(circle at center, rgba(6, 78, 59, 0.15) 0%, #010502 85%)", lightBg: "radial-gradient(circle at center, rgba(16, 185, 129, 0.06) 0%, #f4fbf7 85%)" },
  { id: "sakura-blossom", name: "Sakura Blossom", icon: "Heart", desc: "Soft romantic pink flower gardens", bg: "linear-gradient(135deg, #0a0104 0%, #4c051e 100%)", lightBg: "linear-gradient(135deg, #fff1f2 0%, #fecdd3 100%)" },
  { id: "ice-glacier", name: "Arctic Glacier", icon: "Wind", desc: "Frosted polar glacier shelves", bg: "linear-gradient(135deg, #010a14 0%, #083344 100%)", lightBg: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)" },
  { id: "bento-grid-dark", name: "Bento Minimal", icon: "Grid", desc: "Carbon fiber technical outline grid", bg: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)", lightBg: "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)" },
  { id: "solar-storm", name: "Solar Storm", icon: "AlertTriangle", desc: "Solar flares and amber cosmic winds", bg: "linear-gradient(135deg, #080200 0%, #431407 100%)", lightBg: "linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)" },
  { id: "custom", name: "Custom Image", icon: "Image", desc: "Specify your own custom background URL", bg: "linear-gradient(45deg, #1e293b, #0f172a)", lightBg: "linear-gradient(45deg, #f1f5f9, #cbd5e1)" }
];

export function ColorPalettePicker({ 
  value, 
  onChange,
  defaultValue,
  onReset
}: { 
  value: string; 
  onChange: (color: string) => void; 
  defaultValue?: string;
  onReset?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(value);
  const originalColorRef = React.useRef(value);

  // When value changes from outside, sync tempColor
  useEffect(() => {
    setTempColor(value);
  }, [value]);

  const handleOpen = () => {
    originalColorRef.current = value;
    setTempColor(value);
    setIsOpen(true);
  };

  const handleLiveChange = (color: string) => {
    setTempColor(color);
    // Instant real-time update of actual ERP style behind popup
    onChange(color);
  };

  const handleSave = () => {
    onChange(tempColor);
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Revert to original color on cancel
    onChange(originalColorRef.current);
    setTempColor(originalColorRef.current);
    setIsOpen(false);
  };

  const handleResetToDefault = () => {
    if (defaultValue) {
      handleLiveChange(defaultValue);
    } else if (onReset) {
      onReset();
    }
  };

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded-xl transition-all cursor-pointer text-xs text-slate-300 font-bold group shadow-sm shrink-0"
      >
        <span 
          className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0 transition-transform group-hover:scale-110" 
          style={{ backgroundColor: value }} 
        />
        <span className="font-mono tracking-wider">{value?.toUpperCase() || "#FFFFFF"}</span>
        <span className="text-[10px] text-slate-500 group-hover:text-cyan-400 transition-colors uppercase font-display ml-1">Change Color</span>
      </button>

      {/* POPUP MODAL */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-5.5 h-5.5 rounded-lg flex items-center justify-center bg-cyan-950 border border-cyan-500/20 text-cyan-400">
                  <span className="text-xs font-black">RGB</span>
                </div>
                <div>
                  <h3 className="text-xs font-black font-display text-white uppercase tracking-wider leading-none">ERP Color Studio</h3>
                  <p className="text-[9px] text-slate-400 font-semibold mt-1">Live tuning active color option in real-time</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleCancel}
                className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Side: Color Picker */}
              <div className="md:col-span-7 flex flex-col gap-4">
                <RgbColorPicker
                  value={tempColor}
                  onChange={handleLiveChange}
                  isDarkMode={true}
                />
                
                {/* Reset Buttons */}
                {(defaultValue || onReset) && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-400 hover:text-white font-bold text-xs uppercase transition-all cursor-pointer"
                  >
                    Reset to Default Option ({defaultValue || "Original"})
                  </button>
                )}
              </div>

              {/* Right Side: High-Fidelity Mini Live Preview */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Mockup Preview</span>
                  <span className="text-[8px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                    Real-time
                  </span>
                </div>

                {/* Simulated ERP Mockup */}
                <div 
                  className="flex-1 rounded-2xl border flex flex-col overflow-hidden text-slate-300 font-sans shadow-md min-h-[250px]"
                  style={{ backgroundColor: "#020617" }}
                >
                  {/* Top Bar */}
                  <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-[10px] font-black shrink-0">
                    <span className="text-white">ERP Control Panel</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex overflow-hidden text-[9px] font-bold">
                    {/* Sidebar */}
                    <div className="w-14 border-r border-slate-850 p-1.5 flex flex-col gap-1 shrink-0" style={{ backgroundColor: "#0f172a" }}>
                      <div className="w-full h-1.5 rounded-full bg-slate-700 opacity-60" />
                      <div className="w-8 h-1.5 rounded-full bg-slate-800 mt-1" />
                      <div className="w-10 h-1.5 rounded-full bg-slate-800" />
                    </div>

                    {/* Main content area */}
                    <div className="flex-1 p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-white">System Balance</span>
                        <span className="text-[7px] px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/20">Live</span>
                      </div>
                      
                      <div className="p-2 rounded-lg border border-slate-800 bg-slate-900/20 space-y-1">
                        <div className="text-[11px] font-black text-white">$24,850</div>
                        <div className="h-3 w-full flex items-end gap-1 pt-1">
                          {[25, 60, 45, 90, 75, 100].map((h, i) => (
                            <div 
                              key={i}
                              className="flex-1 rounded-sm bg-cyan-400"
                              style={{ 
                                height: `${h}%`,
                                backgroundColor: tempColor
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Interactive Button Preview */}
                      <button 
                        type="button"
                        className="w-full py-1 rounded text-[8px] font-black text-white animate-pulse"
                        style={{ backgroundColor: tempColor }}
                      >
                        Sample Styled Element
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                  Notice: Changes are instantly applied to the main ERP view behind this dialog. Click Save to keep them, or Cancel to revert.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-900 bg-slate-900/40 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/30 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={13} />
                Save Color
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

const AmbientAnimationOverlay = ({ 
  animations,
  isDarkMode = true
}: { 
  animations: { 
    enableEffect: boolean; 
    effectType: string; 
    animationSpeed: string;
    backgroundTheme?: string;
    customBackgroundUrl?: string;
    backgroundOpacity?: number;
    interactiveBubbles?: boolean;
  };
  isDarkMode?: boolean;
}) => {
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

    // Mouse coordinates tracking
    const mouse = { x: -1000, y: -1000, active: false };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const speedMultiplier = animations.animationSpeed === "slow" ? 0.5 : animations.animationSpeed === "fast" ? 2 : 1;

    // Light/Dark mode specific style constants for background animations
    const isDark = isDarkMode;
    const starColor = isDark ? "rgba(255, 255, 255, " : "rgba(15, 23, 42, ";
    const starShadow = isDark ? "#ffffff" : "#0f172a";
    const flakeColor = isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(15, 23, 42, 0.7)";
    const flakeShadow = isDark ? "#ffffff" : "#0f172a";
    const matrixBg = isDark ? "rgba(10, 15, 30, 0.08)" : "rgba(255, 255, 255, 0.08)";
    const matrixColor = isDark ? "#22d3ee" : "#0e7490";
    const bubbleStroke = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(15, 23, 42, 0.4)";
    const bubbleShine = isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(15, 23, 42, 0.3)";
    const rainStroke = isDark ? "rgba(14, 165, 233, 0.7)" : "rgba(2, 132, 199, 0.8)";
    const fireflyColor = isDark ? "rgba(234, 179, 8, 0.7)" : "rgba(180, 83, 9, 0.85)";
    const fireflyShadow = isDark ? "rgba(234, 179, 8, 0.9)" : "rgba(180, 83, 9, 0.9)";

    // Sparks array for interactive trailing
    const sparks: Array<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string }> = [];

    const createSpark = (x: number, y: number) => {
      const colors = ["#22d3ee", "#f43f5e", "#10b981", "#fb923c", "#a78bfa", "#eab308"];
      sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4 * speedMultiplier,
        vy: (Math.random() - 0.5) * 4 * speedMultiplier - 1,
        r: Math.random() * 3 + 1.5,
        alpha: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    };

    if (animations.effectType === "matrix") {
      const columns = Math.floor(width / 20) + 1;
      const yPositions = Array(columns).fill(0);

      const render = () => {
        ctx.fillStyle = matrixBg;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = matrixColor;
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
    } else if (animations.effectType === "stars") {
      // Twinkling stars + Interactive mouse sparks
      const stars: Array<{ x: number; y: number; r: number; alpha: number; speed: number; direction: number }> = [];
      for (let i = 0; i < 80; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.8 + 0.6,
          alpha: Math.random(),
          speed: (Math.random() * 0.02 + 0.005) * speedMultiplier,
          direction: Math.random() > 0.5 ? 1 : -1
        });
      }

      let lastSparkTime = 0;

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        // Render static twinkling stars
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          s.alpha += s.speed * s.direction;
          if (s.alpha >= 1) {
            s.alpha = 1;
            s.direction = -1;
          } else if (s.alpha <= 0.1) {
            s.alpha = 0.1;
            s.direction = 1;
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `${starColor}${s.alpha})`;
          ctx.shadowBlur = 4;
          ctx.shadowColor = starShadow;
          ctx.fill();
        }
        ctx.shadowBlur = 0; // reset

        // Create interactive trail sparks when mouse moves
        if (mouse.active) {
          const now = Date.now();
          if (now - lastSparkTime > 30) {
            createSpark(mouse.x, mouse.y);
            lastSparkTime = now;
          }
        }

        // Draw and update sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.alpha -= 0.02;

          if (sp.alpha <= 0) {
            sparks.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = sp.alpha;
          ctx.shadowBlur = 6;
          ctx.shadowColor = sp.color;
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "bubbles") {
      // Floating bubbles that repel from mouse cursor
      const bubbles: Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string; buoyancy: number }> = [];
      const colors = ["rgba(34, 211, 238, 0.25)", "rgba(167, 139, 250, 0.25)", "rgba(16, 185, 129, 0.25)", "rgba(244, 63, 94, 0.25)"];

      for (let i = 0; i < 40; i++) {
        bubbles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1,
          vy: - (Math.random() * 0.8 + 0.4),
          r: Math.random() * 12 + 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          buoyancy: Math.random() * 0.05 + 0.02
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < bubbles.length; i++) {
          const b = bubbles[i];

          // Basic physics
          b.y += b.vy * speedMultiplier;
          b.x += b.vx * speedMultiplier;

          // Gentle bounce on vertical/horizontal borders
          if (b.x - b.r < 0) { b.x = b.r; b.vx *= -1; }
          if (b.x + b.r > width) { b.x = width - b.r; b.vx *= -1; }

          // Repulsion logic when mouse is near
          if (mouse.active) {
            const dx = b.x - mouse.x;
            const dbY = b.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dbY * dbY);
            if (dist < 130) {
              const force = (130 - dist) / 130;
              b.vx += (dx / dist) * force * 1.8 * speedMultiplier;
              b.vy += (dbY / dist) * force * 1.8 * speedMultiplier;
            }
          }

          // Friction to keep things from getting chaotic
          b.vx *= 0.94;
          b.vy *= 0.94;

          // Re-apply steady buoyancy drift
          b.vy -= b.buoyancy * speedMultiplier;
          if (b.vy < -2.5) b.vy = -2.5;

          // Wrap back to bottom
          if (b.y + b.r < -10) {
            b.y = height + b.r + 20;
            b.x = Math.random() * width;
            b.vx = (Math.random() - 0.5) * 1;
            b.vy = - (Math.random() * 0.8 + 0.4);
          }

          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.strokeStyle = bubbleStroke;
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();

          // Highlight shine inside bubble
          ctx.beginPath();
          ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = bubbleShine;
          ctx.fill();
        }

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "snow") {
      // Falling winter snowflakes
      const flakes: Array<{ x: number; y: number; r: number; d: number; speed: number }> = [];
      for (let i = 0; i < 60; i++) {
        flakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 3.5 + 1.2,
          d: Math.random() * 50,
          speed: (Math.random() * 0.7 + 0.3) * speedMultiplier
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < flakes.length; i++) {
          const f = flakes[i];
          f.y += f.speed;
          f.x += Math.sin(f.d) * 0.4 * speedMultiplier;
          f.d += 0.01;

          if (f.y > height) {
            flakes[i] = {
              ...f,
              y: -10,
              x: Math.random() * width,
              speed: (Math.random() * 0.7 + 0.3) * speedMultiplier
            };
          }

          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = flakeColor;
          ctx.shadowBlur = 3;
          ctx.shadowColor = flakeShadow;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "fireflies") {
      // Cozy drifting glowing fireflies
      const flies: Array<{ x: number; y: number; r: number; vx: number; vy: number; alpha: number; cycle: number; color: string }> = [];
      for (let i = 0; i < 35; i++) {
        flies.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2.2 + 1.5,
          vx: (Math.random() - 0.5) * 0.8 * speedMultiplier,
          vy: (Math.random() - 0.5) * 0.8 * speedMultiplier,
          alpha: Math.random(),
          cycle: Math.random() * Math.PI,
          color: fireflyColor
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < flies.length; i++) {
          const f = flies[i];
          f.x += f.vx;
          f.y += f.vy;
          f.cycle += 0.02 * speedMultiplier;
          f.alpha = (Math.sin(f.cycle) + 1) / 2; // fade in / out nicely

          // boundary wrapping
          if (f.x < 0) f.x = width;
          if (f.x > width) f.x = 0;
          if (f.y < 0) f.y = height;
          if (f.y > height) f.y = 0;

          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = f.color;
          ctx.globalAlpha = f.alpha;
          ctx.shadowBlur = 10;
          ctx.shadowColor = fireflyShadow;
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "rain") {
      const drops: Array<{ x: number; y: number; length: number; speed: number; opacity: number }> = [];
      for (let i = 0; i < 100; i++) {
        drops.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: Math.random() * 20 + 10,
          speed: (Math.random() * 10 + 15) * speedMultiplier,
          opacity: Math.random() * 0.4 + 0.1
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = rainStroke;
        ctx.lineWidth = 1.5;

        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          ctx.beginPath();
          ctx.globalAlpha = d.opacity;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x, d.y + d.length);
          ctx.stroke();

          d.y += d.speed;
          if (d.y > height) {
            d.y = -20;
            d.x = Math.random() * width;
          }
        }
        ctx.globalAlpha = 1.0;
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "fire") {
      const embers: Array<{ x: number; y: number; r: number; vy: number; vx: number; alpha: number; life: number; color: string }> = [];
      const colors = ["#f97316", "#ef4444", "#f59e0b", "#ffedd5"];
      
      const render = () => {
        ctx.clearRect(0, 0, width, height);

        // Spawn embers at bottom
        if (embers.length < 80) {
          embers.push({
            x: Math.random() * width,
            y: height + Math.random() * 20,
            r: Math.random() * 3.5 + 1.5,
            vy: - (Math.random() * 2 + 1) * speedMultiplier,
            vx: (Math.random() - 0.5) * 1.5 * speedMultiplier,
            alpha: 1.0,
            life: Math.random() * 100 + 50,
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }

        for (let i = embers.length - 1; i >= 0; i--) {
          const e = embers[i];
          e.x += e.vx;
          e.y += e.vy;
          e.life -= speedMultiplier;
          e.alpha = Math.max(0, e.life / 150);

          if (e.life <= 0 || e.y < 0) {
            embers.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          ctx.fillStyle = e.color;
          ctx.globalAlpha = e.alpha;
          ctx.shadowBlur = 8;
          ctx.shadowColor = e.color;
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "pulse") {
      const waves: Array<{ r: number; alpha: number; speed: number; x: number; y: number }> = [];
      let counter = 0;

      const render = () => {
        ctx.clearRect(0, 0, width, height);
        
        counter += speedMultiplier;
        if (counter % 40 < 1) {
          waves.push({
            r: 5,
            alpha: 0.8,
            speed: 2.5 * speedMultiplier,
            x: mouse.active ? mouse.x : width / 2,
            y: mouse.active ? mouse.y : height / 2
          });
        }

        ctx.lineWidth = 2.5;
        for (let i = waves.length - 1; i >= 0; i--) {
          const w = waves[i];
          w.r += w.speed;
          w.alpha -= 0.006 * speedMultiplier;

          if (w.alpha <= 0 || w.r > width) {
            waves.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34, 211, 238, ${w.alpha})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(34, 211, 238, 0.5)";
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "particles") {
      const parts: Array<{ x: number; y: number; r: number; vx: number; vy: number; color: string }> = [];
      const colors = ["#22d3ee", "#a78bfa", "#f43f5e", "#10b981"];
      for (let i = 0; i < 60; i++) {
        parts.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 4 + 1.5,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          
          if (mouse.active) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 300) {
              p.vx += (dx / dist) * 0.04 * speedMultiplier;
              p.vy += (dy / dist) * 0.04 * speedMultiplier;
            }
          }

          p.x += p.vx * speedMultiplier;
          p.y += p.vy * speedMultiplier;
          p.vx *= 0.98;
          p.vy *= 0.98;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.6;
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "matrix-red") {
      const columns = Math.floor(width / 20) + 1;
      const yPositions = Array(columns).fill(0);

      const render = () => {
        ctx.fillStyle = "rgba(15, 5, 5, 0.08)";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#ef4444";
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
    } else if (animations.effectType === "aurora") {
      let phase = 0;

      const render = () => {
        ctx.clearRect(0, 0, width, height);
        
        phase += 0.003 * speedMultiplier;
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, "rgba(16, 185, 129, 0)");
        grad.addColorStop(0.3, `rgba(16, 185, 129, ${Math.abs(Math.sin(phase)) * 0.15})`);
        grad.addColorStop(0.5, `rgba(6, 182, 212, ${Math.abs(Math.sin(phase + 1)) * 0.15})`);
        grad.addColorStop(0.7, `rgba(139, 92, 246, ${Math.abs(Math.cos(phase)) * 0.12})`);
        grad.addColorStop(1, "rgba(139, 92, 246, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.1);
        for (let x = 0; x <= width; x += 30) {
          const y = height * 0.35 + Math.sin(x * 0.004 + phase) * 120 + Math.cos(x * 0.002 + phase) * 60;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height * 0.95);
        ctx.lineTo(0, height * 0.95);
        ctx.closePath();
        ctx.fill();

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "jellyfish") {
      const jellies: Array<{ x: number; y: number; r: number; speed: number; pulseCycle: number; color: string }> = [];
      const colors = ["rgba(167, 139, 250, 0.22)", "rgba(34, 211, 238, 0.22)", "rgba(244, 63, 94, 0.22)"];
      for (let i = 0; i < 8; i++) {
        jellies.push({
          x: Math.random() * width,
          y: height + Math.random() * 100,
          r: Math.random() * 15 + 15,
          speed: (Math.random() * 0.4 + 0.3) * speedMultiplier,
          pulseCycle: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < jellies.length; i++) {
          const j = jellies[i];
          j.pulseCycle += 0.03 * speedMultiplier;
          const scale = 1 + Math.sin(j.pulseCycle) * 0.2;
          
          j.y -= j.speed * (1 + Math.sin(j.pulseCycle) * 0.4);

          if (j.y < -50) {
            j.y = height + 50;
            j.x = Math.random() * width;
          }

          ctx.beginPath();
          ctx.arc(j.x, j.y, j.r * scale, Math.PI, 0, false);
          ctx.fillStyle = j.color;
          ctx.fill();

          // draw tentacles
          ctx.beginPath();
          ctx.strokeStyle = j.color;
          ctx.lineWidth = 1.5;
          for (let t = -3; t <= 3; t++) {
            const tx = j.x + (t * j.r * 0.25);
            ctx.moveTo(tx, j.y);
            ctx.quadraticCurveTo(
              tx + Math.sin(j.pulseCycle) * 10,
              j.y + j.r * 1.5,
              tx + Math.cos(j.pulseCycle + t) * 5,
              j.y + j.r * 2.5
            );
          }
          ctx.stroke();
        }

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "leaves") {
      const leaves: Array<{ x: number; y: number; r: number; speed: number; angle: number; angleSpeed: number; color: string }> = [];
      const colors = ["#d97706", "#b45309", "#ea580c", "#ca8a04"];
      for (let i = 0; i < 25; i++) {
        leaves.push({
          x: Math.random() * width,
          y: Math.random() * height - height,
          r: Math.random() * 8 + 6,
          speed: (Math.random() * 0.8 + 0.5) * speedMultiplier,
          angle: Math.random() * Math.PI * 2,
          angleSpeed: (Math.random() * 0.02 - 0.01) * speedMultiplier,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < leaves.length; i++) {
          const lf = leaves[i];
          lf.y += lf.speed;
          lf.x += Math.sin(lf.angle) * 0.5 * speedMultiplier;
          lf.angle += lf.angleSpeed;

          if (lf.y > height + 20) {
            lf.y = -20;
            lf.x = Math.random() * width;
          }

          ctx.save();
          ctx.translate(lf.x, lf.y);
          ctx.rotate(lf.angle);
          ctx.fillStyle = lf.color;
          
          ctx.beginPath();
          ctx.moveTo(0, -lf.r);
          ctx.quadraticCurveTo(lf.r * 0.6, -lf.r * 0.5, 0, lf.r);
          ctx.quadraticCurveTo(-lf.r * 0.6, -lf.r * 0.5, 0, -lf.r);
          ctx.fill();
          
          ctx.restore();
        }

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "laser") {
      let laserY = 0;
      let laserDir = 1;

      const render = () => {
        ctx.clearRect(0, 0, width, height);
        
        laserY += 1.5 * laserDir * speedMultiplier;
        if (laserY > height) {
          laserY = height;
          laserDir = -1;
        } else if (laserY < 0) {
          laserY = 0;
          laserDir = 1;
        }

        const grad = ctx.createLinearGradient(0, laserY - 15, 0, laserY + 15);
        grad.addColorStop(0, "rgba(6, 182, 212, 0)");
        grad.addColorStop(0.5, "rgba(6, 182, 212, 0.45)");
        grad.addColorStop(1, "rgba(6, 182, 212, 0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, laserY - 15, width, 30);

        // Core laser line
        ctx.strokeStyle = "rgba(34, 211, 238, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, laserY);
        ctx.lineTo(width, laserY);
        ctx.stroke();

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "galaxy") {
      const stars: Array<{ x: number; y: number; r: number; alpha: number; angle: number; dist: number; speed: number }> = [];
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: 0, y: 0,
          r: Math.random() * 1.5 + 0.4,
          alpha: Math.random() * 0.8 + 0.2,
          angle: Math.random() * Math.PI * 2,
          dist: Math.random() * Math.min(width, height) * 0.75,
          speed: (Math.random() * 0.0015 + 0.0003) * speedMultiplier
        });
      }
      const render = () => {
        ctx.fillStyle = isDark ? "rgba(3, 1, 8, 0.15)" : "rgba(245, 243, 250, 0.15)";
        ctx.fillRect(0, 0, width, height);
        const cx = width / 2;
        const cy = height / 2;

        const nebula = ctx.createRadialGradient(cx, cy, 5, cx, cy, Math.min(width, height) * 0.55);
        nebula.addColorStop(0, isDark ? "rgba(109, 40, 217, 0.14)" : "rgba(196, 181, 253, 0.14)");
        nebula.addColorStop(0.4, isDark ? "rgba(30, 58, 138, 0.07)" : "rgba(191, 219, 254, 0.07)");
        nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, width, height);

        stars.forEach(s => {
          s.angle += s.speed;
          s.x = cx + Math.cos(s.angle) * s.dist;
          s.y = cy + Math.sin(s.angle) * s.dist;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${s.alpha})` : `rgba(15, 23, 42, ${s.alpha})`;
          ctx.fill();
        });
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "water-waves") {
      let offset = 0;
      const render = () => {
        ctx.clearRect(0, 0, width, height);
        offset += 0.012 * speedMultiplier;
        
        for (let w = 0; w < 3; w++) {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width + 10; x += 15) {
            const sinVal = Math.sin(x * 0.004 + offset + w * 1.8);
            const cosVal = Math.cos(x * 0.0015 + offset * 0.6 + w);
            const y = height - 100 + sinVal * 30 + cosVal * 15 - w * 25;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fillStyle = w === 0 
            ? (isDark ? "rgba(6, 182, 212, 0.06)" : "rgba(186, 230, 253, 0.2)")
            : w === 1
            ? (isDark ? "rgba(8, 145, 178, 0.09)" : "rgba(125, 211, 252, 0.15)")
            : (isDark ? "rgba(14, 116, 144, 0.12)" : "rgba(56, 189, 248, 0.1)");
          ctx.fill();
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "smoke") {
      const smokeParticles: Array<{ x: number; y: number; r: number; vx: number; vy: number; alpha: number; life: number; maxLife: number }> = [];
      const render = () => {
        ctx.clearRect(0, 0, width, height);
        if (smokeParticles.length < 35) {
          smokeParticles.push({
            x: Math.random() * width,
            y: height + Math.random() * 20,
            r: Math.random() * 35 + 20,
            vx: (Math.random() - 0.5) * 0.4,
            vy: - (Math.random() * 1.0 + 0.3),
            alpha: Math.random() * 0.12 + 0.04,
            life: 0,
            maxLife: Math.random() * 250 + 150
          });
        }
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
          const p = smokeParticles[i];
          p.x += p.vx * speedMultiplier;
          p.y += p.vy * speedMultiplier;
          p.r += 0.12 * speedMultiplier;
          p.life += speedMultiplier;
          const currentAlpha = p.alpha * (1 - p.life / p.maxLife);
          if (p.life >= p.maxLife || p.y < -p.r) {
            smokeParticles.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? `rgba(200, 200, 255, ${currentAlpha})` : `rgba(75, 85, 105, ${currentAlpha})`;
          ctx.fill();
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "clouds") {
      const clouds: Array<{ x: number; y: number; r: number; speed: number; opacity: number }> = [];
      for (let i = 0; i < 12; i++) {
        clouds.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.5,
          r: Math.random() * 70 + 50,
          speed: (Math.random() * 0.12 + 0.03) * speedMultiplier,
          opacity: Math.random() * 0.08 + 0.03
        });
      }
      const render = () => {
        ctx.clearRect(0, 0, width, height);
        clouds.forEach(c => {
          c.x += c.speed;
          if (c.x - c.r > width) {
            c.x = -c.r;
            c.y = Math.random() * height * 0.5;
          }
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
          ctx.arc(c.x - c.r * 0.4, c.y + c.r * 0.15, c.r * 0.65, 0, Math.PI * 2);
          ctx.arc(c.x + c.r * 0.4, c.y + c.r * 0.15, c.r * 0.65, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${c.opacity})` : `rgba(148, 163, 184, ${c.opacity})`;
          ctx.fill();
        });
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "hexagon") {
      let wave = 0;
      const render = () => {
        ctx.clearRect(0, 0, width, height);
        wave += 0.015 * speedMultiplier;
        const hexRadius = 40;
        const h = hexRadius * Math.sqrt(3);
        
        for (let y = 0; y < height + h; y += h) {
          for (let x = 0; x < width + hexRadius * 3; x += hexRadius * 3) {
            const drawHex = (cx: number, cy: number) => {
              ctx.beginPath();
              for (let side = 0; side < 6; side++) {
                const angle = (side * Math.PI) / 3;
                const px = cx + hexRadius * Math.cos(angle);
                const py = cy + hexRadius * Math.sin(angle);
                if (side === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              const dist = Math.sqrt((cx - mouse.x) * (cx - mouse.x) + (cy - mouse.y) * (cy - mouse.y));
              if (dist < 180 && mouse.active) {
                ctx.strokeStyle = isDark 
                  ? `rgba(34, 211, 238, ${(180 - dist) / 180 * 0.35})` 
                  : `rgba(14, 116, 144, ${(180 - dist) / 180 * 0.35})`;
                ctx.lineWidth = 1.2;
              } else {
                const pulse = (Math.sin(cx * 0.003 + cy * 0.003 + wave) + 1) / 2;
                ctx.strokeStyle = isDark 
                  ? `rgba(34, 211, 238, ${pulse * 0.05 + 0.01})` 
                  : `rgba(14, 116, 144, ${pulse * 0.06 + 0.01})`;
                ctx.lineWidth = 0.8;
              }
              ctx.stroke();
            };
            drawHex(x, y);
            drawHex(x + hexRadius * 1.5, y + h / 2);
          }
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "geometric") {
      const shapes: Array<{ x: number; y: number; r: number; vx: number; vy: number; angle: number; speed: number; type: string; color: string }> = [];
      const types = ["square", "triangle", "circle"];
      const colors = isDark 
        ? ["rgba(34, 211, 238, 0.12)", "rgba(244, 63, 94, 0.12)", "rgba(167, 139, 250, 0.12)"]
        : ["rgba(14, 116, 144, 0.1)", "rgba(225, 29, 72, 0.1)", "rgba(109, 40, 217, 0.1)"];
      for (let i = 0; i < 15; i++) {
        shapes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 15 + 12,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          angle: Math.random() * Math.PI * 2,
          speed: (Math.random() * 0.015 - 0.0075) * speedMultiplier,
          type: types[Math.floor(Math.random() * types.length)],
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
      const render = () => {
        ctx.clearRect(0, 0, width, height);
        shapes.forEach(s => {
          s.x += s.vx * speedMultiplier;
          s.y += s.vy * speedMultiplier;
          s.angle += s.speed;
          if (s.x - s.r < 0 || s.x + s.r > width) s.vx *= -1;
          if (s.y - s.r < 0 || s.y + s.r > height) s.vy *= -1;

          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.angle);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          if (s.type === "square") {
            ctx.strokeRect(-s.r, -s.r, s.r * 2, s.r * 2);
          } else if (s.type === "triangle") {
            ctx.moveTo(0, -s.r);
            ctx.lineTo(s.r, s.r);
            ctx.lineTo(-s.r, s.r);
            ctx.closePath();
            ctx.stroke();
          } else {
            ctx.arc(0, 0, s.r, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        });
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "circuit") {
      const lines: Array<{ x: number; y: number; vx: number; vy: number; length: number; maxLength: number; branches: number }> = [];
      const completedLines: Array<{ path: Array<{ x: number; y: number }> }> = [];
      const spawnLine = () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const dir = Math.floor(Math.random() * 4);
        const vx = dir === 0 ? 1.5 : dir === 1 ? -1.5 : 0;
        const vy = dir === 2 ? 1.5 : dir === 3 ? -1.5 : 0;
        return { x, y, vx, vy, length: 0, maxLength: Math.random() * 120 + 40, branches: 0 };
      };
      for (let i = 0; i < 12; i++) lines.push(spawnLine());
      const render = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = isDark ? "rgba(34, 211, 238, 0.12)" : "rgba(14, 116, 144, 0.15)";
        ctx.lineWidth = 1.2;

        completedLines.forEach(l => {
          ctx.beginPath();
          ctx.moveTo(l.path[0].x, l.path[0].y);
          for (let i = 1; i < l.path.length; i++) ctx.lineTo(l.path[i].x, l.path[i].y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(l.path[l.path.length - 1].x, l.path[l.path.length - 1].y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "rgba(34, 211, 238, 0.25)" : "rgba(14, 116, 144, 0.3)";
          ctx.fill();
        });

        for (let i = lines.length - 1; i >= 0; i--) {
          const l = lines[i];
          const prevX = l.x;
          const prevY = l.y;
          l.x += l.vx * speedMultiplier;
          l.y += l.vy * speedMultiplier;
          l.length += Math.abs(l.vx + l.vy) * speedMultiplier;

          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(l.x, l.y);
          ctx.stroke();

          if (l.length >= l.maxLength) {
            if (l.branches < 2 && Math.random() < 0.4) {
              const dir = Math.random() < 0.5 ? { vx: l.vy, vy: -l.vx } : { vx: -l.vy, vy: l.vx };
              lines.push({
                x: l.x,
                y: l.y,
                vx: dir.vx,
                vy: dir.vy,
                length: 0,
                maxLength: Math.random() * 80 + 20,
                branches: l.branches + 1
              });
            }
            completedLines.push({ path: [{ x: prevX, y: prevY }, { x: l.x, y: l.y }] });
            if (completedLines.length > 35) completedLines.shift();
            lines[i] = spawnLine();
          }
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "light-rays") {
      let angle = 0;
      const render = () => {
        ctx.clearRect(0, 0, width, height);
        angle += 0.0008 * speedMultiplier;
        const numRays = 14;
        ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.012)" : "rgba(30, 41, 59, 0.012)";
        const cx = width * 0.15;
        const cy = -40;
        for (let i = 0; i < numRays; i++) {
          const rayAngle = (i * Math.PI * 2) / numRays + angle;
          const rayAngleEnd = rayAngle + 0.1 + Math.sin(angle * 2.5 + i) * 0.03;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(rayAngle) * width * 1.4, cy + Math.sin(rayAngle) * height * 1.4);
          ctx.lineTo(cx + Math.cos(rayAngleEnd) * width * 1.4, cy + Math.sin(rayAngleEnd) * height * 1.4);
          ctx.closePath();
          ctx.fill();
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "moving-gradients" || animations.effectType === "mesh-gradients") {
      const blobs: Array<{ x: number; y: number; r: number; vx: number; vy: number; color1: string; color2: string }> = [];
      const colors = isDark
        ? [
            ["rgba(124, 58, 237, 0.12)", "rgba(0,0,0,0)"],
            ["rgba(8, 145, 178, 0.12)", "rgba(0,0,0,0)"],
            ["rgba(13, 148, 136, 0.12)", "rgba(0,0,0,0)"],
            ["rgba(219, 39, 119, 0.08)", "rgba(0,0,0,0)"]
          ]
        : [
            ["rgba(196, 181, 253, 0.16)", "rgba(255,255,255,0)"],
            ["rgba(165, 243, 252, 0.18)", "rgba(255,255,255,0)"],
            ["rgba(153, 246, 228, 0.16)", "rgba(255,255,255,0)"],
            ["rgba(252, 165, 203, 0.12)", "rgba(255,255,255,0)"]
          ];
      for (let i = 0; i < 4; i++) {
        blobs.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * width * 0.3 + width * 0.15,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          color1: colors[i][0],
          color2: colors[i][1]
        });
      }
      const render = () => {
        ctx.clearRect(0, 0, width, height);

        blobs.forEach(b => {
          b.x += b.vx * speedMultiplier;
          b.y += b.vy * speedMultiplier;
          if (b.x - b.r * 0.5 < 0 || b.x + b.r * 0.5 > width) b.vx *= -1;
          if (b.y - b.r * 0.5 < 0 || b.y + b.r * 0.5 > height) b.vy *= -1;

          const grad = ctx.createRadialGradient(b.x, b.y, b.r * 0.1, b.x, b.y, b.r);
          grad.addColorStop(0, b.color1);
          grad.addColorStop(1, b.color2);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        });
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    } else if (animations.effectType === "floating-polygons") {
      const nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
      for (let i = 0; i < 35; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          r: Math.random() * 2.0 + 1.0
        });
      }
      const render = () => {
        ctx.clearRect(0, 0, width, height);
        
        nodes.forEach(n => {
          n.x += n.vx * speedMultiplier;
          n.y += n.vy * speedMultiplier;
          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "rgba(34, 211, 238, 0.4)" : "rgba(14, 116, 144, 0.45)";
          ctx.fill();
        });

        ctx.lineWidth = 0.6;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              const alpha = (100 - dist) / 100 * 0.12;
              ctx.strokeStyle = isDark ? `rgba(34, 211, 238, ${alpha})` : `rgba(14, 116, 144, ${alpha})`;
              ctx.stroke();
            }
          }
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [animations]);

  if (!animations.enableEffect || animations.effectType === "none" || animations.effectType === "neon") {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-[0.32]"
    />
  );
};

export default function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      const localToken = localStorage.getItem("mess_token");
      const expiryStr = localStorage.getItem("mess_token_expiry");
      if (localToken) {
        if (expiryStr) {
          const expiry = parseInt(expiryStr, 10);
          if (Date.now() > expiry) {
            localStorage.removeItem("mess_token");
            localStorage.removeItem("mess_token_expiry");
            return null;
          }
        }
        return localToken;
      }
      return sessionStorage.getItem("mess_token");
    } catch (e) {
      console.error("Failed to read session token from storage", e);
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [firebaseAuthChecked, setFirebaseAuthChecked] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "dashboard";
  });
  const [marketSubTab, setMarketSubTab] = useState<"standard" | "managerial">("standard");
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
    accentColor: "#22d3ee",
    siteAccentColorRgb: "#22d3ee",
    typographyHighlightRgb: "#67e8f9",
    layoutScaleColorRgb: "#a78bfa"
  });

  // Animations/Effects
  const [messAnimations, setMessAnimations] = useState({
    enableEffect: false,
    effectType: "none", // "none", "matrix", "neon", "confetti", "stars", "bubbles", "snow", "fireflies"
    animationSpeed: "normal",
    accentGlow: true,
    backgroundTheme: "default", // "default", "cosmic-void", "midnight-nebula", "cyberpunk-grid", "sunset-glow", "ocean-depth", "forest-whisper", "aurora-borealis", "custom"
    customBackgroundUrl: "",
    backgroundOpacity: 20,
    themeTemplate: "default-erp"
  });

  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const [enableManagerRating, setEnableManagerRating] = useState(true);
  const [balanceSheetGlow, setBalanceSheetGlow] = useState("none");
  const [roleAnimations, setRoleAnimations] = useState({
    ADMIN: { animation: "pulse", color: "text-red-500", glow: true, glowStyle: "golden-aura" },
    SUPERUSER: { animation: "pulse", color: "text-orange-500", glow: true, glowStyle: "cosmic-nebula" },
    ASSISTANT_SUPERUSER: { animation: "none", color: "text-cyan-400", glow: true, glowStyle: "deep-ocean" },
    MANAGER: { animation: "bounce", color: "text-yellow-400", glow: true, glowStyle: "emerald-ripple" },
    PARTIAL_MANAGER: { animation: "none", color: "text-emerald-400", glow: false, glowStyle: "none" },
    MEMBER: { animation: "none", color: "text-slate-400", glow: false, glowStyle: "none" }
  });

  const [adminVisibility, setAdminVisibility] = useState({
    showAdminCard: false,
    showAdminPhone: false,
    showAdminEmail: false,
    showAdminRole: false
  });

  // Dashboard Visibility rules
  const [dashboardVisibility, setDashboardVisibility] = useState({
    showAuditLogs: true,
    showCashDeposit: true,
    showMealTracker: true,
    showFoodMenu: true,
    showNotices: true,
    showAnalytics: true,
    showDashboardOverview: false
  });

  // Synchronise acting role for ultimate admin
  useEffect(() => {
    if (currentUser && currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com") {
      const storedActingRole = localStorage.getItem("acting_role");
      if (storedActingRole && storedActingRole !== currentUser.role) {
        setCurrentUser(prev => prev ? { ...prev, role: storedActingRole as UserRole } : null);
      }
    }
  }, [currentUser]);

  // Safe mode state for Admins & Super Users (defaults to true)
  const [safeMode, setSafeMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("safe_mode");
      return saved !== null ? saved === "true" : true;
    } catch (e) {
      return true;
    }
  });

  const handleToggleSafeMode = () => {
    const newVal = !safeMode;
    setSafeMode(newVal);
    try {
      localStorage.setItem("safe_mode", String(newVal));
    } catch (e) {
      console.error(e);
    }
  };

  // Forcefully override window.fetch when safeMode is on to block all POST/PUT/DELETE requests across the app
  // and inject X-Acting-Role header for ultimate admin
  useEffect(() => {
    const originalFetch = window.fetch;
    
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method || "GET").toUpperCase();
      const urlString = typeof input === "string" ? input : (input as any).url || "";
      
      if (safeMode && currentUser && ["POST", "PUT", "DELETE"].includes(method)) {
        // Exempt auth/session endpoints so the user can still log in, log out, or verify credentials safely
        const isExempt = urlString.includes("/login") || 
                        urlString.includes("/logout") || 
                        urlString.includes("/verify") || 
                        urlString.includes("/otp") ||
                        urlString.includes("/register") ||
                        urlString.includes("/activate");
                        
        if (!isExempt) {
          alert("🛡️ SAFE MODE IS ACTIVE\n\nAll changes/modifications are currently locked to prevent accidental updates.\n\nTo make any edits, please turn OFF 'Safe Mode' using the toggle button in the header.");
          return new Response(JSON.stringify({ error: "Safe Mode Active: All modifications are blocked." }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // Add X-Acting-Role header for ultimate admin
      let headers = init?.headers ? new Headers(init.headers) : new Headers();
      const actingRole = localStorage.getItem("acting_role");
      if (currentUser && currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com" && actingRole) {
        headers.set("X-Acting-Role", actingRole);
      }

      const newInit = {
        ...init,
        headers
      };
      
      return originalFetch(input, newInit);
    };

    try {
      Object.defineProperty(window, "fetch", {
        value: customFetch,
        configurable: true,
        writable: true
      });
    } catch (e) {
      console.warn("Could not redefine window.fetch via Object.defineProperty, falling back to direct assignment", e);
      try {
        (window as any).fetch = customFetch;
      } catch (err) {
        console.error("Direct assignment of window.fetch failed:", err);
      }
    }
    
    return () => {
      try {
        Object.defineProperty(window, "fetch", {
          value: originalFetch,
          configurable: true,
          writable: true
        });
      } catch (e) {
        try {
          (window as any).fetch = originalFetch;
        } catch (err) {
          // Ignore
        }
      }
    };
  }, [safeMode, currentUser]);

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

  // Market Date Forced Flow & Duties states
  const [dutiesList, setDutiesList] = useState<any[]>([]);
  const [marketForcedFlowStep, setMarketForcedFlowStep] = useState<string | null>(null);
  const [forcedMarketDate, setForcedMarketDate] = useState<string>("");

  const [messes, setMesses] = useState<{ id: string, name: string }[]>([]);
  const [activeMessId, setActiveMessId] = useState("default");

  // Dynamic UI configuration states
  const [siteColor, setSiteColor] = useState("cyan");
  const [fontSize, setFontSize] = useState("normal");
  const [fontStyle, setFontStyle] = useState("sans");
  const [logoText, setLogoText] = useState("Ababil mess");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>(["Rent/ভাড়া", "বুয়া বিল", "WiFi", "Electricity + Water"]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [mealTypes, setMealTypes] = useState<any[]>([
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ]);

  // Login page customizer
  const [loginCustomization, setLoginCustomization] = useState({
    title: "Mess ERP",
    subtitle: "BENGAL BACHELOR ERP ENGINE",
    fontStyle: "sans",
    backgroundType: "theme",
    backgroundTheme: "neon-shallows",
    backgroundColor: "#020617",
    backgroundImageUrl: "",
    showBrandingIcon: true,
    showGoogleLogin: true,
    cardBg: "rgba(15, 23, 42, 0.6)",
    textColor: "#ffffff",
    accentColor: "#22d3ee",
    animationType: "pulse"
  });

  // Home page customizer
  const [homeCustomization, setHomeCustomization] = useState({
    welcomeTitle: "Dashboard Overview",
    welcomeSubtitle: "BENGAL BACHELOR COOPERATIVE ECOSYSTEM",
    fontStyle: "sans",
    backgroundType: "theme",
    backgroundTheme: "neon-shallows",
    backgroundColor: "#020617",
    backgroundImageUrl: "",
    cardBg: "rgba(30, 41, 59, 0.4)",
    textColor: "#ffffff",
    accentColor: "#22d3ee",
    showQuickActions: true,
    showBanner: true
  });

  // Typography customization settings state
  const [typographySettings, setTypographySettings] = useState({
    primaryFontColor: "",
    secondaryFontColor: "",
    headingColor: "",
    menuTextColor: "",
    sidebarTextColor: "",
    navbarTextColor: "",
    cardTextColor: "",
    tableTextColor: "",
    buttonTextColor: "",
    linkColor: "",
    successTextColor: "",
    warningTextColor: "",
    errorTextColor: "",
    globalFontSize: 14,
    headingSize: 18,
    sidebarFontSize: 12,
    navigationFontSize: 12,
    cardTitleSize: 14,
    cardBodySize: 12,
    tableFontSize: 12,
    buttonFontSize: 12,
    fontFamily: "Inter",
    accessibilityPreset: "normal"
  });

  // Elections/Ballot voting states
  const [elections, setElections] = useState<{
    enabled: boolean;
    topic?: string;
    subject?: string;
    voteType?: "superuser" | "custom";
    options?: string[];
    isFinal?: boolean;
    candidates: string[];
    votes: {
      SUPERUSER: Record<string, string>;
      ASSISTANT_SUPERUSER: Record<string, string>;
      CUSTOM?: Record<string, string>;
    };
    startDate?: string;
    endDate?: string;
  }>({
    enabled: false,
    topic: "Superuser selection",
    subject: "options",
    voteType: "superuser",
    options: [],
    isFinal: false,
    candidates: [],
    votes: {
      SUPERUSER: {},
      ASSISTANT_SUPERUSER: {},
      CUSTOM: {}
    },
    startDate: "",
    endDate: ""
  });

  // Mess Branch deletion states
  const [selectedMessToDelete, setSelectedMessToDelete] = useState<{ id: string, name: string } | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [activePreviewTab, setActivePreviewTab] = useState<"login" | "home">("login");

  // Election form configuration states
  const [electionEnabled, setElectionEnabled] = useState(false);
  const [electionStartDate, setElectionStartDate] = useState("");
  const [electionEndDate, setElectionEndDate] = useState("");
  const [electionCandidates, setElectionCandidates] = useState<string[]>([]);
  const [electionTopic, setElectionTopic] = useState("Superuser selection");
  const [electionSubject, setElectionSubject] = useState("options");
  const [electionVoteType, setElectionVoteType] = useState<"superuser" | "custom">("superuser");
  const [electionOptions, setElectionOptions] = useState<string[]>([]);
  const [electionCustomOptionsText, setElectionCustomOptionsText] = useState("");

  useEffect(() => {
    if (elections) {
      setElectionEnabled(!!elections.enabled);
      setElectionStartDate(elections.startDate || "");
      setElectionEndDate(elections.endDate || "");
      setElectionCandidates(elections.candidates || []);
      setElectionTopic((elections as any).topic || "Superuser selection");
      setElectionSubject((elections as any).subject || "options");
      setElectionVoteType((elections as any).voteType || "superuser");
      setElectionOptions((elections as any).options || []);
      setElectionCustomOptionsText(((elections as any).options || []).join(", "));
    }
  }, [elections]);

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

  const fetchElections = async (token: string) => {
    try {
      const response = await fetch("/api/elections", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setElections(data);
      }
    } catch (e) {
      console.error("Failed to fetch elections:", e);
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
        if (data.mealTypes) setMealTypes(data.mealTypes);
        if (data.currencySymbol) setCurrencySymbol(data.currencySymbol);
        if (data.customColors) setCustomColors(prev => ({ ...prev, ...data.customColors }));
        if (data.messAnimations) setMessAnimations(prev => ({ ...prev, ...data.messAnimations }));
        if (data.dashboardVisibility) setDashboardVisibility(prev => ({ ...prev, ...data.dashboardVisibility }));
        if (data.dateRestrictions) setDateRestrictions(prev => ({ ...prev, ...data.dateRestrictions }));
        if (data.loginCustomization) setLoginCustomization(prev => ({ ...prev, ...data.loginCustomization }));
        if (data.homeCustomization) setHomeCustomization(prev => ({ ...prev, ...data.homeCustomization }));
        if (data.enableManagerRating !== undefined) setEnableManagerRating(data.enableManagerRating);
        if (data.balanceSheetGlow !== undefined) setBalanceSheetGlow(data.balanceSheetGlow);
        if (data.roleAnimations !== undefined) setRoleAnimations(data.roleAnimations);
        if (data.adminVisibility !== undefined) setAdminVisibility(data.adminVisibility);
        if (data.typographySettings) setTypographySettings(prev => ({ ...prev, ...data.typographySettings }));
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
          if (s.mealTypes) setMealTypes(s.mealTypes);
          if (s.currencySymbol) setCurrencySymbol(s.currencySymbol);
          if (s.customColors) setCustomColors(s.customColors);
          if (s.messAnimations) setMessAnimations(s.messAnimations);
          if (s.dashboardVisibility) setDashboardVisibility(s.dashboardVisibility);
          if (s.dateRestrictions) setDateRestrictions(s.dateRestrictions);
          if (s.loginCustomization) setLoginCustomization(s.loginCustomization);
          if (s.homeCustomization) setHomeCustomization(s.homeCustomization);
          if (s.enableManagerRating !== undefined) setEnableManagerRating(s.enableManagerRating);
          if (s.balanceSheetGlow !== undefined) setBalanceSheetGlow(s.balanceSheetGlow);
          if (s.roleAnimations !== undefined) setRoleAnimations(s.roleAnimations);
          if (s.adminVisibility !== undefined) setAdminVisibility(s.adminVisibility);
          if (s.typographySettings) setTypographySettings(s.typographySettings);
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

  const handleConfigureElection = async (params: { 
    enabled: boolean; 
    candidates: string[]; 
    startDate?: string; 
    endDate?: string;
    topic?: string;
    subject?: string;
    voteType?: "superuser" | "custom";
    options?: string[];
    isFinal?: boolean;
    resetVotes?: boolean;
  }) => {
    try {
      const response = await fetch("/api/elections/configure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify(params)
      });
      if (response.ok) {
        const data = await response.json();
        setElections(data.elections);
        alert("Democracy ballot configuration saved successfully!");
      } else {
        const err = await response.json();
        alert(err.error || "Failed to update election parameters");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving election settings.");
    }
  };

  const handleLogoutLocal = () => {
    localStorage.removeItem("mess_token");
    localStorage.removeItem("mess_token_expiry");
    sessionStorage.removeItem("mess_token");
    setSessionToken(null);
    setCurrentUser(null);
    setReportSummary(null);
    setActiveTab("dashboard");
  };

  const handleLogout = async () => {
    handleLogoutLocal();
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out from Firebase Auth:", e);
    }
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
        handleLogoutLocal();
      }
    } catch (e) {
      console.error("Session verification failed:", e);
      handleLogoutLocal();
    }
  };

  const [hasSuperUserChangeDot, setHasSuperUserChangeDot] = useState(false);

  // Check if any recent logs (last 24 hours) were made by a super user
  const checkSuperUserRecentLogs = async (token: string, currentMembersList: Member[]) => {
    try {
      const response = await fetch("/api/auditlogs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const logs: any[] = data.auditLogs || [];
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        
        const superUsers = currentMembersList.filter(m => m.role === UserRole.SUPERUSER).map(m => m.id);
        
        const hasRecentSUChange = logs.some(log => {
          const logTime = new Date(log.timestamp).getTime();
          const isRecent = logTime > oneDayAgo;
          const isSuperUserOperator = superUsers.includes(log.userId) || log.reason.toLowerCase().includes("superuser");
          return isRecent && isSuperUserOperator;
        });
        
        setHasSuperUserChangeDot(hasRecentSUChange);
      }
    } catch (e) {
      console.error("Error checking superuser logs:", e);
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
        const mList = membersData.members || [];
        setMembersList(mList);
        await checkSuperUserRecentLogs(token, mList);
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

  const fetchDuties = async () => {
    if (!sessionToken || !currentMonthId) return;
    try {
      const response = await fetch(`/api/duties/${currentMonthId}`, {
        headers: { "Authorization": `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDutiesList(data.duties || []);
      }
    } catch (e) {
      console.error("Error fetching duties in App:", e);
    }
  };

  useEffect(() => {
    if (sessionToken) {
      if (sessionToken.startsWith("ey") && !firebaseAuthChecked) {
        // Skip initial check of Firebase token, wait for onAuthStateChanged to refresh/verify
        return;
      }
      validateSession(sessionToken);
      fetchMonthsAndMembers(sessionToken);
      fetchSettings(sessionToken);
      fetchMesses(sessionToken);
      fetchElections(sessionToken);
    }
  }, [sessionToken, firebaseAuthChecked]);

  // Firebase Auth persistence listener to auto-refresh expired token and handle auto-login on startup
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const freshToken = await firebaseUser.getIdToken(true); // forces token refresh if expired
          if (!isMounted) return;
          localStorage.setItem("mess_token", freshToken);
          setSessionToken(freshToken);
          setFirebaseAuthChecked(true);

          // Validate against server database
          const response = await fetch("/api/auth/me", {
            headers: { "Authorization": `Bearer ${freshToken}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (isMounted) {
              setCurrentUser(data.user);
            }
          } else {
            console.error("Firebase authenticated but backend user check failed.");
            if (isMounted) {
              const { signOut } = await import("firebase/auth");
              await signOut(auth);
              handleLogoutLocal();
            }
          }
        } catch (e) {
          console.error("Error on Firebase auth state change:", e);
          if (isMounted) handleLogoutLocal();
        }
      } else {
        // No Firebase user
        const localToken = localStorage.getItem("mess_token") || sessionStorage.getItem("mess_token");
        if (localToken && !localToken.startsWith("ey")) {
          // It's a legacy or password-based token, let's keep and validate it
          if (isMounted) {
            validateSession(localToken);
            setFirebaseAuthChecked(true);
          }
        } else {
          if (isMounted) {
            handleLogoutLocal();
            setFirebaseAuthChecked(true);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionToken && currentMonthId) {
      fetchReportSummary();
      fetchDuties();
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

  // Scroll to the top of the page when activeTab changes to prevent starting from the middle/bottom
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo(0, 0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentUser?.role === UserRole.MEMBER && activeTab === "meals") {
      setActiveTab("dashboard");
    }
  }, [currentUser, activeTab]);

  const handleLoginSuccess = (token: string, user: Member, rememberMe?: boolean) => {
    try {
      if (rememberMe) {
        localStorage.setItem("mess_token", token);
        localStorage.setItem("mess_token_expiry", String(Date.now() + 10 * 24 * 60 * 60 * 1000)); // 10 days
        sessionStorage.removeItem("mess_token");
      } else {
        localStorage.removeItem("mess_token");
        localStorage.removeItem("mess_token_expiry");
        sessionStorage.setItem("mess_token", token);
      }
    } catch (e) {
      console.error("Storage write failed:", e);
    }
    setSessionToken(token);
    setCurrentUser(user);
    fetchMonthsAndMembers(token);
  };

  const handleRefreshAll = () => {
    if (sessionToken) {
      fetchMonthsAndMembers(sessionToken);
      fetchReportSummary();
      fetchDuties();
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
    csvContent += `Manager Monthly Market,৳ ${reportSummary.managerMarketSpent || 0}\r\n`;
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
      const response = await fetch("/api/admin/backup/export", {
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
          
          const response = await fetch("/api/admin/backup/import", {
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
    custom: { sans: '"Outfit", system-ui, sans-serif', display: '"Space Grotesk", sans-serif' },
  };

  const fontSizeMap: Record<string, string> = {
    small: "font-size: 13px !important;",
    "13.5": "font-size: 13.5px !important;",
    normal: "font-size: 14px !important;",
    "14.5": "font-size: 14.5px !important;",
    large: "font-size: 15px !important;",
    "15.5": "font-size: 15.5px !important;",
    "16": "font-size: 16px !important;",
    xlarge: "font-size: 16.5px !important;",
    "17": "font-size: 17px !important;",
    "17.5": "font-size: 17.5px !important;",
    "18": "font-size: 18px !important;",
  };

  const hexToRgb = (hex: string): string => {
    if (!hex) return "6, 182, 212";
    let clean = hex.replace("#", "");
    if (clean.length === 3) {
      clean = clean.split("").map(c => c + c).join("");
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }
    return "6, 182, 212";
  };

  const lightenDarkenColor = (hex: string, percent: number) => {
    let usePound = false;
    if (hex[0] === "#") {
      hex = hex.slice(1);
      usePound = true;
    }
    try {
      const num = parseInt(hex, 16);
      let r = (num >> 16) + percent;
      if (r > 255) r = 255;
      else if (r < 0) r = 0;
      let b = ((num >> 8) & 0x00FF) + percent;
      if (b > 255) b = 255;
      else if (b < 0) b = 0;
      let g = (num & 0x0000FF) + percent;
      if (g > 255) g = 255;
      else if (g < 0) g = 0;
      return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, "0");
    } catch (e) {
      return (usePound ? "#" : "") + hex;
    }
  };

  const getCustomColorMap = () => {
    const hex = customColors?.siteAccentColorRgb || "#22d3ee";
    const rgb = hexToRgb(hex);
    return {
      rgb,
      c300: lightenDarkenColor(hex, 40),
      c400: hex,
      c500: lightenDarkenColor(hex, -20),
      c600: lightenDarkenColor(hex, -40)
    };
  };

  const colors = siteColor === "custom" ? getCustomColorMap() : (colorMap[siteColor] || colorMap.cyan);
  const fonts = fontStyleMap[fontStyle] || fontStyleMap.sans;
  const sizeStyle = fontSizeMap[fontSize] || fontSizeMap.normal;

  // Authentication gate
  if (!sessionToken || !currentUser) {
    return (
      <div className={`min-h-screen transition-all flex items-center justify-center p-4 relative ${isDarkMode ? "bg-slate-950 font-sans" : "bg-slate-50 font-sans"}`}>
        {/* Glow backgrounds */}
        <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-radial-gradient opacity-20 animate-pulse pointer-events-none"></div>
        <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-radial-gradient opacity-25 animate-pulse pointer-events-none"></div>
        <Login onLoginSuccess={handleLoginSuccess} isDarkMode={isDarkMode} customization={loginCustomization} />
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
    { id: "democracy", label: t("Democracy Ballot"), icon: <Vote size={16} /> },
    { id: "notices", label: t("Notices"), icon: <Bell size={16} /> },
    { id: "audit", label: t("Audit Log"), icon: <Shield size={16} /> },
    { id: "settings", label: t("ERP Control Panel"), icon: <Settings size={16} /> }
  ];

  const activeMembers = membersList.filter(m => m.status === "ACTIVE");
  
  const checkAllVoted = () => {
    if (!elections || !elections.enabled) return false;
    if (activeMembers.length === 0) return false;
    
    const voteType = (elections as any).voteType || "superuser";
    if (voteType === "custom") {
      const customVotes = (elections as any).votes?.CUSTOM || {};
      return activeMembers.every(m => customVotes[m.id] !== undefined);
    } else {
      const suVotes = elections.votes?.SUPERUSER || {};
      const asuVotes = elections.votes?.ASSISTANT_SUPERUSER || {};
      return activeMembers.every(m => suVotes[m.id] !== undefined || asuVotes[m.id] !== undefined);
    }
  };

  const allVoted = checkAllVoted();
  const showResultsInDashboard = !!(elections?.isFinal || allVoted);

  const visibleNavItems = navItems.filter(item => {
    if (item.id === "democracy" && showResultsInDashboard) return false;
    if (item.id === "audit" && dashboardVisibility && !dashboardVisibility.showAuditLogs) return false;
    if (item.id === "deposits" && dashboardVisibility && !dashboardVisibility.showCashDeposit) return false;
    if (item.id === "meals" && currentUser?.role === UserRole.MEMBER) return false;
    if (item.id === "meals" && dashboardVisibility && !dashboardVisibility.showMealTracker) return false;
    if (item.id === "menu" && dashboardVisibility && !dashboardVisibility.showFoodMenu) return false;
    if (item.id === "notices" && dashboardVisibility && !dashboardVisibility.showNotices) return false;
    return true;
  });

  const getThemeBgStyle = () => {
    const currentTemplateId = previewTemplateId || messAnimations?.themeTemplate || "default-erp";
    const currentTemplate = THEME_TEMPLATES.find(t => t.id === currentTemplateId) || THEME_TEMPLATES[0];
    const theme = previewTemplateId ? currentTemplate.backgroundTheme : (messAnimations?.backgroundTheme || "default");
    const customUrl = messAnimations?.customBackgroundUrl || "";
    const opacity = (messAnimations?.backgroundOpacity ?? 20) / 100;
    const activeIsDarkMode = previewTemplateId ? currentTemplate.isDarkMode : isDarkMode;

    if (theme === "custom" && customUrl) {
      const overlayColor = activeIsDarkMode ? "10, 15, 30" : "255, 255, 255";
      return {
        backgroundImage: `linear-gradient(rgba(${overlayColor}, ${1 - opacity}), rgba(${overlayColor}, ${1 - opacity})), url("${customUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat"
      };
    }

    if (!activeIsDarkMode) {
      // PREMIUM LIGHT MODE SPECTRUM THEMES
      if (theme === "cosmic-void") {
        return {
          backgroundImage: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "midnight-nebula") {
        return {
          backgroundImage: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "cyberpunk-grid") {
        return {
          backgroundColor: "#f8fafc",
          backgroundImage: `
            linear-gradient(rgba(14, 116, 144, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 116, 144, 0.04) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(34, 211, 238, 0.12) 0%, #f8fafc 80%)
          `,
          backgroundSize: "40px 40px, 40px 40px, 100% 100%",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "sunset-glow") {
        return {
          backgroundImage: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "ocean-depth") {
        return {
          backgroundImage: "linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "forest-whisper") {
        return {
          backgroundImage: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "aurora-borealis") {
        return {
          backgroundImage: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "neon-shallows") {
        return {
          backgroundImage: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "sahara-sand") {
        return {
          backgroundImage: "linear-gradient(135deg, #fefce8 0%, #fef9c3 50%, #fef08a 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "deep-space") {
        return {
          backgroundImage: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "electric-indigo") {
        return {
          backgroundImage: "linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 50%, #c7d2fe 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "magma-flow") {
        return {
          backgroundImage: "linear-gradient(135deg, #fff5f5 0%, #fee2e2 50%, #fca5a5 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "cyber-emerald") {
        return {
          backgroundColor: "#f4fbf7",
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(16, 185, 129, 0.06) 0%, #f4fbf7 85%)
          `,
          backgroundSize: "32px 32px, 32px 32px, 100% 100%",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "sakura-blossom") {
        return {
          backgroundImage: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "ice-glacier") {
        return {
          backgroundImage: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "bento-grid-dark") {
        return {
          backgroundColor: "#ffffff",
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "solar-storm") {
        return {
          backgroundImage: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)",
          backgroundAttachment: "fixed"
        };
      }
    } else {
      // PREMIUM DARK MODE SPECTRUM THEMES
      if (theme === "cosmic-void") {
        return {
          backgroundImage: "radial-gradient(circle at 50% 50%, #1e1b4b 0%, #090514 70%, #020005 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "midnight-nebula") {
        return {
          backgroundImage: "linear-gradient(135deg, #020617 0%, #1e1b4b 30%, #581c87 60%, #4a044e 85%, #020617 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "cyberpunk-grid") {
        return {
          backgroundColor: "#030008",
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(14, 116, 144, 0.15) 0%, #030008 80%)
          `,
          backgroundSize: "40px 40px, 40px 40px, 100% 100%",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "sunset-glow") {
        return {
          backgroundImage: "linear-gradient(135deg, #180020 0%, #3b0764 40%, #701a75 70%, #9a3412 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "ocean-depth") {
        return {
          backgroundImage: "linear-gradient(180deg, #022c22 0%, #042f2e 30%, #115e59 70%, #064e3b 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "forest-whisper") {
        return {
          backgroundImage: "linear-gradient(135deg, #022c22 0%, #064e3b 40%, #14532d 80%, #052e16 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "aurora-borealis") {
        return {
          backgroundImage: "linear-gradient(135deg, #020617 0%, #043530 30%, #0f172a 60%, #1e1b4b 80%, #020617 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "neon-shallows") {
        return {
          backgroundImage: "linear-gradient(135deg, #020617 0%, #064e3b 25%, #4c0519 75%, #020617 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "sahara-sand") {
        return {
          backgroundImage: "linear-gradient(135deg, #0f0502 0%, #2a0800 35%, #451a03 70%, #170500 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "deep-space") {
        return {
          backgroundImage: "radial-gradient(circle at 30% 20%, #030712 0%, #09090b 60%, #020202 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "electric-indigo") {
        return {
          backgroundImage: "linear-gradient(180deg, #03000a 0%, #050014 40%, #1e1b4b 80%, #03000a 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "magma-flow") {
        return {
          backgroundImage: "linear-gradient(135deg, #000000 0%, #1c0202 40%, #450a0a 75%, #020000 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "cyber-emerald") {
        return {
          backgroundColor: "#010502",
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.04) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(6, 78, 59, 0.15) 0%, #010502 85%)
          `,
          backgroundSize: "32px 32px, 32px 32px, 100% 100%",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "sakura-blossom") {
        return {
          backgroundImage: "linear-gradient(135deg, #0a0104 0%, #20010c 35%, #4c051e 70%, #0a0104 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "ice-glacier") {
        return {
          backgroundImage: "linear-gradient(135deg, #010a14 0%, #021a30 40%, #083344 80%, #010a14 100%)",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "bento-grid-dark") {
        return {
          backgroundColor: "#09090b",
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          backgroundAttachment: "fixed"
        };
      }
      if (theme === "solar-storm") {
        return {
          backgroundImage: "linear-gradient(135deg, #080200 0%, #240a00 35%, #431407 75%, #080200 100%)",
          backgroundAttachment: "fixed"
        };
      }
    }

    return {};
  };

  // Contrast YIQ calculator for ensuring text contrast dynamically on any background!
  const getContrastColor = (hexcolor: string, lightColor = "#ffffff", darkColor = "#0f172a") => {
    if (!hexcolor) return darkColor;
    let r, g, b;
    let hex = hexcolor.trim().replace("#", "");
    if (hex.length === 3) {
      hex = hex.split("").map(c => c + c).join("");
    }
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      return darkColor;
    }
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? darkColor : lightColor;
  };

  const getFontFamilyStack = (family: string) => {
    switch (family) {
      case "Poppins": return '"Poppins", "Outfit", sans-serif';
      case "Roboto": return '"Roboto", sans-serif';
      case "Nunito": return '"Nunito", sans-serif';
      case "Montserrat": return '"Montserrat", sans-serif';
      case "Open Sans": return '"Open Sans", sans-serif';
      case "Lato": return '"Lato", sans-serif';
      case "Inter":
      default: return '"Inter", "Outfit", sans-serif';
    }
  };

  const getActiveTypographySettings = (isDark: boolean) => {
    const defaults = {
      primaryFontColor: isDark ? "#f8fafc" : "#0f172a",
      secondaryFontColor: isDark ? "#94a3b8" : "#475569",
      headingColor: isDark ? "#22d3ee" : "#0f172a",
      menuTextColor: isDark ? "#cbd5e1" : "#1e293b",
      sidebarTextColor: isDark ? "#94a3b8" : "#f1f5f9",
      navbarTextColor: isDark ? "#cbd5e1" : "#0f172a",
      cardTextColor: isDark ? "#cbd5e1" : "#1e293b",
      tableTextColor: isDark ? "#cbd5e1" : "#1e293b",
      buttonTextColor: isDark ? "#ffffff" : "#0f172a",
      linkColor: isDark ? "#38bdf8" : "#0284c7",
      successTextColor: isDark ? "#4ade80" : "#16a34a",
      warningTextColor: isDark ? "#facc15" : "#d97706",
      errorTextColor: isDark ? "#f87171" : "#dc2626",
      
      globalFontSize: 14,
      headingSize: 18,
      sidebarFontSize: 12,
      navigationFontSize: 12,
      cardTitleSize: 14,
      cardBodySize: 12,
      tableFontSize: 12,
      buttonFontSize: 12,
      
      fontFamily: "Inter",
      accessibilityPreset: "normal"
    };

    // Accessibility Preset overrides
    const preset = typographySettings?.accessibilityPreset || "normal";
    if (preset === "large-text") {
      defaults.globalFontSize = 16;
      defaults.headingSize = 22;
      defaults.sidebarFontSize = 14;
      defaults.navigationFontSize = 14;
      defaults.cardTitleSize = 16;
      defaults.cardBodySize = 14;
      defaults.tableFontSize = 14;
      defaults.buttonFontSize = 14;
    } else if (preset === "high-contrast") {
      defaults.primaryFontColor = isDark ? "#ffffff" : "#000000";
      defaults.secondaryFontColor = isDark ? "#cbd5e1" : "#1e293b";
      defaults.headingColor = isDark ? "#38bdf8" : "#000000";
      defaults.menuTextColor = isDark ? "#ffffff" : "#000000";
      defaults.sidebarTextColor = isDark ? "#ffffff" : "#000000";
      defaults.navbarTextColor = isDark ? "#ffffff" : "#000000";
      defaults.cardTextColor = isDark ? "#ffffff" : "#000000";
      defaults.tableTextColor = isDark ? "#ffffff" : "#000000";
      defaults.linkColor = isDark ? "#0ea5e9" : "#0284c7";
      defaults.successTextColor = isDark ? "#22c55e" : "#15803d";
      defaults.warningTextColor = isDark ? "#eab308" : "#b45309";
      defaults.errorTextColor = isDark ? "#ef4444" : "#b91c1c";
    } else if (preset === "accessibility-mode") {
      defaults.globalFontSize = 18;
      defaults.headingSize = 24;
      defaults.sidebarFontSize = 16;
      defaults.navigationFontSize = 16;
      defaults.cardTitleSize = 18;
      defaults.cardBodySize = 16;
      defaults.tableFontSize = 16;
      defaults.buttonFontSize = 16;
      
      defaults.primaryFontColor = isDark ? "#ffffff" : "#000000";
      defaults.secondaryFontColor = isDark ? "#e2e8f0" : "#0f172a";
      defaults.headingColor = isDark ? "#38bdf8" : "#000000";
      defaults.menuTextColor = isDark ? "#ffffff" : "#000000";
      defaults.sidebarTextColor = isDark ? "#ffffff" : "#000000";
      defaults.navbarTextColor = isDark ? "#ffffff" : "#000000";
      defaults.cardTextColor = isDark ? "#ffffff" : "#000000";
      defaults.tableTextColor = isDark ? "#ffffff" : "#000000";
    }

    return {
      primaryFontColor: typographySettings?.primaryFontColor || defaults.primaryFontColor,
      secondaryFontColor: typographySettings?.secondaryFontColor || defaults.secondaryFontColor,
      headingColor: typographySettings?.headingColor || defaults.headingColor,
      menuTextColor: typographySettings?.menuTextColor || defaults.menuTextColor,
      sidebarTextColor: typographySettings?.sidebarTextColor || defaults.sidebarTextColor,
      navbarTextColor: typographySettings?.navbarTextColor || defaults.navbarTextColor,
      cardTextColor: typographySettings?.cardTextColor || defaults.cardTextColor,
      tableTextColor: typographySettings?.tableTextColor || defaults.tableTextColor,
      buttonTextColor: typographySettings?.buttonTextColor || defaults.buttonTextColor,
      linkColor: typographySettings?.linkColor || defaults.linkColor,
      successTextColor: typographySettings?.successTextColor || defaults.successTextColor,
      warningTextColor: typographySettings?.warningTextColor || defaults.warningTextColor,
      errorTextColor: typographySettings?.errorTextColor || defaults.errorTextColor,
      
      globalFontSize: typographySettings?.globalFontSize !== undefined ? Number(typographySettings.globalFontSize) : defaults.globalFontSize,
      headingSize: typographySettings?.headingSize !== undefined ? Number(typographySettings.headingSize) : defaults.headingSize,
      sidebarFontSize: typographySettings?.sidebarFontSize !== undefined ? Number(typographySettings.sidebarFontSize) : defaults.sidebarFontSize,
      navigationFontSize: typographySettings?.navigationFontSize !== undefined ? Number(typographySettings.navigationFontSize) : defaults.navigationFontSize,
      cardTitleSize: typographySettings?.cardTitleSize !== undefined ? Number(typographySettings.cardTitleSize) : defaults.cardTitleSize,
      cardBodySize: typographySettings?.cardBodySize !== undefined ? Number(typographySettings.cardBodySize) : defaults.cardBodySize,
      tableFontSize: typographySettings?.tableFontSize !== undefined ? Number(typographySettings.tableFontSize) : defaults.tableFontSize,
      buttonFontSize: typographySettings?.buttonFontSize !== undefined ? Number(typographySettings.buttonFontSize) : defaults.buttonFontSize,
      
      fontFamily: typographySettings?.fontFamily || defaults.fontFamily,
      accessibilityPreset: preset
    };
  };

  const currentTemplateId = previewTemplateId || messAnimations?.themeTemplate || "default-erp";
  const currentTemplate = THEME_TEMPLATES.find(t => t.id === currentTemplateId) || THEME_TEMPLATES[0];
  const activeIsDarkMode = previewTemplateId ? currentTemplate.isDarkMode : isDarkMode;
  const activeCustomColors = previewTemplateId ? currentTemplate.customColors : (customColors || THEME_TEMPLATES[0].customColors);
  const theme = previewTemplateId ? currentTemplate.backgroundTheme : (messAnimations?.backgroundTheme || "default");

  const activeTypography = getActiveTypographySettings(activeIsDarkMode);

  return (
    <div 
      style={getThemeBgStyle()}
      className={`min-h-screen transition-all duration-300 flex flex-col md:flex-row theme-${currentTemplateId} ${
        activeIsDarkMode
          ? "text-white font-sans " + (theme === "default" || !theme ? "bg-slate-950" : "")
          : "text-slate-900 font-sans light-mode-root " + (theme === "default" || !theme ? "bg-slate-50" : "")
      }`}
    >
      <style>{`
        :root {
          --color-cyan-300: ${colors.c300} !important;
          --color-cyan-400: ${colors.c400} !important;
          --color-cyan-500: ${colors.c500} !important;
          --color-cyan-600: ${colors.c600} !important;
          --font-sans: ${fonts.sans} !important;
          --font-display: ${fonts.display} !important;
          --custom-sidebar-bg: ${activeCustomColors?.sidebarBg || "#0f172a"};
          --custom-header-bg: ${activeCustomColors?.headerBg || "#0f172a"};
          --custom-card-bg: ${activeCustomColors?.cardBg || "#1e293b"};
          --custom-accent-color: ${activeCustomColors?.accentColor || "#22d3ee"};
          --custom-typography-highlight: ${activeCustomColors?.typographyHighlightRgb || "#67e8f9"};
          --custom-layout-scale-color: ${activeCustomColors?.layoutScaleColorRgb || "#a78bfa"};

          /* Typography Custom Colors */
          --typo-primary-color: ${activeTypography.primaryFontColor};
          --typo-secondary-color: ${activeTypography.secondaryFontColor};
          --typo-heading-color: ${activeTypography.headingColor};
          --typo-menu-color: ${activeTypography.menuTextColor};
          --typo-sidebar-color: ${activeTypography.sidebarTextColor};
          --typo-navbar-color: ${activeTypography.navbarTextColor};
          --typo-card-color: ${activeTypography.cardTextColor};
          --typo-table-color: ${activeTypography.tableTextColor};
          --typo-button-color: ${activeTypography.buttonTextColor};
          --typo-link-color: ${activeTypography.linkColor};
          --typo-success-color: ${activeTypography.successTextColor};
          --typo-warning-color: ${activeTypography.warningTextColor};
          --typo-error-color: ${activeTypography.errorTextColor};

          /* Typography Sizes */
          --typo-global-size: ${activeTypography.globalFontSize}px;
          --typo-heading-size: ${activeTypography.headingSize}px;
          --typo-sidebar-size: ${activeTypography.sidebarFontSize}px;
          --typo-navigation-size: ${activeTypography.navigationFontSize}px;
          --typo-card-title-size: ${activeTypography.cardTitleSize}px;
          --typo-card-body-size: ${activeTypography.cardBodySize}px;
          --typo-table-size: ${activeTypography.tableFontSize}px;
          --typo-button-size: ${activeTypography.buttonFontSize}px;

          /* Typography Font Family */
          --typo-font-family: ${getFontFamilyStack(activeTypography.fontFamily)};
        }

        /* Applying custom typography rules globally */
        body, html, .font-sans, p, span, div, input, select, textarea, label {
          font-family: var(--typo-font-family), system-ui, sans-serif !important;
        }

        /* Global base size overrides */
        body, html {
          font-size: var(--typo-global-size) !important;
        }

        /* Headings text override */
        h1, h2, h3, h4, h5, h6, .font-display, .text-cyan-300, .text-cyan-400, .text-cyan-500 {
          color: var(--typo-heading-color) !important;
          font-family: var(--typo-font-family), system-ui, sans-serif !important;
        }

        /* Adjusting header sizing based on customization */
        h1, .text-xl, .text-2xl, .text-3xl {
          font-size: var(--typo-heading-size) !important;
        }
        h2, .text-lg {
          font-size: calc(var(--typo-heading-size) - 2px) !important;
        }
        h3, h4, .text-base {
          font-size: calc(var(--typo-heading-size) - 4px) !important;
        }

        /* Sidebar/Navigation overrides */
        aside, .sidebar-container, [id^="sidebar"], .sidebar-link {
          font-size: var(--typo-sidebar-size) !important;
        }
        aside span, aside a, aside button, .sidebar-link, .sidebar-text {
          color: var(--typo-sidebar-color) !important;
          font-size: var(--typo-sidebar-size) !important;
        }

        /* Navigation elements text */
        nav a, nav button, header a, header button, .nav-item {
          color: var(--typo-navbar-color) !important;
          font-size: var(--typo-navigation-size) !important;
        }

        /* Card and Panel text/body size overrides */
        .glass-panel, .glass-panel-light, .card-container, .bg-slate-900\/50, .bg-slate-950\/40 {
          color: var(--typo-card-color) !important;
        }
        .glass-panel p, .glass-panel span, .card-container p, .card-container span {
          font-size: var(--typo-card-body-size) !important;
        }
        .glass-panel h3, .glass-panel h4, .card-container h3, .card-container h4, .card-title {
          font-size: var(--typo-card-title-size) !important;
        }

        /* Table font style overrides */
        table, .table-container, th, td, tr, thead, tbody {
          color: var(--typo-table-color) !important;
          font-size: var(--typo-table-size) !important;
        }

        /* Link colors overrides */
        a:not([role="button"]):not(.btn), .link {
          color: var(--typo-link-color) !important;
        }

        /* Button sizes & text colors */
        button:not(.nav-item), .btn {
          font-size: var(--typo-button-size) !important;
        }

        /* Statuses color overrides */
        .text-emerald-400, .text-emerald-500, .text-green-400, .text-green-500, .text-success {
          color: var(--typo-success-color) !important;
        }
        .text-yellow-400, .text-yellow-500, .text-amber-500, .text-orange-500, .text-warning {
          color: var(--typo-warning-color) !important;
        }
        .text-red-400, .text-red-500, .text-rose-500, .text-rose-400, .text-error {
          color: var(--typo-error-color) !important;
        }

        /* Fix text contrast in light mode dynamically on common light mode containers */
        .light-mode-root .text-slate-200,
        .light-mode-root .text-gray-200,
        .light-mode-root .text-slate-300,
        .light-mode-root .text-gray-300,
        .light-mode-root .text-slate-400,
        .light-mode-root .text-gray-400 {
          color: var(--typo-primary-color) !important;
        }

        .light-mode-root .bg-slate-950\/40,
        .light-mode-root .bg-slate-950\/60,
        .light-mode-root .bg-slate-900\/50,
        .light-mode-root .bg-slate-950 {
          background-color: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
        }

        body, html {
          ${sizeStyle}
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(${colors.rgb}, 0.4) !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(${colors.rgb}, 0.7) !important;
        }
        .glass-panel {
          border-color: rgba(${colors.rgb}, 0.15) !important;
          background-color: ${activeIsDarkMode && activeCustomColors?.cardBg ? activeCustomColors.cardBg : "rgba(30, 41, 59, 0.4)"} !important;
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
            box-shadow: 0 0 15px ${activeCustomColors?.accentColor || colors.c400}40 !important;
            border-color: ${activeCustomColors?.accentColor || colors.c400}60 !important;
          }
          button:hover {
            box-shadow: 0 0 12px ${activeCustomColors?.accentColor || colors.c400}80 !important;
          }
        ` : ""}
        ${fontStyle === "custom" ? `
          h1, h2, h3, h4, .font-display, .text-cyan-300, .text-cyan-400 {
            color: ${activeCustomColors?.typographyHighlightRgb || "#67e8f9"} !important;
          }
        ` : ""}
        .scale-indicator-dot {
          background-color: ${activeCustomColors?.layoutScaleColorRgb || "#a78bfa"} !important;
        }
        
        /* Custom styles for theme template */
        ${currentTemplate.customStyles || ""}

        /* Specialized Premium Visual Effects */
        ${messAnimations?.glowingLabels ? `
          label, .text-cyan-400, .text-cyan-300, .text-slate-400 {
            text-shadow: 0 0 6px ${activeCustomColors?.accentColor || "#22d3ee"}50 !important;
          }
        ` : ""}
        ${messAnimations?.glowingButtons ? `
          button:not(.nav-item), .btn {
            box-shadow: 0 0 10px ${activeCustomColors?.accentColor || "#22d3ee"}40 !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          button:not(.nav-item):hover, .btn:hover {
            box-shadow: 0 0 15px ${activeCustomColors?.accentColor || "#22d3ee"}75 !important;
            transform: translateY(-0.5px);
          }
        ` : ""}
        ${messAnimations?.glowingIcons ? `
          svg, .lucide {
            filter: drop-shadow(0 0 4px ${activeCustomColors?.accentColor || "#22d3ee"}40) !important;
          }
        ` : ""}
        ${messAnimations?.glowingCards ? `
          .glass-panel, .rounded-2xl {
            box-shadow: 0 0 18px ${activeCustomColors?.accentColor || "#22d3ee"}25 !important;
          }
        ` : ""}
        ${messAnimations?.neonBorders ? `
          .glass-panel, .rounded-2xl {
            border-color: ${activeCustomColors?.accentColor || "#22d3ee"}75 !important;
            border-width: 1.25px !important;
          }
        ` : ""}
        ${messAnimations?.rgbHover ? `
          .glass-panel:hover, .rounded-2xl:hover {
            border-color: transparent !important;
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.4) !important;
            transition: all 0.3s ease !important;
          }
        ` : ""}
        ${messAnimations?.animatedShadows ? `
          .glass-panel, .rounded-2xl {
            animation: animateShadow 8s infinite alternate ease-in-out !important;
          }
          @keyframes animateShadow {
            0% { box-shadow: 0 0 10px rgba(34, 211, 238, 0.15); }
            50% { box-shadow: 0 0 18px rgba(167, 139, 250, 0.25); }
            100% { box-shadow: 0 0 10px rgba(244, 63, 94, 0.15); }
          }
        ` : ""}
        ${messAnimations?.glassCards ? `
          .glass-panel, .rounded-2xl {
            background: ${activeIsDarkMode 
              ? "linear-gradient(135deg, rgba(15, 23, 42, 0.65) 0%, rgba(30, 41, 59, 0.35) 100%)" 
              : "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)"} !important;
            backdrop-filter: blur(14px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(14px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
        ` : ""}
      `}</style>
      
      <AmbientAnimationOverlay animations={messAnimations} isDarkMode={activeIsDarkMode} />
      
      {/* ---------------------------------------------------------
          HEADER FOR MOBILE / VIEW CONTROL
          --------------------------------------------------------- */}
      <header className={`md:hidden sticky top-0 flex items-center justify-between px-4 py-3.5 border-b z-40 backdrop-blur-md ${
        isDarkMode ? "bg-slate-950/80 border-slate-900" : "bg-white/80 border-slate-200 shadow-sm"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
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
                    <span className="flex-1">{item.label}</span>
                    {item.id === "audit" && hasSuperUserChangeDot && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" title="Recent Super User activity" />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className={`space-y-4 border-t pt-4 ${isDarkMode ? "border-slate-800/60" : "border-slate-150"}`}>
              <div className="flex items-center gap-3 px-1">
                {currentUser.photo ? (
                  <img src={currentUser.photo} className="w-8 h-8 rounded-lg object-cover border border-cyan-500/20" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">
                    {currentUser.nickname.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate leading-none ${isDarkMode ? "text-white" : "text-slate-800"}`}>{currentUser.nickname}</p>
                  <span className="text-[9px] text-orange-500 font-mono uppercase tracking-wider block mt-1">{currentUser.role}</span>
                </div>
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
        </div>
      )}

      {/* ---------------------------------------------------------
          DESKTOP SIDEBAR PANEL
          --------------------------------------------------------- */}
      <aside 
        style={{
          backgroundColor: activeIsDarkMode ? activeCustomColors?.sidebarBg || undefined : undefined
        }}
        className={`hidden md:flex flex-col justify-between w-64 shrink-0 border-r h-screen sticky top-0 z-10 transition-all ${
          activeIsDarkMode ? "border-slate-900" : "bg-white border-slate-200"
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
                <span className="flex-1">{item.label}</span>
                {item.id === "audit" && hasSuperUserChangeDot && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" title="Recent Super User activity" />
                )}
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
        
        {currentUser.status === "ARCHIVED" && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-xs text-rose-400">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold">ARCHIVED PROFILE (READ-ONLY ACCESS)</p>
              <p className="text-[11px] opacity-80 mt-0.5">
                You have left this mess. You have read-only access to view your past logs, history, and records. You cannot make any edits or save new updates.
              </p>
            </div>
          </div>
        )}
        
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
                {new Date().toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
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

            {currentUser && (
              <button
                onClick={handleToggleSafeMode}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all ${
                  safeMode 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" 
                    : "bg-slate-500/5 border-slate-800 text-slate-500 hover:text-slate-400"
                }`}
                title={safeMode ? "Safe Mode is active to prevent accidental changes." : "Safe Mode is off."}
              >
                <Shield size={14} className={safeMode ? "text-emerald-400 animate-pulse" : "text-slate-500"} />
                <span>🛡️ Safe Mode: {safeMode ? "ON" : "OFF"}</span>
              </button>
            )}

            {currentUser && currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com" && (
              <div className="flex items-center gap-1.5" id="ultimate-admin-role-selector">
                <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Act As:</span>
                <select
                  value={currentUser.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    localStorage.setItem("acting_role", newRole);
                    setCurrentUser(prev => prev ? { ...prev, role: newRole as UserRole } : null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-orange-400 font-bold" : "bg-white border-slate-200 text-orange-600 font-bold"
                  }`}
                >
                  <option value={UserRole.ADMIN}>Admin (Myself)</option>
                  <option value={UserRole.SUPERUSER}>Super User</option>
                  <option value={UserRole.ASSISTANT_SUPERUSER}>Asst. Super User</option>
                  <option value={UserRole.MANAGER}>Manager</option>
                  <option value={UserRole.PARTIAL_MANAGER}>Partial Manager</option>
                  <option value={UserRole.MEMBER}>Member</option>
                </select>
              </div>
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
          
          {safeMode && (
            <div className={`mb-6 p-2.5 px-4 rounded-xl border flex items-center justify-between gap-3 ${
              activeIsDarkMode 
                ? "bg-emerald-950/25 border-emerald-500/15 text-emerald-400" 
                : "bg-emerald-50/70 border-emerald-200/80 text-emerald-800 shadow-sm"
            }`} id="safe-mode-banner">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold">
                  Safe mode is on to prevent unwanted changes
                </span>
              </div>
              {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER) && (
                <button
                  onClick={handleToggleSafeMode}
                  className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/25 text-emerald-400 font-extrabold text-[9px] rounded-md cursor-pointer uppercase tracking-wider transition-all shrink-0"
                >
                  Turn Off
                </button>
              )}
            </div>
          )}
          
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
              onNavigateToTab={(tab) => { 
                setActiveTab(tab); 
                if (tab === "market") {
                  setMarketSubTab("managerial");
                }
              }}
              reportSummary={reportSummary}
              triggerRefresh={handleRefreshAll}
              months={months}
              onChangeMonth={setCurrentMonthId}
              homeCustomization={homeCustomization}
              elections={elections}
              membersListProp={membersList}
              showResultsInDashboard={showResultsInDashboard}
              enableManagerRating={enableManagerRating}
              duties={dutiesList}
              marketForcedFlowStep={marketForcedFlowStep}
              onSetMarketForcedFlowStep={setMarketForcedFlowStep}
              forcedMarketDate={forcedMarketDate}
              onSetForcedMarketDate={setForcedMarketDate}
              dashboardVisibility={dashboardVisibility}
              mealTypes={mealTypes}
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
              safeMode={safeMode}
              mealTypes={mealTypes}
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
              mealTypes={mealTypes}
            />
          )}

          {activeTab === "menu" && (
            <FoodMenu 
              currentUser={currentUser}
              currentMonthId={currentMonthId}
              isDarkMode={isDarkMode}
              dateRestrictions={dateRestrictions}
              marketForcedFlowStep={marketForcedFlowStep}
              onSetMarketForcedFlowStep={setMarketForcedFlowStep}
              forcedMarketDate={forcedMarketDate}
              onNavigateToTab={(tab) => { setActiveTab(tab); }}
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
              safeMode={safeMode}
              subTab={marketSubTab}
              onSetSubTab={setMarketSubTab}
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
              balanceSheetGlow={balanceSheetGlow}
              safeMode={safeMode}
              logoText={logoText}
              mealTypes={mealTypes}
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
              members={membersList}
            />
          )}

          {activeTab === "democracy" && (
            <Democracy 
              currentUser={currentUser}
              isDarkMode={isDarkMode}
              members={membersList}
              elections={elections}
              sessionToken={sessionToken}
              onRefresh={() => {
                fetchElections(sessionToken);
                fetchMonthsAndMembers(sessionToken);
              }}
              currencySymbol={currencySymbol}
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

                  <div className={`grid grid-cols-1 ${currentUser.role === UserRole.ADMIN ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4 mb-6`}>
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

                    {currentUser.role === UserRole.ADMIN && (
                      <button
                        onClick={handleDownloadBackup}
                        className="p-4 rounded-xl border border-cyan-500/10 hover:border-cyan-400 bg-slate-950/20 text-center cursor-pointer transition-all hover:scale-105"
                      >
                        <Download className="mx-auto text-cyan-400 mb-2" size={24} />
                        <p className="text-xs font-bold text-slate-200">Download JSON Backup</p>
                        <p className="text-[10px] text-slate-500 mt-1">Saves raw databases, multi-mess snapshots, and custom styles.</p>
                      </button>
                    )}
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
                                  setMesses(listData.messes || []);
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

                    {/* List of Managed Mess Branches for Deletion */}
                    <div className="border-t border-slate-800/60 pt-4 mt-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block font-display">Manage & Clean Up Branches</h4>
                      
                      {messes.length <= 1 ? (
                        <p className="text-[10px] text-slate-500 italic">No additional managed branches currently available to delete.</p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {messes.map((m) => {
                            const isDefault = m.id === "default";
                            const isActive = m.id === activeMessId;
                            return (
                              <div key={m.id} className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-900">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-200">{m.name}</span>
                                  <span className="text-[8px] font-mono text-slate-500 uppercase">
                                    ID: {m.id} {isDefault && "• DEFAULT"} {isActive && "• ACTIVE"}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  {isDefault ? (
                                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] text-slate-500 font-bold uppercase">
                                      System Protected
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMessToDelete(m);
                                        setDeleteConfirmationInput("");
                                      }}
                                      className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 hover:border-red-500 rounded text-[9px] font-bold uppercase transition-all cursor-pointer"
                                    >
                                      Archive / Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Secondary verification modal/form for deleting a branch */}
                    {selectedMessToDelete && (
                      <div className="mt-4 p-4 rounded-xl bg-red-950/10 border border-red-500/20 text-slate-300">
                        <h4 className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1.5 uppercase font-display">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          Danger: Permanent Deletion Verification
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                          You are about to delete the branch <strong className="text-red-400">"{selectedMessToDelete.name}"</strong>. This will permanently purge its transactions, member lists, meals tracking, food menus, audit logs, and settings. <strong>This action cannot be undone.</strong>
                        </p>
                        
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              Please type <span className="text-red-400 font-bold">"{selectedMessToDelete.name}"</span> to confirm:
                            </label>
                            <input
                              type="text"
                              value={deleteConfirmationInput}
                              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                              placeholder={selectedMessToDelete.name}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-red-950 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMessToDelete(null);
                                setDeleteConfirmationInput("");
                              }}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={deleteConfirmationInput !== selectedMessToDelete.name}
                              onClick={async () => {
                                if (deleteConfirmationInput !== selectedMessToDelete.name) return;
                                try {
                                  const response = await fetch(`/api/admin/messes/${selectedMessToDelete.id}`, {
                                    method: "DELETE",
                                    headers: {
                                      "Authorization": `Bearer ${sessionToken}`
                                    }
                                  });
                                  if (response.ok) {
                                    alert(`Branch "${selectedMessToDelete.name}" has been successfully deleted.`);
                                    
                                    // If we deleted the active branch, reload the entire workspace to reset standard database context to default
                                    if (selectedMessToDelete.id === activeMessId) {
                                      window.location.reload();
                                    } else {
                                      // Otherwise, just refresh the list of messes cleanly without reloading!
                                      if (sessionToken) {
                                        const listResp = await fetch("/api/admin/messes", {
                                          headers: { "Authorization": `Bearer ${sessionToken}` }
                                        });
                                        if (listResp.ok) {
                                          const listData = await listResp.json();
                                          setMesses(listData.messes || []);
                                        }
                                      }
                                      setSelectedMessToDelete(null);
                                      setDeleteConfirmationInput("");
                                    }
                                  } else {
                                    const err = await response.json();
                                    alert(err.error || "Failed to delete mess branch");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("Error occurred while deleting branch.");
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                                deleteConfirmationInput === selectedMessToDelete.name
                                  ? "bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                                  : "bg-red-950/20 text-red-500/50 border border-red-950/40 cursor-not-allowed"
                              }`}
                            >
                              Confirm Permanent Deletion
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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

                {/* Democracy & Superuser Voting System Configuration */}
                {([UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERUSER].includes(currentUser.role)) && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                      <Vote className="w-4 h-4 text-cyan-400" />
                      Democracy Ballot & Voting Configuration
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Configure parameters for democratic ballots or polls. Define custom topics, subjects, options, and voting dates. This is open to Admins, Managers, and Super Users.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: General Settings */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">Ballot Status</label>
                            <select
                              value={electionEnabled ? "enabled" : "disabled"}
                              onChange={(e) => setElectionEnabled(e.target.value === "enabled")}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            >
                              <option value="disabled">Disabled (Ballot Closed)</option>
                              <option value="enabled">Enabled (Ballot Open/Active)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">Vote Type</label>
                            <select
                              value={electionVoteType}
                              onChange={(e) => setElectionVoteType(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            >
                              <option value="superuser">Super User (SU / ASU) Selection</option>
                              <option value="custom">Custom Ballot/Poll (e.g. Tour, Event)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">Ballot Topic</label>
                            <input
                              type="text"
                              value={electionTopic}
                              onChange={(e) => setElectionTopic(e.target.value)}
                              placeholder="e.g. Tour or Superuser selection"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">Ballot Subject</label>
                            <input
                              type="text"
                              value={electionSubject}
                              onChange={(e) => setElectionSubject(e.target.value)}
                              placeholder="e.g. options or candidates"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">Start Date & Time</label>
                            <input
                              type="datetime-local"
                              value={electionStartDate}
                              onChange={(e) => setElectionStartDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">End Date & Time</label>
                            <input
                              type="datetime-local"
                              value={electionEndDate}
                              onChange={(e) => setElectionEndDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Candidates Checklist or Custom Options */}
                      <div className="space-y-2 border border-slate-800/80 rounded-xl p-3 bg-slate-950/40">
                        {electionVoteType === "superuser" ? (
                          <>
                            <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-display">Eligible Candidates Checklist</label>
                            <p className="text-[10px] text-slate-500 leading-snug">
                              Check all members who are allowed to run for the Superuser / Assistant Superuser position. If none are checked, all members are eligible.
                            </p>
                            
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 mt-2">
                              {membersList.length === 0 ? (
                                <p className="text-[10px] text-slate-500 font-mono italic">No members found in this mess branch.</p>
                              ) : (
                                membersList.map((m) => {
                                  const isChecked = electionCandidates.includes(m.id);
                                  return (
                                    <label key={m.id} className="flex items-center gap-2 p-1.5 rounded bg-slate-950 hover:bg-slate-900 border border-slate-900/60 cursor-pointer transition-all">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setElectionCandidates(prev => [...prev, m.id]);
                                          } else {
                                            setElectionCandidates(prev => prev.filter(id => id !== m.id));
                                          }
                                        }}
                                        className="accent-cyan-500 cursor-pointer"
                                      />
                                      <div className="flex-1 flex justify-between items-center text-[11px]">
                                        <span className="font-bold text-slate-200">{m.nickname}</span>
                                        <span className="text-[9px] font-mono text-slate-500 uppercase">{m.role}</span>
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-display">Custom Voting Options</label>
                            <p className="text-[10px] text-slate-500 leading-snug mb-2">
                              Enter the distinct voting choices/options separated by commas.
                            </p>
                            <textarea
                              rows={4}
                              value={electionCustomOptionsText}
                              onChange={(e) => setElectionCustomOptionsText(e.target.value)}
                              placeholder="e.g. Option A - Srimangal, Option B - Ratargul, Option C - Sajek"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 font-sans"
                            />
                            <p className="text-[9px] text-slate-400 italic mt-1 leading-snug">
                              Note: Changing the Vote Type, Topic, or options will reset currently casted ballots for this election to keep the poll fair.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm("Are you sure you want to completely reset all cast votes for this election/poll?")) {
                            await handleConfigureElection({
                              enabled: electionEnabled,
                              startDate: electionStartDate,
                              endDate: electionEndDate,
                              candidates: electionCandidates,
                              topic: electionTopic,
                              subject: electionSubject,
                              voteType: electionVoteType,
                              options: electionVoteType === "custom" 
                                ? electionCustomOptionsText.split(",").map(s => s.trim()).filter(Boolean)
                                : [],
                              resetVotes: true
                            });
                          }
                        }}
                        className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/30 font-bold text-[10px] text-rose-300 rounded-xl cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Reset Current Votes
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const customOpts = electionVoteType === "custom"
                            ? electionCustomOptionsText.split(",").map(s => s.trim()).filter(Boolean)
                            : [];
                          await handleConfigureElection({
                            enabled: electionEnabled,
                            startDate: electionStartDate,
                            endDate: electionEndDate,
                            candidates: electionCandidates,
                            topic: electionTopic,
                            subject: electionSubject,
                            voteType: electionVoteType,
                            options: customOpts,
                            isFinal: false
                          });
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold text-xs text-white rounded-xl cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Apply Democracy Settings
                      </button>
                    </div>
                  </div>
                )}

                {/* Theme Templates Customizer */}
                {currentUser.role === UserRole.ADMIN && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    activeIsDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3 mb-4">
                      <div>
                        <h3 className="text-sm font-bold font-display text-cyan-300 flex items-center gap-2">
                          <LucideIcons.Palette size={16} className="text-cyan-400" />
                          Enterprise Theme Engine
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Configure live-previewable UI themes, customizable typography variables, and professional background effects.
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm("Reset entire appearance to factory defaults? This will restore standard fonts, colors, and default themes.")) {
                            try {
                              const defaultTemplate = THEME_TEMPLATES[0];
                              setSiteColor(defaultTemplate.siteColor);
                              setFontStyle(defaultTemplate.fontStyle);
                              setIsDarkMode(defaultTemplate.isDarkMode);
                              setCustomColors(defaultTemplate.customColors);
                              setMessAnimations(prev => ({
                                ...prev,
                                backgroundTheme: defaultTemplate.backgroundTheme,
                                themeTemplate: defaultTemplate.id,
                                glowingLabels: false,
                                glowingButtons: false,
                                glowingIcons: false,
                                glowingCards: false,
                                neonBorders: false,
                                rgbHover: false,
                                animatedShadows: false,
                                glassCards: false
                              }));
                              setPreviewTemplateId(null);
                              
                              await handleUpdateSettings({
                                siteColor: defaultTemplate.siteColor,
                                fontStyle: defaultTemplate.fontStyle,
                                customColors: defaultTemplate.customColors,
                                messAnimations: {
                                  ...messAnimations,
                                  backgroundTheme: defaultTemplate.backgroundTheme,
                                  themeTemplate: defaultTemplate.id,
                                  glowingLabels: false,
                                  glowingButtons: false,
                                  glowingIcons: false,
                                  glowingCards: false,
                                  neonBorders: false,
                                  rgbHover: false,
                                  animatedShadows: false,
                                  glassCards: false
                                }
                              });
                              alert("Appearance settings restored to default successfully.");
                            } catch (e) {
                              console.error(e);
                              alert("Failed to reset settings.");
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/30 text-rose-300 rounded-xl cursor-pointer transition-all uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                      >
                        <LucideIcons.RotateCcw size={11} />
                        Reset Theme Engine
                      </button>
                    </div>

                    <ThemeEnginePanel
                      messAnimations={messAnimations}
                      setMessAnimations={setMessAnimations}
                      isDarkMode={isDarkMode}
                      setIsDarkMode={setIsDarkMode}
                      siteColor={siteColor}
                      setSiteColor={setSiteColor}
                      fontStyle={fontStyle}
                      setFontStyle={setFontStyle}
                      customColors={customColors}
                      setCustomColors={setCustomColors}
                      previewTemplateId={previewTemplateId}
                      setPreviewTemplateId={setPreviewTemplateId}
                      handleUpdateSettings={handleUpdateSettings}
                      typographySettings={typographySettings}
                      setTypographySettings={setTypographySettings}
                    />
                  </div>
                )}

                {/* Visual UI Customizer */}
                {currentUser.role === UserRole.ADMIN && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    activeIsDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
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
                          <option value="custom">Custom RGB Color Palette</option>
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
                          <option value="custom">Custom RGB Typography Palette</option>
                        </select>
                      </div>

                      {/* Font Size Scaling Option */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block flex items-center gap-1.5">
                          Application Layout Scale
                          <span className="w-2 h-2 rounded-full scale-indicator-dot inline-block animate-pulse"></span>
                        </label>
                        <select
                          value={fontSize}
                          onChange={(e) => setFontSize(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        >
                          <option value="small">Compact (13px)</option>
                          <option value="13.5">13.5px</option>
                          <option value="normal">Normal (14px)</option>
                          <option value="14.5">14.5px</option>
                          <option value="large">Spacious (15px)</option>
                          <option value="15.5">15.5px</option>
                          <option value="16">16px</option>
                          <option value="xlarge">Readable (16.5px)</option>
                          <option value="17">17px</option>
                          <option value="17.5">17.5px</option>
                          <option value="18">18px</option>
                        </select>
                      </div>

                      {/* Save Applied Settings Button */}
                      <div className="col-span-1 md:col-span-2 flex justify-end pb-3">
                        <button
                          onClick={async () => {
                            try {
                              await handleUpdateSettings({ logoText, siteColor, fontStyle, fontSize });
                              alert("Enterprise UI and branding settings saved successfully.");
                            } catch (err) {
                              console.error(err);
                              alert("Failed to save branding settings.");
                            }
                          }}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/30 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Save size={14} className="stroke-[2.5px]" />
                          Save Applied Settings
                        </button>
                      </div>

                      {/* RGB Custom Colors Customizer */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">Granular Color Customization Palettes</h4>
                          <button
                            onClick={async () => {
                              await handleUpdateSettings({ customColors });
                              alert("Granular color customization applied successfully.");
                            }}
                            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                          >
                            Apply Color Changes
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cash Deposit Section Bg</label>
                            <ColorPalettePicker
                              value={customColors?.cashDepositBg || "#ea580c"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, cashDepositBg: color + "1a" }))}
                              defaultValue="#ea580c"
                              onReset={() => setCustomColors(prev => ({ ...prev, cashDepositBg: "#ea580c" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cash Deposit Border</label>
                            <ColorPalettePicker
                              value={customColors?.cashDepositBorder || "#ea580c"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, cashDepositBorder: color }))}
                              defaultValue="#ea580c"
                              onReset={() => setCustomColors(prev => ({ ...prev, cashDepositBorder: "#ea580c" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Settlement Sheet Bg</label>
                            <ColorPalettePicker
                              value={customColors?.settlementBg || "#16a34a"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, settlementBg: color + "1a" }))}
                              defaultValue="#16a34a"
                              onReset={() => setCustomColors(prev => ({ ...prev, settlementBg: "#16a34a" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Settlement Sheet Border</label>
                            <ColorPalettePicker
                              value={customColors?.settlementBorder || "#16a34a"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, settlementBorder: color }))}
                              defaultValue="#16a34a"
                              onReset={() => setCustomColors(prev => ({ ...prev, settlementBorder: "#16a34a" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sidebar Background</label>
                            <ColorPalettePicker
                              value={customColors?.sidebarBg || "#0f172a"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, sidebarBg: color }))}
                              defaultValue="#0f172a"
                              onReset={() => setCustomColors(prev => ({ ...prev, sidebarBg: "#0f172a" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Header Background</label>
                            <ColorPalettePicker
                              value={customColors?.headerBg || "#0f172a"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, headerBg: color }))}
                              defaultValue="#0f172a"
                              onReset={() => setCustomColors(prev => ({ ...prev, headerBg: "#0f172a" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Card Background</label>
                            <ColorPalettePicker
                              value={customColors?.cardBg || "#1e293b"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, cardBg: color }))}
                              defaultValue="#1e293b"
                              onReset={() => setCustomColors(prev => ({ ...prev, cardBg: "#1e293b" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Accent Glow Color</label>
                            <ColorPalettePicker
                              value={customColors?.accentColor || "#22d3ee"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, accentColor: color }))}
                              defaultValue="#22d3ee"
                              onReset={() => setCustomColors(prev => ({ ...prev, accentColor: "#22d3ee" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Site Accent Color Palette</label>
                            <ColorPalettePicker
                              value={customColors?.siteAccentColorRgb || "#22d3ee"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, siteAccentColorRgb: color }))}
                              defaultValue="#22d3ee"
                              onReset={() => setCustomColors(prev => ({ ...prev, siteAccentColorRgb: "#22d3ee" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Typography Highlight Palette</label>
                            <ColorPalettePicker
                              value={customColors?.typographyHighlightRgb || "#67e8f9"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, typographyHighlightRgb: color }))}
                              defaultValue="#67e8f9"
                              onReset={() => setCustomColors(prev => ({ ...prev, typographyHighlightRgb: "#67e8f9" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Layout Scale Color Palette</label>
                            <ColorPalettePicker
                              value={customColors?.layoutScaleColorRgb || "#a78bfa"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, layoutScaleColorRgb: color }))}
                              defaultValue="#a78bfa"
                              onReset={() => setCustomColors(prev => ({ ...prev, layoutScaleColorRgb: "#a78bfa" }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dashboard Visibility Rules config */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">Dashboard Tab Visibility Rules (Per-Branch)</h4>
                          <button
                            onClick={async () => {
                              await handleUpdateSettings({ dashboardVisibility });
                              alert("Tab visibility rules saved successfully.");
                            }}
                            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                          >
                            Apply Visibility Rules
                          </button>
                        </div>
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

                          <div className="flex items-center gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 col-span-2">
                            <input
                              type="checkbox"
                              checked={!!dashboardVisibility?.showDashboardOverview}
                              disabled={!(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER || currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com")}
                              onChange={(e) => setDashboardVisibility(prev => ({ ...prev, showDashboardOverview: e.target.checked }))}
                              className="accent-cyan-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <div>
                              <span className="text-xs text-orange-400 font-bold flex items-center gap-1.5">
                                ★ Show Dashboard Overview
                                {!(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERUSER || currentUser.email?.toLowerCase() === "mdshahriarhimel@gmail.com") && (
                                  <span className="text-[8px] bg-red-500/10 text-red-400 px-1 rounded uppercase font-extrabold border border-red-500/20">Restricted</span>
                                )}
                              </span>
                              <span className="text-[9px] text-slate-500 block mt-0.5">
                                Controls metrics, balances & active reports. Toggleable by Admin & Super Users.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mess Animations/Effects config */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">Interactive Mess Themes & Animation Effects</h4>
                          <button
                            onClick={async () => {
                              await handleUpdateSettings({ messAnimations });
                              alert("Interactive themes and animation effects updated successfully.");
                            }}
                            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                          >
                            Apply Themes & Effects
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Admins can activate custom ambient animation overlays and immersive background styles on active branches (e.g. Dhaka or Chittagong) 
                          to personalize the branch's aesthetic experience.
                        </p>
                        <div className="space-y-4">
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
                                <option value="stars">Interactive Sparkling Stars (Trail!)</option>
                                <option value="bubbles">Interactive Repelling Bubbles (Physics!)</option>
                                <option value="snow">Gentle Winter Snowfall</option>
                                <option value="fireflies">Twilight Glowing Fireflies</option>
                                <option value="rain">Heavy Autumn Rain</option>
                                <option value="fire">Flickering Campfire Embers</option>
                                <option value="pulse">Ambient Heartbeat Wave</option>
                                <option value="particles">Floating Cosmic Dust (Gravity!)</option>
                                <option value="matrix-red">Red Cyber Defense Code</option>
                                <option value="aurora">Luminous Northern Lights</option>
                                <option value="jellyfish">Mystical Deep Sea Jellyfish</option>
                                <option value="leaves">Swaying Autumn Golden Leaves</option>
                                <option value="laser">Moving Vertical Laser Scanners</option>
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

                          <div className="space-y-4 pt-1 col-span-1 md:col-span-2">
                            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                              <label className="text-[10px] font-bold text-slate-400 block uppercase font-display flex items-center gap-2">
                                <LucideIcons.LayoutGrid size={12} className="text-cyan-400" />
                                Visual Theme Selection Grid
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setMessAnimations(prev => ({
                                    ...prev,
                                    backgroundTheme: "default",
                                    customBackgroundUrl: "",
                                    backgroundOpacity: 20
                                  }));
                                }}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-extrabold flex items-center gap-1 cursor-pointer hover:underline"
                                title="Reset theme to default"
                              >
                                <LucideIcons.RotateCcw size={10} />
                                Reset Theme
                              </button>
                            </div>
                            
                            {/* Theme Cards Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                              {VISUAL_THEMES.map((t) => {
                                const isSelected = (messAnimations?.backgroundTheme || "default") === t.id;
                                const IconComponent = (LucideIcons as any)[t.icon] || LucideIcons.Sparkles;
                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => setMessAnimations(prev => ({ ...prev, backgroundTheme: t.id }))}
                                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left relative overflow-hidden group ${
                                      isSelected
                                        ? "border-cyan-400 ring-2 ring-cyan-500/20 bg-slate-900/80"
                                        : "border-slate-800/80 hover:border-slate-700 bg-slate-950/40"
                                    }`}
                                  >
                                    {/* Visual Circle Preview of Gradient */}
                                    <div className="flex items-center justify-between mb-2">
                                      <div
                                        className="w-5 h-5 rounded-md border border-white/10 flex items-center justify-center shadow-inner"
                                        style={{ background: isDarkMode ? t.bg : t.lightBg }}
                                      >
                                        <IconComponent size={10} className={isSelected ? "text-cyan-400" : "text-slate-400 group-hover:text-white transition-colors"} />
                                      </div>
                                      {isSelected && (
                                        <div className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-400 flex items-center justify-center text-cyan-400">
                                          <LucideIcons.Check size={8} className="stroke-[3]" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold text-slate-200 truncate">{t.name}</p>
                                      <p className="text-[9px] text-slate-500 leading-tight mt-0.5 group-hover:text-slate-400 transition-colors line-clamp-2">{t.desc}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {messAnimations?.backgroundTheme === "custom" && (
                              <div className="space-y-1 pt-1">
                                <label className="text-[10px] font-bold text-slate-400 block uppercase font-display">Custom Image URL</label>
                                <input
                                  type="text"
                                  placeholder="https://images.unsplash.com/... or relative path"
                                  value={messAnimations?.customBackgroundUrl || ""}
                                  onChange={(e) => setMessAnimations(prev => ({ ...prev, customBackgroundUrl: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                />
                              </div>
                            )}
                          </div>

                          {messAnimations?.backgroundTheme === "custom" && (
                            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-slate-400 block uppercase font-display">Background Blend Opacity</label>
                                <span className="text-xs font-mono font-bold text-cyan-400">{messAnimations?.backgroundOpacity ?? 20}%</span>
                              </div>
                              <input
                                type="range"
                                min="5"
                                max="95"
                                step="5"
                                value={messAnimations?.backgroundOpacity ?? 20}
                                onChange={(e) => setMessAnimations(prev => ({ ...prev, backgroundOpacity: parseInt(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                              />
                              <p className="text-[10px] text-slate-500 leading-tight">
                                Adjust how prominently the background image shows through. Lower values make it more subtle, preventing UI text reading issues.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Calendar & Date Access Rules config */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">Calendar Date & Input Permission Rules</h4>
                          <button
                            onClick={async () => {
                              await handleUpdateSettings({ dateRestrictions });
                              alert("Calendar input permission rules updated successfully.");
                            }}
                            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                          >
                            Apply Permission Rules
                          </button>
                        </div>
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

                      {/* Login Page Customizer */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">Login Page Customizer</h4>
                          <button
                            onClick={async () => {
                              await handleUpdateSettings({ loginCustomization });
                              alert("Login Page Customizer settings saved successfully.");
                            }}
                            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                          >
                            Apply Login Customizations
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Customize every single layout parameter of the Login Screen. Set custom fonts, background themes, custom brand text, animations, and toggle interactive elements.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Login Title</label>
                            <input
                              type="text"
                              value={loginCustomization?.title || ""}
                              onChange={(e) => setLoginCustomization(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Mess ERP"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Login Subtitle</label>
                            <input
                              type="text"
                              value={loginCustomization?.subtitle || ""}
                              onChange={(e) => setLoginCustomization(prev => ({ ...prev, subtitle: e.target.value }))}
                              placeholder="BENGAL BACHELOR ERP ENGINE"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Font Style Preset</label>
                            <select
                              value={loginCustomization?.fontStyle || "sans"}
                              onChange={(e) => setLoginCustomization(prev => ({ ...prev, fontStyle: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            >
                              <option value="sans">Modern Sans (Inter)</option>
                              <option value="mono">Brutalist Technical (Fira Code)</option>
                              <option value="serif">Elegant Editorial (Georgia)</option>
                              <option value="display">Clean Geometry (Space Grotesk)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Background Type</label>
                            <select
                              value={loginCustomization?.backgroundType || "theme"}
                              onChange={(e) => setLoginCustomization(prev => ({ ...prev, backgroundType: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            >
                              <option value="theme">Preset Background Theme</option>
                              <option value="color">Flat Solid Color</option>
                              <option value="image">Custom Background Image URL</option>
                            </select>
                          </div>

                          {loginCustomization?.backgroundType === "theme" && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Background Theme</label>
                              <select
                                value={loginCustomization?.backgroundTheme || "neon-shallows"}
                                onChange={(e) => setLoginCustomization(prev => ({ ...prev, backgroundTheme: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                              >
                                <option value="default">Default Standard Slate</option>
                                <option value="cosmic-void">Cosmic Void (Deep Purple)</option>
                                <option value="midnight-nebula">Midnight Nebula</option>
                                <option value="cyberpunk-grid">Cyberpunk Grid</option>
                                <option value="sunset-glow">Sunset Velvet</option>
                                <option value="ocean-depth">Ocean Depths</option>
                                <option value="forest-whisper">Forest Whisper</option>
                                <option value="neon-shallows">Retro Neon Shallows</option>
                                <option value="deep-space">Deep Space Obsidian</option>
                              </select>
                            </div>
                          )}

                          {loginCustomization?.backgroundType === "color" && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Background Color</label>
                              <ColorPalettePicker
                                value={loginCustomization?.backgroundColor || "#020617"}
                                onChange={(color) => setLoginCustomization(prev => ({ ...prev, backgroundColor: color }))}
                              />
                            </div>
                          )}

                          {loginCustomization?.backgroundType === "image" && (
                            <div className="space-y-1.5 col-span-1 sm:col-span-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Background Image URL</label>
                              <input
                                type="text"
                                value={loginCustomization?.backgroundImageUrl || ""}
                                onChange={(e) => setLoginCustomization(prev => ({ ...prev, backgroundImageUrl: e.target.value }))}
                                placeholder="https://images.unsplash.com/photo-..."
                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                              />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Login Form Card Bg</label>
                            <input
                              type="text"
                              value={loginCustomization?.cardBg || ""}
                              onChange={(e) => setLoginCustomization(prev => ({ ...prev, cardBg: e.target.value }))}
                              placeholder="rgba(15, 23, 42, 0.8)"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Text Color</label>
                            <ColorPalettePicker
                              value={loginCustomization?.textColor || "#ffffff"}
                              onChange={(color) => setLoginCustomization(prev => ({ ...prev, textColor: color }))}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accent Glow Color</label>
                            <ColorPalettePicker
                              value={loginCustomization?.accentColor || "#22d3ee"}
                              onChange={(color) => setLoginCustomization(prev => ({ ...prev, accentColor: color }))}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Login Animation</label>
                            <select
                              value={loginCustomization?.animationType || "fade"}
                              onChange={(e) => setLoginCustomization(prev => ({ ...prev, animationType: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            >
                              <option value="none">None (Static Form)</option>
                              <option value="fade">Subtle Elegant Fade-In</option>
                              <option value="slide">Dynamic Slide-Up Entrance</option>
                              <option value="pulse">Soft Cyclic Pulsing Wave</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Login Logo Type</label>
                            <select
                              value={loginCustomization?.logoType || "key"}
                              onChange={(e) => setLoginCustomization(prev => ({ ...prev, logoType: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            >
                              <option value="key">Key Icon (Default)</option>
                              <option value="shield">Shield Icon</option>
                              <option value="sparkles">Sparkles Icon</option>
                              <option value="coffee">Coffee Icon</option>
                              <option value="users">Users Icon</option>
                              <option value="trophy">Trophy Icon</option>
                              <option value="lock">Lock Icon</option>
                              <option value="image">Custom Image URL</option>
                            </select>
                          </div>

                          {loginCustomization?.logoType === "image" && (
                            <div className="space-y-1.5 animate-fade-in">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Logo Image URL</label>
                              <input
                                type="text"
                                value={loginCustomization?.customLogoUrl || ""}
                                onChange={(e) => setLoginCustomization(prev => ({ ...prev, customLogoUrl: e.target.value }))}
                                placeholder="https://example.com/logo.png"
                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-5">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2 rounded border border-slate-900 w-full">
                              <input
                                type="checkbox"
                                checked={!!loginCustomization?.showBrandingIcon}
                                onChange={(e) => setLoginCustomization(prev => ({ ...prev, showBrandingIcon: e.target.checked }))}
                                className="accent-cyan-500 cursor-pointer"
                              />
                              <span className="text-[11px] text-slate-300 font-medium">Show Brand Icon</span>
                            </label>
                          </div>

                          <div className="flex items-center gap-2 pt-5">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2 rounded border border-slate-900 w-full">
                              <input
                                type="checkbox"
                                checked={!!loginCustomization?.showGoogleLogin}
                                onChange={(e) => setLoginCustomization(prev => ({ ...prev, showGoogleLogin: e.target.checked }))}
                                className="accent-cyan-500 cursor-pointer"
                              />
                              <span className="text-[11px] text-slate-300 font-medium">Show Google Login</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Home Page / Welcome Banner Customizer */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">Home/Dashboard Screen Customizer</h4>
                          <button
                            onClick={async () => {
                              await handleUpdateSettings({ homeCustomization });
                              alert("Home dashboard customizations applied successfully.");
                            }}
                            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                          >
                            Apply Home Customizations
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Modify the primary greeting card, typography, and card-level branding styles for the Home dashboard. Use <code className="text-cyan-400 font-mono font-bold text-[10px] bg-slate-950 px-1 py-0.5 rounded">{"{nickname}"}</code> in title to dynamically reference the user.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Welcome Banner Title</label>
                            <input
                              type="text"
                              value={homeCustomization?.welcomeTitle || ""}
                              onChange={(e) => setHomeCustomization(prev => ({ ...prev, welcomeTitle: e.target.value }))}
                              placeholder="Assalamu Alaikum, {nickname}!"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Welcome Banner Subtitle</label>
                            <input
                              type="text"
                              value={homeCustomization?.welcomeSubtitle || ""}
                              onChange={(e) => setHomeCustomization(prev => ({ ...prev, welcomeSubtitle: e.target.value }))}
                              placeholder="Welcome to the Mess ERP Hub..."
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Font Style Preset</label>
                            <select
                              value={homeCustomization?.fontStyle || "sans"}
                              onChange={(e) => setHomeCustomization(prev => ({ ...prev, fontStyle: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            >
                              <option value="sans">Modern Sans (Outfit)</option>
                              <option value="mono">Brutalist Technical (Fira Code)</option>
                              <option value="serif">Elegant Editorial (Georgia)</option>
                              <option value="display">Clean Geometry (Space Grotesk)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Card Background Color</label>
                            <input
                              type="text"
                              value={homeCustomization?.cardBg || ""}
                              onChange={(e) => setHomeCustomization(prev => ({ ...prev, cardBg: e.target.value }))}
                              placeholder="rgba(30, 41, 59, 0.4)"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Text Color (Hex or CSS)</label>
                            <input
                              type="text"
                              value={homeCustomization?.textColor || ""}
                              onChange={(e) => setHomeCustomization(prev => ({ ...prev, textColor: e.target.value }))}
                              placeholder="#ffffff"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accent Glow Color</label>
                            <input
                              type="text"
                              value={homeCustomization?.accentColor || ""}
                              onChange={(e) => setHomeCustomization(prev => ({ ...prev, accentColor: e.target.value }))}
                              placeholder="#22d3ee"
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-5">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2 rounded border border-slate-900 w-full">
                              <input
                                type="checkbox"
                                checked={homeCustomization?.showBanner !== false}
                                onChange={(e) => setHomeCustomization(prev => ({ ...prev, showBanner: e.target.checked }))}
                                className="accent-cyan-500 cursor-pointer"
                              />
                              <span className="text-[11px] text-slate-300 font-medium">Render Welcome Banner</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Premium Glowing Effects & Performance Controls */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-4 mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">Premium Glowing Effects & Performance Controls</h4>
                          <button
                            onClick={async () => {
                              await handleUpdateSettings({ 
                                enableManagerRating, 
                                balanceSheetGlow, 
                                roleAnimations, 
                                adminVisibility 
                              });
                              alert("Premium glowing styles and visibility rules applied successfully.");
                            }}
                            className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                          >
                            Apply Glowing Controls
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Control premium, customizable animated glowing background and transition effects for active components and mess role profiles. This creates distinctive visual branding across the app.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Column 1: Manager performance and Balance sheet glow */}
                          <div className="space-y-4">
                            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-900/80 space-y-3">
                              <p className="text-xs font-bold text-slate-200">Manager Performance Rating</p>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-900 w-full">
                                  <input
                                    type="checkbox"
                                    checked={!!enableManagerRating}
                                    onChange={(e) => setEnableManagerRating(e.target.checked)}
                                    className="accent-cyan-500 cursor-pointer"
                                  />
                                  <span className="text-[11px] text-slate-300 font-medium">Enable Manager Performance Rating Card</span>
                                </label>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                When enabled, users can submit and view ratings starting from the 7th of the month.
                              </p>
                            </div>

                            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-900/80 space-y-3">
                              <label className="text-xs font-bold text-slate-200 block">Balance Sheet Glowing Style</label>
                              <select
                                value={balanceSheetGlow || "none"}
                                onChange={(e) => setBalanceSheetGlow(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                              >
                                <option value="none">None (Standard Border)</option>
                                <option value="golden-aura">Golden Aura</option>
                                <option value="volcanic-flame">Volcanic Flame</option>
                                <option value="deep-ocean">Deep Ocean Ripple</option>
                                <option value="cosmic-nebula">Cosmic Nebula</option>
                                <option value="emerald-ripple">Emerald Ripple</option>
                                <option value="cyberpunk-neon">Cyberpunk Neon</option>
                                <option value="ghostly-violet">Ghostly Violet</option>
                                <option value="electric-discharge">Electric Discharge</option>
                                <option value="crimson-tide">Crimson Tide</option>
                                <option value="solar-eclipse">Solar Eclipse</option>
                              </select>
                              <p className="text-[10px] text-slate-500">
                                Customize the animated box-shadow and gradient glow applied to the "Individual Month Balance Sheet" container.
                              </p>
                            </div>
                          </div>

                          {/* Column 2: Admin Privacy & Security Settings */}
                          <div className="space-y-4">
                            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-900/80 space-y-3 h-full">
                              <p className="text-xs font-bold text-slate-200">Admin Privacy & Security Settings</p>
                              <p className="text-[10px] text-slate-400">
                                Control which Admin credentials are shown to normal members. When turned off, info is masked or hidden.
                              </p>
                              
                              <div className="space-y-2 pt-1">
                                <label className="flex items-center gap-2.5 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-900 text-[11px] text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={!!adminVisibility?.showAdminCard}
                                    onChange={(e) => setAdminVisibility((prev: any) => ({ ...prev, showAdminCard: e.target.checked }))}
                                    className="accent-cyan-500"
                                  />
                                  <span>Show Admin Card in Members List</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-900 text-[11px] text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={!!adminVisibility?.showAdminPhone}
                                    onChange={(e) => setAdminVisibility((prev: any) => ({ ...prev, showAdminPhone: e.target.checked }))}
                                    className="accent-cyan-500"
                                  />
                                  <span>Show Admin Phone Number & WhatsApp Link</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-900 text-[11px] text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={!!adminVisibility?.showAdminEmail}
                                    onChange={(e) => setAdminVisibility((prev: any) => ({ ...prev, showAdminEmail: e.target.checked }))}
                                    className="accent-cyan-500"
                                  />
                                  <span>Show Admin Email Address</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-900 text-[11px] text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={!!adminVisibility?.showAdminRole}
                                    onChange={(e) => setAdminVisibility((prev: any) => ({ ...prev, showAdminRole: e.target.checked }))}
                                    className="accent-cyan-500"
                                  />
                                  <span>Show Admin Authority Role Badge (else shows "Member")</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Real-time Layout Preview Panel */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-800/60 pt-6 mt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                          <div>
                            <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Real-Time Miniaturized Layout Preview
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              See how your customizations look live before saving them to the system.
                            </p>
                          </div>
                          
                          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setActivePreviewTab("login")}
                              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                                activePreviewTab === "login"
                                  ? "bg-cyan-500 text-white shadow"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Login Screen
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePreviewTab("home")}
                              className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                                activePreviewTab === "home"
                                  ? "bg-cyan-500 text-white shadow"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Home Dashboard Banner
                            </button>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                          {activePreviewTab === "login" ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 font-mono mb-2 uppercase">Simulated Login Preview (Scale ~30%)</span>
                              <div 
                                style={(() => {
                                  if (!loginCustomization) return {};
                                  if (loginCustomization.backgroundType === "color") {
                                    return { backgroundColor: loginCustomization.backgroundColor || "#020617" };
                                  }
                                  if (loginCustomization.backgroundType === "image") {
                                    return {
                                      backgroundImage: `url(${loginCustomization.backgroundImageUrl || ""})`,
                                      backgroundSize: "cover",
                                      backgroundPosition: "center"
                                    };
                                  }
                                  // Preset background themes
                                  switch (loginCustomization.backgroundTheme) {
                                    case "cosmic-void":
                                      return { background: "linear-gradient(to bottom, #1e1b4b, #03001e, #0f172a)" };
                                    case "midnight-nebula":
                                      return { background: "linear-gradient(to right, #000428, #004e92)" };
                                    case "cyberpunk-grid":
                                      return { background: "linear-gradient(135deg, #0f172a, #1e1b4b)", border: "1px solid #22d3ee30" };
                                    case "sunset-glow":
                                      return { background: "linear-gradient(to bottom right, #4c0519, #451a03)" };
                                    case "ocean-depth":
                                      return { background: "linear-gradient(to bottom, #083344, #172554)" };
                                    case "forest-whisper":
                                      return { background: "linear-gradient(to bottom, #064e3b, #022c22)" };
                                    case "neon-shallows":
                                      return { background: "linear-gradient(to bottom right, #06b6d4, #0f172a)" };
                                    case "deep-space":
                                      return { background: "linear-gradient(to bottom, #020617, #0f172a)" };
                                    default:
                                      return { background: "#0f172a" };
                                  }
                                })()}
                                className={`w-full max-w-sm h-64 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-4 border border-slate-800 transition-all ${
                                  loginCustomization?.fontStyle === "mono" ? "font-mono" :
                                  loginCustomization?.fontStyle === "serif" ? "font-serif" :
                                  loginCustomization?.fontStyle === "display" ? "font-display" : "font-sans"
                                }`}
                              >
                                {/* Mini form container */}
                                <div 
                                  style={{ 
                                    backgroundColor: loginCustomization?.cardBg || "rgba(15, 23, 42, 0.6)", 
                                    color: loginCustomization?.textColor || "#ffffff",
                                    borderColor: loginCustomization?.accentColor ? `${loginCustomization.accentColor}30` : "rgba(34, 211, 238, 0.2)"
                                  }}
                                  className="w-[85%] p-3 rounded-lg border shadow-lg backdrop-blur-sm flex flex-col items-center text-center transition-all"
                                >
                                  {loginCustomization?.showBrandingIcon !== false && (
                                    <div 
                                      style={{ color: loginCustomization?.accentColor || "#22d3ee" }}
                                      className="w-5 h-5 rounded-full bg-slate-950/40 border border-slate-800 flex items-center justify-center mb-1 text-[8px] font-bold font-mono"
                                    >
                                      B
                                    </div>
                                  )}
                                  <h5 className="text-[10px] font-black tracking-tight" style={{ color: loginCustomization?.textColor || "#ffffff" }}>
                                    {loginCustomization?.title || "Mess ERP"}
                                  </h5>
                                  <p className="text-[6px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                                    {loginCustomization?.subtitle || "BENGAL BACHELOR ERP ENGINE"}
                                  </p>

                                  <div className="w-full mt-2 space-y-1">
                                    <div className="h-4 bg-slate-950/60 border border-slate-800 rounded px-1.5 flex items-center text-[5px] text-slate-400">
                                      <span>Username / Phone</span>
                                    </div>
                                    <div className="h-4 bg-slate-950/60 border border-slate-800 rounded px-1.5 flex items-center text-[5px] text-slate-400">
                                      <span>Password</span>
                                    </div>
                                  </div>

                                  <button 
                                    type="button"
                                    style={{ 
                                      background: `linear-gradient(to right, ${loginCustomization?.accentColor || "#06b6d4"}, ${loginCustomization?.accentColor || "#0891b2"}dd)`
                                    }}
                                    className="w-full h-4 mt-2 text-[5px] font-black text-white rounded uppercase tracking-wide flex items-center justify-center"
                                  >
                                    SIGN IN PORTAL
                                  </button>

                                  {loginCustomization?.showGoogleLogin !== false && (
                                    <div className="w-full mt-1.5 pt-1.5 border-t border-slate-800/40 flex items-center justify-center">
                                      <div className="h-3.5 px-2 bg-slate-950/80 border border-slate-800 rounded flex items-center justify-center gap-1 text-[4px] text-slate-300 w-full cursor-pointer">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                        <span>SIGN IN WITH GOOGLE</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 font-mono mb-2 uppercase">Simulated Dashboard Welcome Banner Preview (Scale ~40%)</span>
                              <div className="w-full max-w-lg p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col justify-center">
                                <div 
                                  style={{
                                    backgroundColor: homeCustomization?.cardBg || "rgba(30, 41, 59, 0.4)",
                                    color: homeCustomization?.textColor || "#ffffff"
                                  }}
                                  className={`p-4 rounded-xl border border-slate-800/60 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all ${
                                    homeCustomization?.fontStyle === "mono" ? "font-mono" :
                                    homeCustomization?.fontStyle === "serif" ? "font-serif" :
                                    homeCustomization?.fontStyle === "display" ? "font-display" : "font-sans"
                                  }`}
                                >
                                  {/* Glow effect */}
                                  <div className="absolute right-0 top-0 w-24 h-24 bg-radial-gradient opacity-30 pointer-events-none"></div>

                                  <div className="relative z-10 flex-1">
                                    <span className="text-[6px] font-bold tracking-widest text-orange-500 uppercase flex items-center gap-1 mb-0.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                                      LIVE ACCESS GRANTED
                                    </span>
                                    <h4 className="text-[11px] font-black tracking-tight flex items-center gap-1">
                                      {homeCustomization?.welcomeTitle ? (
                                        homeCustomization.welcomeTitle.replace("{nickname}", currentUser.nickname)
                                      ) : (
                                        `Assalamu Alaikum, ${currentUser.nickname}!`
                                      )}
                                      <span className="text-[5px] font-mono font-bold uppercase text-orange-500 bg-orange-500/10 px-1 rounded border border-orange-500/20">
                                        {currentUser.role}
                                      </span>
                                    </h4>
                                    <p className="text-[7px] text-slate-400 mt-0.5 max-w-sm leading-relaxed">
                                      {homeCustomization?.welcomeSubtitle || "Welcome to the Mess ERP Hub. Check details, submit your market expenses, track meals, and manage monthly balances with ease."}
                                    </p>
                                  </div>

                                  <div className="relative z-10">
                                    <span 
                                      className="px-2 py-0.5 rounded border text-[6px] font-semibold flex items-center gap-1"
                                      style={{ 
                                        borderColor: homeCustomization?.accentColor ? `${homeCustomization.accentColor}30` : "rgba(34, 211, 238, 0.2)",
                                        color: homeCustomization?.accentColor || "#22d3ee" 
                                      }}
                                    >
                                      <span>JULY 2026</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
                            dateRestrictions,
                            loginCustomization,
                            homeCustomization,
                            enableManagerRating,
                            balanceSheetGlow,
                            roleAnimations,
                            adminVisibility
                          });
                          alert("UI Customisations, Login layout, Home dashboard settings, and animation templates saved & applied successfully.");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold text-xs text-white rounded-xl cursor-pointer transition-all shrink-0 uppercase font-display tracking-wide"
                      >
                        APPLY THEME CHANGES
                      </button>
                    </div>
                  </div>
                )}

                {/* Typography Settings Section */}
                {currentUser.role === UserRole.ADMIN && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 mt-6 ${
                    activeIsDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold font-display text-cyan-300">Typography Settings</h3>
                      <button
                        onClick={async () => {
                          const defaultTypo = {
                            primaryFontColor: "",
                            secondaryFontColor: "",
                            headingColor: "",
                            menuTextColor: "",
                            sidebarTextColor: "",
                            navbarTextColor: "",
                            cardTextColor: "",
                            tableTextColor: "",
                            buttonTextColor: "",
                            linkColor: "",
                            successTextColor: "",
                            warningTextColor: "",
                            errorTextColor: "",
                            globalFontSize: 14,
                            headingSize: 18,
                            sidebarFontSize: 12,
                            navigationFontSize: 12,
                            cardTitleSize: 14,
                            cardBodySize: 12,
                            tableFontSize: 12,
                            buttonFontSize: 12,
                            fontFamily: "Inter",
                            accessibilityPreset: "normal"
                          };
                          setTypographySettings(defaultTypo);
                          await handleUpdateSettings({ typographySettings: defaultTypo });
                          alert("Typography settings reset to defaults.");
                        }}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-600 border border-red-500/20 hover:border-red-500 text-red-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0 flex items-center gap-1"
                      >
                        <LucideIcons.RotateCcw size={10} />
                        Reset Typography
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Customize typeface families, font size sliders, and custom colors. Includes accessibility presets to guarantee readability and high-contrast styling automatically.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* Column 1: Font Family & Presets */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4">
                          <p className="text-xs font-bold text-slate-200 border-b border-slate-800/60 pb-1.5 flex items-center gap-1.5">
                            <LucideIcons.Type size={12} className="text-cyan-400" />
                            Typeface Family
                          </p>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Font Family</label>
                            <select
                              value={typographySettings.fontFamily || "Inter"}
                              onChange={(e) => setTypographySettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            >
                              <option value="Inter">Inter (Clean modern/neutral)</option>
                              <option value="Poppins">Poppins (Friendly geometric)</option>
                              <option value="Roboto">Roboto (Technical sans)</option>
                              <option value="Nunito">Nunito (Rounded and soft)</option>
                              <option value="Montserrat">Montserrat (Bold geometric)</option>
                              <option value="Open Sans">Open Sans (Optimized readable)</option>
                              <option value="Lato">Lato (Warm sans)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accessibility Mode Presets</label>
                            <select
                              value={typographySettings.accessibilityPreset || "normal"}
                              onChange={(e) => {
                                const preset = e.target.value;
                                setTypographySettings(prev => ({ ...prev, accessibilityPreset: preset }));
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            >
                              <option value="normal">Normal Presets</option>
                              <option value="large-text">Large Readable Text</option>
                              <option value="high-contrast">High Contrast Mode</option>
                              <option value="accessibility-mode">Maximum Accessibility (18px Base)</option>
                            </select>
                          </div>
                        </div>

                        {/* Interactive Font Preview box */}
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                          <p className="text-xs font-bold text-slate-200 border-b border-slate-800/60 pb-1.5">Live Font Preview Area</p>
                          <div 
                            style={{ fontFamily: getFontFamilyStack(typographySettings.fontFamily) }}
                            className="p-3 bg-slate-950/70 border border-slate-900 rounded-lg space-y-2"
                          >
                            <p className="text-xs font-black text-cyan-400 uppercase tracking-wider">ABCDEFGHIJKLM</p>
                            <p className="text-xs text-slate-300">
                              The quick brown fox jumps over the lazy dog. 1234567890
                            </p>
                            <div className="flex gap-1.5 pt-1">
                              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Success</span>
                              <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">Error</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Font Sizes (Sliders and Numbers) */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3.5">
                        <p className="text-xs font-bold text-slate-200 border-b border-slate-800/60 pb-1.5 flex items-center gap-1.5">
                          <LucideIcons.Layout size={12} className="text-cyan-400" />
                          Font Size Overrides (Slider & Input)
                        </p>

                        {[
                          { label: "Global Font Size", key: "globalFontSize", min: 11, max: 20 },
                          { label: "Heading Font Size", key: "headingSize", min: 14, max: 28 },
                          { label: "Sidebar Font Size", key: "sidebarFontSize", min: 10, max: 18 },
                          { label: "Navigation Size", key: "navigationFontSize", min: 10, max: 18 },
                          { label: "Card Title Size", key: "cardTitleSize", min: 11, max: 22 },
                          { label: "Card Body Size", key: "cardBodySize", min: 10, max: 18 },
                          { label: "Table Font Size", key: "tableFontSize", min: 10, max: 18 },
                          { label: "Button Font Size", key: "buttonFontSize", min: 10, max: 18 },
                        ].map((sz) => (
                          <div key={sz.key} className="space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              <span>{sz.label}</span>
                              <span className="font-mono text-cyan-400">{(typographySettings as any)[sz.key] || sz.min}px</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min={sz.min}
                                max={sz.max}
                                value={(typographySettings as any)[sz.key] || sz.min}
                                onChange={(e) => setTypographySettings(prev => ({ ...prev, [sz.key]: parseInt(e.target.value) }))}
                                className="h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 flex-1"
                              />
                              <input
                                type="number"
                                min={sz.min}
                                max={sz.max}
                                value={(typographySettings as any)[sz.key] || sz.min}
                                onChange={(e) => setTypographySettings(prev => ({ ...prev, [sz.key]: parseInt(e.target.value) || sz.min }))}
                                className="w-12 bg-slate-950 border border-slate-800 text-[10px] text-white rounded px-1 py-0.5 text-center focus:outline-none font-mono"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Column 3: Typography Custom Colors */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3.5">
                        <p className="text-xs font-bold text-slate-200 border-b border-slate-800/60 pb-1.5 flex items-center gap-1.5">
                          <LucideIcons.Palette size={12} className="text-cyan-400" />
                          Granular Typography Colors
                        </p>

                        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
                          {[
                            { label: "Primary Font Color", key: "primaryFontColor", def: activeIsDarkMode ? "#f8fafc" : "#0f172a" },
                            { label: "Secondary Font Color", key: "secondaryFontColor", def: activeIsDarkMode ? "#94a3b8" : "#475569" },
                            { label: "Heading Color", key: "headingColor", def: activeIsDarkMode ? "#22d3ee" : "#0f172a" },
                            { label: "Menu Text Color", key: "menuTextColor", def: activeIsDarkMode ? "#cbd5e1" : "#1e293b" },
                            { label: "Sidebar Text Color", key: "sidebarTextColor", def: activeIsDarkMode ? "#94a3b8" : "#f1f5f9" },
                            { label: "Navbar Text Color", key: "navbarTextColor", def: activeIsDarkMode ? "#cbd5e1" : "#0f172a" },
                            { label: "Card Text Color", key: "cardTextColor", def: activeIsDarkMode ? "#cbd5e1" : "#1e293b" },
                            { label: "Table Text Color", key: "tableTextColor", def: activeIsDarkMode ? "#cbd5e1" : "#1e293b" },
                            { label: "Button Text Color", key: "buttonTextColor", def: activeIsDarkMode ? "#ffffff" : "#0f172a" },
                            { label: "Link Color", key: "linkColor", def: activeIsDarkMode ? "#38bdf8" : "#0284c7" },
                            { label: "Success Text Color", key: "successTextColor", def: activeIsDarkMode ? "#4ade80" : "#16a34a" },
                            { label: "Warning Text Color", key: "warningTextColor", def: activeIsDarkMode ? "#facc15" : "#d97706" },
                            { label: "Error Text Color", key: "errorTextColor", def: activeIsDarkMode ? "#f87171" : "#dc2626" },
                          ].map((col) => (
                            <div key={col.key} className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{col.label}</label>
                              <ColorPalettePicker
                                value={(typographySettings as any)[col.key] || col.def}
                                onChange={(color) => setTypographySettings(prev => ({ ...prev, [col.key]: color }))}
                                defaultValue={col.def}
                                onReset={() => setTypographySettings(prev => ({ ...prev, [col.key]: "" }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        onClick={async () => {
                          try {
                            await handleUpdateSettings({ typographySettings });
                            alert("Typography customizations and sizes applied and persisted successfully.");
                          } catch (err) {
                            console.error(err);
                            alert("Failed to save typography settings.");
                          }
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold text-xs text-white rounded-xl cursor-pointer transition-all uppercase font-display tracking-wide"
                      >
                        SAVE TYPOGRAPHY SETTINGS
                      </button>
                    </div>
                  </div>
                )}

                {/* Super User's Dashboard Tab Visibility Rules */}
                {currentUser.role === UserRole.SUPERUSER && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`} id="superuser-dashboard-config">
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="text-orange-500 animate-spin-slow" size={18} />
                      <h3 className="text-sm font-bold font-display text-cyan-300">🛡️ Dashboard Configuration Hub (Super User)</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      As a Super User, you have authority to customize branch-wide tab/dashboard visibility rules. You can toggle specific tabs or hide/show the main Dashboard Overview below.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-3 border-b border-slate-800/60 pb-2">
                        <h4 className="text-xs font-bold font-display text-cyan-300 uppercase tracking-wide">Dashboard Tab Visibility Rules (Per-Branch)</h4>
                        <button
                          onClick={async () => {
                            await handleUpdateSettings({ dashboardVisibility });
                            alert("Dashboard and tab visibility rules saved successfully.");
                          }}
                          className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0"
                        >
                          Apply Configuration
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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

                        <div className="flex items-center gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 col-span-1 sm:col-span-2 md:col-span-3">
                          <input
                            type="checkbox"
                            checked={!!dashboardVisibility?.showDashboardOverview}
                            onChange={(e) => setDashboardVisibility(prev => ({ ...prev, showDashboardOverview: e.target.checked }))}
                            className="accent-cyan-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs text-orange-400 font-bold flex items-center gap-1.5">
                              ★ Show Dashboard Overview
                            </span>
                            <span className="text-[9px] text-slate-500 block mt-0.5">
                              Controls metrics, balances & active reports. Turn it on to make dashboard overview stats visible, or turn it off to hide/restrict access.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configurable Meal Type System */}
                {[UserRole.ADMIN, UserRole.SUPERUSER].includes(currentUser.role) && (
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${
                    isDarkMode ? "bg-slate-900/40 border-cyan-500/10" : "bg-white border-slate-200 shadow-sm"
                  }`}>
                    <h3 className="text-sm font-bold font-display text-cyan-300 mb-3">Meal Type Configuration</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Configure active meal schedules. Enabled meals will appear in meal entries, calculations, reports, and calendars.
                    </p>

                    <div className="space-y-4">
                      {mealTypes.map((mealType) => (
                        <div key={mealType.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                          <div>
                            <span className="text-xs font-bold text-white block capitalize">{mealType.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {mealType.id === "breakfast" ? "Configurable breakfast meal session." : `Standard system ${mealType.name.toLowerCase()} session.`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {mealType.id === "breakfast" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = mealTypes.map((t) =>
                                    t.id === mealType.id ? { ...t, enabled: !t.enabled } : t
                                  );
                                  setMealTypes(updated);
                                  handleUpdateSettings({ mealTypes: updated });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  mealType.enabled
                                    ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                              >
                                {mealType.enabled ? "Enabled" : "Disabled"}
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                                Always Enabled
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
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

                {currentUser.email.toLowerCase() === "mdshahriarhimel@gmail.com" && (
                  <AdminControlsPanel
                    messes={messes}
                    sessionToken={sessionToken || ""}
                    isDarkMode={isDarkMode}
                  />
                )}

              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
