/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

export interface ModeContrastPalette {
  cardBg: string;
  cardText: string;
  secondaryText: string;
  headingText: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  paidBadgeBg: string;
  paidBadgeText: string;
  unpaidBadgeBg: string;
  unpaidBadgeText: string;
}

export interface CachedThemeContrastEntry {
  themeId: string;
  signature: string;
  dark: ModeContrastPalette;
  light: ModeContrastPalette;
  source: "GEMINI_AI" | "WCAG_ENGINE";
  modelUsed?: string;
  updatedAt: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API ||
    process.env.GEMEINI_API_KEY ||
    process.env.GEMEINI_API ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function parseRgb(colorStr: string, fallback: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  if (!colorStr || typeof colorStr !== "string") return fallback;
  const s = colorStr.trim();
  if (s.startsWith("rgb")) {
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) {
      return {
        r: Math.min(255, Math.max(0, parseInt(m[1], 10))),
        g: Math.min(255, Math.max(0, parseInt(m[2], 10))),
        b: Math.min(255, Math.max(0, parseInt(m[3], 10))),
      };
    }
  }
  let hex = s.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length >= 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  return fallback;
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixRgb(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  ratio: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * ratio),
    g: Math.round(c1.g + (c2.g - c1.g) * ratio),
    b: Math.round(c1.b + (c2.b - c1.b) * ratio),
  };
}

export function buildDeterministicWcagPalettes(
  customColors: Record<string, any> = {}
): { dark: ModeContrastPalette; light: ModeContrastPalette } {
  const accentRgb = parseRgb(customColors.accentColor || "#22d3ee", { r: 34, g: 211, b: 238 });
  const rawCardRgb = parseRgb(customColors.cardBg || "#0f172a", { r: 15, g: 23, b: 42 });

  // Dark surface: ensure deep rich background (luminance <= 0.06)
  const darkSurfaceRgb =
    relativeLuminance(rawCardRgb) > 0.08
      ? mixRgb(rawCardRgb, { r: 11, g: 17, b: 32 }, 0.82)
      : rawCardRgb;
  const darkInputRgb = mixRgb(darkSurfaceRgb, { r: 7, g: 11, b: 22 }, 0.55);
  const darkBorderRgb = mixRgb(accentRgb, { r: 100, g: 116, b: 139 }, 0.45);
  const darkHeadingRgb = mixRgb(accentRgb, { r: 255, g: 255, b: 255 }, 0.35);
  const darkPlaceholderRgb = mixRgb(accentRgb, { r: 226, g: 232, b: 240 }, 0.55);

  // Light surface: ensure crisp bright background (luminance >= 0.85)
  const lightSurfaceRgb =
    relativeLuminance(rawCardRgb) < 0.75
      ? mixRgb(rawCardRgb, { r: 255, g: 255, b: 255 }, 0.94)
      : rawCardRgb;
  const lightBorderRgb = mixRgb(accentRgb, { r: 71, g: 85, b: 105 }, 0.65);
  const lightHeadingRgb = mixRgb(accentRgb, { r: 15, g: 23, b: 42 }, 0.68);

  return {
    dark: {
      cardBg: toHex(darkSurfaceRgb),
      cardText: "#f8fafc",
      secondaryText: "#cbd5e1",
      headingText: toHex(darkHeadingRgb),
      inputBg: toHex(darkInputRgb),
      inputBorder: toHex(darkBorderRgb),
      inputText: "#ffffff",
      inputPlaceholder: toHex(darkPlaceholderRgb),
      tableHeaderBg: toHex(mixRgb(darkSurfaceRgb, { r: 2, g: 6, b: 23 }, 0.6)),
      tableHeaderText: "#f1f5f9",
      paidBadgeBg: "#064e3b",
      paidBadgeText: "#a7f3d0",
      unpaidBadgeBg: "#881337",
      unpaidBadgeText: "#fecdd3",
    },
    light: {
      cardBg: toHex(lightSurfaceRgb),
      cardText: "#0f172a",
      secondaryText: "#334155",
      headingText: toHex(lightHeadingRgb),
      inputBg: "#ffffff",
      inputBorder: toHex(lightBorderRgb),
      inputText: "#0f172a",
      inputPlaceholder: "#334155",
      tableHeaderBg: "#f1f5f9",
      tableHeaderText: "#0f172a",
      paidBadgeBg: "#d1fae5",
      paidBadgeText: "#065f46",
      unpaidBadgeBg: "#ffe4e6",
      unpaidBadgeText: "#9f1239",
    },
  };
}

function enforceWcagSafety(
  candidate: Partial<ModeContrastPalette> | undefined,
  fallback: ModeContrastPalette,
  mode: "dark" | "light"
): ModeContrastPalette {
  if (!candidate) return fallback;

  const merged: ModeContrastPalette = {
    cardBg: candidate.cardBg || fallback.cardBg,
    cardText: candidate.cardText || fallback.cardText,
    secondaryText: candidate.secondaryText || fallback.secondaryText,
    headingText: candidate.headingText || fallback.headingText,
    inputBg: candidate.inputBg || fallback.inputBg,
    inputBorder: candidate.inputBorder || fallback.inputBorder,
    inputText: candidate.inputText || fallback.inputText,
    inputPlaceholder: candidate.inputPlaceholder || fallback.inputPlaceholder,
    tableHeaderBg: candidate.tableHeaderBg || fallback.tableHeaderBg,
    tableHeaderText: candidate.tableHeaderText || fallback.tableHeaderText,
    paidBadgeBg: candidate.paidBadgeBg || fallback.paidBadgeBg,
    paidBadgeText: candidate.paidBadgeText || fallback.paidBadgeText,
    unpaidBadgeBg: candidate.unpaidBadgeBg || fallback.unpaidBadgeBg,
    unpaidBadgeText: candidate.unpaidBadgeText || fallback.unpaidBadgeText,
  };

  const defaultBg = parseRgb(fallback.cardBg, mode === "dark" ? { r: 15, g: 23, b: 42 } : { r: 255, g: 255, b: 255 });
  let cardBgRgb = parseRgb(merged.cardBg, defaultBg);
  const cardLum = relativeLuminance(cardBgRgb);

  if (mode === "dark" && cardLum > 0.14) {
    cardBgRgb = parseRgb(fallback.cardBg, { r: 15, g: 23, b: 42 });
  } else if (mode === "light" && cardLum < 0.72) {
    cardBgRgb = parseRgb(fallback.cardBg, { r: 255, g: 255, b: 255 });
  }
  merged.cardBg = toHex(cardBgRgb);

  let inputBgRgb = parseRgb(merged.inputBg, parseRgb(fallback.inputBg, defaultBg));
  const inputLum = relativeLuminance(inputBgRgb);
  if (mode === "dark" && inputLum > 0.12) {
    inputBgRgb = parseRgb(fallback.inputBg, { r: 15, g: 23, b: 42 });
  } else if (mode === "light" && inputLum < 0.8) {
    inputBgRgb = { r: 255, g: 255, b: 255 };
  }
  merged.inputBg = toHex(inputBgRgb);

  const ensureTextContrast = (textHex: string, bgRgb: { r: number; g: number; b: number }, minRatio: number, fbHex: string): string => {
    const tRgb = parseRgb(textHex, parseRgb(fbHex, { r: 255, g: 255, b: 255 }));
    if (contrastRatio(tRgb, bgRgb) >= minRatio) {
      return toHex(tRgb);
    }
    return fbHex;
  };

  merged.cardText = ensureTextContrast(merged.cardText, cardBgRgb, 7.0, fallback.cardText);
  merged.secondaryText = ensureTextContrast(merged.secondaryText, cardBgRgb, 4.5, fallback.secondaryText);
  merged.headingText = ensureTextContrast(merged.headingText, cardBgRgb, 4.5, fallback.headingText);
  merged.inputText = ensureTextContrast(merged.inputText, inputBgRgb, 7.0, fallback.inputText);
  merged.inputPlaceholder = ensureTextContrast(merged.inputPlaceholder, inputBgRgb, 4.5, fallback.inputPlaceholder);

  const borderRgb = parseRgb(merged.inputBorder, parseRgb(fallback.inputBorder, { r: 100, g: 116, b: 139 }));
  merged.inputBorder = contrastRatio(borderRgb, cardBgRgb) >= 1.6 ? toHex(borderRgb) : fallback.inputBorder;

  return merged;
}

export function computeThemeSignature(themeId: string, customColors: Record<string, any> = {}): string {
  const accent = String(customColors.accentColor || "#22d3ee").trim().toLowerCase();
  const card = String(customColors.cardBg || "").trim().toLowerCase();
  const sidebar = String(customColors.sidebarBg || "").trim().toLowerCase();
  return `${themeId || "default-erp"}::${accent}::${card}::${sidebar}`;
}

export async function generateOrResolveThemeContrast(
  themeId: string,
  themeName: string,
  customColors: Record<string, any> = {}
): Promise<CachedThemeContrastEntry> {
  const signature = computeThemeSignature(themeId, customColors);
  const wcagFallback = buildDeterministicWcagPalettes(customColors);
  const ai = getGeminiClient();

  if (!ai) {
    return {
      themeId,
      signature,
      dark: wcagFallback.dark,
      light: wcagFallback.light,
      source: "WCAG_ENGINE",
      updatedAt: new Date().toISOString(),
    };
  }

  const paletteSchema = {
    type: Type.OBJECT,
    properties: {
      cardBg: { type: Type.STRING, description: "6-digit hex color for card background" },
      cardText: { type: Type.STRING, description: "6-digit hex color for primary text (>= 7:1 contrast against cardBg)" },
      secondaryText: { type: Type.STRING, description: "6-digit hex color for secondary text (>= 4.5:1 contrast against cardBg)" },
      headingText: { type: Type.STRING, description: "6-digit hex color for headings (>= 4.5:1 contrast against cardBg)" },
      inputBg: { type: Type.STRING, description: "6-digit hex color for input field background (dark in dark mode, white/light in light mode)" },
      inputBorder: { type: Type.STRING, description: "6-digit hex color for input border" },
      inputText: { type: Type.STRING, description: "6-digit hex color for input typed value (>= 7:1 contrast against inputBg)" },
      inputPlaceholder: { type: Type.STRING, description: "6-digit hex color for input placeholder numbers (>= 4.5:1 contrast against inputBg)" },
      tableHeaderBg: { type: Type.STRING, description: "6-digit hex color for table header background" },
      tableHeaderText: { type: Type.STRING, description: "6-digit hex color for table header text" },
      paidBadgeBg: { type: Type.STRING, description: "6-digit hex color for PAID status badge background" },
      paidBadgeText: { type: Type.STRING, description: "6-digit hex color for PAID status badge text" },
      unpaidBadgeBg: { type: Type.STRING, description: "6-digit hex color for UNPAID status badge background" },
      unpaidBadgeText: { type: Type.STRING, description: "6-digit hex color for UNPAID status badge text" },
    },
    required: [
      "cardBg",
      "cardText",
      "secondaryText",
      "headingText",
      "inputBg",
      "inputBorder",
      "inputText",
      "inputPlaceholder",
      "tableHeaderBg",
      "tableHeaderText",
      "paidBadgeBg",
      "paidBadgeText",
      "unpaidBadgeBg",
      "unpaidBadgeText",
    ],
  };

  const prompt = `Generate WCAG AAA/AA compliant high-contrast 6-digit #RRGGBB color palettes for BOTH Dark Mode and Light Mode for an ERP financial settlement & meal management dashboard.
Theme ID: "${themeId}"
Theme Name: "${themeName || themeId}"
Base Accent Color: "${customColors.accentColor || "#22d3ee"}"
Base Card Background: "${customColors.cardBg || "#0f172a"}"
Base Sidebar Background: "${customColors.sidebarBg || "#0f172a"}"

Strict Rules:
1. In "dark" mode: inputBg and cardBg MUST be deep dark colors (never white or light gray), while inputText, inputPlaceholder, and cardText MUST be crisp bright colors so numbers like 0, 1450, 1989 inside input boxes are 100% readable.
2. In "light" mode: inputBg and cardBg MUST be clean light/white colors, while inputText, inputPlaceholder, and cardText MUST be deep dark colors (#0f172a / #1e293b) so numbers and labels are razor-sharp.
3. Return only 6-digit hex codes (#RRGGBB).`;

  const candidateModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          ...(modelName === "gemini-4-hydrogen"
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dark: paletteSchema,
              light: paletteSchema,
            },
            required: ["dark", "light"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);

      return {
        themeId,
        signature,
        dark: enforceWcagSafety(parsed.dark, wcagFallback.dark, "dark"),
        light: enforceWcagSafety(parsed.light, wcagFallback.light, "light"),
        source: "GEMINI_AI",
        modelUsed: modelName,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`[ThemeContrastAI] Model ${modelName} failed, trying fallback:`, (err as any)?.message || err);
    }
  }

  return {
    themeId,
    signature,
    dark: wcagFallback.dark,
    light: wcagFallback.light,
    source: "WCAG_ENGINE",
    updatedAt: new Date().toISOString(),
  };
}
