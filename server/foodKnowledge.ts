/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../src/db/index.ts";
import { foodKnowledgeBase, foodAliases, foodReviewQueue } from "../src/db/schema.ts";
import { eq, sql } from "drizzle-orm";
import { GoogleGenAI, Type } from "@google/genai";
import { generateUUID } from "./db.js";

// Initialize Gemini client on the server side
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

export interface FoodItem {
  id: string;
  label: string;
  category: string;
  aliases: string[];
  confidence: number;
  timestamp: string;
  frequency: number;
}

// In-memory cache for hot lookups
const foodCache = new Map<string, FoodItem>(); // foodId -> FoodItem
const aliasCache = new Map<string, string>(); // alias (lowercase) -> foodId

let isInitialized = false;

export function invalidateFoodCache() {
  isInitialized = false;
}

/**
 * Phonetic similarity generator for transliterated Bengali/English food names.
 * Reduces spelling variations into a canonical pronunciation key.
 */
function getPhoneticKey(str: string): string {
  if (!str) return "";
  let s = str.normalize("NFC").toLowerCase().trim();
  
  // Replace Bengali characters with phonetically similar characters
  s = s.replace(/ড়/g, "র")
       .replace(/ঢ়/g, "র")
       .replace(/ষ/g, "শ")
       .replace(/স/g, "শ")
       .replace(/ী/g, "ি")
       .replace(/ূ/g, "ু")
       .replace(/ত/g, "ত")
       .replace(/থ/g, "ত")
       .replace(/দ/g, "দ")
       .replace(/ধ/g, "দ");

  // Keep letters, numbers, spaces, and Bengali characters
  s = s.replace(/[^\w\s\u0980-\u09ff]/g, "");

  // Convert typical English transliteration equivalents
  s = s.replace(/ch/g, "s")
       .replace(/sh/g, "s")
       .replace(/c/g, "s")
       .replace(/z/g, "s")
       .replace(/kh/g, "k")
       .replace(/gh/g, "g")
       .replace(/th/g, "t")
       .replace(/dh/g, "d")
       .replace(/ph/g, "f")
       .replace(/bh/g, "v")
       .replace(/w/g, "o")
       .replace(/y/g, "i")
       .replace(/oo/g, "u")
       .replace(/ee/g, "i");

  // Collapse consecutive identical consonants
  s = s.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1");

  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Standard Levenshtein distance calculation
 */
function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (const row of tmp) {
      if (row.length <= 1) {
        // Init row
      }
    }
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Returns string similarity score from 0.0 to 1.0 using Levenshtein distance
 */
function getSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  const distance = getLevenshteinDistance(a, b);
  return 1.0 - distance / maxLength;
}

/**
 * Programmatic fuzzy matching using spelling, phonetics, substrings and Levenshtein distance.
 */
export function findFuzzyMatch(normalizedQuery: string): FoodItem | null {
  if (!normalizedQuery) return null;

  // 1. Token & sub-phrase matching against alias and food cache
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  for (let len = tokens.length; len >= 1; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      const subPhrase = tokens.slice(i, i + len).join(" ");
      if (subPhrase.length < 2) continue;

      const subAliasId = aliasCache.get(subPhrase);
      if (subAliasId) {
        const food = foodCache.get(subAliasId);
        if (food) return food;
      }

      for (const food of foodCache.values()) {
        if (food.label.toLowerCase().trim() === subPhrase) {
          return food;
        }
      }
    }
  }

  const qPhonetic = getPhoneticKey(normalizedQuery);
  
  let bestMatch: FoodItem | null = null;
  let highestScore = 0;

  for (const food of foodCache.values()) {
    const labelsToCheck = [food.label.toLowerCase().trim(), ...food.aliases];
    
    for (const target of labelsToCheck) {
      const targetNormalized = target.toLowerCase().trim();
      if (!targetNormalized) continue;

      const tPhonetic = getPhoneticKey(targetNormalized);

      // Exact phonetic key match (very high confidence)
      if (qPhonetic === tPhonetic && qPhonetic.length > 1) {
        return food;
      }

      // Substring matching for incomplete names / abbreviations
      if (normalizedQuery.length >= 3 && targetNormalized.length >= 3) {
        if (targetNormalized.includes(normalizedQuery) || normalizedQuery.includes(targetNormalized)) {
          const score = Math.min(normalizedQuery.length, targetNormalized.length) / Math.max(normalizedQuery.length, targetNormalized.length);
          if (score > highestScore && score >= 0.6) {
            highestScore = score;
            bestMatch = food;
          }
        }
      }

      // Phonetic substring match
      if (qPhonetic.length >= 3 && tPhonetic.length >= 3) {
        if (tPhonetic.includes(qPhonetic) || qPhonetic.includes(tPhonetic)) {
          const score = Math.min(qPhonetic.length, tPhonetic.length) / Math.max(qPhonetic.length, tPhonetic.length);
          if (score > highestScore && score >= 0.7) {
            highestScore = score;
            bestMatch = food;
          }
        }
      }

      // Levenshtein similarity on string
      const textSimilarity = getSimilarity(normalizedQuery, targetNormalized);
      if (textSimilarity > highestScore && textSimilarity >= 0.75) {
        highestScore = textSimilarity;
        bestMatch = food;
      }

      // Levenshtein similarity on phonetics
      const phoneticSimilarity = getSimilarity(qPhonetic, tPhonetic);
      if (phoneticSimilarity > highestScore && phoneticSimilarity >= 0.8) {
        highestScore = phoneticSimilarity;
        bestMatch = food;
      }
    }
  }

  return bestMatch;
}

// Seed data for common foods to minimize initial Gemini worker calls
const INITIAL_FOOD_SEED = [
  { label: "পুঁই শাক", category: "Vegetables", aliases: ["pui shak", "পুঁইশাক", "pui saag", "pui", "পুঁই"] },
  { label: "চিংড়ি", category: "Fish", aliases: ["chingri", "চিংড়ি", "shrimp", "prawn", "চিংড়ি মাছ"] },
  { label: "রুই মাছ", category: "Fish", aliases: ["rui mach", "রুই", "rui fish", "রুই মাছের ঝোল"] },
  { label: "ইলিশ মাছ", category: "Fish", aliases: ["ilish", "hilsa", "ইলিশ", "ইলিশ মাছের ঝোল", "সরিষা ইলিশ"] },
  { label: "পাঙ্গাস মাছ", category: "Fish", aliases: ["pangas", "পাঙ্গাস", "পাংগাস"] },
  { label: "তেলাপিয়া মাছ", category: "Fish", aliases: ["tilapia", "তেলাপিয়া", "তেলাপিয়া"] },
  { label: "কাতলা মাছ", category: "Fish", aliases: ["katla", "কাতলা"] },
  { label: "কই মাছ", category: "Fish", aliases: ["koi", "কই"] },
  { label: "শোল মাছ", category: "Fish", aliases: ["shol", "শোল"] },
  { label: "শিং মাছ", category: "Fish", aliases: ["shing", "শিং"] },
  { label: "পাবদা মাছ", category: "Fish", aliases: ["pabda", "পাবদা"] },
  { label: "মুরগির মাংস", category: "Chicken", aliases: ["chicken", "murgi", "মুরগি", "মুরগী", "চিকেন", "চিকেন রোস্ট", "চিকেন কারি"] },
  { label: "গরুর মাংস", category: "Beef", aliases: ["beef", "gorur mangso", "গরু", "বিফ", "গরুর মাংস ভুনা"] },
  { label: "খাসির মাংস", category: "Mutton", aliases: ["mutton", "khasir mangso", "খাসি", "মটন"] },
  { label: "ডাল", category: "Lentils", aliases: ["dal", "daal", "মসুর ডাল", "মুগ ডাল", "ডাল চচ্চড়ি"] },
  { label: "ডিম", category: "Eggs", aliases: ["egg", "dim", "ডিম ভাজি", "ডিম ভুনা", "সিদ্ধ ডিম", "ডিম কারি"] },
  { label: "ভাত", category: "Rice", aliases: ["bhat", "rice", "সাদা ভাত", "পোলাও", "খিচুড়ি", "বিরিয়ানি", "কাচ্চি"] },
  { label: "আলু", category: "Vegetables", aliases: ["alu", "potato", "aloo", "আলু ভাজি", "আলু ভর্তা"] },
  { label: "বেগুন", category: "Vegetables", aliases: ["begun", "eggplant", "brinjal", "বেগুন ভাজি", "বেগুন ভর্তা"] },
  { label: "পটল", category: "Vegetables", aliases: ["potol", "pointed gourd", "পটল ভাজি"] },
  { label: "লাউ", category: "Vegetables", aliases: ["lau", "bottle gourd", "লাউ শাক", "লাউ ডাল"] },
  { label: "টমেটো", category: "Vegetables", aliases: ["tomato", "tomato salad", "টমেটো সালাদ"] },
  { label: "সবজি", category: "Vegetables", aliases: ["sobji", "vegetable", "সবজী", "নিরামিষ"] },
  { label: "ফুলকপি", category: "Vegetables", aliases: ["fulkopi", "cauliflower", "ফুলকপি ভাজি"] },
  { label: "বাঁধাকপি", category: "Vegetables", aliases: ["badhakopi", "cabbage", "বাঁধাকপি ভাজি"] },
  { label: "করলা", category: "Vegetables", aliases: ["korola", "bitter gourd", "করলা ভাজি"] },
  { label: "ঢেঁড়স", category: "Vegetables", aliases: ["dheros", "bhindi", "okra", "ঢেঁড়স ভাজি"] },
  { label: "শাক", category: "Vegetables", aliases: ["shak", "saag", "শাক ভাজি"] },
  { label: "ডাটা শাক", category: "Vegetables", aliases: ["ডাটাশাক", "ডাঁটা শাক", "data shak", "danta shak", "danta saag", "ডাটা", "ডাটা ভাজি", "ডাটা চচ্চড়ি"] },
  { label: "লাল শাক", category: "Vegetables", aliases: ["লালশাক", "lal shak", "lal saag", "লাল শাক ভাজি"] },
  { label: "কলমি শাক", category: "Vegetables", aliases: ["কলমিশাক", "kolmi shak", "kalmi saag"] },
  { label: "পালং শাক", category: "Vegetables", aliases: ["পালংশাক", "palong shak", "palak saag", "পালং শাক ভাজি"] },
  { label: "পাট শাক", category: "Vegetables", aliases: ["পাটশাক", "pat shak", "pat saag"] },
  { label: "কচুর লতি", category: "Vegetables", aliases: ["kochur loti", "kocur loti", "kosur loti", "লতি", "কচুরলতি"] },
  { label: "কচুর শাক", category: "Vegetables", aliases: ["kochur shak", "kochu shak", "কচু শাক"] },
  { label: "মিষ্টি কুমড়া", category: "Vegetables", aliases: ["misti kumra", "sweet pumpkin", "মিষ্টিকুমড়া", "মিষ্টি কুমড়া ভাজি"] },
  { label: "ঝিঙে", category: "Vegetables", aliases: ["jhinge", "jhinga", "ঝিঙ্গা"] },
  { label: "চিচিঙ্গা", category: "Vegetables", aliases: ["chichinga", "snake gourd"] },
  { label: "কাঁচকলা", category: "Vegetables", aliases: ["kachkola", "কাচকলা", "green banana"] },
  { label: "শিম", category: "Vegetables", aliases: ["shim", "sheem", "শিম ভাজি"] },
  { label: "বরবটি", category: "Vegetables", aliases: ["borboti", "yardlong bean", "বরবটি ভাজি"] },
  { label: "শুটকি মাছ", category: "Fish", aliases: ["shutki", "sutki", "শুটকি", "শুটকী", "শুটকি ভুনা", "লইট্যা শুটকি"] },
  { label: "বোয়াল মাছ", category: "Fish", aliases: ["boyal", "boal", "বোয়াল মাছ", "বোয়াল"] },
  { label: "টাকি মাছ", category: "Fish", aliases: ["taki", "টাকি", "টাকি মাছের ভর্তা"] },
  { label: "সালাদ", category: "Vegetables", aliases: ["salad", "সালাদ"] },
];

// Global rate-limit cooldown tracker to avoid spamming Gemini when 429 RESOURCE_EXHAUSTED is hit
let geminiCooldownUntil = 0;

/**
 * Rule-based culinary heuristic classifier for Bengali foods.
 * Recognizes categories offline with zero latency and resilience against API outages.
 */
export function classifyFoodHeuristically(rawName: string): { label: string; category: string } | null {
  if (!rawName) return null;
  const clean = rawName.normalize("NFC").toLowerCase().trim();

  // 1. Leafy greens & Shak (Vegetables)
  if (clean.endsWith("শাক") || clean.endsWith("সাখ") || clean.includes("শাক") || clean.endsWith("shak") || clean.endsWith("saag")) {
    return { label: rawName.trim(), category: "Vegetables" };
  }

  // 2. Fish & Seafood (Fish)
  if (clean.includes("মাছ") || clean.endsWith("mach") || clean.endsWith("fish") || clean.includes("শুটকি") || clean.includes("শুটকী") || clean.includes("চিংড়ি") || clean.includes("চিংড়ি") || clean.includes("ইলিশ") || clean.includes("রুই") || clean.includes("কাতলা") || clean.includes("পাঙ্গাস") || clean.includes("পাংগাস") || clean.includes("পাঙ্গাশ") || clean.includes("তেলাপিয়া") || clean.includes("তেলাপিয়া") || clean.includes("কই") || clean.includes("শিং") || clean.includes("মাগুর") || clean.includes("পাবদা") || clean.includes("বোয়াল") || clean.includes("বোয়াল") || clean.includes("টাকি") || clean.includes("মলা") || clean.includes("কাচকি")) {
    return { label: rawName.trim(), category: "Fish" };
  }

  // 3. Chicken
  if (clean.includes("মুরগি") || clean.includes("মুরগী") || clean.includes("চিকেন") || clean.includes("chicken") || clean.includes("murgi")) {
    return { label: rawName.trim(), category: "Chicken" };
  }

  // 4. Beef
  if (clean.includes("গরু") || clean.includes("বিফ") || clean.includes("beef") || clean.includes("gorur")) {
    return { label: rawName.trim(), category: "Beef" };
  }

  // 5. Mutton
  if (clean.includes("খাসি") || clean.includes("মটন") || clean.includes("mutton") || clean.includes("khasir")) {
    return { label: rawName.trim(), category: "Mutton" };
  }

  // 6. Eggs
  if (clean.includes("ডিম") || clean.includes("egg") || clean.includes("dim")) {
    return { label: rawName.trim(), category: "Eggs" };
  }

  // 7. Lentils / Dal
  if (clean.includes("ডাল") || clean.includes("dal") || clean.includes("daal")) {
    return { label: rawName.trim(), category: "Lentils" };
  }

  // 8. Rice & Rice Dishes
  if (clean.includes("ভাত") || clean.includes("bhat") || clean.includes("খিচুড়ি") || clean.includes("খিচুড়ি") || clean.includes("পোলাও") || clean.includes("বিরিয়ানি") || clean.includes("বিরিয়ানি")) {
    return { label: rawName.trim(), category: "Rice" };
  }

  // 9. Common Vegetable preparations
  if (clean.includes("ভর্তা") || clean.includes("ভাজি") || clean.includes("তরকারি") || clean.includes("লাউ") || clean.includes("আলু") || clean.includes("পটল") || clean.includes("করলা") || clean.includes("ফুলকপি") || clean.includes("বাঁধাকপি") || clean.includes("বেগুন") || clean.includes("ঢেঁড়স") || clean.includes("ঢেঁড়স") || clean.includes("ঝিঙে") || clean.includes("চিচিঙ্গা") || clean.includes("কচুর")) {
    return { label: rawName.trim(), category: "Vegetables" };
  }

  return null;
}

/**
 * Initialize Cache from database or seed it if empty
 */
export async function initializeFoodCache() {
  if (isInitialized) return;

  try {
    console.log("[Food Knowledge] Loading cache from database...");
    let [dbFoods, dbAliases] = await Promise.all([
      db.select().from(foodKnowledgeBase),
      db.select().from(foodAliases)
    ]);

    // Seed database if empty
    if (dbFoods.length === 0) {
      console.log("[Food Knowledge] Database is empty. Seeding default known foods...");
      const timestamp = new Date().toISOString();
      const foodsToInsert: any[] = [];
      const aliasesToInsert: any[] = [];

      for (const item of INITIAL_FOOD_SEED) {
        const foodId = "food_" + generateUUID();
        const aliasesJson = JSON.stringify(item.aliases);

        foodsToInsert.push({
          id: foodId,
          label: item.label,
          category: item.category,
          aliases: aliasesJson,
          confidence: 1.0,
          timestamp,
          frequency: 0,
        });

        const normalizedAliases = Array.from(new Set([
          item.label.toLowerCase().trim(),
          ...item.aliases.map(a => a.toLowerCase().trim())
        ]));

        for (const alias of normalizedAliases) {
          if (alias) {
            aliasesToInsert.push({
              id: "alias_" + generateUUID(),
              alias,
              foodId,
            });
          }
        }
      }

      if (foodsToInsert.length > 0) {
        await db.insert(foodKnowledgeBase).values(foodsToInsert);
      }
      if (aliasesToInsert.length > 0) {
        await db.insert(foodAliases).values(aliasesToInsert).onConflictDoNothing();
      }

      [dbFoods, dbAliases] = await Promise.all([
        db.select().from(foodKnowledgeBase),
        db.select().from(foodAliases)
      ]);
    }

    foodCache.clear();
    aliasCache.clear();

    for (const food of dbFoods) {
      let parsedAliases: string[] = [];
      try {
        parsedAliases = JSON.parse(food.aliases);
      } catch (e) {
        parsedAliases = [];
      }

      foodCache.set(food.id, {
        id: food.id,
        label: food.label,
        category: food.category,
        aliases: parsedAliases,
        confidence: food.confidence,
        timestamp: food.timestamp,
        frequency: food.frequency,
      });
    }

    for (const aliasEntry of dbAliases) {
      aliasCache.set(aliasEntry.alias.toLowerCase().trim(), aliasEntry.foodId);
    }

    isInitialized = true;
    console.log(`[Food Knowledge] Cache initialized successfully with ${foodCache.size} foods and ${aliasCache.size} aliases.`);
  } catch (error) {
    console.error("[Food Knowledge] Failed to initialize cache:", error);
  }
}

/**
 * Split text by major Bengali/English food delimiters
 */
export function splitMenuText(text: string): string[] {
  if (!text) return [];

  // Replace connectors with a unified comma delimiter
  const normalizedText = text
    .replace(/\s+(and|&|ও|এবং|আর|with)\s+/gi, ",")
    .replace(/\s*\+\s*/g, ",")
    .replace(/\s+(দিয়ে|দিয়ে)\s+/g, ",");

  // Split by comma, slash, bullet, or common list separators
  return normalizedText
    .split(/[,/+\u2022，、|]/)
    .map(i => i.trim())
    .filter(Boolean);
}

/**
 * Greedy matching algorithm to extract known foods from compound names,
 * returning both the recognized canonical food labels and any unrecognized residual phrases.
 */
export function extractFoodPhrases(text: string): { known: string[]; unknown: string[] } {
  const parts = splitMenuText(text);
  const knownLabelsSet = new Set<string>();
  const unknownPhrases: string[] = [];

  // Get aliases sorted from longest to shortest for greedy matching
  const sortedAliases = Array.from(aliasCache.keys()).sort((a, b) => b.length - a.length);

  for (const part of parts) {
    let remaining = part.toLowerCase().trim();
    if (!remaining) continue;

    let matchedAny = false;

    // Priority 1: Check exact canonical labels
    for (const food of foodCache.values()) {
      if (food.label.toLowerCase().trim() === remaining) {
        knownLabelsSet.add(food.label);
        matchedAny = true;
        break;
      }
    }

    // Priority 2: Greedy matching against Food Alias Dictionary
    if (!matchedAny) {
      for (const alias of sortedAliases) {
        if (alias.length > 1 && remaining.includes(alias)) {
          const foodId = aliasCache.get(alias);
          if (foodId) {
            const food = foodCache.get(foodId);
            if (food) {
              knownLabelsSet.add(food.label);
              matchedAny = true;
            }
          }
          remaining = remaining.replace(alias, "").replace(/\s+/g, " ").trim();
        }
      }
    }

    // Priority 3: Food Cache Fuzzy / Token / Phonetic matching
    if (!matchedAny) {
      const fuzzy = findFuzzyMatch(part);
      if (fuzzy) {
        knownLabelsSet.add(fuzzy.label);
        matchedAny = true;
      }
    }

    // Clean up residual separators and preparation descriptions
    const cleanResidual = remaining
      .replace(/^(ভুনা|ঝোল|ভাজি|কারি|দোপিয়াজা|ভর্তা|সিদ্ধ|পোক্তা|ঝাল|কষা|চিকেন|ফ্রাই|মশলাদার)\s+/gi, "")
      .replace(/\s+(ভুনা|ঝোল|ভাজি|কারি|দোপিয়াজা|ভর্তা|সিদ্ধ|পোক্তা|ঝাল|কষা|চিকেন|ফ্রাই|মশলাদার)$/gi, "")
      .trim();

    if (!matchedAny && cleanResidual.length > 1) {
      const residualFuzzy = findFuzzyMatch(cleanResidual);
      if (residualFuzzy) {
        knownLabelsSet.add(residualFuzzy.label);
      } else {
        unknownPhrases.push(part);
      }
    } else if (matchedAny && cleanResidual.length > 2) {
      const residualFuzzy = findFuzzyMatch(cleanResidual);
      if (residualFuzzy) {
        knownLabelsSet.add(residualFuzzy.label);
      } else {
        unknownPhrases.push(cleanResidual);
      }
    }
  }

  return {
    known: Array.from(knownLabelsSet),
    unknown: Array.from(new Set(unknownPhrases)),
  };
}

/**
 * Query Gemini to normalize, classify and catalog unknown food phrases
 */
export async function learnUnknownFoods(phrases: string[]): Promise<{
  learned: any[];
  queued: any[];
}> {
  if (phrases.length === 0) return { learned: [], queued: [] };

  if (Date.now() < geminiCooldownUntil) {
    console.warn(`[Gemini Teacher] Gemini rate limit cooldown active. Queuing ${phrases.length} phrases directly.`);
    const timestamp = new Date().toISOString();
    for (const p of phrases) {
      try {
        await db.insert(foodReviewQueue).values({
          id: "review_" + generateUUID(),
          phrase: p,
          detectedFood: "Rate-limited",
          confidence: 0.0,
          timestamp,
          status: "PENDING",
        }).onConflictDoNothing();
      } catch (err) {}
    }
    return { learned: [], queued: phrases.map(p => ({ phrase: p, confidence: 0 })) };
  }

  // Pre-filter with heuristic classifier before querying Gemini
  const learnedList: any[] = [];
  const remainingPhrases: string[] = [];
  const timestamp = new Date().toISOString();

  for (const phrase of phrases) {
    const heuristic = classifyFoodHeuristically(phrase);
    if (heuristic) {
      const foodId = "food_" + generateUUID();
      const allAliases = Array.from(new Set([
        heuristic.label.toLowerCase().trim(),
        phrase.toLowerCase().trim(),
      ])).filter(Boolean);

      try {
        await db.insert(foodKnowledgeBase).values({
          id: foodId,
          label: heuristic.label,
          category: heuristic.category,
          aliases: JSON.stringify(allAliases),
          confidence: 0.98,
          timestamp,
          frequency: 1,
        }).onConflictDoNothing();

        for (const alias of allAliases) {
          await db.insert(foodAliases).values({
            id: "alias_" + generateUUID(),
            alias,
            foodId,
          }).onConflictDoNothing();
          aliasCache.set(alias, foodId);
        }

        foodCache.set(foodId, {
          id: foodId,
          label: heuristic.label,
          category: heuristic.category,
          aliases: allAliases,
          confidence: 0.98,
          timestamp,
          frequency: 1,
        });

        learnedList.push({ phrase, label: heuristic.label, category: heuristic.category });
      } catch (e) {
        remainingPhrases.push(phrase);
      }
    } else {
      remainingPhrases.push(phrase);
    }
  }

  if (remainingPhrases.length === 0) {
    return { learned: learnedList, queued: [] };
  }

  const prompt = `You are a culinary expert on Bengali foods and daily meal menus.
Analyze the following list of raw food phrases from a meal menu dashboard.
For each phrase, identify:
1. The canonical food item name in standard Bengali (label).
2. Other common names, English names, phonetic spellings, or Bengali variations (aliases).
3. The main category ('Vegetables', 'Fish', 'Chicken', 'Beef', 'Mutton', 'Eggs', 'Lentils', 'Rice', 'Dessert', 'Drinks', 'Other').
4. Your confidence score (0.0 to 1.0) that this is indeed a recognized food item in Bangladesh/Bengal region. If you are uncertain or it is a random non-food word, set confidence low (under 0.95).

Input Phrases:
${JSON.stringify(remainingPhrases, null, 2)}

Return a strict JSON array conforming to the schema.`;

  try {
    console.log(`[Gemini Teacher] Asking Gemini to teach us about unknown phrases: ${remainingPhrases.join(", ")}`);
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "List of classified foods",
            items: {
              type: Type.OBJECT,
              properties: {
                originalPhrase: {
                  type: Type.STRING,
                  description: "The exact original phrase from the input"
                },
                label: {
                  type: Type.STRING,
                  description: "The canonical, normalized Bengali name of the food item (e.g. 'সরিষা ইলিশ' or 'লাউ ডাল')"
                },
                aliases: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Common Bengali aliases, phonetic spellings, or translation names"
                },
                category: {
                  type: Type.STRING,
                  description: "Main category choice: 'Vegetables', 'Fish', 'Chicken', 'Beef', 'Mutton', 'Eggs', 'Lentils', 'Rice', 'Dessert', 'Drinks', 'Other'"
                },
                confidence: {
                  type: Type.NUMBER,
                  description: "Confidence score from 0.0 to 1.0"
                }
              },
              required: ["originalPhrase", "label", "aliases", "category", "confidence"]
            }
          }
        }
      });
    } catch (err: any) {
      console.info(`[Gemini Teacher] Primary model call failed (${err?.message}). Attempting fallback query...`);
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt
      });
    }

    const results = JSON.parse(response.text.trim());
    const queuedList: any[] = [];

    for (const res of results) {
      if (res.confidence >= 0.95) {
        // High confidence: Learn and catalog automatically
        const foodId = "food_" + generateUUID();
        const allAliasesSet = new Set([
          res.label.toLowerCase().trim(),
          res.originalPhrase.toLowerCase().trim(),
          ...res.aliases.map((a: string) => a.toLowerCase().trim())
        ]);

        const aliasesArray = Array.from(allAliasesSet).filter(Boolean);

        // Save to Database
        await db.insert(foodKnowledgeBase).values({
          id: foodId,
          label: res.label,
          category: res.category,
          aliases: JSON.stringify(aliasesArray),
          confidence: res.confidence,
          timestamp,
          frequency: 1,
        });

        for (const alias of aliasesArray) {
          await db.insert(foodAliases).values({
            id: "alias_" + generateUUID(),
            alias,
            foodId,
          }).onConflictDoNothing();
        }

        // Update In-memory cache
        foodCache.set(foodId, {
          id: foodId,
          label: res.label,
          category: res.category,
          aliases: aliasesArray,
          confidence: res.confidence,
          timestamp,
          frequency: 1,
        });

        for (const alias of aliasesArray) {
          aliasCache.set(alias, foodId);
        }

        learnedList.push({ phrase: res.originalPhrase, label: res.label, category: res.category });
      } else {
        // Low confidence: Send to Review Queue
        await db.insert(foodReviewQueue).values({
          id: "review_" + generateUUID(),
          phrase: res.originalPhrase,
          detectedFood: res.label || null,
          confidence: res.confidence,
          timestamp,
          status: "PENDING",
        }).onConflictDoUpdate({
          target: foodReviewQueue.phrase,
          set: {
            detectedFood: res.label || null,
            confidence: res.confidence,
            timestamp,
            status: "PENDING",
          }
        });

        queuedList.push({ phrase: res.originalPhrase, detectedFood: res.label, confidence: res.confidence });
      }
    }

    console.log(`[Gemini Teacher] Finished teaching pipeline: Cataloged ${learnedList.length} foods automatically; Sent ${queuedList.length} items to the Review Queue.`);
    return { learned: learnedList, queued: queuedList };
  } catch (error: any) {
    const isUnavailable = error?.status === 503 || error?.status === "UNAVAILABLE" || error?.message?.includes("503") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE");
    const isQuota = error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isUnavailable || isQuota) {
      geminiCooldownUntil = Date.now() + 60000;
      console.info(`[Gemini Teacher] Gemini experiencing high demand / cooldown (503/429). Entering 60s cooldown.`);
    } else {
      console.info("[Gemini Teacher] Notice on Gemini learning pipeline:", error?.message || "Unavailable");
    }
    // On error, write remaining phrases to review queue as PENDING so they are not lost
    const queuedList: any[] = [];
    for (const p of remainingPhrases) {
      try {
        await db.insert(foodReviewQueue).values({
          id: "review_" + generateUUID(),
          phrase: p,
          detectedFood: "Pending categorization",
          confidence: 0.0,
          timestamp,
          status: "PENDING",
        }).onConflictDoNothing();
        queuedList.push({ phrase: p, confidence: 0 });
      } catch (err) {}
    }
    return { learned: learnedList, queued: queuedList };
  }
}

/**
 * 4-Level Priority Semantic Food Recognition Pipeline:
 * Priority 1: Local Food Knowledge (Exact Canonical Food Label Match)
 * Priority 2: Food Alias Dictionary (Exact Alias Dictionary Mapping)
 * Priority 3: Food Cache (Programmatic Fuzzy, Phonetic, Substring & Token Matching)
 * Priority 4: Gemini API (Last Resort ONLY when no local match exists)
 */
export async function resolveCanonicalFood(rawName: string): Promise<{ label: string; category: string; id: string }> {
  await initializeFoodCache();

  if (!rawName) {
    return { label: "", category: "Other", id: "" };
  }

  const normalized = rawName.normalize("NFC").toLowerCase().trim();
  if (!normalized) {
    return { label: rawName, category: "Other", id: "" };
  }

  // Priority 1: Local Food Knowledge (Check exact match against canonical labels)
  for (const food of foodCache.values()) {
    if (food.label.toLowerCase().trim() === normalized) {
      return { label: food.label, category: food.category, id: food.id };
    }
  }

  // Priority 2: Food Alias Dictionary (Check exact match against alias dictionary)
  const exactAliasFoodId = aliasCache.get(normalized);
  if (exactAliasFoodId) {
    const food = foodCache.get(exactAliasFoodId);
    if (food) {
      return { label: food.label, category: food.category, id: food.id };
    }
  }

  // Priority 3: Food Cache (Programmatic Fuzzy, Phonetic, Substring & Token Matching)
  const fuzzyMatch = findFuzzyMatch(normalized);
  if (fuzzyMatch) {
    // Auto-learn/register alias so subsequent lookups hit Priority 2 instantly
    try {
      await db.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias: normalized,
        foodId: fuzzyMatch.id
      }).onConflictDoNothing();
      
      aliasCache.set(normalized, fuzzyMatch.id);
      
      if (!fuzzyMatch.aliases.includes(normalized)) {
        fuzzyMatch.aliases.push(normalized);
        await db.update(foodKnowledgeBase)
          .set({ aliases: JSON.stringify(fuzzyMatch.aliases) })
          .where(eq(foodKnowledgeBase.id, fuzzyMatch.id));
      }
    } catch (e) {
      console.error("[Food Knowledge] Error auto-saving fuzzy match alias:", e);
    }
    return { label: fuzzyMatch.label, category: fuzzyMatch.category, id: fuzzyMatch.id };
  }

  // Priority 4: Rule-based Heuristic Semantic Classifier (Fast & Offline)
  const heuristic = classifyFoodHeuristically(rawName);
  if (heuristic) {
    const foodId = "food_" + generateUUID();
    const timestamp = new Date().toISOString();
    const aliases = Array.from(new Set([
      heuristic.label.toLowerCase().trim(),
      normalized,
      rawName.toLowerCase().trim()
    ])).filter(Boolean);

    try {
      await db.insert(foodKnowledgeBase).values({
        id: foodId,
        label: heuristic.label,
        category: heuristic.category,
        aliases: JSON.stringify(aliases),
        confidence: 0.98,
        timestamp,
        frequency: 1,
      }).onConflictDoNothing();

      for (const alias of aliases) {
        await db.insert(foodAliases).values({
          id: "alias_" + generateUUID(),
          alias,
          foodId,
        }).onConflictDoNothing();
        aliasCache.set(alias, foodId);
      }

      foodCache.set(foodId, {
        id: foodId,
        label: heuristic.label,
        category: heuristic.category,
        aliases,
        confidence: 0.98,
        timestamp,
        frequency: 1,
      });

      console.log(`[Food Knowledge] Heuristically classified & learned: "${heuristic.label}" under "${heuristic.category}"`);
      return { label: heuristic.label, category: heuristic.category, id: foodId };
    } catch (err) {
      console.error("[Food Knowledge] Error caching heuristic classification:", err);
      return { label: heuristic.label, category: heuristic.category, id: "" };
    }
  }

  // Priority 5: Gemini API (Last Resort ONLY when no local match exists)
  if (Date.now() < geminiCooldownUntil) {
    return { label: rawName, category: "Other", id: "" };
  }

  try {
    const existingFoods = Array.from(foodCache.values()).map(f => ({
      id: f.id,
      label: f.label,
      category: f.category,
      aliases: f.aliases
    }));

    const prompt = `You are a Bengali food intelligence expert.
We have an unrecognized food name: "${rawName}".
We want to map it semantically to an existing food from our database, or identify it as a completely new food.

Here is the list of existing canonical foods:
${JSON.stringify(existingFoods, null, 2)}

Please analyze if "${rawName}" refers to one of the existing canonical foods (even with typos, dialect variations, phonetic spellings, different languages, or abbreviations).
For example: "kosur loti", "kocur loti", "কছুর লতি" all refer to "কচুর লতি" or "kochur loti". "goru", "beef", "gorur mangsho" all refer to "গরুর মাংস" (Beef).

Respond with a strict JSON object:
{
  "isMatch": true,
  "matchedFoodId": "the ID of the matching food",
  "matchedLabel": "the label of the matching food",
  "newFoodLabel": null,
  "newFoodCategory": null,
  "aliasesToSave": ["list of strings that should be saved as aliases, e.g. the original unrecognized name and its variations"],
  "reason": "why they are the same"
}
OR if it's a completely different food:
{
  "isMatch": false,
  "matchedFoodId": null,
  "matchedLabel": null,
  "newFoodLabel": "standard canonical name for this new food in Bengali or English",
  "newFoodCategory": "one of: 'Vegetables', 'Fish', 'Chicken', 'Beef', 'Mutton', 'Eggs', 'Lentils', 'Rice', 'Dessert', 'Drinks', 'Other'",
  "aliasesToSave": ["list of strings to save as aliases for this new food"],
  "reason": "why it is a new food"
}`;

    console.log(`[Food Knowledge] Calling Gemini AI for semantic recognition of: "${rawName}"`);
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isMatch: { type: Type.BOOLEAN },
            matchedFoodId: { type: Type.STRING },
            matchedLabel: { type: Type.STRING },
            newFoodLabel: { type: Type.STRING },
            newFoodCategory: { type: Type.STRING },
            aliasesToSave: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            reason: { type: Type.STRING }
          },
          required: ["isMatch", "aliasesToSave"]
        }
      }
    });

    const result = JSON.parse(response.text.trim());
    const timestamp = new Date().toISOString();

    if (result.isMatch && result.matchedFoodId) {
      const foodId = result.matchedFoodId;
      const food = foodCache.get(foodId);
      if (food) {
        // Step 5: Self Learning - Automatically save aliases permanently
        const newAliases = Array.from(new Set([
          normalized,
          ...result.aliasesToSave.map((a: string) => a.toLowerCase().trim())
        ])).filter(Boolean);

        for (const alias of newAliases) {
          if (!food.aliases.includes(alias)) {
            food.aliases.push(alias);
          }
          await db.insert(foodAliases).values({
            id: "alias_" + generateUUID(),
            alias,
            foodId,
          }).onConflictDoNothing();
          aliasCache.set(alias, foodId);
        }

        await db.update(foodKnowledgeBase)
          .set({ aliases: JSON.stringify(food.aliases) })
          .where(eq(foodKnowledgeBase.id, foodId));

        console.log(`[Food Knowledge] Self-learned alias: Saved ${newAliases.join(", ")} for canonical food: "${food.label}"`);
        return { label: food.label, category: food.category, id: food.id };
      }
    }

    // It's a completely new food or we didn't find the matched food ID in cache
    const newLabel = result.newFoodLabel || rawName;
    const newCategory = result.newFoodCategory || "Other";
    const foodId = "food_" + generateUUID();

    const newAliases = Array.from(new Set([
      newLabel.toLowerCase().trim(),
      normalized,
      ...result.aliasesToSave.map((a: string) => a.toLowerCase().trim())
    ])).filter(Boolean);

    await db.insert(foodKnowledgeBase).values({
      id: foodId,
      label: newLabel,
      category: newCategory,
      aliases: JSON.stringify(newAliases),
      confidence: 1.0,
      timestamp,
      frequency: 1,
    });

    for (const alias of newAliases) {
      await db.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias,
        foodId,
      }).onConflictDoNothing();
      aliasCache.set(alias, foodId);
    }

    foodCache.set(foodId, {
      id: foodId,
      label: newLabel,
      category: newCategory,
      aliases: newAliases,
      confidence: 1.0,
      timestamp,
      frequency: 1,
    });

    console.log(`[Food Knowledge] Self-learned new food: Created "${newLabel}" under "${newCategory}"`);
    return { label: newLabel, category: newCategory, id: foodId };

  } catch (error: any) {
    const isUnavailable = error?.status === 503 || error?.status === "UNAVAILABLE" || error?.message?.includes("503") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE");
    const isQuota = error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isUnavailable || isQuota) {
      geminiCooldownUntil = Date.now() + 60000;
      console.info(`[Food Knowledge] Gemini API temporarily experiencing high demand / cooldown (503/429) for "${rawName}". Entering 60s cooldown.`);
    } else {
      console.info(`[Food Knowledge] Gemini recognition skipped for "${rawName}":`, error?.message || "Unavailable");
    }
    // Graceful fallback to raw input in case of Gemini errors
    const fallbackHeuristic = classifyFoodHeuristically(rawName);
    return { label: rawName, category: fallbackHeuristic?.category || "Other", id: "" };
  }
}

/**
 * Executed whenever a manager saves a meal/menu.
 * Increment frequency metrics for matching food labels.
 */
export async function processMenuFoods(
  lunchVegetable: string,
  lunchMain: string,
  dinnerVegetable: string,
  dinnerMain: string
) {
  await initializeFoodCache();

  const rawPhrases = [lunchVegetable, lunchMain, dinnerVegetable, dinnerMain]
    .filter(Boolean)
    .flatMap(text => splitMenuText(text));

  for (const phrase of rawPhrases) {
    const canonical = await resolveCanonicalFood(phrase);
    if (canonical.id) {
      // Increment frequency in DB & cache
      const cachedItem = foodCache.get(canonical.id);
      if (cachedItem) {
        cachedItem.frequency += 1;
        await db
          .update(foodKnowledgeBase)
          .set({ frequency: cachedItem.frequency })
          .where(eq(foodKnowledgeBase.id, canonical.id));
      }
    }
  }
}

/**
 * Return current analytics about the Food Knowledge Base
 */
export async function getFoodAnalytics() {
  await initializeFoodCache();

  const totalKnown = foodCache.size;
  const reviewQueue = await db.select().from(foodReviewQueue);
  const pendingCount = reviewQueue.filter(r => r.status === "PENDING").length;

  // Get total saves by summing frequencies
  let totalDBSaves = 0;
  const topRecognized: any[] = [];

  for (const food of foodCache.values()) {
    totalDBSaves += food.frequency;
    topRecognized.push({
      label: food.label,
      category: food.category,
      frequency: food.frequency,
    });
  }

  // Sort top recognized foods
  topRecognized.sort((a, b) => b.frequency - a.frequency);

  // Teaching efficiency calculation:
  // Hits = total times we matched known cache/db foods
  // Misses = number of times we had to ask Gemini (approximated by total distinct foods learned later + queue entries)
  const geminiCallsCount = totalKnown - INITIAL_FOOD_SEED.length + reviewQueue.length;
  const hits = totalDBSaves;
  const totalQueries = hits + geminiCallsCount;
  const efficiency = totalQueries > 0 ? (hits / totalQueries) * 100 : 100;

  return {
    totalKnown,
    pendingReviews: pendingCount,
    totalSavesRecognized: totalDBSaves,
    efficiencyScore: Math.round(efficiency * 10) / 10,
    topFoods: topRecognized.slice(0, 5),
    reviewQueue: reviewQueue,
  };
}
