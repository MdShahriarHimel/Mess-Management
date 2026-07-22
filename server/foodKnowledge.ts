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
  apiKey: process.env.GEMINI_API_KEY,
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

/**
  * Standardized input normalization helper as required by Phase 8.1:
  * 1. NFC unicode normalize
  * 2. Lowercase
  * 3. Trim whitespace
  * 4. Collapse multiple spaces
  */
export function normalizeFoodInput(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
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
  let s = normalizeFoodInput(str);
  
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
  const qPhonetic = getPhoneticKey(normalizedQuery);
  
  let bestMatch: FoodItem | null = null;
  let highestScore = 0;

  for (const food of foodCache.values()) {
    const labelsToCheck = [normalizeFoodInput(food.label), ...food.aliases.map(normalizeFoodInput)];
    
    for (const target of labelsToCheck) {
      if (!target) continue;

      const tPhonetic = getPhoneticKey(target);

      // 1. Exact phonetic key match (very high confidence)
      if (qPhonetic === tPhonetic && qPhonetic.length > 1) {
        return food;
      }

      // 2. Substring matching for incomplete names / abbreviations
      if (normalizedQuery.length >= 3 && target.length >= 3) {
        if (target.includes(normalizedQuery) || normalizedQuery.includes(target)) {
          const score = Math.min(normalizedQuery.length, target.length) / Math.max(normalizedQuery.length, target.length);
          if (score > highestScore && score >= 0.7) {
            highestScore = score;
            bestMatch = food;
          }
        }
      }

      // 3. Phonetic substring match
      if (qPhonetic.length >= 3 && tPhonetic.length >= 3) {
        if (tPhonetic.includes(qPhonetic) || qPhonetic.includes(tPhonetic)) {
          const score = Math.min(qPhonetic.length, tPhonetic.length) / Math.max(qPhonetic.length, tPhonetic.length);
          if (score > highestScore && score >= 0.75) {
            highestScore = score;
            bestMatch = food;
          }
        }
      }

      // 4. Levenshtein similarity on string
      const textSimilarity = getSimilarity(normalizedQuery, target);
      if (textSimilarity > highestScore && textSimilarity >= 0.82) {
        highestScore = textSimilarity;
        bestMatch = food;
      }

      // 5. Levenshtein similarity on phonetics
      const phoneticSimilarity = getSimilarity(qPhonetic, tPhonetic);
      if (phoneticSimilarity > highestScore && phoneticSimilarity >= 0.85) {
        highestScore = phoneticSimilarity;
        bestMatch = food;
      }
    }
  }

  return bestMatch;
}

// Seed data for common foods to minimize initial Gemini worker calls
const INITIAL_FOOD_SEED = [
  { label: "কচু", category: "Vegetables", aliases: ["kochu", "kosu", "kocu", "kochoo", "কচু", "taro"] },
  { label: "কচুর লতি", category: "Vegetables", aliases: ["kochur loti", "kosur loti", "kocur loti", "কছুর লতি", "loti", "taro stem"] },
  { label: "পুঁই শাক", category: "Vegetables", aliases: ["pui shak", "পুঁইশাক", "pui saag", "pui", "পুঁই"] },
  { label: "লাল শাক", category: "Vegetables", aliases: ["lal shak", "লালশাক", "lal saag", "red spinach"] },
  { label: "কলমি শাক", category: "Vegetables", aliases: ["kolmi shak", "কলমিশাক", "kolmi", "water spinach"] },
  { label: "ঢেঁড়স", category: "Vegetables", aliases: ["dherosh", "dhyarosh", "dheros", "ঢেরস", "okra", "ladies finger"] },
  { label: "চিংড়ি", category: "Fish", aliases: ["chingri", "চিংড়ি", "shrimp", "prawn", "চিংড়ি মাছ"] },
  { label: "রুই মাছ", category: "Fish", aliases: ["rui mach", "রুই", "rui fish", "রুই মাছের ঝোল"] },
  { label: "মুরগি", category: "Chicken", aliases: ["murgi", "morgi", "murghi", "মুরগী", "chicken", "চিকেন", "মুরগির মাংস"] },
  { label: "গরুর মাংস", category: "Beef", aliases: ["beef", "gorur mangso", "গরু", "বিফ", "goru"] },
  { label: "খাসির মাংস", category: "Mutton", aliases: ["mutton", "khasir mangso", "খাসি", "মটন"] },
  { label: "ডাল", category: "Lentils", aliases: ["dal", "daal", "মসুর ডাল", "মুগ ডাল", "ডাল চচ্চড়ি"] },
  { label: "ডিম", category: "Eggs", aliases: ["egg", "dim", "ডিম ভাজি", "ডিম ভুনা", "সিদ্ধ ডিম"] },
  { label: "ভাত", category: "Rice", aliases: ["bhat", "rice", "সাদা ভাত", "পোলাও", "খিচুড়ি"] },
  { label: "আলু", category: "Vegetables", aliases: ["alu", "potato", "aloo", "আলু ভাজি", "আলু ভর্তা"] },
  { label: "বেগুন", category: "Vegetables", aliases: ["begun", "eggplant", "brinjal", "বেগুন ভাজি"] },
  { label: "পটল", category: "Vegetables", aliases: ["potol", "pointed gourd", "পটল ভাজি"] },
  { label: "লাউ", category: "Vegetables", aliases: ["lau", "bottle gourd", "লাউ শাক"] },
  { label: "টমেটো", category: "Vegetables", aliases: ["tomato", "tomato salad", "টমেটো সালাদ"] },
  { label: "সবজি", category: "Vegetables", aliases: ["sobji", "vegetable", "সবজী", "নিরামিষ"] },
];

/**
 * Initialize Cache from database or seed it if empty
 */
export async function initializeFoodCache() {
  if (isInitialized) return;

  try {
    let dbFoods = await db.select().from(foodKnowledgeBase);

    // Seed database if empty
    if (dbFoods.length === 0) {
      console.log("[Food Knowledge] Database is empty. Seeding default known foods...");
      const timestamp = new Date().toISOString();
      for (const item of INITIAL_FOOD_SEED) {
        const foodId = "food_" + generateUUID();
        const aliasesJson = JSON.stringify(item.aliases);

        await db.insert(foodKnowledgeBase).values({
          id: foodId,
          label: item.label,
          category: item.category,
          aliases: aliasesJson,
          confidence: 1.0,
          timestamp,
          frequency: 0,
        });

        // Insert into aliases table
        const normalizedAliases = Array.from(new Set([
          normalizeFoodInput(item.label),
          ...item.aliases.map(normalizeFoodInput)
        ]));

        for (const alias of normalizedAliases) {
          if (alias) {
            await db.insert(foodAliases).values({
              id: "alias_" + generateUUID(),
              alias,
              foodId,
            }).onConflictDoNothing();
          }
        }
      }
      // Re-read seeded tables
      dbFoods = await db.select().from(foodKnowledgeBase);
    }

    // Populate in-memory cache
    foodCache.clear();
    aliasCache.clear();

    const dbAliases = await db.select().from(foodAliases);

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
      aliasCache.set(normalizeFoodInput(aliasEntry.alias), aliasEntry.foodId);
    }

    isInitialized = true;
    console.log(`[Food Knowledge] Cache initialized with ${foodCache.size} canonical foods and ${aliasCache.size} aliases.`);
  } catch (error) {
    console.error("[Food Knowledge] Failed to initialize cache:", error);
  }
}

/**
 * Autocomplete Search in PostgreSQL/Cache without calling Gemini.
 * Returns canonical foods matching the input string prefix, label, or aliases.
 */
export async function searchFoodDatabase(query: string): Promise<FoodItem[]> {
  await initializeFoodCache();
  const normalized = normalizeFoodInput(query);
  if (!normalized) {
    return Array.from(foodCache.values()).sort((a, b) => b.frequency - a.frequency).slice(0, 10);
  }

  const matches: FoodItem[] = [];
  const addedIds = new Set<string>();

  for (const food of foodCache.values()) {
    const normLabel = normalizeFoodInput(food.label);
    const normAliases = food.aliases.map(normalizeFoodInput);

    const isMatch = normLabel.includes(normalized) || normAliases.some(a => a.includes(normalized));
    if (isMatch && !addedIds.has(food.id)) {
      addedIds.add(food.id);
      matches.push(food);
    }
  }

  // Sort by frequency & label length for best match relevance
  matches.sort((a, b) => {
    const aExact = normalizeFoodInput(a.label) === normalized ? 100 : 0;
    const bExact = normalizeFoodInput(b.label) === normalized ? 100 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return b.frequency - a.frequency;
  });

  return matches.slice(0, 10);
}

/**
 * Instant Synchronous Canonical Resolution without Gemini.
 * Maps rawName (e.g. kosu, kochu, kocu) to Canonical Food (e.g. কচু).
 */
export function resolveCanonicalFoodSync(rawName: string): { label: string; category: string; id: string; isKnown: boolean } {
  if (!rawName) return { label: "", category: "Other", id: "", isKnown: false };
  const normalized = normalizeFoodInput(rawName);
  if (!normalized) return { label: rawName, category: "Other", id: "", isKnown: false };

  // 1. Direct Alias Cache Match
  const exactAliasFoodId = aliasCache.get(normalized);
  if (exactAliasFoodId) {
    const food = foodCache.get(exactAliasFoodId);
    if (food) return { label: food.label, category: food.category, id: food.id, isKnown: true };
  }

  // 2. Direct Canonical Label Match
  for (const food of foodCache.values()) {
    if (normalizeFoodInput(food.label) === normalized) {
      return { label: food.label, category: food.category, id: food.id, isKnown: true };
    }
  }

  // 3. Programmatic Fuzzy Match
  const fuzzy = findFuzzyMatch(normalized);
  if (fuzzy) {
    return { label: fuzzy.label, category: fuzzy.category, id: fuzzy.id, isKnown: true };
  }

  return { label: rawName, category: "Other", id: "", isKnown: false };
}

/**
 * Async Canonical Resolution with cache initialization.
 */
export async function resolveCanonicalFood(rawName: string): Promise<{ label: string; category: string; id: string; isKnown: boolean }> {
  await initializeFoodCache();
  return resolveCanonicalFoodSync(rawName);
}

/**
 * Check if a food phrase is known in the alias library.
 * Returns status without calling Gemini.
 */
export async function checkFoodRecognition(rawName: string): Promise<{
  isKnown: boolean;
  canonical?: { id: string; label: string; category: string; aliases: string[] };
  message?: string;
  GeminiCalled: boolean;
}> {
  await initializeFoodCache();
  const res = resolveCanonicalFoodSync(rawName);

  if (res.isKnown) {
    const food = foodCache.get(res.id);
    return {
      isKnown: true,
      canonical: {
        id: res.id,
        label: res.label,
        category: res.category,
        aliases: food ? food.aliases : [],
      },
      GeminiCalled: false,
    };
  }

  return {
    isKnown: false,
    message: "Unknown food detected.",
    GeminiCalled: false,
  };
}

/**
 * Ask Gemini for Unknown Food Suggestion.
 * CRITICAL RULE: Gemini suggestions MUST NEVER modify the database automatically!
 * This function returns the suggestion for UI user/admin approval.
 */
export async function askGeminiForUnknownFood(rawName: string): Promise<{
  suggestion: {
    isMatch: boolean;
    matchedFoodId: string | null;
    matchedLabel: string | null;
    newFoodLabel: string | null;
    newFoodCategory: string | null;
    confidence: number;
    confidencePercent: string;
    reason: string;
    aliasesToSave: string[];
  };
}> {
  await initializeFoodCache();
  const normalized = normalizeFoodInput(rawName);

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

Analyze if "${rawName}" refers to one of the existing canonical foods (even with typos, dialect variations, transliterations, or abbreviations).
For example: "kosu", "kochu", "kocu", "kochoo" all refer to "কচু". "murgi", "morgi", "murghi" all refer to "মুরগি".

Respond with a strict JSON object:
{
  "isMatch": true or false,
  "matchedFoodId": "ID if matched, else null",
  "matchedLabel": "label if matched, else null",
  "newFoodLabel": "canonical Bengali food name if completely new food, else null",
  "newFoodCategory": "One of: 'Vegetables', 'Fish', 'Chicken', 'Beef', 'Mutton', 'Eggs', 'Lentils', 'Rice', 'Dessert', 'Drinks', 'Other'",
  "confidence": 0.96 (number between 0.0 and 1.0),
  "reason": "short explanatory reason",
  "aliasesToSave": ["${normalized}", "other variations"]
}`;

  try {
    console.log(`[Food Knowledge] Asking Gemini for unknown food suggestion: "${rawName}"`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
            confidence: { type: Type.NUMBER },
            reason: { type: Type.STRING },
            aliasesToSave: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["isMatch", "confidence", "reason", "aliasesToSave"]
        }
      }
    });

    const res = JSON.parse(response.text.trim());
    const confidenceNum = Number(res.confidence || 0.9);
    const confidencePercent = Math.round(confidenceNum * 100) + "%";

    return {
      suggestion: {
        isMatch: Boolean(res.isMatch),
        matchedFoodId: res.matchedFoodId || null,
        matchedLabel: res.matchedLabel || null,
        newFoodLabel: res.newFoodLabel || null,
        newFoodCategory: res.newFoodCategory || "Vegetables",
        confidence: confidenceNum,
        confidencePercent,
        reason: res.reason || `Probably means ${res.matchedLabel || res.newFoodLabel || rawName}`,
        aliasesToSave: Array.from(new Set([normalized, ...(res.aliasesToSave || []).map(normalizeFoodInput)])).filter(Boolean),
      }
    };
  } catch (err) {
    console.error("[Food Knowledge] Gemini suggestion call failed:", err);
    return {
      suggestion: {
        isMatch: false,
        matchedFoodId: null,
        matchedLabel: null,
        newFoodLabel: rawName,
        newFoodCategory: "Vegetables",
        confidence: 0.8,
        confidencePercent: "80%",
        reason: `Suggested food: ${rawName}`,
        aliasesToSave: [normalized],
      }
    };
  }
}

/**
 * Approve and Permanently Catalog a Food or Alias in PostgreSQL.
 * Nothing is permanently saved until an authorized user/admin approves it!
 */
export async function approveFoodSuggestion(data: {
  label: string;
  category: string;
  aliases: string[] | string;
  matchedFoodId?: string;
  reviewId?: string;
}): Promise<{ success: boolean; foodId: string }> {
  await initializeFoodCache();

  const timestamp = new Date().toISOString();
  let aliasesArr: string[] = [];
  if (Array.isArray(data.aliases)) {
    aliasesArr = data.aliases.map(normalizeFoodInput).filter(Boolean);
  } else if (typeof data.aliases === "string") {
    aliasesArr = data.aliases.split(",").map(normalizeFoodInput).filter(Boolean);
  }

  const canonicalLabel = data.label.trim();
  const category = data.category || "Vegetables";

  let foodId = data.matchedFoodId || "";

  // Check if food already exists by label
  if (!foodId) {
    for (const food of foodCache.values()) {
      if (normalizeFoodInput(food.label) === normalizeFoodInput(canonicalLabel)) {
        foodId = food.id;
        break;
      }
    }
  }

  if (foodId && foodCache.has(foodId)) {
    // Existing canonical food -> Add new aliases to it
    const existing = foodCache.get(foodId)!;
    const combinedAliases = Array.from(new Set([
      ...existing.aliases.map(normalizeFoodInput),
      normalizeFoodInput(canonicalLabel),
      ...aliasesArr
    ])).filter(Boolean);

    await db.update(foodKnowledgeBase)
      .set({ aliases: JSON.stringify(combinedAliases) })
      .where(eq(foodKnowledgeBase.id, foodId));

    for (const alias of combinedAliases) {
      await db.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias,
        foodId,
      }).onConflictDoNothing();
      aliasCache.set(alias, foodId);
    }

    existing.aliases = combinedAliases;
  } else {
    // Brand new canonical food
    foodId = "food_" + generateUUID();
    const combinedAliases = Array.from(new Set([
      normalizeFoodInput(canonicalLabel),
      ...aliasesArr
    ])).filter(Boolean);

    await db.insert(foodKnowledgeBase).values({
      id: foodId,
      label: canonicalLabel,
      category,
      aliases: JSON.stringify(combinedAliases),
      confidence: 1.0,
      timestamp,
      frequency: 1,
    });

    for (const alias of combinedAliases) {
      await db.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias,
        foodId,
      }).onConflictDoNothing();
      aliasCache.set(alias, foodId);
    }

    foodCache.set(foodId, {
      id: foodId,
      label: canonicalLabel,
      category,
      aliases: combinedAliases,
      confidence: 1.0,
      timestamp,
      frequency: 1,
    });
  }

  // Update review queue item if provided
  if (data.reviewId) {
    await db.update(foodReviewQueue)
      .set({ status: "APPROVED", detectedFood: canonicalLabel })
      .where(eq(foodReviewQueue.id, data.reviewId));
  }

  invalidateFoodCache();
  await initializeFoodCache();

  return { success: true, foodId };
}

/**
 * Add a new alias to an existing canonical food.
 */
export async function addAliasToFood(foodId: string, rawAlias: string) {
  await initializeFoodCache();
  const food = foodCache.get(foodId);
  if (!food) throw new Error("Canonical Food not found");

  const normalized = normalizeFoodInput(rawAlias);
  if (!normalized) return;

  if (!food.aliases.includes(normalized)) {
    food.aliases.push(normalized);
  }

  await db.update(foodKnowledgeBase)
    .set({ aliases: JSON.stringify(food.aliases) })
    .where(eq(foodKnowledgeBase.id, foodId));

  await db.insert(foodAliases).values({
    id: "alias_" + generateUUID(),
    alias: normalized,
    foodId,
  }).onConflictDoNothing();

  aliasCache.set(normalized, foodId);
}

/**
 * Remove an alias from a canonical food.
 */
export async function removeAliasFromFood(foodId: string, rawAlias: string) {
  await initializeFoodCache();
  const food = foodCache.get(foodId);
  if (!food) throw new Error("Canonical Food not found");

  const normalized = normalizeFoodInput(rawAlias);
  food.aliases = food.aliases.filter(a => normalizeFoodInput(a) !== normalized);

  await db.update(foodKnowledgeBase)
    .set({ aliases: JSON.stringify(food.aliases) })
    .where(eq(foodKnowledgeBase.id, foodId));

  await db.delete(foodAliases).where(eq(foodAliases.alias, normalized));
  aliasCache.delete(normalized);
}

/**
 * Merge two canonical foods (sourceId into targetId).
 * Combines aliases, sums frequency, re-indexes aliases, and deletes source food.
 */
export async function mergeFoodsInDb(sourceId: string, targetId: string) {
  await initializeFoodCache();
  const source = foodCache.get(sourceId);
  const target = foodCache.get(targetId);

  if (!source || !target) {
    throw new Error("Source or target food not found");
  }

  const combinedAliases = Array.from(new Set([
    ...target.aliases.map(normalizeFoodInput),
    normalizeFoodInput(source.label),
    ...source.aliases.map(normalizeFoodInput)
  ])).filter(Boolean);

  const combinedFrequency = target.frequency + source.frequency;

  // 1. Update target food
  await db.update(foodKnowledgeBase)
    .set({
      aliases: JSON.stringify(combinedAliases),
      frequency: combinedFrequency,
    })
    .where(eq(foodKnowledgeBase.id, targetId));

  // 2. Remap aliases in food_aliases table
  await db.update(foodAliases)
    .set({ foodId: targetId })
    .where(eq(foodAliases.foodId, sourceId));

  // Add missing alias rows for target
  for (const alias of combinedAliases) {
    await db.insert(foodAliases).values({
      id: "alias_" + generateUUID(),
      alias,
      foodId: targetId,
    }).onConflictDoNothing();
  }

  // 3. Delete source food
  await db.delete(foodKnowledgeBase).where(eq(foodKnowledgeBase.id, sourceId));

  invalidateFoodCache();
  await initializeFoodCache();
}

/**
 * Split text by major Bengali/English food delimiters
 */
export function splitMenuText(text: string): string[] {
  if (!text) return [];

  const normalizedText = text
    .replace(/\s+(and|&|ও|এবং|আর|with)\s+/gi, ",")
    .replace(/\s*\+\s*/g, ",")
    .replace(/\s+(দিয়ে|দিয়ে)\s+/g, ",");

  return normalizedText
    .split(/[,/+\u2022，、|]/)
    .map(i => i.trim())
    .filter(Boolean);
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
    const canonical = resolveCanonicalFoodSync(phrase);
    if (canonical.isKnown && canonical.id) {
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

  let totalDBSaves = 0;
  const topRecognized: any[] = [];

  for (const food of foodCache.values()) {
    totalDBSaves += food.frequency;
    topRecognized.push({
      id: food.id,
      label: food.label,
      category: food.category,
      frequency: food.frequency,
      aliasCount: food.aliases.length,
      aliases: food.aliases,
    });
  }

  topRecognized.sort((a, b) => b.frequency - a.frequency);

  const geminiCallsCount = Math.max(0, totalKnown - INITIAL_FOOD_SEED.length + reviewQueue.length);
  const hits = totalDBSaves;
  const totalQueries = hits + geminiCallsCount;
  const efficiency = totalQueries > 0 ? (hits / totalQueries) * 100 : 100;

  return {
    totalKnown,
    pendingReviews: pendingCount,
    totalSavesRecognized: totalDBSaves,
    efficiencyScore: Math.round(efficiency * 10) / 10,
    topFoods: topRecognized.slice(0, 10),
    reviewQueue,
  };
}

