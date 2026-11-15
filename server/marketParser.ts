/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { db } from "../src/db/index.js";
import { foodKnowledgeBase, foodAliases, persistentFiles as persistentFilesTable } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { generateUUID, DB_DIR, writeAndPersistFile } from "./db.js";

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

const PARSER_CACHE_VERSION = "v2";

export interface ParsedVoucherItem {
  name: string;
  originalText: string;
  amount: number;
  quantity?: string;
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
    id: "sonali_chicken",
    label: "সোনালি মুরগি",
    category: "Chicken",
    emoji: "🐥",
    aliases: ["sonali", "shonali", "sonali murgi", "shonali murgi", "sonali chicken", "pakistani murgi", "সোনালি মুরগি", "সোনালি মুরগী", "সোনালী মুরগি", "সোনালী মুরগী", "সোনালি", "সোনালী", "পাকিস্তানি মুরগি"]
  },
  {
    id: "broiler_chicken",
    label: "ব্রয়লার মুরগি",
    category: "Chicken",
    emoji: "🐔",
    aliases: ["broiler", "boiler", "broilar", "broiler murgi", "broiler chicken", "ব্রয়লার", "ব্রয়লার", "ব্রয়লার মুরগি", "ব্রয়লার মুরগি", "ব্রয়লার মুরগী", "ব্রয়লার মুরগী", "বয়লার", "বয়লার"]
  },
  {
    id: "chicken",
    label: "মুরগির মাংস",
    category: "Chicken",
    emoji: "🐔",
    aliases: ["murgi", "morgi", "chicken", "deshi murgi", "মুরগি", "মুরগী", "মুরগির মাংস", "মুরগীর মাংস", "মুরগির", "চিকেন", "দেশি মুরগি", "দেশী মুরগি"]
  },
  {
    id: "quail",
    label: "কোয়েল",
    category: "Chicken",
    emoji: "🐦",
    aliases: ["koel", "koyel", "quail", "কোয়েল", "কোয়েল", "কোয়েল পাখি", "কোয়েল পাখি"]
  },
  {
    id: "shrimp",
    label: "চিংড়ি মাছ",
    category: "Fish",
    emoji: "🦐",
    aliases: ["chingri", "chinri", "chingree", "chingri mach", "prawn", "shrimp", "চিংড়ি", "চিংড়ি", "চিংড়ী", "চিংড়ি মাছ"]
  },
  {
    id: "shutki",
    label: "শুটকি",
    category: "Fish",
    emoji: "🐟",
    aliases: ["shutki", "sutki", "shutki mach", "sutki mach", "loitta shutki", "churi shutki", "dry fish", "dried fish", "শুটকি", "শুটকী", "শুঁটকি", "শুটকি মাছ", "শুটকী মাছ", "লইট্যা শুটকি", "চ্যাপা শুটকি", "ছুরি শুটকি"]
  },
  {
    id: "fish",
    label: "মাছ",
    category: "Fish",
    emoji: "🐟",
    aliases: [
      "mach", "maach", "fish", "rui", "ilish", "katla", "pangas", "pangash", "telapia", "shol", "koi",
      "pabda", "choto mach", "small fish", "tengra", "shing", "magur", "boal", "mrigel", "carp",
      "মাছ", "রুই", "রুই মাছ", "ইলিশ", "কাতলা", "পাঙ্গাস", "তেলাপিয়া", "তেলাপিয়া", "পাবদা", "পাবদা মাছ", "ছোট মাছ", "টেংরা", "শিং", "মাগুর", "বোয়াল"
    ]
  },
  {
    id: "egg",
    label: "ডিম",
    category: "Eggs",
    emoji: "🥚",
    aliases: ["dim", "deem", "egg", "eggs", "anda", "ডিম", "আন্ডা", "হাঁসের ডিম"]
  },
  {
    id: "pui_shak",
    label: "পুঁইশাক",
    category: "Vegetables",
    emoji: "🥬",
    aliases: ["puishak", "pui shak", "pui saag", "malabar spinach", "পুঁইশাক", "পুঁই শাক", "পুইশাক", "পুই শাক"]
  },
  {
    id: "red_amaranth",
    label: "লালশাক",
    category: "Vegetables",
    emoji: "🥬",
    aliases: ["lalshak", "lal shak", "lal saag", "লালশাক", "লাল শাক"]
  },
  {
    id: "palong_shak",
    label: "পালংশাক",
    category: "Vegetables",
    emoji: "🥬",
    aliases: ["palong", "palong shak", "palong saag", "spinach", "পালংশাক", "পালং শাক", "পালং"]
  },
  {
    id: "kolmi_shak",
    label: "কলমিশাক",
    category: "Vegetables",
    emoji: "🥬",
    aliases: ["kolmi", "kolmi shak", "water spinach", "কলমিশাক", "কলমি শাক", "কলমি"]
  },
  {
    id: "cauliflower",
    label: "ফুলকপি",
    category: "Vegetables",
    emoji: "🥦",
    aliases: ["fulkopi", "phulkopi", "ful kopi", "full kopi", "fullkopi", "cauliflower", "ফুলকপি", "ফুল কপি", "কপি"]
  },
  {
    id: "cabbage",
    label: "বাঁধাকপি",
    category: "Vegetables",
    emoji: "🥬",
    aliases: ["badhakopi", "badha kopi", "bandhakopi", "cabbage", "বাঁধাকপি", "বাধাকপি", "পাতাকপি", "পাতা কপি"]
  },
  {
    id: "tomato",
    label: "টমেটো",
    category: "Vegetables",
    emoji: "🍅",
    aliases: ["tomato", "tomatoes", "টমেটো", "টমেটু"]
  },
  {
    id: "bean",
    label: "শিম",
    category: "Vegetables",
    emoji: "🫛",
    aliases: ["shim", "sim", "seem", "bean", "beans", "শিম", "সিম", "শীম"]
  },
  {
    id: "bottle_gourd",
    label: "লাউ",
    category: "Vegetables",
    emoji: "🍈",
    aliases: ["lau", "law", "bottle gourd", "gourd", "লাউ", "কদু"]
  },
  {
    id: "eggplant",
    label: "বেগুন",
    category: "Vegetables",
    emoji: "🍆",
    aliases: ["begun", "brinjal", "eggplant", "aubergine", "বেগুন", "তাল বেগুন"]
  },
  {
    id: "chichinga",
    label: "চিচিঙ্গা",
    category: "Vegetables",
    emoji: "🥒",
    aliases: ["chichinga", "chichingha", "cicinga", "snake gourd", "চিচিঙ্গা", "চিচিঙা", "চিচিংগা"]
  },
  {
    id: "pointed_gourd",
    label: "পটল",
    category: "Vegetables",
    emoji: "🥒",
    aliases: ["potol", "patol", "pointed gourd", "পটল"]
  },
  {
    id: "okra",
    label: "ঢেঁড়স",
    category: "Vegetables",
    emoji: "🫛",
    aliases: ["dheros", "dherosh", "bhindi", "okra", "ঢেঁড়স", "ঢেঁড়স", "ঢেড়স", "ভেন্ডি"]
  },
  {
    id: "bitter_gourd",
    label: "করলা",
    category: "Vegetables",
    emoji: "🥒",
    aliases: ["korola", "korolla", "karela", "bitter gourd", "করলা", "উচ্ছে"]
  },
  {
    id: "cucumber",
    label: "শসা",
    category: "Vegetables",
    emoji: "🥒",
    aliases: ["shosha", "sosa", "cucumber", "শসা"]
  },
  {
    id: "pumpkin",
    label: "মিষ্টি কুমড়া",
    category: "Vegetables",
    emoji: "🎃",
    aliases: ["kumra", "misti kumra", "mishti kumra", "pumpkin", "কুমড়া", "কুমড়া", "মিষ্টি কুমড়া", "মিষ্টিকুমড়া"]
  },
  {
    id: "carrot",
    label: "গাজর",
    category: "Vegetables",
    emoji: "🥕",
    aliases: ["gajor", "carrot", "carrots", "গাজর"]
  },
  {
    id: "radish",
    label: "মুলা",
    category: "Vegetables",
    emoji: "🥕",
    aliases: ["mula", "radish", "মুলা", "মূলা"]
  },
  {
    id: "taro",
    label: "কচু",
    category: "Vegetables",
    emoji: "🥔",
    aliases: ["kochu", "kochu mukhi", "taro", "কচু", "কচুর মুখি", "লতি", "কচুর লতি"]
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
    aliases: ["peyaj", "peaj", "piyaj", "pyaj", "piaj", "piaz", "peyaz", "onion", "onions", "পেঁয়াজ", "পেঁয়াজ", "পিঁয়াজ", "পিঁয়াজ", "পিয়াজ", "পিয়াজ", "পেয়াজ", "পেয়াজ"]
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
    id: "peanut",
    label: "বাদাম",
    category: "Grocery",
    emoji: "🥜",
    aliases: ["badam", "baadam", "chinabadam", "china badam", "kaju", "kajubadam", "kathbadam", "kath badam", "peanut", "peanuts", "nut", "nuts", "almond", "cashew", "বাদাম", "চিনাবাদাম", "চিনা বাদাম", "কাজুবাদাম", "কাঠবাদাম", "পেস্তা বাদাম"]
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
    emoji: "🟡",
    aliases: ["dal", "daal", "lentil", "lentils", "mosur dal", "mug dal", "mug", "moog", "masoor", "buter dal", "kheshari", "ডাল", "মসুর ডাল", "মুগ ডাল", "বুটের ডাল", "খেসারি ডাল"]
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
    aliases: ["sobji", "shobji", "sabji", "shaksobji", "shak", "saag", "vegetable", "vegetables", "সবজি", "শাক", "শাকসবজি", "শাক-সবজি"]
  },
  {
    id: "fare",
    label: "যাতায়াত ভাড়া",
    category: "Expense",
    emoji: "🛺",
    aliases: ["vara", "bhara", "rickshaw", "rikshaw", "gari", "fare", "transport", "transportation", "auto", "bhadha", "ভাড়া", "ভাড়া", "রিকশা", "যাতায়াত", "গাড়ি ভাড়া", "ভ্যান ভাড়া"]
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

const SPECIFIC_VEG_IDS = new Set([
  "pui_shak",
  "red_amaranth",
  "palong_shak",
  "kolmi_shak",
  "cauliflower",
  "cabbage",
  "tomato",
  "bean",
  "bottle_gourd",
  "eggplant",
  "chichinga",
  "pointed_gourd",
  "okra",
  "bitter_gourd",
  "cucumber",
  "pumpkin",
  "carrot",
  "radish",
  "taro",
  "potato",
  "onion",
  "papaya",
  "chili",
]);

// In-memory alias mapping cache: alias -> CanonicalGrocery
const aliasToGroceryMap = new Map<string, CanonicalGrocery>();
let isDictionaryInitialized = false;

function normalizeBengaliText(str: string): string {
  return (str || "")
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u0981/g, "") // Normalize optional chandrabindu (ঁ)
    .toLowerCase()
    .trim();
}

// Synchronously populate built-in aliases immediately on startup
function populateBuiltinAliases() {
  for (const item of CANONICAL_GROCERIES) {
    aliasToGroceryMap.set(normalizeBengaliText(item.id), item);
    aliasToGroceryMap.set(normalizeBengaliText(item.label), item);
    for (const alias of item.aliases) {
      const norm = normalizeBengaliText(alias);
      if (norm) aliasToGroceryMap.set(norm, item);
      const compacted = norm.replace(/\s+/g, "");
      if (compacted) aliasToGroceryMap.set(compacted, item);
    }
  }
}
populateBuiltinAliases();

// Per-mess permanent breakdown caches (RAM + persistent_files in PostgreSQL)
const messBreakdownCache = new Map<string, Record<string, VoucherBreakdownResponse>>();
const messBreakdownLoadedFromPg = new Set<string>();

function getBreakdownFilename(messId: string): string {
  const safeMess = (messId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `voucher_breakdowns_${safeMess}.json`;
}

async function loadMessBreakdowns(messId: string): Promise<Record<string, VoucherBreakdownResponse>> {
  const key = messId || "default";
  if (messBreakdownCache.has(key)) {
    return messBreakdownCache.get(key)!;
  }

  const filename = getBreakdownFilename(key);
  const localPath = path.join(DB_DIR, filename);

  if (fs.existsSync(localPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(localPath, "utf-8"));
      if (parsed && typeof parsed === "object") {
        messBreakdownCache.set(key, parsed);
        messBreakdownLoadedFromPg.add(key);
        return parsed;
      }
    } catch {}
  }

  if (!messBreakdownLoadedFromPg.has(key)) {
    messBreakdownLoadedFromPg.add(key);
    try {
      const rows = await db
        .select()
        .from(persistentFilesTable)
        .where(eq(persistentFilesTable.filename, filename))
        .limit(1);
      if (rows[0]?.content) {
        const parsed = JSON.parse(rows[0].content);
        if (parsed && typeof parsed === "object") {
          messBreakdownCache.set(key, parsed);
          try {
            fs.mkdirSync(DB_DIR, { recursive: true });
            fs.writeFileSync(localPath, rows[0].content, "utf-8");
          } catch {}
          return parsed;
        }
      }
    } catch {}
  }

  const empty: Record<string, VoucherBreakdownResponse> = {};
  messBreakdownCache.set(key, empty);
  return empty;
}

function saveMessBreakdownEntry(messId: string, cacheKey: string, data: VoucherBreakdownResponse): void {
  const key = messId || "default";
  const current = messBreakdownCache.get(key) || {};
  current[cacheKey] = data;

  // Keep per-mess cache bounded safely (most recent 1500 unique vouchers)
  const keys = Object.keys(current);
  if (keys.length > 1500) {
    for (let i = 0; i < keys.length - 1500; i++) {
      delete current[keys[i]];
    }
  }

  messBreakdownCache.set(key, current);
  writeAndPersistFile(getBreakdownFilename(key), JSON.stringify(current));
}

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
      const normAlias = normalizeBengaliText(ca.alias);
      if (!normAlias || aliasToGroceryMap.has(normAlias)) continue;
      const parentFood = foodMap.get(ca.foodId);
      if (parentFood) {
        const matchingCanonical = findCanonicalByQuery(parentFood.label) || {
          id: parentFood.id,
          label: parentFood.label,
          category: parentFood.category || "Grocery",
          emoji: (parentFood as any).emoji || "🛒",
          aliases: []
        };
        aliasToGroceryMap.set(normAlias, matchingCanonical);
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
  let s = normalizeBengaliText(word);
  s = s.replace(/(?<![a-z\u0980-\u09FF])(?:taka|tk\.?|টাকা|কেজি|গ্রাম|পোয়া|পোয়া|হালি|আঁটি|আটি|kg|gm)(?![a-z\u0980-\u09FF])/gi, " ");
  s = s.replace(/^(?:and|এবং|ও)\s+/i, " ");
  s = s.replace(/[,\-:।+()=&.]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Finds a matching canonical grocery for a word or phrase, supporting compound matches
 */
export function findCanonicalByQuery(query: string): CanonicalGrocery | null {
  if (!query) return null;
  const clean = normalizeWord(query);
  if (!clean) return null;

  // Direct exact alias match
  if (aliasToGroceryMap.has(clean)) {
    return aliasToGroceryMap.get(clean)!;
  }

  // Multi-word & specific-before-generic match across CANONICAL_GROCERIES
  const matchedCanns: CanonicalGrocery[] = [];
  for (const item of CANONICAL_GROCERIES) {
    for (const al of item.aliases) {
      const normAl = normalizeBengaliText(al);
      if (normAl.length >= 2 && clean.includes(normAl)) {
        if (!matchedCanns.some(c => c.id === item.id)) {
          matchedCanns.push(item);
        }
        break;
      }
    }
  }

  // Suppress generic parent categories when a specific child matched in the same item phrase
  const hasSpecificChicken = matchedCanns.some(c => c.id === "sonali_chicken" || c.id === "broiler_chicken" || c.id === "quail");
  const hasSpecificFish = matchedCanns.some(c => c.id === "shutki" || c.id === "shrimp");
  const hasSpecificVeg = matchedCanns.some(c => SPECIFIC_VEG_IDS.has(c.id));

  const filtered = matchedCanns.filter(c => {
    if (c.id === "chicken" && hasSpecificChicken) return false;
    if (c.id === "fish" && hasSpecificFish) return false;
    if (c.id === "vegetables" && hasSpecificVeg) {
      // Keep generic vegetables only if user explicitly wrote "সবজি" or "শাকসবজি"
      return /(সবজি|শাকসবজি|শাক-সবজি|sobji|shobji|sabji|vegetable)/i.test(clean);
    }
    return true;
  });

  if (filtered.length > 0) {
    if (filtered.length === 1) return filtered[0];
    return {
      id: filtered.map(c => c.id).join("_"),
      label: filtered.map(c => c.label).join(" ও "),
      category: filtered[0].category,
      emoji: filtered.map(c => c.emoji).join(""),
      aliases: []
    };
  }

  // Fallback: Token & learned DB alias match
  const parts = clean.split(" ");
  for (const part of parts) {
    if (part.length >= 2 && aliasToGroceryMap.has(part)) {
      return aliasToGroceryMap.get(part)!;
    }
  }

  for (const [alias, item] of aliasToGroceryMap.entries()) {
    if (alias.length >= 3 && (clean.includes(alias) || alias.includes(clean))) {
      return item;
    }
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
 * Smart extractor that separates Bangladeshi units/weights from Taka prices
 */
function extractQtyAndPrice(seg: string): { rawLabel: string; qtyStr: string; amount: number } {
  const qtyParts: string[] = [];
  let working = seg.trim().replace(/[।.]+$/, "").trim();

  // 1. Extract explicit quantity + unit patterns (including attached units like ১পোয়া, ২আটি, ৩ হালি, 22 ta)
  const qtyRegex = /(\d+(?:\.\d+)?)\s*(?:kg|k\.g\.?|কেজি|কে\.জি\.?|gm|g|গ্রাম|পোয়া|পোয়া|powa|poa|হালি|hali|ডজন|dozen|আঁটি|আটি|ati|পিস|pcs|pc|টি|ti|ta|টা(?!কা)|লিটার|লটার|ltr|ml|প্যাকেট|pkt|packet|বোতল|বস্তা)(?=\s|$|[=,\-:;+().])/gi;
  working = working.replace(qtyRegex, (fullMatch) => {
    qtyParts.push(fullMatch.trim());
    return " ";
  });

  let amount = 0;
  let priceFound = false;

  // 2. Explicit '=' price delimiter (e.g., "মুরগি 3.07=৫২৫", "রসুন ১পোয়া=২০", "Shonali Murgi= 330")
  const eqIdx = working.lastIndexOf("=");
  if (eqIdx !== -1) {
    const rhs = working.slice(eqIdx + 1).trim();
    const lhs = working.slice(0, eqIdx).trim();
    const rhsPriceMatch = rhs.match(/(\d+(?:\.\d+)?)/);
    if (rhsPriceMatch) {
      amount = parseFloat(rhsPriceMatch[1]);
      priceFound = true;
      working = lhs;
      // Any leftover standalone number on LHS (e.g., 3.07 in "মুরগি 3.07=৫২৫") is quantity, NOT price
      working = working.replace(/(\d+(?:\.\d+)?)/g, (numMatch) => {
        qtyParts.push(numMatch.trim());
        return " ";
      });
    }
  }

  // 3. Explicit currency indicators (e.g., "শুটকি ১০০টাকা", "30 tk", "৪০০৳", "10/-")
  if (!priceFound) {
    const currencyAfter = working.match(/(\d+(?:\.\d+)?)\s*(?:টাকা|ট(?!া)|tk\.?|taka|৳|\/-|bdt)(?=\s|$|[=,\-:;+().])/i);
    const currencyBefore = working.match(/(?<![a-zA-Z\u0980-\u09FF])(?:৳|tk\.?|taka|টাকা)\s*(\d+(?:\.\d+)?)/i);
    const curMatch = currencyAfter || currencyBefore;
    if (curMatch) {
      amount = parseFloat(curMatch[1]);
      priceFound = true;
      working = working.replace(curMatch[0], " ");
    }
  }

  // 4. Parenthesized trailing price (e.g., "মুরগি(৩১০)", "সবজি২(১৬০)")
  if (!priceFound) {
    const parenMatch = working.match(/\((\d+(?:\.\d+)?)\)/);
    if (parenMatch) {
      amount = parseFloat(parenMatch[1]);
      priceFound = true;
      working = working.replace(parenMatch[0], " ");
    }
  }

  // 5. Remaining standalone numbers
  if (!priceFound) {
    const nums = Array.from(working.matchAll(/(\d+(?:\.\d+)?)/g));
    if (nums.length >= 2) {
      const last = nums[nums.length - 1];
      amount = parseFloat(last[1]);
      priceFound = true;
      // Earlier standalone numbers are quantities (e.g., "মুরগি 3.07 - 525")
      for (let i = 0; i < nums.length - 1; i++) {
        qtyParts.push(nums[i][1]);
      }
      working = working.replace(/(\d+(?:\.\d+)?)/g, " ");
    } else if (nums.length === 1) {
      const only = nums[0];
      const numStr = only[1];
      const numVal = parseFloat(numStr);
      // Unlabelled fractional decimal < 25 (e.g., 0.7, 1.7, 2.7, 3.07, 3.2) represents kg weight, not Taka
      if (numStr.includes(".") && numVal > 0 && numVal < 25) {
        qtyParts.push(`${numStr} kg`);
        amount = 0;
      } else {
        amount = numVal;
      }
      working = working.replace(only[0], " ");
    }
  } else {
    // Strip any leftover stray numbers after explicit currency/parenthesized price (e.g. "২" in "সবজি২(১৬০)")
    working = working.replace(/(\d+(?:\.\d+)?)/g, (m) => {
      if (qtyParts.length === 0) qtyParts.push(m);
      return " ";
    });
  }

  const rawLabel = working
    .replace(/(?<![a-zA-Z\u0980-\u09FF])(?:taka|tk\.?|টাকা)(?![a-zA-Z\u0980-\u09FF])/gi, " ")
    .replace(/^(?:and|এবং)\s+/i, " ")
    .replace(/[,\-:।+()=&.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    rawLabel,
    qtyStr: qtyParts.join(", ").trim(),
    amount: Number.isFinite(amount) ? amount : 0,
  };
}

/**
 * Fast rule-based parser that handles standard Bengali grocery lines
 */
export function parseVoucherTextLocally(text: string): { items: ParsedVoucherItem[]; isComplete: boolean } {
  if (!text || typeof text !== "string") return { items: [], isComplete: false };

  const normalizedText = convertBengaliDigits(text);
  // Split on comma, semicolon, newline, pipe, or Bengali danda
  const segments = normalizedText.split(/[,;\n|।]/).map(s => s.trim()).filter(Boolean);

  const items: ParsedVoucherItem[] = [];
  let allMatched = segments.length > 0;

  for (const seg of segments) {
    const { rawLabel, qtyStr, amount } = extractQtyAndPrice(seg);
    if (!rawLabel && amount === 0 && !qtyStr) continue;

    const canonical = findCanonicalByQuery(rawLabel);
    if (canonical) {
      items.push({
        name: canonical.label,
        originalText: rawLabel || canonical.label,
        amount,
        quantity: qtyStr || undefined,
        emoji: canonical.emoji,
        category: canonical.category
      });
    } else if (rawLabel.length > 0) {
      items.push({
        name: rawLabel,
        originalText: rawLabel,
        amount,
        quantity: qtyStr || undefined,
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
 * Primary: gemini-4-hydrogen -> fallback to gemini-3.1-flash-lite -> gemini-2.5-flash
 */
const GEMINI_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash"
];

export async function parseVoucherWithGeminiCascade(
  text: string,
  totalAmount?: number,
  voucherQuantity?: string
): Promise<ParsedVoucherItem[]> {
  const prompt = `You are a Bangladeshi bachelor mess grocery and expense breakdown parser.
Analyze this market voucher purchase note: "${text}"
${voucherQuantity ? `Additional quantity note: "${voucherQuantity}"` : ""}
${totalAmount ? `Total voucher amount: ${totalAmount} BDT.` : ""}

CRITICAL RULES FOR BANGLADESHI MESS VOUCHERS:
1. Keep specific item names individually in Bengali: e.g. পুঁইশাক, লালশাক, পালংশাক, টমেটো, শিম, বাঁধাকপি, ফুলকপি, লাউ, পটল, ঢেঁড়স, করলা, আলু, পেঁয়াজ, রসুন, কাঁচামরিচ, কোয়েল, ডাল (or মুগ ডাল / মসুর ডাল / বুটের ডাল), শুটকি, বাদাম, চিংড়ি মাছ, সোনালি মুরগি, ব্রয়লার মুরগি, মুরগির মাংস. NEVER replace a named vegetable/green (like পুঁইশাক, টমেটো, শিম) with generic "শাকসবজি". Only use "শাকসবজি" when the text literally says generic সবজি / শাক / শাকসবজি.
2. QUANTITY vs PRICE DISAMBIGUATION:
   - Small decimal numbers (like 0.7, 1.7, 2.7, 3.07, 3.2) or numbers with units (1kg, 700gm, ২০০গ্রাম, ১পোয়া, ২ হালি, ৫ আটি, 22 ta) are QUANTITIES (put in "quantity"), NOT Taka prices!
   - When an item uses "=" or "-" (e.g. "মুরগি 3.07=৫২৫" or "রসুন ১পোয়া=২০" or "goru- 1 kg - 793"), the right-hand number (525, 20, 793) is the Taka price ("amount"), and the left-hand number/unit ("3.07", "১পোয়া", "1 kg") is "quantity".
   - If an item has NO price written (only quantity, like "ডিম ২ হালি" or "Goru 700gm"), set "amount": 0 and "quantity": "২ হালি" / "700gm". Never guess ৳ 2 as the price of eggs!
   - When an item only has a price without units (e.g. "মরিচ ২০", "মাছ ৩৬০", "কোয়েল ৪০"), that number IS the Taka price ("amount": 20, 360, 40).
3. EMOJI RULES:
   - গরুর মাংস -> 🥩, খাসির মাংস -> 🍖
   - মুরগির মাংস / ব্রয়লার মুরগি -> 🐔, সোনালি মুরগি -> 🐥, কোয়েল -> 🐦
   - চিংড়ি মাছ -> 🦐, শুটকি / মাছ -> 🐟
   - বাদাম -> 🥜, পেঁয়াজ -> 🧅, রসুন -> 🧄, কাঁচামরিচ -> 🌶️, চিচিঙ্গা -> 🥒
   - টমেটো -> 🍅, শিম -> 🫛, পুঁইশাক / লালশাক / বাঁধাকপি -> 🥬, ফুলকপি -> 🥦, লাউ -> 🍈, আলু -> 🥔
   - ডাল / মুগ ডাল / মসুর ডাল / বুটের ডাল -> 🟡 (never use a bowl emoji!)
   - যাতায়াত ভাড়া -> 🛺

Respond strictly with a valid JSON array matching the schema.`;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Market Parser] Calling Gemini model: ${model} for voucher parsing...`);
      const config: any = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              originalText: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              quantity: { type: Type.STRING },
              emoji: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["name", "originalText", "amount", "emoji", "category"]
          }
        }
      };
      if (model === "gemini-4-hydrogen") {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config
      });

      const responseText = response.text?.trim() || "";
      if (responseText) {
        const cleanJson = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Market Parser] Successfully parsed ${parsed.length} items using ${model}.`);

          const normalizedItems: ParsedVoucherItem[] = parsed.map((p: any) => {
            const matchedCanonical = findCanonicalByQuery(p.name) || findCanonicalByQuery(p.originalText);
            if (p.originalText && p.name && matchedCanonical) {
              learnNewAliasInPostgres(p.originalText, matchedCanonical.id, matchedCanonical.label).catch(() => {});
            }
            const resolvedEmoji = matchedCanonical?.emoji || (p.emoji === "🥣" ? "🟡" : p.emoji) || "🛒";
            return {
              name: p.name || matchedCanonical?.label || "বাজার খরচ",
              originalText: p.originalText || p.name || "",
              amount: Number(p.amount) || 0,
              quantity: p.quantity ? String(p.quantity).trim() : undefined,
              emoji: resolvedEmoji,
              category: p.category || matchedCanonical?.category || "Grocery"
            };
          });

          return normalizedItems;
        }
      }
    } catch (err: any) {
      console.warn(`[Market Parser] Gemini model ${model} failed or unavailable:`, err.message);
    }
  }

  throw new Error("All Gemini fallback cascade models were unable to process the request.");
}

/**
 * Main breakdown parser combining mess-scoped PostgreSQL cache, deterministic Bengali parser, and Gemini cascade
 */
export async function getVoucherBreakdown(
  text: string,
  totalAmount?: number,
  messId: string = "default",
  voucherQuantity?: string
): Promise<VoucherBreakdownResponse> {
  await ensureDictionaryInitialized();

  const effectiveMessId = messId || "default";
  const cacheKey = `${PARSER_CACHE_VERSION}::${text.trim()}__${totalAmount || 0}__${(voucherQuantity || "").trim()}`;

  // 0. Check mess-scoped persistent cache (PostgreSQL + RAM)
  const messCache = await loadMessBreakdowns(effectiveMessId);
  if (messCache[cacheKey]) {
    return messCache[cacheKey];
  }

  // 1. Try instant deterministic Bangladeshi mess rule/dictionary match
  const localResult = parseVoucherTextLocally(text);
  if (localResult.isComplete && localResult.items.length > 0) {
    const totalParsed = localResult.items.reduce((s, it) => s + it.amount, 0);
    const resp: VoucherBreakdownResponse = {
      items: localResult.items,
      totalParsedAmount: totalParsed,
      source: "DICTIONARY"
    };
    saveMessBreakdownEntry(effectiveMessId, cacheKey, resp);
    return resp;
  }

  // 2. If unknown items or freeform phrasing remain, invoke Gemini Multi-Model Cascade once and persist forever in PG
  try {
    const aiItems = await parseVoucherWithGeminiCascade(text, totalAmount, voucherQuantity);
    if (aiItems.length > 0) {
      const totalParsed = aiItems.reduce((s, it) => s + it.amount, 0);
      const resp: VoucherBreakdownResponse = {
        items: aiItems,
        totalParsedAmount: totalParsed,
        source: "GEMINI_AI"
      };
      saveMessBreakdownEntry(effectiveMessId, cacheKey, resp);
      return resp;
    }
  } catch (e: any) {
    console.warn("[Market Parser] Gemini cascade fallback failed:", e.message);
  }

  // 3. Best-effort deterministic fallback (do NOT permanently lock fallback if AI failed due to transient issue)
  if (localResult.items.length > 0) {
    const totalParsed = localResult.items.reduce((s, it) => s + it.amount, 0);
    return {
      items: localResult.items,
      totalParsedAmount: totalParsed,
      source: "HYBRID"
    };
  }

  const fallbackCanonical = findCanonicalByQuery(text) || {
    id: "grocery",
    label: text.trim() || "বাজার খরচ",
    category: "Grocery",
    emoji: "🛒",
    aliases: []
  };

  return {
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
}
