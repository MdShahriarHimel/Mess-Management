# Custom Cycle End-Time Override & Cycle Date Fix Plan (Completed)

## Direct Alignment with User Choices

> [!IMPORTANT]
> **বাস্তবায়িত সমাধানের সারসংক্ষেপ:**
> 1. **নিউ সাইকেল তৈরিতে তারিখ উল্টা হওয়া সমাধান (Fixed New Cycle Creation Dates):**
>    - পূর্বে `getMonthDefaults`-এ পূর্ববর্তী সাইকেলের শেষ দিনকে (`Nov 30`) নতুন সাইকেলের শুরুর দিন ধরে ১ মাস যোগ করায় ভুলভাবে `30-Nov` থেকে `30-Dec` প্রদর্শিত হচ্ছিল এবং সাইকেলের নাম আবার `November 2026` সাজেস্ট করছিল।
>    - এটি পুরোপুরি সংশোধন করা হয়েছে: মেসের বিদ্যমান সাইকেলগুলোর মধ্যে সর্বশেষ সাইকেল (নভেম্বর ২০২৬) পরীক্ষা করে পরবর্তী নতুন সাইকেল হিসেবে স্বয়ংক্রিয়ভাবে **December 2026** সাজেস্ট করা হচ্ছে।
>    - সাইকেল শুরুর সময়: **১লা ডিসেম্বর রাত ১২:০০ টা (00:00)** এবং শেষ হওয়ার সময়: **পরবর্তী মাসের ১লা জানুয়ারি দুপুর ২:০০ টা (14:00)**।
>    - কেউ যদি বক্সে যেকোনো মাস টাইপ করেন (যেমন: `November 2026`), স্বয়ংক্রিয়ভাবে ১লা নভেম্বর রাত ১২:০০ টা থেকে ১লা ডিসেম্বর দুপুর ২:০০ টা সেট হবে।
> 2. **সাইকেলের সমাপ্তি তারিখ পরবর্তী মাসের ১ তারিখ দুপুর ২:০০ টা (Cycle Ends on 1st of Next Month at 2:00 PM):**
>    - ডাটাবেজে নভেম্বর ২০২৬ সাইকেলের শেষ তারিখ `Nov 30, 11:59 PM` থেকে আপডেট করে সঠিক নিয়মে **`2026-12-01T14:00:00` (Dec 1, 02:00 PM)** করা হয়েছে।
>    - একইভাবে অক্টোবর ২০২৬ সাইকেলের শেষ তারিখ **`2026-11-01T14:00:00` (Nov 1, 02:00 PM)** করা হয়েছে।
>    - সক্রিয় সাইকেল তালিকায় এখন যথাযথভাবে প্রদর্শিত হচ্ছে: `Nov 1, 12:00 AM ➔ Dec 1, 2:00 PM`।
> 3. **জিরো-ব্যান্ডউইথ গ্লোবাল টাইমজোন ও কাস্টম ওভাররাইড:**
>    - ব্রাউজারের নেটিভ `Intl.supportedValuesOf('timeZone')` এপিআই অপরিবর্তিত ও সক্রিয় রয়েছে (০% নেটওয়ার্ক ব্যান্ডউইথ ও ০% নিয়ন পোস্টগ্রে কম্পিউট)।
>    - সাইকেল এডিট প্যানেলে যেকোনো কাস্টম কাটঅফ (যেমন: ৪ঠা নভেম্বর সন্ধ্যা ৬:০০ টা) নির্ধারণ করলে সেই সময় অনুযায়ী সাইকেলটি আনলক থাকবে এবং সেই মুহূর্তে স্বয়ংক্রিয়ভাবে লক হবে।

---

## 1. Resolved Issues

1. **Bug 1: Upside Down Dates on New Cycle Form**:
   - `getMonthDefaults` now scores all registered cycles by `year * 12 + monthIdx` to determine the latest registered month, and accurately generates the next chronological cycle (e.g. `December 2026` from `2026-12-01T00:00` to `2027-01-01T14:00`).
   - `getDatesForMonthName` dynamically maps typed month names to start on the 1st at 00:00 and end on the 1st of the next month at 14:00.
2. **Bug 2: Month Ending within Same Month (30 Nov 11:59 PM)**:
   - Updated `server/db.ts` auto-creation logic to set `endIso` to `${nextYear}-${pad(nextMonthIdx + 1)}-01T14:00:00`.
   - Updated records in PostgreSQL Cloud SQL (`monthsTable`) and `database_backup.json` for October and November 2026.
   - Cycle list now renders: `Nov 1, 12:00 AM ➔ Dec 1, 2:00 PM`.

---

## 2. Verification

- `npx tsx` স্ক্রিপ্টের মাধ্যমে ডাটাবেজ এবং মেমোরি ক্যাশে উভয় জায়গায় `October 2026` (`2026-10-01T00:00:00` ➔ `2026-11-01T14:00:00`) এবং `November 2026` (`2026-11-01T00:00:00` ➔ `2026-12-01T14:00:00`) সফলভাবে যাচাই করা হয়েছে।
- `getMonthDefaults` টেস্টে নতুন সাইকেল প্রস্তাবনা এখন `December 2026` (`2026-12-01T00:00` ➔ `2027-01-01T14:00`) রিটার্ন করছে।
- `compile_applet` এবং `lint_applet` (tsc --noEmit) উভয়ই ১০০% সফল।
