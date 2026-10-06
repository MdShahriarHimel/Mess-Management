/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): { ai: GoogleGenAI; key: string } | null {
  const key = 
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY;

  if (!key) return null;

  return {
    key,
    ai: new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    }),
  };
}

export interface ScannedMemberMeal {
  memberId: string;
  detectedNameInImage: string;
  matchedMemberName: string;
  lunch: number;
  dinner: number;
  breakfast?: number;
  confidence: "high" | "medium" | "low";
  lunchReason: string;
  dinnerReason: string;
}

export interface UnmatchedName {
  nameInImage: string;
  lunchMark?: string;
  dinnerMark?: string;
  note: string;
}

export interface MealScanResult {
  success: boolean;
  detectedMeals: ScannedMemberMeal[];
  unmatchedNames: UnmatchedName[];
  summary: string;
  totalMembersDetected: number;
  totalLunchCount: number;
  totalDinnerCount: number;
  error?: string;
}

export async function scanMealSheetWithAI(
  base64Image: string,
  mimeType: string,
  activeMembers: { id: string; name: string; nickname?: string }[],
  activeMealTypes: { id: string; name: string }[] = [
    { id: "lunch", name: "Lunch" },
    { id: "dinner", name: "Dinner" }
  ]
): Promise<MealScanResult> {
  try {
    const geminiInstance = getGeminiClient();
    if (!geminiInstance) {
      throw new Error(
        "GEMINI_API_KEY সার্ভারে কনফিগার করা নেই। অনুগ্রহ করে Render / সার্ভার ড্যাশবোর্ডে গিয়ে Environment Variables সেকশনে 'GEMINI_API_KEY' যোগ করুন (Google AI Studio থেকে সম্পূর্ণ ফ্রিতে পাওয়া যায়: aistudio.google.com)।"
      );
    }

    // Clean base64 data if data URL prefix exists
    let cleanBase64 = base64Image;
    let resolvedMimeType = mimeType || "image/jpeg";
    if (base64Image.includes(",")) {
      const parts = base64Image.split(",");
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch && mimeMatch[1]) {
        resolvedMimeType = mimeMatch[1];
      }
    }

    const memberRosterDescription = activeMembers
      .map((m, idx) => `${idx + 1}. ID: "${m.id}" | Name: "${m.name}" | Nickname: "${m.nickname || ""}"`)
      .join("\n");

    const mealTypesList = activeMealTypes.map(t => `${t.name} (${t.id})`).join(", ");

    const systemPrompt = `You are a high-precision OCR and document analysis AI for Bangladeshi Bachelor Mess management systems.
Your job is to read and interpret handwritten or printed Meal Sheets / Charts (মিল খাতা / মিল বোর্ড / মিল চার্ট).

### OFFICIAL ACTIVE MESS MEMBERS ROSTER (Only match against these):
${memberRosterDescription}

### MEAL TYPES BEING TRACKED:
${mealTypesList}

### RULES OF THE MESS MEAL CHART (VERY STRICT, FOLLOW EXACTLY):
1. **CHART STRUCTURE & COLUMN HEADERS (CRITICAL)**:
   - The image shows a table or column layout with Member Name and meal shifts.
   - CAREFULLY INSPECT THE COLUMN HEADERS AT THE TOP OF THE TABLE:
     - Notice which column is for Lunch and which is for Dinner!
     - In some charts: Column 1 is Name, Column 2 is Lunch (দুপুর / ☀️), Column 3 is Dinner (রাত / 🌙).
     - In other charts (like 'নাম | রাত 🌙 | দুপুর ☀️'): Column 1 is Name, Column 2 is Dinner (রাত / 🌙), Column 3 is Lunch (দুপুর / ☀️)!
     - MATCH VALUES BY THE ACTUAL COLUMN HEADER LABEL, NOT JUST THE COLUMN ORDER!
     - For example, if header is 'রাত' in column 2 and 'দুপুর' in column 3, then Column 2 values go to 'dinner' and Column 3 values go to 'lunch'!
   - Ignore scribbled out / crossed out rows (কাটা দেওয়া বা মোছা নাম). Ignore titles and dates.

2. **CROSS = MEAL OFF (0 servings)**:
   - If someone's cell has a CROSS mark ('X', 'x', '✖', '❌', 'কাটা দাগ', 'ক্রস', '0', 'off', 'না', or horizontal strike), that member's meal is OFF for that shift!
   - Mark value for that meal MUST BE 0.

3. **BLANK / TICK / DEFAULT = MEAL ON (1 serving)**:
   - In bachelor messes, members usually do NOT write anything if their regular meal is active.
   - Any BLANK / EMPTY cell (ফাঁকা ঘর, খালি জায়গা, কোনো দাগ নেই) means the meal is ACTIVE / ON! Default value = 1.
   - Any TICK mark ('✓', '✔'), dot (.), or dash (-) ALSO means ACTIVE / ON! Default value = 1.

4. **NUMERIC COUNTS, WORDS, & GUEST MEALS (২, ৩, দুই, তিন, Two, Three, গেস্ট মিল)**:
   - Members often write numbers or words when having extra servings or guest meals (গেস্ট মিল).
   - You MUST recognize both digits and spelled-out words in Bengali and English:
     a) **Bengali Digits / Numerals**:
        - '২' -> 2
        - '৩' -> 3
        - '৪' -> 4
        - '১' -> 1
        - '০' -> 0 (off)
     b) **English Digits**:
        - '2' -> 2, '3' -> 3, '4' -> 4, '1' -> 1, '0' -> 0
     c) **Bengali Written Words**:
        - 'দুই', 'দুটি', '২টি', 'দুইটা' -> 2
        - 'তিন', 'তিনটি', '৩টি', 'তিনটা' -> 3
        - 'চার', '৪টি', 'চারটা' -> 4
        - 'এক', '১টি', 'একটা' -> 1
        - 'দেড়', '১.৫' -> 1.5
        - 'আধা', 'হাফ', '০.৫' -> 0.5
     d) **English Written Words**:
        - 'two', 'double', '2 meals' -> 2
        - 'three', 'triple', '3 meals' -> 3
        - 'four' -> 4
        - 'one' -> 1
     e) **Guest Meal Annotations (গেস্ট মিল)**:
        - If written as '+1', '১+১', 'Guest 1', 'গেস্ট ১' -> Total = 2 servings (1 own + 1 guest).
        - If written as '+2', '১+২', 'Guest 2', 'গেস্ট ২' -> Total = 3 servings (1 own + 2 guests).
        - If written simply as '২' or '3', assign that exact number (2 or 3).
     f) In "lunchReason" and "dinnerReason", describe the detection clearly in Bengali (e.g. 'দুই লেখা (২টি মিল)', '৩ লেখা (৩টি মিল)', 'ফাঁকা ঘর (১ মিল চালু)', 'ক্রস চিহ্ন (মিল অফ)').

5. **BILINGUAL FUZZY MATCHING (Bengali <-> English)**:
   - Names on the sheet may be written in Bengali (e.g., 'ইশতিয়াক আহমেদ', 'ফয়সাল', 'দিদার', 'সোহান', 'জিহাদ', 'সাকিব') or in English (e.g., 'Ishtiaque', 'Faisal', 'Didar', 'Sohan').
   - You MUST match phonetic equivalents between Bengali and English against the Official Members Roster provided above.
   - For example:
     - 'ইশতিয়াক' or 'ইশতিয়াক আহমেদ' matches 'Ishtiaque Ahmed'
     - 'দিদার' matches 'didar hosen' / 'didar'
     - 'সোহান' matches 'mdshoaeeb' / 'Sohan'
     - 'ফয়সাল' matches 'Faisal'
   - Always assign the exact "memberId" from the provided roster for matched members.

6. **UNKNOWN / UNMATCHED NAMES**:
   - If the chart contains a name that does NOT match any member in the provided roster, DO NOT make up an ID or assign it randomly.
   - Place such unlisted names in "unmatchedNames" array with a note explaining they are not in the official mess roster.

Output strictly valid JSON with this schema:
{
  "detectedMeals": [
    {
      "memberId": "string (matching official member ID)",
      "detectedNameInImage": "string (the name as seen in the photo)",
      "matchedMemberName": "string (the official roster name)",
      "lunch": number (0 if cross/off, 1 if blank/tick/running, or specific number),
      "dinner": number (0 if cross/off, 1 if blank/tick/running, or specific number),
      "breakfast": number (optional, default 0 unless breakfast column exists),
      "confidence": "high" | "medium" | "low",
      "lunchReason": "string (e.g. 'ফাঁকা ঘর (চলছে)' or 'ক্রস চিহ্ন (অফ)')",
      "dinnerReason": "string (e.g. 'ফাঁকা ঘর (চলছে)' or 'ক্রস চিহ্ন (অফ)')"
    }
  ],
  "unmatchedNames": [
    {
      "nameInImage": "string",
      "lunchMark": "string",
      "dinnerMark": "string",
      "note": "Not found in official mess roster - skipped"
    }
  ],
  "summary": "string in Bengali summarizing total detected members, how many meals running, and who has meal off"
}`;

    const imagePart = {
      inlineData: {
        mimeType: resolvedMimeType,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: systemPrompt,
    };

    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-flash-latest"
    ];

    let lastError: any = null;
    let response: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[AI Meal Scanner] Attempting vision scan with model: ${modelName}`);
        response = await geminiInstance.ai.models.generateContent({
          model: modelName,
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response && response.text) {
          console.log(`[AI Meal Scanner] Successfully scanned using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Meal Scanner] Model ${modelName} encountered error (${err?.message || err}). Trying next candidate...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All AI vision models are currently busy. Please try again in a few moments.");
    }

    const outputText = response.text || "{}";
    const parsed = JSON.parse(outputText);

    const detectedMeals: ScannedMemberMeal[] = Array.isArray(parsed.detectedMeals) ? parsed.detectedMeals : [];
    const unmatchedNames: UnmatchedName[] = Array.isArray(parsed.unmatchedNames) ? parsed.unmatchedNames : [];

    // Calculate totals
    const totalLunch = detectedMeals.reduce((acc, curr) => acc + (Number(curr.lunch) || 0), 0);
    const totalDinner = detectedMeals.reduce((acc, curr) => acc + (Number(curr.dinner) || 0), 0);

    return {
      success: true,
      detectedMeals,
      unmatchedNames,
      summary: parsed.summary || `ছবি থেকে ${detectedMeals.length} জন সদস্যের মিল সফলভাবে স্ক্যান করা হয়েছে।`,
      totalMembersDetected: detectedMeals.length,
      totalLunchCount: totalLunch,
      totalDinnerCount: totalDinner,
    };
  } catch (err: any) {
    console.error("[AI Meal Scanner Error]:", err);
    let cleanError = err?.message || "Unknown error during AI scan";
    if (cleanError.includes("503") || cleanError.toLowerCase().includes("high demand") || cleanError.toLowerCase().includes("unavailable")) {
      cleanError = "AI সার্ভারে সাময়িক অতিরিক্ত চাপ (High Demand) চলছে। অনুগ্রহ করে কয়েক সেকেন্ড পর আবার স্ক্যান বাটনে চাপ দিন।";
    }
    return {
      success: false,
      detectedMeals: [],
      unmatchedNames: [],
      summary: "ছবি স্ক্যান করতে ব্যর্থ হয়েছে। অনুগ্রহ করে স্পষ্ট ছবি দিয়ে পুনরায় চেষ্টা করুন।",
      totalMembersDetected: 0,
      totalLunchCount: 0,
      totalDinnerCount: 0,
      error: cleanError,
    };
  }
}
