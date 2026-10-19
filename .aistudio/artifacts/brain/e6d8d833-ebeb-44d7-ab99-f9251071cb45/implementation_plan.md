# Implementation Plan - Universal Minimalist UI & Redundant Text Removal

ইউজারের নির্দেশ অনুযায়ী, প্রতিটি মেস (Multi-tenant) এবং প্রতিটি ব্যবহারকারী রোলের (Admin, Manager, Member/Border) ক্ষেত্রে ড্যাশবোর্ড ও সার্বিক ইউআই থেকে অতিরিক্ত, অপ্রয়োজনীয় ও অযথা ব্যাখ্যামূলক টেক্সটগুলো স্থায়ীভাবে অপসারণ করা হবে।

---

## Universal Design Principle & Scope
1. **সার্বজনীন প্রয়োগ (Universal to All Roles & Messes)**:
   - অ্যাডমিন হোক বা সাধারণ মেম্বার—কাউকেই কোনো রোলে অপ্রয়োজনীয় ব্যাখ্যা বা ক্লাটার টেক্সট দেখানো হবে না।
   - সিস্টেমের মাল্টি-টেন্যান্ট নীতি বজায় রেখে প্রতিটি মেসের সকল সদস্যের ইন্টারফেস স্বয়ংক্রিয়ভাবে স্লিম ও ক্লিন থাকবে।
2. **ধাপে ধাপে পরিচ্ছন্নতা (Progressive Decluttering)**:
   - টাইটেল বা আইকন দেখেই যেহেতু ব্যবহারকারী কাজ বুঝতে পারেন, তাই নিচের অতিরিক্ত ব্যাখ্যামূলক বাক্যগুলো সম্পূর্ণ বর্জন করা হবে।

---

## Proposed Changes (Phase 1: Dashboard Focus)

### 1. Header Duty Notice Cleanup (`src/components/Dashboard.tsx`)
- **সমস্যা**: ব্যবহারকারীর কোনো নির্ধারিত ডিউটি না থাকলে হেডারে "No specific mess duties assigned currently" টেক্সটটি দৃশ্যমান থাকে।
- **সমাধান**:
  - কোনো দায়িত্ব না থাকলে কোনো টেক্সট বা এম্পটি নোটিশ দেখানো হবে না (`null`)।
  - শুধুমাত্র কারো উপর সক্রিয় ডিউটি থাকলে তখনই সুন্দর ব্যাজটি (`currentUserDuty`) দৃশ্যমান হবে।
  - অ্যাডমিন বা মেম্বার—সবার ক্ষেত্রে এই নিয়ম সমানভাবে প্রযোজ্য হবে।

---

### 2. Primary Stat Cards Subtext Removal (`src/components/Dashboard.tsx`)
মূল ৪টি স্ট্যাট কার্ডের নিচের অবাঞ্ছিত ব্যাখ্যামূলক টেক্সট সম্পূর্ণ মুছে ফেলা হবে:
- **Meal Rate**:
  - ❌ `Calculated live based on current meals` টেক্সটটি সম্পূর্ণ মুছে ফেলা হবে।
- **Total Expenses / Mess Balance**:
  - ❌ `Total deposits - total mess expenses` টেক্সটটি সম্পূর্ণ মুছে ফেলা হবে।
- **Active Members**:
  - ❌ `Out of {members.length} registered` টেক্সটটি সম্পূর্ণ মুছে ফেলা হবে।
- **Total Meals**:
  - ❌ `Combined total for current cycle` টেক্সটটি সম্পূর্ণ মুছে ফেলা হবে।
- **লেআউট**: টেক্সট মুছে যাওয়ার পর কার্ডগুলোর উচ্চতা ও অভ্যন্তরীণ স্পেসিং সামঞ্জস্যপূর্ণ রাখা হবে যাতে ডেস্কটপ ও মোবাইলে প্রিমিয়াম লুক বজায় থাকে।

---

### 3. Quick Action Shortcut Cards Subtext Removal (`src/components/Dashboard.tsx`)
শর্টকাট কার্ডগুলোর নিচের সব অতিরিক্ত বিবরণী টেক্সট মুছে ফেলা হবে:
- **Add Meals**: "Log your daily lunch and dinner intake" -> ❌ অপসারিত।
- **Record Expense**: "Input shared bazaar or utility costs" -> ❌ অপসারিত।
- **Analytics & Reports**: "View detailed reports and export PDF" -> ❌ অপসারিত।
- **Member Deposit**: "Deposit balance into mess account" -> ❌ অপসারিত।
- **Meal Attendance**: "Track who is eating meals daily" -> ❌ অপসারিত।
- **Notices**: "Important updates and announcements" -> ❌ অপসারিত।
- **Rules & Settings**: "Configure mess rules and members" -> ❌ অপসারিত।
- **কার্ড লেআউট**: শর্টকাট কার্ডগুলোর আকার ও প্যাডিং অক্ষুণ্ণ রেখে আইকন, টাইটেল ও অ্যারো পরিচ্ছন্নভাবে সজ্জিত করা হবে।

---

### 4. অন্যান্য মডিউলে পরবর্তী ধাপের প্রস্তুতি
- ইউজার যেভাবে জানিয়েছেন, পরবর্তীতে অন্যান্য মডিউলের (যেমন মিল শিট, বাজার খরচ, মেম্বার লিস্ট ইত্যাদি) অপ্রয়োজনীয় সাবটেক্সটও একইভাবে ধাপে ধাপে পরিচ্ছন্ন করা হবে।

---

## Multi-Tenant & RBAC Verification
- কোনো মেসের ডাটাবেজ বা পারমিশন লজিক পরিবর্তন হচ্ছে না।
- অ্যাডমিন প্যানেল হোক বা বর্ডার ভিউ—সবখানেই অপ্রয়োজনীয় টেক্সট ক্লাটার দূরীভূত হবে।
- কোনো মেসের ডাটা বা সেটিংস অন্য মেসে ওভাররাইট হওয়ার কোনো ঝুঁকি নেই।

---

## Verification Plan

### Automated Verification
- `compile_applet`: কোনো কম্পাইলেশন বা টাইপস্ক্রিপ্ট এরর নেই তা যাচাই করা।
- `lint_applet`: সিনট্যাক্স ও কোড ফরম্যাটিং নিশ্চিত করা।

### Manual Verification
- **Header Check**: ডিউটিহীন সদস্য ও অ্যাডমিন উভয়ের আইডিতে কোনো অযথা মেসেজ প্রদর্শিত হচ্ছে না তা নিশ্চিত করা।
- **Stat Cards Check**: ৪টি স্ট্যাট কার্ডেই শুধুমাত্র টাইটেল এবং সঠিক সংখ্যা পরিচ্ছন্নভাবে প্রদর্শিত হচ্ছে কি না তা পরীক্ষা করা।
- **Shortcuts Grid Check**: শর্টকাট বাটনগুলো ডেস্কটপ ও মোবাইল উভয় স্ক্রিনেই মসৃণ ও কমপ্যাক্ট দেখাচ্ছে কি না তা যাচাই করা।
