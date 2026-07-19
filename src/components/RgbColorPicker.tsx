import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, Pipette, RefreshCw, ChevronDown } from "lucide-react";

// Color helper conversions
export function hexToRgb(hex: string) {
  let cleaned = hex.replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r: number, g: number, b: number) {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const rh = clamp(r).toString(16).padStart(2, "0");
  const gh = clamp(g).toString(16).padStart(2, "0");
  const bh = clamp(b).toString(16).padStart(2, "0");
  return `#${rh}${gh}${bh}`.toLowerCase();
}

export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function hslToRgb(h: number, s: number, l: number) {
  h /= 360; s /= 100; l /= 100;
  let r = l, g = l, b = l;
  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function hslToHsv(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return {
    h,
    s: Math.round(sv * 100),
    v: Math.round(v * 100)
  };
}

export function hsvToHsl(h: number, s: number, v: number) {
  s /= 100;
  v /= 100;
  const l = v * (1 - s / 2);
  const sl = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l);
  return {
    h,
    s: Math.round(sl * 100),
    l: Math.round(l * 100)
  };
}

export function hsvToRgb(h: number, s: number, v: number) {
  s /= 100;
  v /= 100;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function rgbToOklch(r: number, g: number, b: number) {
  let lr = r / 255;
  let lg = g / 255;
  let lb = b / 255;
  
  lr = lr > 0.04045 ? Math.pow((lr + 0.055) / 1.055, 2.4) : lr / 12.92;
  lg = lg > 0.04045 ? Math.pow((lg + 0.055) / 1.055, 2.4) : lg / 12.92;
  lb = lb > 0.04045 ? Math.pow((lb + 0.055) / 1.055, 2.4) : lb / 12.92;
  
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  
  const l_cube = Math.cbrt(l_);
  const m_cube = Math.cbrt(m_);
  const s_cube = Math.cbrt(s_);
  
  const L = 0.2104542553 * l_cube + 0.7936177850 * m_cube - 0.0040720468 * s_cube;
  const a = 1.9779984951 * l_cube - 2.4285922050 * m_cube + 0.4505937099 * s_cube;
  const b_coord = 0.0259040371 * l_cube + 0.7827717662 * m_cube - 0.8086757660 * s_cube;
  
  const C = Math.sqrt(a * a + b_coord * b_coord);
  let h = Math.atan2(b_coord, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  
  return {
    l: parseFloat(L.toFixed(2)),
    c: parseFloat(C.toFixed(2)),
    h: Math.round(h)
  };
}

export function getColorHarmonies(h: number, s: number, l: number, type: string) {
  const angles: number[] = [];
  switch (type) {
    case "Analogous":
      angles.push(-30, 0, 30);
      break;
    case "Complementary":
      angles.push(0, 180);
      break;
    case "Double Split Complementary":
      angles.push(0, 30, 150, 180, 210);
      break;
    case "Rectangle":
      angles.push(0, 60, 180, 240);
      break;
    case "Split Complementary":
      angles.push(0, 150, 210);
      break;
    case "Tetradic":
      angles.push(0, 90, 180, 270);
      break;
    case "Triadic":
      angles.push(0, 120, 240);
      break;
    default:
      angles.push(0);
  }

  return angles.map((angle) => {
    const nextH = (h + angle + 360) % 360;
    const rgb = hslToRgb(nextH, s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    return { h: nextH, s, l, hex };
  });
}

// Generates shading values of a color (light to dark)
export function getColorShades(h: number, s: number) {
  const shades = [];
  for (let l = 10; l <= 90; l += 10) {
    const rgb = hslToRgb(h, s, l);
    shades.push(rgbToHex(rgb.r, rgb.g, rgb.b));
  }
  return shades;
}

interface RgbColorPickerProps {
  value: string; // HEX string like "#22d3ee" (optionally with trailing alpha, which we clean)
  onChange: (color: string) => void;
  isDarkMode?: boolean;
}

export default function RgbColorPicker({ value, onChange, isDarkMode = true }: RgbColorPickerProps) {
  // Ensure we operate on a valid clean 6-digit hex string
  const cleanHex = (val: string) => {
    let clean = val ? val.trim() : "#22d3ee";
    if (!clean.startsWith("#")) clean = "#" + clean;
    // Strip trailing opacity characters if it is an 8-char hex (e.g. #ea580c1a)
    if (clean.length > 7) {
      clean = clean.slice(0, 7);
    }
    return clean;
  };

  const initialHex = cleanHex(value);
  const rgb = hexToRgb(initialHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const initialHsv = hslToHsv(hsl.h, hsl.s, hsl.l);

  const [hsv, setHsv] = useState(initialHsv);
  const [copied, setCopied] = useState(false);
  const [formatType, setFormatType] = useState<"Hex" | "RGB" | "HSL" | "OKLCH">("Hex");
  const [harmonyType, setHarmonyType] = useState<string>("Analogous");

  const spectrumRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);

  const isSpectrumDragging = useRef(false);
  const isHueDragging = useRef(false);

  // Sync state if external value changes (and not currently dragging)
  useEffect(() => {
    const nextHex = cleanHex(value);
    const curRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const currHex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);
    if (nextHex !== currHex) {
      const nextRgb = hexToRgb(nextHex);
      const nextHsl = rgbToHsl(nextRgb.r, nextRgb.g, nextRgb.b);
      setHsv(hslToHsv(nextHsl.h, nextHsl.s, nextHsl.l));
    }
  }, [value]);

  // Derived properties
  const activeRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const activeHex = rgbToHex(activeRgb.r, activeRgb.g, activeRgb.b);
  const activeHsl = rgbToHsl(activeRgb.r, activeRgb.g, activeRgb.b);
  const activeOklch = rgbToOklch(activeRgb.r, activeRgb.g, activeRgb.b);
  const activeShades = getColorShades(activeHsl.h, activeHsl.s);
  const activeHarmonies = getColorHarmonies(activeHsl.h, activeHsl.s, activeHsl.l, harmonyType);

  // Call onChange with new HEX code
  const updateColor = (newHsv: typeof hsv) => {
    setHsv(newHsv);
    const calculatedRgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    const calculatedHex = rgbToHex(calculatedRgb.r, calculatedRgb.g, calculatedRgb.b);
    onChange(calculatedHex);
  };

  // Drag handlers for 2D Color Spectrum Box
  const handleSpectrumMove = (clientX: number, clientY: number) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    
    // Saturation is X (0 - 100%)
    // Value is 100% - Y (0 - 100%)
    updateColor({
      ...hsv,
      s: Math.round(x * 100),
      v: Math.round((1 - y) * 100)
    });
  };

  const handleSpectrumMouseDown = (e: React.MouseEvent) => {
    isSpectrumDragging.current = true;
    handleSpectrumMove(e.clientX, e.clientY);
    document.addEventListener("mousemove", handleSpectrumMouseMove);
    document.addEventListener("mouseup", handleSpectrumMouseUp);
  };

  const handleSpectrumMouseMove = (e: MouseEvent) => {
    if (!isSpectrumDragging.current) return;
    handleSpectrumMove(e.clientX, e.clientY);
  };

  const handleSpectrumMouseUp = () => {
    isSpectrumDragging.current = false;
    document.removeEventListener("mousemove", handleSpectrumMouseMove);
    document.removeEventListener("mouseup", handleSpectrumMouseUp);
  };

  // Drag handlers for Hue Slider
  const handleHueMove = (clientX: number) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    updateColor({
      ...hsv,
      h: Math.round(x * 360)
    });
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    isHueDragging.current = true;
    handleHueMove(e.clientX);
    document.addEventListener("mousemove", handleHueMouseMove);
    document.addEventListener("mouseup", handleHueMouseUp);
  };

  const handleHueMouseMove = (e: MouseEvent) => {
    if (!isHueDragging.current) return;
    handleHueMove(e.clientX);
  };

  const handleHueMouseUp = () => {
    isHueDragging.current = false;
    document.removeEventListener("mousemove", handleHueMouseMove);
    document.removeEventListener("mouseup", handleHueMouseUp);
  };

  // Touch support
  const handleSpectrumTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    isSpectrumDragging.current = true;
    handleSpectrumMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleSpectrumTouchMove = (e: React.TouchEvent) => {
    if (!isSpectrumDragging.current || e.touches.length === 0) return;
    handleSpectrumMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleHueTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    isHueDragging.current = true;
    handleHueMove(e.touches[0].clientX);
  };

  const handleHueTouchMove = (e: React.TouchEvent) => {
    if (!isHueDragging.current || e.touches.length === 0) return;
    handleHueMove(e.touches[0].clientX);
  };

  // Copies the formatting value to clipboard
  const handleCopyColor = () => {
    let copyText = activeHex;
    if (formatType === "RGB") copyText = `rgb(${activeRgb.r}, ${activeRgb.g}, ${activeRgb.b})`;
    if (formatType === "HSL") copyText = `hsl(${activeHsl.h}, ${activeHsl.s}%, ${activeHsl.l}%)`;
    if (formatType === "OKLCH") copyText = `oklch(${activeOklch.l}, ${activeOklch.c}, ${activeOklch.h})`;

    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generates random color
  const handleRandomPalette = () => {
    const randomH = Math.floor(Math.random() * 360);
    const randomS = Math.floor(Math.random() * 50) + 50; // 50-100% saturation
    const randomV = Math.floor(Math.random() * 40) + 45; // 45-85% value (keeps it vivid)
    updateColor({ h: randomH, s: randomS, v: randomV });
  };

  // Exports color palette to clipboard
  const handleExportColors = () => {
    const exportText = `
Active Color: ${activeHex}
Harmony (${harmonyType}):
${activeHarmonies.map((h, i) => `  Color ${i+1}: ${h.hex}`).join("\n")}
Shading Palette:
${activeShades.map((s, i) => `  Shade ${i+1}: ${s}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(exportText);
    alert("Full color customization schema exported to clipboard!");
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isDarkMode 
        ? "bg-slate-900 border-slate-800 text-slate-100 shadow-2xl" 
        : "bg-white border-slate-200 text-slate-800 shadow-xl"
    } max-w-2xl w-full flex flex-col gap-4 font-sans select-none`}>
      
      {/* 1. TOP STATS BAR ROW */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3.5 ${
        isDarkMode ? "border-slate-800/80" : "border-slate-100"
      }`}>
        <div className="flex items-center gap-3">
          {/* Circular swatch preview */}
          <div 
            className="w-9 h-9 rounded-full shadow-inner border border-white/20 relative flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            style={{ backgroundColor: activeHex }}
            onClick={handleCopyColor}
            title="Click to copy color"
          >
            <Pipette size={14} className="text-white drop-shadow" />
          </div>

          {/* Formats info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] md:text-[11px] font-semibold text-slate-500 font-mono">
            <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
              Hex <strong className="font-extrabold text-cyan-400 font-mono">{activeHex.toUpperCase()}</strong>
            </span>
            <span>
              RGB <strong className="text-slate-400 font-mono">{activeRgb.r},{activeRgb.g},{activeRgb.b}</strong>
            </span>
            <span>
              HSL <strong className="text-slate-400 font-mono">{activeHsl.h},{activeHsl.s}%,{activeHsl.l}%</strong>
            </span>
            <span>
              OKLCH <strong className="text-slate-400 font-mono">{activeOklch.l},{activeOklch.c},{activeOklch.h}</strong>
            </span>
          </div>
        </div>

        {/* Shading Spectrum Strip */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-850 h-5 w-28 shrink-0 shadow-sm">
          {activeShades.map((shade, i) => (
            <div 
              key={shade}
              className="flex-1 cursor-pointer hover:scale-110 active:scale-90 transition-transform relative group"
              style={{ backgroundColor: shade }}
              onClick={() => {
                const rgbVal = hexToRgb(shade);
                const hslVal = rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b);
                updateColor(hslToHsv(hslVal.h, hslVal.s, hslVal.l));
              }}
              title={`Use shade ${i+1}: ${shade}`}
            >
              <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-1 py-0.5 rounded shadow whitespace-nowrap z-50">
                {shade}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. MAIN PANELS CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: SPECTRUM + HUE + HEX INPUT (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-3.5">
          {/* Saturation-Value Canvas Box */}
          <div 
            ref={spectrumRef}
            onMouseDown={handleSpectrumMouseDown}
            onTouchStart={handleSpectrumTouchStart}
            onTouchMove={handleSpectrumTouchMove}
            onTouchEnd={() => { isSpectrumDragging.current = false; }}
            className="w-full h-44 rounded-xl relative overflow-hidden cursor-crosshair shadow-md"
            style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
          >
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            
            {/* White Ring Marker */}
            <div 
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 translate-y-1/2"
              style={{ 
                left: `${hsv.s}%`, 
                bottom: `${hsv.v}%` 
              }}
            />
          </div>

          {/* Hue Rainbow Slider Row */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Hue Spectrum</span>
              <span className="text-cyan-400 font-mono">{hsv.h}°</span>
            </div>
            <div 
              ref={hueSliderRef}
              onMouseDown={handleHueMouseDown}
              onTouchStart={handleHueTouchStart}
              onTouchMove={handleHueTouchMove}
              onTouchEnd={() => { isHueDragging.current = false; }}
              className="w-full h-3 rounded-full relative cursor-ew-resize shadow-inner overflow-visible"
              style={{ 
                background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)" 
              }}
            >
              {/* Draggable Circle Handle */}
              <div 
                className="absolute w-4.5 h-4.5 bg-white rounded-full border border-slate-300 dark:border-slate-800 shadow-md top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${(hsv.h / 360) * 100}%` }}
              />
            </div>
          </div>

          {/* Formats Selector & Copy Hex section */}
          <div className="grid grid-cols-12 gap-2 items-center">
            {/* Tiny color swatch */}
            <div 
              className="col-span-2 h-9 rounded-lg border border-slate-300 dark:border-slate-800 shadow-sm"
              style={{ backgroundColor: activeHex }}
            />

            {/* Input area */}
            <div className="col-span-6 relative">
              <input 
                type="text"
                value={
                  formatType === "Hex" ? activeHex :
                  formatType === "RGB" ? `${activeRgb.r}, ${activeRgb.g}, ${activeRgb.b}` :
                  formatType === "HSL" ? `${activeHsl.h}, ${activeHsl.s}%, ${activeHsl.l}%` :
                  `${activeOklch.l}, ${activeOklch.c}, ${activeOklch.h}`
                }
                readOnly
                onClick={handleCopyColor}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 font-mono text-[10px] font-bold cursor-pointer hover:border-cyan-500 focus:outline-none text-slate-700 dark:text-slate-300"
              />
              <button 
                onClick={handleCopyColor}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Copy color"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>

            {/* Dropdown menu */}
            <div className="col-span-4 relative">
              <select
                value={formatType}
                onChange={(e) => setFormatType(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-[10px] uppercase text-slate-600 dark:text-slate-400 focus:outline-none appearance-none cursor-pointer pr-6"
              >
                <option value="Hex">Hex</option>
                <option value="RGB">RGB</option>
                <option value="HSL">HSL</option>
                <option value="OKLCH">OKLCH</option>
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Bottom actions */}
          <div className="flex gap-2 text-[10px] font-bold mt-1">
            <button
              onClick={handleRandomPalette}
              className="flex-1 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RefreshCw size={11} />
              Random Palette
            </button>
            <button
              onClick={handleExportColors}
              className="flex-1 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              Export Colors
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: HARMONIES + VERTICAL SWATCH (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-3">
          {/* Choose Harmony dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Choose Harmony...</label>
            <div className="relative">
              <select
                value={harmonyType}
                onChange={(e) => setHarmonyType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none appearance-none cursor-pointer pr-8"
              >
                <option value="Analogous">Analogous</option>
                <option value="Complementary">Complementary</option>
                <option value="Double Split Complementary">Double Split Complementary</option>
                <option value="Rectangle">Rectangle</option>
                <option value="Split Complementary">Split Complementary</option>
                <option value="Tetradic">Tetradic</option>
                <option value="Triadic">Triadic</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Swatches of Harmony */}
          <div className="grid grid-cols-5 gap-1 border-t dark:border-slate-800/60 pt-2.5">
            {activeHarmonies.map((harm, idx) => {
              const isCurrent = activeHex === harm.hex;
              return (
                <div 
                  key={idx}
                  onClick={() => {
                    const rgbVal = hexToRgb(harm.hex);
                    const hslVal = rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b);
                    updateColor(hslToHsv(hslVal.h, hslVal.s, hslVal.l));
                  }}
                  className={`h-11 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-end p-0.5 relative group border shadow-sm ${
                    isCurrent ? "border-cyan-400 ring-2 ring-cyan-500/20 scale-105" : "border-transparent"
                  }`}
                  style={{ backgroundColor: harm.hex }}
                  title={`Select ${harm.hex}`}
                >
                  <span className="bg-black/60 backdrop-blur-[2px] text-white text-[7px] font-mono font-bold rounded-sm px-0.5 scale-90 select-none pointer-events-none uppercase">
                    {harm.hex.slice(1, 4)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Color Block Banner */}
          <div 
            className="flex-grow rounded-xl relative overflow-hidden border border-white/15 min-h-[75px] shadow-lg flex items-end p-3 group"
            style={{ backgroundColor: activeHex }}
          >
            <div className="bg-black/40 backdrop-blur-[4px] p-2 rounded-lg text-white max-w-full font-mono text-[9px] font-bold select-all opacity-0 group-hover:opacity-100 transition-opacity">
              <span>OKLCH: {activeOklch.l}, {activeOklch.c}, {activeOklch.h}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
