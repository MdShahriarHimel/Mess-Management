/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, Upload, X, Check, Loader2, Sparkles, AlertCircle, 
  HelpCircle, CheckCircle2, XCircle, RefreshCw, Save, ArrowRight,
  Plus, Minus, Users, FlipHorizontal, Eye
} from "lucide-react";
import { Member } from "../types.js";

interface ScannedMealEntry {
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

interface UnmatchedName {
  nameInImage: string;
  lunchMark?: string;
  dinnerMark?: string;
  note: string;
}

interface AIMealScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onApplyMeals: (scannedMap: Record<string, Record<string, number>>, autoSave?: boolean) => Promise<void> | void;
  members: Member[];
  activeMealTypes: { id: string; name: string }[];
  isDarkMode: boolean;
  authToken: string;
  currentMonthId: string;
}

export default function AIMealScannerModal({
  isOpen,
  onClose,
  selectedDate,
  onApplyMeals,
  members,
  activeMealTypes,
  isDarkMode,
  authToken,
  currentMonthId,
}: AIMealScannerModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    detectedMeals: ScannedMealEntry[];
    unmatchedNames: UnmatchedName[];
    summary: string;
    totalLunchCount: number;
    totalDinnerCount: number;
  } | null>(null);
  const [editableMeals, setEditableMeals] = useState<Record<string, Record<string, number>>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Live Camera states
  const [isLiveCamera, setIsLiveCamera] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Stop live camera stream helper
  const stopLiveCamera = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.error("Error stopping camera tracks:", e);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveCamera(false);
    setIsCameraStarting(false);
  };

  // Start live in-app camera viewfinder
  const startLiveCamera = async (facing: "environment" | "user" = "environment") => {
    setErrorMessage(null);
    setIsCameraStarting(true);
    setIsLiveCamera(true);
    setCameraFacing(facing);

    // Stop previous track if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("আপনার ব্রাউজারে সরাসরি লাইভ ক্যামেরা চালু করা সম্ভব হয়নি।");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Some browsers auto-play without issue
        }
      }
    } catch (err: any) {
      console.warn("[AIMealScannerModal] Live camera error:", err);
      stopLiveCamera();
      
      let errMsg = "সরাসরি ক্যামেরা চালু করা সম্ভব হয়নি।";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errMsg = "ক্যামেরার অনুমতি (Permission) দেওয়া হয়নি। ব্রাউজার সেটিংসে ক্যামেরা এলাউ করুন অথবা গ্যালারি থেকে ছবি নির্বাচন করুন।";
      } else if (err.message) {
        errMsg = `${errMsg} (${err.message})`;
      }
      setErrorMessage(errMsg);

      // Attempt fallback to native camera input
      setTimeout(() => {
        cameraInputRef.current?.click();
      }, 300);
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Toggle between back and front camera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    startLiveCamera(nextFacing);
  };

  // Capture frame from live camera video
  const captureLivePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      setImagePreview(dataUrl);
      setScanResult(null);
      setErrorMessage(null);

      // Convert to file object
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `meal-sheet-${Date.now()}.jpg`, { type: "image/jpeg" });
          setImageFile(file);
        }
      }, "image/jpeg", 0.92);

      // Stop video stream after capture
      stopLiveCamera();
    } catch (e: any) {
      console.error("Failed to capture photo from video:", e);
      setErrorMessage("ছবি ক্যাপচার করতে সমস্যা হয়েছে: " + e.message);
    }
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

  if (!isOpen) return null;

  const handleImageSelect = (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setImageFile(file);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartScan = async () => {
    if (!imagePreview) {
      setErrorMessage("অনুগ্রহ করে প্রথমে মিল চার্টের একটি ছবি আপলোড করুন");
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/meals/ai-scan-sheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          image: imagePreview,
          mimeType: imageFile?.type || "image/jpeg",
          monthId: currentMonthId,
          mealTypes: activeMealTypes
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "ছবি থেকে মিল স্ক্যান করতে ব্যর্থ হয়েছে। স্পষ্ট ছবি দিয়ে পুনরায় চেষ্টা করুন।");
      }

      setScanResult({
        detectedMeals: data.detectedMeals || [],
        unmatchedNames: data.unmatchedNames || [],
        summary: data.summary || "",
        totalLunchCount: data.totalLunchCount || 0,
        totalDinnerCount: data.totalDinnerCount || 0
      });

      // Populate editable meals map
      const initialMap: Record<string, Record<string, number>> = {};
      (data.detectedMeals || []).forEach((item: ScannedMealEntry) => {
        initialMap[item.memberId] = {
          lunch: Number(item.lunch) || 0,
          dinner: Number(item.dinner) || 0
        };
        if (item.breakfast !== undefined) {
          initialMap[item.memberId].breakfast = Number(item.breakfast) || 0;
        }
      });
      setEditableMeals(initialMap);

    } catch (err: any) {
      console.error(err);
      let msg = err.message || "ছবি স্ক্যান করতে সমস্যা হয়েছে।";
      if (msg.includes("503") || msg.toLowerCase().includes("high demand") || msg.toLowerCase().includes("unavailable")) {
        msg = "AI মডেল সার্ভারে সাময়িক চাপ (High Demand) চলছে। অনুগ্রহ করে কয়েক সেকেন্ড পর আবার স্ক্যান বাটনে চাপ দিন।";
      }
      setErrorMessage(msg);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleMealValue = (memberId: string, mealType: string) => {
    setEditableMeals(prev => {
      const current = prev[memberId]?.[mealType] ?? 1;
      const next = current > 0 ? 0 : 1;
      return {
        ...prev,
        [memberId]: {
          ...(prev[memberId] || {}),
          [mealType]: next
        }
      };
    });
  };

  const adjustMealCount = (memberId: string, mealType: string, delta: number) => {
    setEditableMeals(prev => {
      const current = prev[memberId]?.[mealType] ?? 1;
      const next = Math.max(0, Math.round((current + delta) * 10) / 10);
      return {
        ...prev,
        [memberId]: {
          ...(prev[memberId] || {}),
          [mealType]: next
        }
      };
    });
  };

  const handleCloseModal = () => {
    stopLiveCamera();
    onClose();
  };

  const handleApply = async (autoSave: boolean = false) => {
    setIsApplying(true);
    try {
      await onApplyMeals(editableMeals, autoSave);
      handleCloseModal();
    } catch (e: any) {
      setErrorMessage(e.message || "মিল ইনপুট করতে সমস্যা হয়েছে");
    } finally {
      setIsApplying(false);
    }
  };

  const resetScanner = () => {
    stopLiveCamera();
    setImageFile(null);
    setImagePreview(null);
    setScanResult(null);
    setEditableMeals({});
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden text-left transition-all ${
          isDarkMode 
            ? "bg-slate-900 border-cyan-500/20 text-white shadow-cyan-950/50" 
            : "bg-white border-slate-200 text-slate-800 shadow-slate-300"
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
          isDarkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold font-display flex items-center gap-1.5 text-cyan-400">
                  AI Meal Sheet Scanner
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Gemini Multimodal Vision
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  100% Free
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                মিল চার্টের ছবি থেকে অটোমেটিক দুপুর ও রাতের মিল ইনপুট করুন ({selectedDate})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDarkMode 
                ? "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white" 
                : "border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">

          {/* Quick Logic Info Banner */}
          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            isDarkMode ? "bg-cyan-950/20 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-900"
          }`}>
            <div className="font-bold mb-1 flex items-center gap-1.5 text-cyan-400">
              <HelpCircle size={15} />
              চার্ট পড়ার স্বয়ংক্রিয় নিয়ম (Bachelor Mess Logic):
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mt-1.5">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 font-black flex items-center justify-center shrink-0">✖</span>
                <span><strong>ক্রস চিহ্ন (X / 0):</strong> মিল বন্ধ (০)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0">⬜</span>
                <span><strong>ফাঁকা ঘর / টিক (✓ / 1):</strong> মিল চালু (১)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0">🌐</span>
                <span><strong>বাংলা/ইংরেজি নাম:</strong> অটো ম্যাচ (যেমন: ইশতিয়াক = Ishtiaque)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 font-black flex items-center justify-center shrink-0">২+</span>
                <span><strong>গেস্ট মিল / সংখ্যা (২, ৩, two, three, +১):</strong> নির্দিষ্ট মিল সংখ্যা অটো ইনপুট নিবে</span>
              </li>
              <li className="flex items-center gap-2 sm:col-span-2">
                <span className="w-5 h-5 rounded-md bg-slate-500/20 text-slate-400 font-bold flex items-center justify-center shrink-0">🚫</span>
                <span><strong>তালিকাবহির্ভূত নাম:</strong> মেসে মেম্বার হিসেবে না থাকলে স্বয়ংক্রিয়ভাবে বাদ যাবে</span>
              </li>
            </ul>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Upload & Preview Section */}
          {!scanResult && (
            <div className="space-y-4">
              <div 
                className={`p-4 sm:p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 text-center transition-all ${
                  isLiveCamera
                    ? "border-cyan-500 bg-slate-950/60"
                    : imagePreview 
                      ? isDarkMode ? "border-cyan-500/40 bg-slate-950/40" : "border-cyan-300 bg-cyan-50/30"
                      : isDarkMode ? "border-slate-800 hover:border-cyan-500/30 bg-slate-950/30" : "border-slate-300 hover:border-cyan-400 bg-slate-50"
                }`}
              >
                {/* 1. Live In-App Camera Viewfinder */}
                {isLiveCamera ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <div className="relative w-full max-w-lg aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-cyan-500 shadow-2xl flex items-center justify-center">
                      <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted
                        className={`w-full h-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
                      />

                      {/* Viewfinder Guide Overlay Frame */}
                      <div className="absolute inset-3 sm:inset-5 border-2 border-dashed border-cyan-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2.5 sm:p-3">
                        <div className="flex items-center gap-1.5 self-start bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-cyan-300 border border-cyan-500/30">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                          <span>লাইভ ক্যামেরা • খাতা বা বোর্ডের ছবি সোজা ফ্রেমে রাখুন</span>
                        </div>
                        <div className="self-center bg-slate-950/80 backdrop-blur-sm px-3 py-1 rounded-md text-[11px] font-semibold text-cyan-200 border border-cyan-500/20">
                          নিচের বাটনে চাপ দিয়ে ছবি তুলুন
                        </div>
                      </div>

                      {/* Top Action Buttons inside Viewfinder */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-2 z-10">
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm transition-all shadow cursor-pointer active:scale-95"
                          title="ক্যামেরা সুইচ করুন (সামনে/পেছনে)"
                        >
                          <FlipHorizontal size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={stopLiveCamera}
                          className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/30 backdrop-blur-sm transition-all shadow cursor-pointer active:scale-95"
                          title="ক্যামেরা বন্ধ করুন"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Camera Initializing Loader */}
                      {isCameraStarting && (
                        <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-cyan-400 z-20">
                          <Loader2 size={32} className="animate-spin" />
                          <span className="text-xs font-bold">ক্যামেরা চালু হচ্ছে...</span>
                        </div>
                      )}
                    </div>

                    {/* Camera Control Action Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                      >
                        বাতিল করুন
                      </button>

                      <button
                        type="button"
                        onClick={captureLivePhoto}
                        disabled={isCameraStarting}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer border border-cyan-300/40"
                      >
                        <Camera size={16} />
                        <span>ছবি তুলুন (ক্যাপচার)</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="সামনের ও পেছনের ক্যামেরা বদলান"
                      >
                        <FlipHorizontal size={14} />
                        <span>ক্যামেরা পরিবর্তন</span>
                      </button>
                    </div>
                  </div>
                ) : imagePreview ? (
                  /* 2. Image Preview when Captured or Selected */
                  <div className="space-y-4 w-full flex flex-col items-center">
                    <div className="relative max-w-md max-h-72 rounded-xl overflow-hidden border border-cyan-500/30 shadow-lg">
                      <img 
                        src={imagePreview} 
                        alt="Meal Sheet Preview" 
                        className="w-full h-auto object-contain max-h-72" 
                      />
                      <button
                        type="button"
                        onClick={resetScanner}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-rose-400 hover:bg-slate-900 transition-colors shadow cursor-pointer"
                        title="ছবি পরিবর্তন করুন"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => startLiveCamera("environment")}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera size={14} />
                        ক্যামেরা দিয়ে পুনরায় তুলুন
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload size={14} />
                        গ্যালারি থেকে অন্য ছবি দিন
                      </button>
                      <button
                        type="button"
                        onClick={resetScanner}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-rose-800/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X size={14} />
                        ছবি মুছুন
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 3. Initial Choice: Live Camera vs Gallery */
                  <>
                    <div className="p-4 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Camera size={36} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">
                        মিল খাতা বা বোর্ডের স্পষ্ট ছবি দিন
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md">
                        সরাসরি ক্যামেরা দিয়ে ছবি তুলুন অথবা আপনার ফোনের গ্যালারি থেকে পূর্বে তোলা ছবি সিলেক্ট করুন।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 w-full max-w-md">
                      {/* Choice A: Open Real Live In-App Camera */}
                      <button
                        type="button"
                        onClick={() => startLiveCamera("environment")}
                        className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/40 active:scale-95 transition-all cursor-pointer border border-cyan-400/30 group"
                      >
                        <div className="flex items-center gap-2 text-sm font-extrabold">
                          <Camera size={18} className="text-cyan-200 group-hover:scale-110 transition-transform" />
                          <span>সরাসরি ক্যামেরা অন করুন</span>
                        </div>
                        <span className="text-[11px] text-cyan-100 font-normal">
                          লাইভ ভিউ দিয়ে সরাসরি ছবি তুলুন
                        </span>
                      </button>

                      {/* Choice B: Choose from Gallery / Storage */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs rounded-xl flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-100">
                          <Upload size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                          <span>গ্যালারি / ফাইল থেকে বাছুন</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-normal">
                          আগে তোলা ছবি বা ফাইল নির্বাচন করুন
                        </span>
                      </button>
                    </div>

                    {/* Native Camera App Fallback Link */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="text-[11px] text-slate-400 hover:text-cyan-400 underline underline-offset-4 flex items-center gap-1 transition-colors pt-1 cursor-pointer"
                    >
                      <span>বা ফোনের নিজস্ব ক্যামেরা অ্যাপ দিয়ে সরাসরি তুলতে এখানে ট্যাপ করুন</span>
                    </button>
                  </>
                )}

                {/* Hidden File Inputs */}
                {/* 1. Gallery input: NO capture attribute, pure photo picker */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageSelect(f);
                    e.target.value = "";
                  }}
                />
                {/* 2. Device Camera fallback input: capture="environment" */}
                <input 
                  type="file" 
                  ref={cameraInputRef} 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageSelect(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Start Scan Button */}
              {imagePreview && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleStartScan}
                    disabled={isScanning}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-cyan-200" />
                        <span>AI স্ক্যান করছে... হাতের লেখা ও ক্রস/ফাঁকা ঘর বিশ্লেষণ করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>স্ক্যান ও মিল শনাক্ত করুন (Run AI Scan)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. Results & Review Section */}
          {scanResult && (
            <div className="space-y-4">
              {/* Summary Header */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDarkMode ? "bg-slate-950/80 border-cyan-500/30" : "bg-cyan-50 border-cyan-200"
              }`}>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    AI স্ক্যান ফলাফল
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {scanResult.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
                    দুপুর (Lunch): {Object.values(editableMeals).reduce((a: number, b: any) => a + (Number(b?.lunch) || 0), 0)}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
                    রাত (Dinner): {Object.values(editableMeals).reduce((a: number, b: any) => a + (Number(b?.dinner) || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Unmatched / Unknown Names Warning */}
              {scanResult.unmatchedNames.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-400" />
                    ছবিতে থাকা যে নামগুলো মেসের তালিকায় নেই (বাদ দেওয়া হয়েছে):
                  </p>
                  <p className="text-[11px] text-slate-400 pl-5">
                    {scanResult.unmatchedNames.map(u => `"${u.nameInImage}"`).join(", ")} — ওয়েবসাইটে কোনো মেম্বার না থাকায় এদের মিল যোগ করা হয়নি।
                  </p>
                </div>
              )}

              {/* Detected Members Table */}
              <div className={`border rounded-xl overflow-hidden ${
                isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white"
              }`}>
                <div className="overflow-x-auto max-h-[360px] custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${
                      isDarkMode ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}>
                      <tr>
                        <th className="py-3 px-4">মেম্বারের নাম</th>
                        <th className="py-3 px-4">ছবিতে পাওয়া নাম</th>
                        <th className="py-3 px-4 text-center text-orange-400">দুপুর (Lunch)</th>
                        <th className="py-3 px-4 text-center text-cyan-400">রাত (Dinner)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {scanResult.detectedMeals.map((item) => {
                        const mInfo = members.find(m => m.id === item.memberId);
                        const curLunch = editableMeals[item.memberId]?.lunch ?? item.lunch;
                        const curDinner = editableMeals[item.memberId]?.dinner ?? item.dinner;

                        return (
                          <tr 
                            key={item.memberId}
                            className={`hover:bg-cyan-500/5 transition-colors ${
                              isDarkMode ? "text-slate-200" : "text-slate-800"
                            }`}
                          >
                            <td className="py-2.5 px-4">
                              <div className="font-bold">{mInfo?.name || item.matchedMemberName}</div>
                              <div className="text-[10px] text-slate-500">@{mInfo?.nickname || "member"}</div>
                            </td>

                            <td className="py-2.5 px-4 font-mono text-slate-400">
                              "{item.detectedNameInImage}"
                            </td>

                            {/* Lunch column */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => adjustMealCount(item.memberId, "lunch", -1)}
                                  disabled={curLunch <= 0}
                                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
                                  title="মিল সংখ্যা কমান"
                                >
                                  <Minus size={11} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleMealValue(item.memberId, "lunch")}
                                  className={`min-w-[84px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer inline-flex items-center justify-center gap-1 ${
                                    curLunch === 0
                                      ? "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25"
                                      : curLunch === 1
                                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                                      : "bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 font-black shadow-sm"
                                  }`}
                                  title={item.lunchReason ? `AI শনাক্তকরণ: ${item.lunchReason}` : "ক্লিক করে টগল করুন"}
                                >
                                  {curLunch === 0 ? (
                                    <>
                                      <X size={12} />
                                      <span>০ (অফ)</span>
                                    </>
                                  ) : curLunch === 1 ? (
                                    <>
                                      <Check size={12} />
                                      <span>১ (চালু)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Users size={12} className="text-purple-400" />
                                      <span>{curLunch} (গেস্টসহ)</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => adjustMealCount(item.memberId, "lunch", 1)}
                                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
                                  title="গেস্ট মিল / মিল সংখ্যা বাড়ান (+১)"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                              {item.lunchReason && (
                                <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[140px] mx-auto" title={item.lunchReason}>
                                  {item.lunchReason}
                                </div>
                              )}
                            </td>

                            {/* Dinner column */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => adjustMealCount(item.memberId, "dinner", -1)}
                                  disabled={curDinner <= 0}
                                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
                                  title="মিল সংখ্যা কমান"
                                >
                                  <Minus size={11} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleMealValue(item.memberId, "dinner")}
                                  className={`min-w-[84px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer inline-flex items-center justify-center gap-1 ${
                                    curDinner === 0
                                      ? "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25"
                                      : curDinner === 1
                                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                                      : "bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 font-black shadow-sm"
                                  }`}
                                  title={item.dinnerReason ? `AI শনাক্তকরণ: ${item.dinnerReason}` : "ক্লিক করে টগল করুন"}
                                >
                                  {curDinner === 0 ? (
                                    <>
                                      <X size={12} />
                                      <span>০ (অফ)</span>
                                    </>
                                  ) : curDinner === 1 ? (
                                    <>
                                      <Check size={12} />
                                      <span>১ (চালু)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Users size={12} className="text-purple-400" />
                                      <span>{curDinner} (গেস্টসহ)</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => adjustMealCount(item.memberId, "dinner", 1)}
                                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
                                  title="গেস্ট মিল / মিল সংখ্যা বাড়ান (+১)"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                              {item.dinnerReason && (
                                <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[140px] mx-auto" title={item.dinnerReason}>
                                  {item.dinnerReason}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetScanner}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw size={13} />
                  নতুন ছবি দিন
                </button>

                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={() => handleApply(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <span>টেবিলে বসান (Review in Table)</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={() => handleApply(true)}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        সেভ হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Save size={13} />
                        ইনপুট ও সরাসরি সেভ করুন
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
