# Custom Cycle End-Time Override & Global Timezone Search Plan (Completed)

## Direct Alignment with User Choices

> [!IMPORTANT]
> **বাস্তবায়িত সিদ্ধান্তের সারসংক্ষেপ:**
> 1. **জিরো-ওভারহেড গ্লোবাল টাইমজোন সার্চ (Zero Compute / Bandwidth):**
>    - ব্রাউজারের নেটিভ `Intl.supportedValuesOf('timeZone')` এপিআই ব্যবহার করা হয়েছে। এতে **কোনো সার্ভার রিকোয়েস্ট নেই, রেন্ডারের কোনো ব্যান্ডউইথ খরচ নেই এবং নিয়ন পোস্টগ্রের (Neon PostgreSQL) ০% কম্পিউট ইউনিট (CU)** ব্যবহার হয়।
>    - এটি পুরোপুরি ক্লায়েন্ট-সাইড ব্রাউজার মেমোরিতে চলে, যা ব্যবহারকারীকে বিশ্বের ৪২০+ টাইমজোন (যেমন: ভারতের `Asia/Kolkata`, বাংলাদেশের `Asia/Dhaka`, দুবাইয়ের `Asia/Dubai`, আমেরিকার `America/New_York` ইত্যাদি) তাত্ক্ষণিক সার্চ করার এবং প্রয়োজনে কাস্টম টেক্সট ইনপুটে যেকোনো ভ্যালিড IANA রিজিয়ন লেখার সুযোগ দিচ্ছে।
> 2. **সাইকেল শেষ হওয়ার সময় ম্যানুয়াল ওভাররাইড (Cycle Settings Panel Only):**
>    - শুধুমাত্র **Cycle Settings** প্যানেলে সুপার ইউজার বা অ্যাডমিন কোনো নির্দিষ্ট সাইকেলের সমাপ্তি সময় পরিবর্তন করে তারিখের সাথে নির্দিষ্ট সময়ও (যেমন: **4th November 06:00 PM / 18:00:00**) নির্ধারণ করতে পারবেন।
>    - ডিফল্ট ১ তারিখ দুপুর ২:০০ টার বদলে ওই সাইকেলটি নির্ধারিত ম্যানুয়াল সময় (যেমন: ৪ নভেম্বর সন্ধ্যা ৬:০০ টা) পর্যন্ত **আনলক** থাকবে এবং সেই সময় অতিক্রম হওয়ামাত্রই স্বয়ংক্রিয়ভাবে লক হবে।
> 3. **কঠোর মেস আইসোলেশন (`RULE[AGENTS_md]`):**
>    - এই ম্যানুয়াল সময় পরিবর্তন শুধুমাত্র সংশ্লিষ্ট মেসের ওই নির্দিষ্ট সাইকেলেই প্রযোজ্য হবে; অন্য কোনো মেসের সাইকেলে এর বিন্দুমাত্র প্রভাব পড়বে না।

---

## 1. Overview & Core Concept

- **Completed Implementation**:
  - `Intl.supportedValuesOf('timeZone')` ভিত্তিক জিরো-ব্যান্ডউইথ ক্লায়েন্ট সার্চ ও ভ্যালিডেটেড টেক্সট ইনপুট কার্যকর।
  - সাইকেল এডিট ফর্মে `datetime-local` ইনপুট ফিল্ড ও বিস্তারিত নির্দেশনামূলক কার্ড যুক্ত করা হয়েছে যাতে নির্দিষ্ট তারিখের সাথে ঘণ্টা ও মিনিট সংরক্ষণ করা যায়।
  - `src/utils/cycleUtils.ts`-এ `parseDhakaDate` সুনির্দিষ্ট সময় (`THH:mm:ss`, `THH:mm`, `YYYY-MM-DD HH:mm`) মেস টাইমজোনে অক্ষুণ্ণ রেখে পার্স করে।
  - `getCycleEffectiveEndDate`-এ অ্যাডমিন নির্ধারিত কাস্টম সময় ডিফল্ট কাটঅফের চেয়ে বেশি হলে সেই কাস্টম সময় অনুযায়ী সাইকেলটি আনলক থাকে এবং ঠিক সেই সময়ে অটো-লক কার্যকর হয়।

---

## 2. Technical Architecture & Component Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Client-Side Zero-Overhead Timezone Engine                   │
│                                                                             │
│  Intl.supportedValuesOf('timeZone') ──► Local Search (0 KB Bandwidth, 0 CU) │
│                                         Live Validation via Intl.DateTime   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Cycle Custom End Time Override (Isolated)                   │
│                                                                             │
│  Superuser sets: endDate = "2026-11-04T18:00:00" in Settings                │
│                                                                             │
│  getCycleEffectiveEndDate(month, messTimezone):                             │
│  - Detects explicit datetime later than default cutoff                      │
│  - Returns exact custom instant: 2026-11-04 18:00:00 in Mess Timezone       │
│  - Cycle remains UNLOCKED until that exact moment                           │
│  - Reaching 18:00 on Nov 4: System AUTO-LOCKS only this cycle               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Source Changes:

1. **`src/utils/cycleUtils.ts`**:
   - `parseDhakaDate`: `THH:mm:ss` বা `THH:mm` ফরম্যাট থাকলে সেই সুনির্দিষ্ট ঘণ্টা ও মিনিট উদ্ধার করে মেস টাইমজোনে Date অবজেক্ট তৈরি করে।
   - `getCycleEffectiveEndDate`: অ্যাডমিন কর্তৃক নির্ধারিত এক্সপ্লিসিট `endDate`-এ সময় উল্লেখ থাকলে সেই সময়কে প্রাধান্য দেয় (`explicitEnd > defaultBoundary`)।
2. **`server/db.ts`**:
   - `getMessTimezone`: মেসের সংরক্ষিত টাইমজোন অনুযায়ী স্বয়ংক্রিয়ভাবে নতুন মাস তৈরি ও অটো-লক টাইমিং পরিচালনা করে।
   - নভেম্বর ২০২৬ সাইকেল প্রস্তুত এবং সক্রিয় রাখা হয়েছে।
3. **`src/components/UnifiedSettingsDashboard.tsx`**:
   - টাইমজোন কার্ডে ক্লায়েন্ট-সাইড মেমোরি সার্চ (সব ৪২০+ IANA টাইমজোন) ও কাস্টম টেক্সট ইনপুট উইথ লাইভ প্রিভিউ ও ডিভাইস অটো-ডিটেকশন।
   - `activeSubTab === "cycles"`-এ সাইকেল এডিট ফর্মে কাস্টম কাটঅফ ওভাররাইডের স্পষ্ট নির্দেশনাবলী ও সক্রিয় সাইকেল তালিকায় টাইমজোন-সচেতন তারিখ ও সময় ডিসপ্লে।
4. **Multi-Tenant Scoping**:
   - মেস আইসোলেশন অপরিবর্তিত রাখা হয়েছে (`months` টেবিল ও `settings_${messId}.json` শুধুমাত্র সংশ্লিষ্ট মেসের জন্য কার্যকর)।

---

## 3. Verification Results

1. **Timezone Search & Custom Input**:
   - `Intl.supportedValuesOf('timeZone')` সফলভাবে ৪২০+ গ্লোবাল টাইমজোন মেমোরি থেকে রিটার্ন করছে।
   - ভারতের `Asia/Kolkata`, আমেরিকার `America/New_York`, ইউরোপের `Europe/London` এবং বাংলাদেশের `Asia/Dhaka` নিখুঁতভাবে হ্যান্ডেল হচ্ছে।
   - কোনো এক্সটার্নাল এপিআই রিকোয়েস্ট নেই, রেন্ডারের কোনো নেটওয়ার্ক ব্যান্ডউইথ খরচ নেই এবং Neon PostgreSQL-এ শূন্য কম্পিউট ইউনিট (CU) ওভারহেড।
2. **Custom Cycle End Time Simulation**:
   - টেস্ট স্ক্রিপ্টে `2026-11-04T18:00:00` দিয়ে যাচাই করা হয়েছে: ৩ নভেম্বর দুপুর ১২টায় সাইকেলটি আনলক থাকছে এবং ৪ নভেম্বর সন্ধ্যা ৬টা পেরোলেই অটো-লক হচ্ছে।
3. **Multi-Tenant Verification**:
   - প্রতিটি মেসের টাইমজোন এবং সাইকেলের সময়সূচি স্ব-স্ব মেস স্কোপে আইসোলেটেড।
4. **Build & Type Checking**:
   - `compile_applet` এবং `lint_applet` (tsc --noEmit) উভয়ই ১০০% সফল ও কোনো ত্রুটি ছাড়াই পাস হয়েছে।
