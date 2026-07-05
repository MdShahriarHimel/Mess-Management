/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Home, Users, Coffee, Sparkles, ShoppingCart, DollarSign, 
  FileSpreadsheet, Bell, Shield, Settings, Sun, Moon, LogOut, Menu, X, Calendar, Download, RefreshCw, Trash2, Plus, Upload, Vote, Award
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
import Democracy from "./components/Democracy.tsx";

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

export function ColorPalettePicker({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (color: string) => void; 
}) {
  const activeHex = value ? (value.startsWith("#") ? value.slice(0, 7).toLowerCase() : "#ffffff") : "#ffffff";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
        {COLOR_PALETTES.map((color) => {
          const isSelected = activeHex === color.hex.toLowerCase();
          return (
            <button
              key={color.hex}
              type="button"
              onClick={() => onChange(color.hex)}
              title={color.name}
              className={`w-5 h-5 rounded-full border cursor-pointer transition-all hover:scale-110 active:scale-95 ${
                isSelected ? "border-white ring-2 ring-cyan-500/50 scale-105" : "border-transparent"
              }`}
              style={{ backgroundColor: color.hex }}
            />
          );
        })}
      </div>
      <span className="text-[9px] text-slate-500 font-medium block italic">
        Selected: {COLOR_PALETTES.find(c => c.hex.toLowerCase() === activeHex)?.name || "Custom Palette"} ({activeHex})
      </span>
    </div>
  );
}

const AmbientAnimationOverlay = ({ 
  animations 
}: { 
  animations: { 
    enableEffect: boolean; 
    effectType: string; 
    animationSpeed: string;
    backgroundTheme?: string;
    customBackgroundUrl?: string;
    backgroundOpacity?: number;
    interactiveBubbles?: boolean;
  } 
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
          ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
          ctx.shadowBlur = 4;
          ctx.shadowColor = "#ffffff";
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
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();

          // Highlight shine inside bubble
          ctx.beginPath();
          ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
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
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.shadowBlur = 3;
          ctx.shadowColor = "#ffffff";
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
          color: "rgba(234, 179, 8, 0.7)" // Cozy warm yellow
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
          ctx.shadowColor = "rgba(234, 179, 8, 0.9)";
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
        ctx.strokeStyle = "rgba(14, 165, 233, 0.7)";
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
    backgroundOpacity: 20
  });

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
          if (s.loginCustomization) setLoginCustomization(s.loginCustomization);
          if (s.homeCustomization) setHomeCustomization(s.homeCustomization);
          if (s.enableManagerRating !== undefined) setEnableManagerRating(s.enableManagerRating);
          if (s.balanceSheetGlow !== undefined) setBalanceSheetGlow(s.balanceSheetGlow);
          if (s.roleAnimations !== undefined) setRoleAnimations(s.roleAnimations);
          if (s.adminVisibility !== undefined) setAdminVisibility(s.adminVisibility);
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
      fetchElections(sessionToken);
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
    if (item.id === "meals" && dashboardVisibility && !dashboardVisibility.showMealTracker) return false;
    if (item.id === "menu" && dashboardVisibility && !dashboardVisibility.showFoodMenu) return false;
    if (item.id === "notices" && dashboardVisibility && !dashboardVisibility.showNotices) return false;
    return true;
  });

  const getThemeBgStyle = () => {
    const theme = messAnimations?.backgroundTheme || "default";
    const customUrl = messAnimations?.customBackgroundUrl || "";
    const opacity = (messAnimations?.backgroundOpacity ?? 20) / 100;

    if (theme === "custom" && customUrl) {
      return {
        backgroundImage: `linear-gradient(rgba(10, 15, 30, ${1 - opacity}), rgba(10, 15, 30, ${1 - opacity})), url("${customUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat"
      };
    }

    if (theme === "cosmic-void") {
      return {
        background: "radial-gradient(circle at 50% 50%, #1e1b4b 0%, #090514 70%, #020005 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "midnight-nebula") {
      return {
        background: "linear-gradient(135deg, #020617 0%, #1e1b4b 30%, #581c87 60%, #4a044e 85%, #020617 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "cyberpunk-grid") {
      return {
        background: "#030008",
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
        background: "linear-gradient(135deg, #180020 0%, #3b0764 40%, #701a75 70%, #9a3412 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "ocean-depth") {
      return {
        background: "linear-gradient(180deg, #022c22 0%, #042f2e 30%, #115e59 70%, #064e3b 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "forest-whisper") {
      return {
        background: "linear-gradient(135deg, #022c22 0%, #064e3b 40%, #14532d 80%, #052e16 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "aurora-borealis") {
      return {
        background: "linear-gradient(135deg, #020617 0%, #043530 30%, #0f172a 60%, #1e1b4b 80%, #020617 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "neon-shallows") {
      return {
        background: "linear-gradient(135deg, #020617 0%, #064e3b 25%, #4c0519 75%, #020617 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "sahara-sand") {
      return {
        background: "linear-gradient(135deg, #0f0502 0%, #2a0800 35%, #451a03 70%, #170500 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "deep-space") {
      return {
        background: "radial-gradient(circle at 30% 20%, #030712 0%, #09090b 60%, #020202 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "electric-indigo") {
      return {
        background: "linear-gradient(180deg, #03000a 0%, #050014 40%, #1e1b4b 80%, #03000a 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "magma-flow") {
      return {
        background: "linear-gradient(135deg, #000000 0%, #1c0202 40%, #450a0a 75%, #020000 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "cyber-emerald") {
      return {
        background: "#010502",
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
        background: "linear-gradient(135deg, #0a0104 0%, #20010c 35%, #4c051e 70%, #0a0104 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "ice-glacier") {
      return {
        background: "linear-gradient(135deg, #010a14 0%, #021a30 40%, #083344 80%, #010a14 100%)",
        backgroundAttachment: "fixed"
      };
    }
    if (theme === "bento-grid-dark") {
      return {
        background: "#09090b",
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
        background: "linear-gradient(135deg, #080200 0%, #240a00 35%, #431407 75%, #080200 100%)",
        backgroundAttachment: "fixed"
      };
    }

    return {};
  };

  return (
    <div 
      style={getThemeBgStyle()}
      className={`min-h-screen transition-all duration-300 flex flex-col md:flex-row ${
        isDarkMode && (!messAnimations?.backgroundTheme || messAnimations?.backgroundTheme === "default") 
          ? "bg-slate-950 text-white font-sans" 
          : !isDarkMode && (!messAnimations?.backgroundTheme || messAnimations?.backgroundTheme === "default")
            ? "bg-slate-50 text-slate-800 font-sans light-mode-root"
            : "text-white font-sans" // Force elegant high-contrast dark style text if immersive themes are active
      } ${!isDarkMode ? "light-mode-root" : ""}`}
    >
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
          --custom-typography-highlight: ${customColors?.typographyHighlightRgb || "#67e8f9"};
          --custom-layout-scale-color: ${customColors?.layoutScaleColorRgb || "#a78bfa"};
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
        ${fontStyle === "custom" ? `
          h1, h2, h3, h4, .font-display, .text-cyan-300, .text-cyan-400 {
            color: ${customColors?.typographyHighlightRgb || "#67e8f9"} !important;
          }
        ` : ""}
        .scale-indicator-dot {
          background-color: ${customColors?.layoutScaleColorRgb || "#a78bfa"} !important;
        }
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
                {new Date().toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {selectedMonth?.name || "July 2026"} 
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
              homeCustomization={homeCustomization}
              elections={elections}
              membersListProp={membersList}
              showResultsInDashboard={showResultsInDashboard}
              enableManagerRating={enableManagerRating}
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
              balanceSheetGlow={balanceSheetGlow}
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

                {/* Visual UI Customizer */}
                {currentUser.role === UserRole.ADMIN && (
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
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cash Deposit Border</label>
                            <ColorPalettePicker
                              value={customColors?.cashDepositBorder || "#ea580c"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, cashDepositBorder: color }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Settlement Sheet Bg</label>
                            <ColorPalettePicker
                              value={customColors?.settlementBg || "#16a34a"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, settlementBg: color + "1a" }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Settlement Sheet Border</label>
                            <ColorPalettePicker
                              value={customColors?.settlementBorder || "#16a34a"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, settlementBorder: color }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sidebar Background</label>
                            <ColorPalettePicker
                              value={customColors?.sidebarBg || "#0f172a"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, sidebarBg: color }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Header Background</label>
                            <ColorPalettePicker
                              value={customColors?.headerBg || "#0f172a"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, headerBg: color }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Card Background</label>
                            <ColorPalettePicker
                              value={customColors?.cardBg || "#1e293b"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, cardBg: color }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Accent Glow Color</label>
                            <ColorPalettePicker
                              value={customColors?.accentColor || "#22d3ee"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, accentColor: color }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Site Accent Color Palette</label>
                            <ColorPalettePicker
                              value={customColors?.siteAccentColorRgb || "#22d3ee"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, siteAccentColorRgb: color }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Typography Highlight Palette</label>
                            <ColorPalettePicker
                              value={customColors?.typographyHighlightRgb || "#67e8f9"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, typographyHighlightRgb: color }))}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Layout Scale Color Palette</label>
                            <ColorPalettePicker
                              value={customColors?.layoutScaleColorRgb || "#a78bfa"}
                              onChange={(color) => setCustomColors(prev => ({ ...prev, layoutScaleColorRgb: color }))}
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

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 block uppercase font-display">Background Theme</label>
                              <select
                                value={messAnimations?.backgroundTheme || "default"}
                                onChange={(e) => setMessAnimations(prev => ({ ...prev, backgroundTheme: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                              >
                                <option value="default">Default (Standard Slate)</option>
                                <option value="cosmic-void">Cosmic Void (Deep Purple)</option>
                                <option value="midnight-nebula">Midnight Nebula (Nebulous violet)</option>
                                <option value="cyberpunk-grid">Cyberpunk Neon Grid (Techno)</option>
                                <option value="sunset-glow">Sunset Velvet (Warm Amber)</option>
                                <option value="ocean-depth">Ocean Depths (Teal Marine)</option>
                                <option value="forest-whisper">Forest Whisper (Cozy Evergreen)</option>
                                <option value="aurora-borealis">Aurora Lights (Boreal Glow)</option>
                                <option value="neon-shallows">Retro Neon Shallows (Cyan-Pink Glow)</option>
                                <option value="sahara-sand">Sahara Dune Dust (Warm Gold)</option>
                                <option value="deep-space">Deep Space Eclipse (Pure Obsidian)</option>
                                <option value="electric-indigo">Electric Indigo Wave (Cobalt)</option>
                                <option value="magma-flow">Volcanic Magma Flow (Molten Crimson)</option>
                                <option value="cyber-emerald">Matrix Green Cyber (Emerald Grid)</option>
                                <option value="sakura-blossom">Sakura Blossom Garden (Pastel Pink)</option>
                                <option value="ice-glacier">Arctic Glacier Shelf (Cyan Ice)</option>
                                <option value="bento-grid-dark">Monochrome Bento Grid (Minimal Carbon)</option>
                                <option value="solar-storm">Solar Storm Flares (Solar Amber)</option>
                                <option value="custom">Custom Image Background URL</option>
                              </select>
                            </div>

                            <div className="space-y-1 col-span-1 sm:col-span-2">
                              {messAnimations?.backgroundTheme === "custom" ? (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-display">Custom Image URL</label>
                                  <input
                                    type="text"
                                    placeholder="https://images.unsplash.com/... or relative path"
                                    value={messAnimations?.customBackgroundUrl || ""}
                                    onChange={(e) => setMessAnimations(prev => ({ ...prev, customBackgroundUrl: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-1 opacity-40">
                                  <label className="text-[10px] font-bold text-slate-500 block uppercase font-display">Custom Image URL (Disabled)</label>
                                  <input
                                    type="text"
                                    disabled
                                    placeholder="Select Custom Background Theme to edit"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-900 text-xs text-slate-600 cursor-not-allowed focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
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
