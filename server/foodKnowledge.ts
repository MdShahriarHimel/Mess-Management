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
  const qPhonetic = getPhoneticKey(normalizedQuery);
  
  let bestMatch: FoodItem | null = null;
  let highestScore = 0;

  for (const food of foodCache.values()) {
    const labelsToCheck = [food.label.toLowerCase().trim(), ...food.aliases];
    
    for (const target of labelsToCheck) {
      const targetNormalized = target.toLowerCase().trim();
      if (!targetNormalized) continue;

      const tPhonetic = getPhoneticKey(targetNormalized);

      // 1. Exact phonetic key match (very high confidence)
      if (qPhonetic === tPhonetic && qPhonetic.length > 1) {
        return food;
      }

      // 2. Substring matching for incomplete names / abbreviations
      if (normalizedQuery.length >= 4 && targetNormalized.length >= 4) {
        if (targetNormalized.includes(normalizedQuery) || normalizedQuery.includes(targetNormalized)) {
          const score = Math.min(normalizedQuery.length, targetNormalized.length) / Math.max(normalizedQuery.length, targetNormalized.length);
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
      const textSimilarity = getSimilarity(normalizedQuery, targetNormalized);
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
  { label: "পুঁই শাক", category: "Vegetables", aliases: ["pui shak", "পুঁইশাক", "pui saag", "pui", "পুঁই"] },
  { label: "চিংড়ি", category: "Fish", aliases: ["chingri", "চিংড়ি", "shrimp", "prawn", "চিংড়ি মাছ"] },
  { label: "রুই মাছ", category: "Fish", aliases: ["rui mach", "রুই", "rui fish", "রুই মাছের ঝোল"] },
  { label: "মুরগির মাংস", category: "Chicken", aliases: ["chicken", "murgi", "মুরগি", "মুরগী", "চিকেন"] },
  { label: "গরুর মাংস", category: "Beef", aliases: ["beef", "gorur mangso", "গরু", "বিফ"] },
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

// Global rate-limit cooldown tracker to avoid spamming Gemini when 429 RESOURCE_EXHAUSTED is hit
let geminiCooldownUntil = 0;

/**
 * Initialize Cache from database or seed it if empty
 */
export async function initializeFoodCache() {
  if (isInitialized) return;

  try {
    console.log("[Food Knowledge] Loading cache from database...");
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
          item.label.toLowerCase().trim(),
          ...item.aliases.map(a => a.toLowerCase().trim())
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

    // Greedy matching
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
        // Remove matched alias portion from the remaining string to avoid double matching
        remaining = remaining.replace(alias, "").replace(/\s+/g, " ").trim();
      }
    }

    // Clean up residual separators and preparation descriptions
    const cleanResidual = remaining
      .replace(/^(ভুনা|ঝোল|ভাজি|কারি|দোপিয়াজা|ভর্তা|সিদ্ধ|পোক্তা|ঝাল|কষা|চিকেন|ফ্রাই|মশলাদার)\s+/gi, "")
      .replace(/\s+(ভুنا|ঝোল|ভাজি|কারি|দোপিয়াজা|ভর্তা|সিদ্ধ|পোক্তা|ঝাল|কষা|চিকেন|ফ্রাই|মশলাদার)$/gi, "")
      .trim();

    if (cleanResidual.length > 1 && !matchedAny) {
      unknownPhrases.push(part); // Send the full original unrecognized part to Gemini to preserve complete context
    } else if (cleanResidual.length > 2 && matchedAny) {
      // If we matched some known things but have significant residue left, send the residue as unknown
      unknownPhrases.push(cleanResidual);
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

  const prompt = `You are a culinary expert on Bengali foods and daily meal menus.
Analyze the following list of raw food phrases from a meal menu dashboard.
For each phrase, identify:
1. The canonical food item name in standard Bengali (label).
2. Other common names, English names, phonetic spellings, or Bengali variations (aliases).
3. The main category ('Vegetables', 'Fish', 'Chicken', 'Beef', 'Mutton', 'Eggs', 'Lentils', 'Rice', 'Dessert', 'Drinks', 'Other').
4. Your confidence score (0.0 to 1.0) that this is indeed a recognized food item in Bangladesh/Bengal region. If you are uncertain or it is a random non-food word, set confidence low (under 0.95).

Input Phrases:
${JSON.stringify(phrases, null, 2)}

Return a strict JSON array conforming to the schema.`;

  try {
    console.log(`[Gemini Teacher] Asking Gemini to teach us about unknown phrases: ${phrases.join(", ")}`);
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
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
      console.warn(`[Gemini Teacher] Primary model call failed (${err?.message}). Attempting fallback query...`);
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });
    }

    const results = JSON.parse(response.text.trim());
    const learnedList: any[] = [];
    const queuedList: any[] = [];
    const timestamp = new Date().toISOString();

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
    const isQuota = error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isQuota) {
      geminiCooldownUntil = Date.now() + 45000;
      console.warn(`[Gemini Teacher] Gemini rate limit reached (429/RESOURCE_EXHAUSTED). Entering 45s cooldown.`);
    } else {
      console.warn("[Gemini Teacher] Failed to execute Gemini learning pipeline:", error?.message || error);
    }
    // On error, write original phrases to review queue as PENDING so they are not lost
    const timestamp = new Date().toISOString();
    for (const p of phrases) {
      try {
        await db.insert(foodReviewQueue).values({
          id: "review_" + generateUUID(),
          phrase: p,
          detectedFood: "Failed Gemini pipeline",
          confidence: 0.0,
          timestamp,
          status: "PENDING",
        }).onConflictDoNothing();
      } catch (err) {}
    }
    return { learned: [], queued: phrases.map(p => ({ phrase: p, confidence: 0 })) };
  }
}

/**
 * 5-Step Semantic Recognition Pipeline:
 * 1. Normalize Input (NFC normalize, lowercase, ignore punctuation)
 * 2. Alias Database Lookup
 * 3. Fuzzy Matching (phonetics, substrings, Levenshtein distance)
 * 4. Gemini AI (Last Resort semantic match)
 * 5. Self Learning (Save newly matched alias permanently)
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

  // Step 2: Alias Database and exact Cache Lookup
  const exactAliasFoodId = aliasCache.get(normalized);
  if (exactAliasFoodId) {
    const food = foodCache.get(exactAliasFoodId);
    if (food) {
      return { label: food.label, category: food.category, id: food.id };
    }
  }

  for (const food of foodCache.values()) {
    if (food.label.toLowerCase().trim() === normalized) {
      return { label: food.label, category: food.category, id: food.id };
    }
  }

  // Step 3: Programmatic Fuzzy Matching (phonetics, substring, Levenshtein distance)
  const fuzzyMatch = findFuzzyMatch(normalized);
  if (fuzzyMatch) {
    // Step 5: Self Learning - Automatically register this exact raw query as an alias so next time it is Step 2
    try {
      await db.insert(foodAliases).values({
        id: "alias_" + generateUUID(),
        alias: normalized,
        foodId: fuzzyMatch.id
      }).onConflictDoNothing();
      
      // Update local cache
      aliasCache.set(normalized, fuzzyMatch.id);
      
      // Also update food's aliases array in DB & cache if not already in there
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

  // Step 4: Gemini AI (Last Resort semantic reasoning)
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
      model: "gemini-3.6-flash",
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
    const isQuota = error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isQuota) {
      geminiCooldownUntil = Date.now() + 45000;
      console.warn(`[Food Knowledge] Gemini rate limit reached (429/RESOURCE_EXHAUSTED) for "${rawName}". Entering 45s cooldown.`);
    } else {
      console.warn(`[Food Knowledge] Gemini semantic recognition failed for "${rawName}":`, error?.message || error);
    }
    // Graceful fallback to raw input in case of Gemini errors
    return { label: rawName, category: "Other", id: "" };
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
