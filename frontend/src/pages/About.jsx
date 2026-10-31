import React from 'react';
import { 
  GraduationCap, 
  Sparkles, 
  ShieldCheck, 
  WifiOff, 
  CheckCircle2, 
  Clock, 
  Users, 
  HeartHandshake 
} from 'lucide-react';

export const About = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Hero Banner */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#2E7D32] flex items-center justify-center text-white mx-auto shadow-md">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2E7D32] tracking-tight">
          About GuruMitra
        </h1>
        <p className="text-sm font-semibold text-stone-700">
          "One teacher. Many grades. Zero planning stress."
        </p>
        <p className="text-xs text-stone-500 max-w-xl mx-auto leading-relaxed">
          GuruMitra is an AI-assisted and mathematically governed classroom planning platform engineered specifically for single-teacher primary schools instructing multiple grades (Grades 1–8) simultaneously in one room.
        </p>
      </div>

      {/* 4 Core Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#2E7D32] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">
            Single-Teacher Mathematical Invariant
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            In a multi-grade classroom, one teacher cannot instruct multiple grades at once. Our deterministic rotation scheduler mathematically ensures that at any minute t, ≤ 1 grade receives direct teacher-led attention, while others work on slates or peer buddy learning.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">
            Teacher Stays in Control (Drafts First)
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            AI is an assistant, never the final authority. All Gemini-generated lesson plans and support suggestions are saved as drafts and only become active upon explicit teacher verification and approval.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">
            Zero-Cost Teaching Learning Materials (TLM)
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Every activity is built around real rural classroom resources: chalkboards, student slates, tamarind seeds, pebbles, garden leaves, and textbooks—never expensive screens or broadband streaming.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
            <WifiOff className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">
            100% Offline-First with Reversible Sync
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            PWA service worker precaching and IndexedDB storage ensure that attendance, student records, and saved lesson plans work without any cellular connectivity. Changes sync automatically when internet resumes.
          </p>
        </div>

      </div>

    </div>
  );
};
