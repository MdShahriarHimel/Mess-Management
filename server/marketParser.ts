/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { db } from "../src/db/index.js";
import { foodKnowledgeBase, foodAliases } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { generateUUID } from "./db.js";

// Initialize Gemini client on server
const ai = new GoogleGenAI({
  apiKey:
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API ||
    process.env.GEMEINI_API_KEY ||
    process.env.GEMEINI_API ||
    process.env.GOOGLE_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export interface ParsedVoucherItem {
  name: string;
  originalText: string;
  amount: number;
  emoji: string;
  category: string;
}

export interface VoucherBreakdownResponse {
  items: ParsedVoucherItem[];
  totalParsedAmount: number;
  unparsedText?: string;
  source: "DICTIONARY" | "GEMINI_AI" | "HYBRID";
}

// Canonical Food & Market Expense Dictionary with Emojis
interface CanonicalGrocery {
  id: string;
  label: string;
  category: string;
  emoji: string;
  aliases: string[];
}

export const CANONICAL_GROCERIES: CanonicalGrocery[] = [
  {
    id: "beef",
    label: "গরুর মাংস",
    category: "Meat",
    emoji: "🥩",
    aliases: ["goru", "guru", "gorur", "cow", "beef", "গরু", "গরুর", "বিফ", "গোশত", "রেড মিট"]
  },
  {
    id: "mutton",
    label: "খাসির মাংস",
    category: "Meat",
    emoji: "🍖",
    aliases: ["chagol", "sagol", "khasi", "khasir", "mutton", "goat", "ছাগল", "খাসি", "খাসির", "ছাগলের"]
  },
  {
    id: "chicken",
    label: "মুরগির মাংস",
    category: "Chicken",
    emoji: "🍗",
    aliases: ["murgi", "morgi", "chicken", "broiler", "sonali", "deshi murgi", "মুরগি", "মুরগী", "চিকেন", "ব্রয়লার", "সোনালী"]
  },
  {
    id: "shrimp",
    label: "চিংড়ি মাছ",
    category: "Fish",
    emoji: "🦐",
    aliases: ["chingri", "chingree", "chingri mach", "prawn", "shrimp", "চিংড়ি", "চিংড়ি", "চিংড়ী", "চিংড়ি মাছ"]
  },
  {
    id: "cauliflower",
    label: "ফুলকপি",
    category: "Vegetables",
    emoji: "🥦",
    aliases: ["fulkopi", "phulkopi", "ful kopi", "cauliflower", "ফুলকপি", "ফুল কপি", "কপি"]
  },
  {
    id: "red_amaranth",
    label: "লালশাক",
    category: "Vegetables",
    emoji: "🥬",
    aliases: ["lalshak", "lal shak", "lal saag", "লালশাক", "লাল শাক"]
  },
  {
    id: "eggplant",
    label: "বেগুন",
    category: "Vegetables",
    emoji: "🍆",
    aliases: ["begun", "brinjal", "eggplant", "aubergine", "বেগুন", "তাল বেগুন"]
  },
  {
    id: "fish",
    label: "মাছ",
    category: "Fish",
    emoji: "🐟",
    aliases: ["mach", "maach", "fish", "rui", "ilish", "katla", "pangas", "telapia", "shol", "koi", "মাছ", "রুই", "ইলিশ", "কাতলা", "পাঙ্গাস", "তেলাপিয়া"]
  },
  {
    id: "egg",
    label: "ডিম",
    category: "Eggs",
    emoji: "🥚",
    aliases: ["dim", "deem", "egg", "eggs", "anda", "ডিম", "আন্ডা", "হাঁসের ডিম"]
  },
  {
    id: "potato",
    label: "আলু",
    category: "Vegetables",
    emoji: "🥔",
    aliases: ["alu", "aloo", "potato", "potatoes", "আলু", "গোল আলু"]
  },
  {
    id: "onion",
    label: "পেঁয়াজ",
    category: "Vegetables",
    emoji: "🧅",
    aliases: ["peyaj", "peaj", "peyaj", "piyaj", "pyaj", "onion", "onions", "পেঁয়াজ", "পিঁয়াজ", "পিয়াজ"]
  },
  {
    id: "papaya",
    label: "পেঁপে",
    category: "Vegetables",
    emoji: "🍈",
    aliases: ["pepe", "pepey", "papaya", "pepeya", "পেঁপে", "পেপে", "কাঁচা পেঁপে"]
  },
  {
    id: "chili",
    label: "কাঁচামরিচ",
    category: "Vegetables",
    emoji: "🌶️",
    aliases: ["morich", "marich", "kacha morich", "chili", "chilli", "green chili", "কাঁচামরিচ", "মরিচ", "কাচামরিচ", "ঝাল"]
  },
  {
    id: "garlic",
    label: "রসুন",
    category: "Spices",
    emoji: "🧄",
    aliases: ["roshun", "roson", "garlic", "রসুন"]
  },
  {
    id: "ginger",
    label: "আদা",
    category: "Spices",
    emoji: "🫚",
    aliases: ["ada", "ginger", "আদা"]
  },
  {
    id: "oil",
    label: "ভোজ্যতেল",
    category: "Oil",
    emoji: "🛢️",
    aliases: ["tel", "teyl", "oil", "soyabean", "soyabean tel", "sorishar tel", "সয়াবিন তেল", "সয়াবিন", "তেল", "সরিষার তেল"]
  },
  {
    id: "lentil",
    label: "ডাল",
    category: "Lentils",
    emoji: "🥣",
    aliases: ["dal", "daal", "lentil", "lentils", "mosur dal", "mug dal", "ডাল", "মসুর ডাল", "মুগ ডাল", "খেসারি ডাল"]
  },
  {
    id: "rice",
    label: "চাল / ভাত",
    category: "Grains",
    emoji: "🍚",
    aliases: ["chal", "chaal", "rice", "bhat", "miniket", "najirshail", "চাল", "ভাত", "মিনিকেট", "নাজিরশাইল", "পোলাও চাল"]
  },
  {
    id: "spices",
    label: "মসলাপাতি",
    category: "Spices",
    emoji: "🧂",
    aliases: ["mosla", "masala", "spice", "spices", "holud", "jira", "dhonia", "lobon", "salt", "লবণ", "মসলা", "মশলা", "হলুদ", "জিরা", "ধনে গুঁড়া"]
  },
  {
    id: "vegetables",
    label: "শাকসবজি",
    category: "Vegetables",
    emoji: "🥬",
    aliases: ["sobji", "shobji", "shak", "saag", "vegetable", "vegetables", "lau", "potol", "dheros", "begun", "সবজি", "শাক", "লাউ", "পটল", "ঢেঁড়স", "বেগুন", "টমেটো", "ফুলকপি", "বাঁধাকপি"]
  },
  {
    id: "fare",
    label: "যাতায়াত ভাড়া",
    category: "Expense",
    emoji: "🛺",
    aliases: ["vara", "bhara", "rickshaw", "rikshaw", "gari", "fare", "transport", "auto", "bhadha", "ভাড়া", "ভাড়া", "রিকশা", "যাতায়াত", "গাড়ি ভাড়া", "ভ্যান ভাড়া"]
  },
  {
    id: "bread_biscuit",
    label: "রুটি / নাস্তা",
    category: "Bakery",
    emoji: "🍞",
    aliases: ["ruti", "bread", "biscuit", "toast", "cake", "nasta", "রুটি", "বিস্কুট", "পাউরুটি", "নাস্তা"]
  },
  {
    id: "dairy",
    label: "দুধ / দুগ্ধজাত",
    category: "Dairy",
    emoji: "🥛",
    aliases: ["dudh", "doodh", "milk", "doi", "দুধ", "দই"]
  },
  {
    id: "miscellaneous",
    label: "বিবিধ খরচ",
    category: "Other",
    emoji: "🛒",
    aliases: ["bibidh", "onnano", "other", "baki", "polythene", "bag", "বিবিধ", "অন্যান্য", "ব্যাগ", "পলিথিন"]
  }
];

// In-memory alias mapping cache: alias -> CanonicalGrocery
const aliasToGroceryMap = new Map<string, CanonicalGrocery>();
let isDictionaryInitialized = false;

// Synchronously populate built-in aliases immediately on startup
function populateBuiltinAliases() {
  for (const item of CANONICAL_GROCERIES) {
    aliasToGroceryMap.set(item.id.toLowerCase(), item);
    aliasToGroceryMap.set(item.label.toLowerCase(), item);
    for (const alias of item.aliases) {
      aliasToGroceryMap.set(alias.toLowerCase().trim(), item);
      const compacted = alias.replace(/\s+/g, "").toLowerCase().trim();
      if (compacted) aliasToGroceryMap.set(compacted, item);
    }
  }
}
populateBuiltinAliases();

// Memory cache for previously parsed voucher strings: text -> VoucherBreakdownResponse
const parsedVouchersCache = new Map<string, VoucherBreakdownResponse>();

/**
 * Initializes and syncs dictionary with PostgreSQL
 */
export async function ensureDictionaryInitialized(): Promise<void> {
  if (isDictionaryInitialized) return;
  populateBuiltinAliases();

  // Query PostgreSQL for any custom food aliases learned previously
  try {
    const customAliases = await db.select().from(foodAliases);
    const customFoods = await db.select().from(foodKnowledgeBase);
    const foodMap = new Map<string, any>();
    for (const f of customFoods) foodMap.set(f.id, f);

    for (const ca of customAliases) {
      const parentFood = foodMap.get(ca.foodId);
      if (parentFood) {
        const matchingCanonical = findCanonicalByQuery(parentFood.label) || {
          id: parentFood.id,
          label: parentFood.label,
          category: parentFood.category || "Grocery",
          emoji: (parentFood as any).emoji || "🛒",
          aliases: []
        };
        aliasToGroceryMap.set(ca.alias.toLowerCase().trim(), matchingCanonical);
      }
    }
    console.log(`[Market Parser] Food dictionary loaded with ${aliasToGroceryMap.size} aliases.`);
  } catch (err: any) {
    console.warn("[Market Parser] Notice: Could not read PostgreSQL custom aliases (using built-in dictionary):", err.message);
  }

  isDictionaryInitialized = true;
}

/**
 * Normalizes input text for fuzzy/phonetic matching
 */
function normalizeWord(word: string): string {
  if (!word) return "";
  let s = word.toLowerCase().trim();
  s = s.replace(/(?:taka|tk\.?|টাকা|টা|কেজি|গ্রাম|kg|gm|g)/gi, " ");
  s = s.replace(/[,\-:।+()=]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Finds a matching canonical grocery for a word or phrase, supporting compound matches
 */
export function findCanonicalByQuery(query: string): CanonicalGrocery | null {
  if (!query) return null;
  const clean = normalizeWord(query);
  if (!clean) return null;

  // Direct alias match
  if (aliasToGroceryMap.has(clean)) {
    return aliasToGroceryMap.get(clean)!;
  }

  // Token sub-phrase match
  const parts = clean.split(" ");
  for (const part of parts) {
    if (part.length >= 2 && aliasToGroceryMap.has(part)) {
      return aliasToGroceryMap.get(part)!;
    }
  }

  // Partial match across aliases
  for (const [alias, item] of aliasToGroceryMap.entries()) {
    if (alias.length >= 3 && (clean.includes(alias) || alias.includes(clean))) {
      return item;
    }
  }

  // Multi-word compound match (e.g. "আলু পেঁয়াজ", "পেঁপে কাঁচামরিচ")
  const matchedCanns: CanonicalGrocery[] = [];
  for (const item of CANONICAL_GROCERIES) {
    for (const al of item.aliases) {
      if (al.length >= 2 && clean.includes(al.toLowerCase())) {
        if (!matchedCanns.some(c => c.id === item.id)) {
          matchedCanns.push(item);
        }
        break;
      }
    }
  }

  if (matchedCanns.length > 0) {
    if (matchedCanns.length === 1) return matchedCanns[0];
    return {
      id: matchedCanns.map(c => c.id).join("_"),
      label: matchedCanns.map(c => c.label).join(" ও "),
      category: matchedCanns[0].category,
      emoji: matchedCanns.map(c => c.emoji).join(""),
      aliases: []
    };
  }

  return null;
}

/**
 * Persists a newly learned alias into PostgreSQL so Gemini isn't called again
 */
export async function learnNewAliasInPostgres(alias: string, canonicalId: string, canonicalLabel: string): Promise<void> {
  const normAlias = alias.toLowerCase().trim();
  if (!normAlias || aliasToGroceryMap.has(normAlias)) return;

  try {
    const existingCanonical = CANONICAL_GROCERIES.find(g => g.id === canonicalId) || {
      id: canonicalId,
      label: canonicalLabel,
      category: "Grocery",
      emoji: "🛒",
      aliases: [normAlias]
    };

    aliasToGroceryMap.set(normAlias, existingCanonical);

    await db.insert(foodAliases).values({
      id: "alias_" + generateUUID(),
      alias: normAlias,
      foodId: canonicalId
    }).onConflictDoNothing();

    console.log(`[Market Parser] Learned new alias in PostgreSQL: "${normAlias}" -> "${canonicalLabel}" (${existingCanonical.emoji})`);
  } catch (err: any) {
    console.warn("[Market Parser] Failed to persist new alias to PostgreSQL:", err.message);
  }
}

/**
 * Converts Bengali digits to English digits
 */
function convertBengaliDigits(str: string): string {
  const bengaliNumbers = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(bengaliNumbers[i], "g"), String(i));
  }
  return res;
}

/**
 * Fast rule-based parser that handles standard Bengali grocery lines:
 * e.g. "গরু 600 টাকা, ডিম 180, আলু পেঁয়াজ 135, পেঁপে কাঁচামরিচ 60, ভাড়া 20 টাকা"
 */
export function parseVoucherTextLocally(text: string): { items: ParsedVoucherItem[]; isComplete: boolean } {
  if (!text || typeof text !== "string") return { items: [], isComplete: false };

  const normalizedText = convertBengaliDigits(text);
  // Split on comma, semicolon, newline, pipe, or Bengali danda (do NOT split on + or -)
  const segments = normalizedText.split(/[,;\n|।]/).map(s => s.trim()).filter(Boolean);

  const items: ParsedVoucherItem[] = [];
  let allMatched = segments.length > 0;

  for (const seg of segments) {
    // 1. Detect weight or quantity unit pattern (e.g. 1.08kg, 1.6kg, 800g, 2 কেজি, 3 হালি, 250gm, 1kg)
    const qtyMatch = seg.match(/(\d+(?:\.\d+)?)\s*(?:kg|k\.g\.?|কেজি|কে\.জি\.?|gm|g|গ্রাম|হালি|আঁটি|আটি|পিস|টি|লিটার|লটার|l|ltr|packet|প্যাকেট)/i);
    let qtyStr = "";
    let segWithoutQty = seg;
    if (qtyMatch) {
      qtyStr = qtyMatch[0].trim();
      segWithoutQty = seg.replace(qtyMatch[0], " ");
    }

    // 2. Detect explicit price indicators (e.g. 600ট, 600 টাকা, 600 tk, 600/-)
    const explicitPriceMatch = segWithoutQty.match(/(\d+(?:\.\d+)?)\s*(?:টাকা|ট|tk|taka|৳|\/-)/i) ||
                               segWithoutQty.match(/(?:৳|tk|taka|টাকা)\s*(\d+(?:\.\d+)?)/i);

    let amount = 0;
    let rawLabel = segWithoutQty;

    if (explicitPriceMatch) {
      amount = parseFloat(explicitPriceMatch[1]);
      rawLabel = rawLabel.replace(explicitPriceMatch[0], " ");
    } else {
      // 3. If no explicit indicator, check if there's any remaining standalone number
      const remainingNum = segWithoutQty.match(/(\d+(?:\.\d+)?)/);
      if (remainingNum) {
        amount = parseFloat(remainingNum[1]);
        rawLabel = rawLabel.replace(remainingNum[0], " ");
      }
    }

    rawLabel = rawLabel.replace(/(?:taka|tk\.?|টাকা|টা)/gi, " ").replace(/[,\-:।+()=]/g, " ").trim();

    const canonical = findCanonicalByQuery(rawLabel);
    if (canonical) {
      items.push({
        name: canonical.label,
        originalText: (rawLabel || canonical.label) + (qtyStr ? ` (${qtyStr})` : ""),
        amount,
        emoji: canonical.emoji,
        category: canonical.category
      });
    } else if (rawLabel.length > 0) {
      items.push({
        name: rawLabel + (qtyStr ? ` (${qtyStr})` : ""),
        originalText: rawLabel,
        amount,
        emoji: "🛒",
        category: "Grocery"
      });
      allMatched = false;
    }
  }

  return { items, isComplete: allMatched && items.length > 0 };
}

/**
 * Multi-Model Gemini Fallback Cascade:
 * Tries models in priority order: gemini-3.8-flash -> gemini-3.1-flash-lite -> gemini-2.5-flash
 */
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash"
];

export async function parseVoucherWithGeminiCascade(
  text: string, 
  totalAmount?: number
): Promise<ParsedVoucherItem[]> {
  const prompt = `You are a Bangladeshi bachelor mess grocery and expense breakdown parser.
Analyze this market voucher purchase note: "${text}"
${totalAmount ? `Total voucher amount: ${totalAmount} BDT.` : ""}

Extract all individual items purchased or spent, along with their cost in BDT and the most fitting clean single emoji for that item.
Handle Bengali text, Banglish/transliterations (e.g. "GORU", "chagol", "alu peyaj", "vara", "dim", "pepe kachamorich"), and abbreviations.
If multiple items share one price (e.g. "আলু পেঁয়াজ 135"), group them as "আলু ও পেঁয়াজ" with appropriate emoji ("🥔🧅").
If travel fare is mentioned (e.g. "ভাড়া 20"), use "যাতায়াত ভাড়া" and "🛺".

Respond strictly with a valid JSON array of objects, with NO markdown backticks, matching this schema:
[
  {
    "name": "Standard Bengali Name (e.g. গরুর মাংস, ডিম, আলু ও পেঁয়াজ, যাতায়াত ভাড়া)",
    "originalText": "The exact word from user",
    "amount": 600,
    "emoji": "🥩",
    "category": "Meat / Vegetables / Eggs / Expense / Grocery"
  }
]`;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Market Parser] Calling Gemini model: ${model} for voucher parsing...`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text?.trim() || "";
      if (responseText) {
        const cleanJson = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Market Parser] Successfully parsed ${parsed.length} items using ${model}.`);
          
          // Learn aliases asynchronously in PostgreSQL
          for (const item of parsed) {
            if (item.originalText && item.name) {
              const matchedCanonical = findCanonicalByQuery(item.name) || findCanonicalByQuery(item.originalText);
              if (matchedCanonical) {
                learnNewAliasInPostgres(item.originalText, matchedCanonical.id, matchedCanonical.label).catch(() => {});
              }
            }
          }

          return parsed.map((p: any) => ({
            name: p.name || "বাজার খরচ",
            originalText: p.originalText || p.name || "",
            amount: Number(p.amount) || 0,
            emoji: p.emoji || "🛒",
            category: p.category || "Grocery"
          }));
        }
      }
    } catch (err: any) {
      console.warn(`[Market Parser] Gemini model ${model} failed or unavailable:`, err.message);
    }
  }

  throw new Error("All Gemini fallback cascade models were unable to process the request.");
}

/**
 * Main breakdown parser function combining local dictionary and Gemini fallback cascade
 */
export async function getVoucherBreakdown(
  text: string, 
  totalAmount?: number
): Promise<VoucherBreakdownResponse> {
  await ensureDictionaryInitialized();

  const cacheKey = `${text.trim()}__${totalAmount || 0}`;
  if (parsedVouchersCache.has(cacheKey)) {
    return parsedVouchersCache.get(cacheKey)!;
  }

  // 1. Try instant rule/dictionary match
  const localResult = parseVoucherTextLocally(text);
  if (localResult.isComplete && localResult.items.length > 0) {
    const totalParsed = localResult.items.reduce((s, it) => s + it.amount, 0);
    const resp: VoucherBreakdownResponse = {
      items: localResult.items,
      totalParsedAmount: totalParsed,
      source: "DICTIONARY"
    };
    parsedVouchersCache.set(cacheKey, resp);
    return resp;
  }

  // 2. If freeform or incomplete, call Gemini Multi-Model Cascade
  try {
    const aiItems = await parseVoucherWithGeminiCascade(text, totalAmount);
    if (aiItems.length > 0) {
      const totalParsed = aiItems.reduce((s, it) => s + it.amount, 0);
      const resp: VoucherBreakdownResponse = {
        items: aiItems,
        totalParsedAmount: totalParsed,
        source: "GEMINI_AI"
      };
      parsedVouchersCache.set(cacheKey, resp);
      return resp;
    }
  } catch (e: any) {
    console.warn("[Market Parser] Gemini cascade fallback failed:", e.message);
  }

  // 3. Fallback: Return best-effort local parsed items, or single item fallback
  if (localResult.items.length > 0) {
    const totalParsed = localResult.items.reduce((s, it) => s + it.amount, 0);
    const resp: VoucherBreakdownResponse = {
      items: localResult.items,
      totalParsedAmount: totalParsed,
      source: "HYBRID"
    };
    parsedVouchersCache.set(cacheKey, resp);
    return resp;
  }

  // Single fallback item
  const fallbackCanonical = findCanonicalByQuery(text) || {
    id: "grocery",
    label: text.trim() || "বাজার খরচ",
    category: "Grocery",
    emoji: "🛒",
    aliases: []
  };

  const resp: VoucherBreakdownResponse = {
    items: [
      {
        name: fallbackCanonical.label,
        originalText: text,
        amount: Number(totalAmount) || 0,
        emoji: fallbackCanonical.emoji,
        category: fallbackCanonical.category
      }
    ],
    totalParsedAmount: Number(totalAmount) || 0,
    source: "DICTIONARY"
  };
  parsedVouchersCache.set(cacheKey, resp);
  return resp;
}
