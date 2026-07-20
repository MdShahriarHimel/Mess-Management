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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
  } catch (error) {
    console.error("[Gemini Teacher] Failed to execute Gemini learning pipeline:", error);
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

  const combinedTexts = [lunchVegetable, lunchMain, dinnerVegetable, dinnerMain]
    .filter(Boolean)
    .join(", ");

  if (!combinedTexts.trim()) return;

  const { known, unknown } = extractFoodPhrases(combinedTexts);

  // 1. Process and Increment frequencies of matching known food labels
  const allMatchedFoodIds = new Set<string>();
  for (const label of known) {
    // Find food ID from our cache
    for (const [foodId, food] of foodCache.entries()) {
      if (food.label === label) {
        allMatchedFoodIds.add(foodId);
        break;
      }
    }
  }

  // Increment frequency counts in DB and Cache
  for (const foodId of allMatchedFoodIds) {
    const cachedItem = foodCache.get(foodId);
    if (cachedItem) {
      cachedItem.frequency += 1;
      await db
        .update(foodKnowledgeBase)
        .set({ frequency: cachedItem.frequency })
        .where(eq(foodKnowledgeBase.id, foodId));
    }
  }

  // 2. Call Gemini for truly unknown residual phrases
  if (unknown.length > 0) {
    console.log(`[Food Knowledge] Found ${unknown.length} unknown phrases. Initiating Gemini teacher pipeline...`);
    const { learned } = await learnUnknownFoods(unknown);

    // Increment frequency for newly learned foods too
    for (const item of learned) {
      for (const [foodId, food] of foodCache.entries()) {
        if (food.label === item.label) {
          food.frequency += 1;
          await db
            .update(foodKnowledgeBase)
            .set({ frequency: food.frequency })
            .where(eq(foodKnowledgeBase.id, foodId));
          break;
        }
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
