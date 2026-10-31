import React from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Award, 
  Lightbulb, 
  CheckCircle2,
  Bookmark
} from 'lucide-react';

export const Research = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-stone-900 mx-auto shadow-md">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Research & Pedagogical Methodology
        </h1>
        <p className="text-xs text-stone-500 max-w-xl mx-auto leading-relaxed">
          The educational science, fieldwork citations, and mathematical proofs underpinning the RuralClass multi-grade orchestration engine.
        </p>
      </div>

      {/* Section 1: The Multi-Grade Reality in India */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
          <BookOpen className="w-4 h-4 text-[#2E7D32]" />
          <h2>1. The Multi-Grade Classroom Reality (ASER & UDISE+ Data)</h2>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          According to the Annual Status of Education Report (ASER) and government UDISE+ surveys, over 40% of primary schools across rural India operate with fewer than 3 teachers for Grades 1 through 5. In states like Karnataka (the famous <em>Nali-Kali</em> methodology), Rajasthan, and Madhya Pradesh, a single teacher instructs 2 to 4 grades simultaneously in one shared classroom room.
        </p>
        <p className="text-xs text-stone-700 leading-relaxed">
          Standard single-grade educational apps and generic LLM chatbots fail catastrophically in these schools because they assume every child in the room is studying the same textbook at the same pace with full teacher attention.
        </p>
      </div>

      {/* Section 2: Mathematical Proof of Single-Teacher Invariant */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
          <Lightbulb className="w-4 h-4 text-amber-600" />
          <h2>2. The Strict Single-Teacher Invariant</h2>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          GuruMitra models classroom instruction as a constrained optimization problem. Let G = [g1, g2, ..., gk] be the set of distinct grades sharing the classroom for period duration T. Let x_i(t) denote the pedagogical role of grade g_i at minute t in [0, T] (Teacher-Led, Independent Slate, or Peer Buddy).
        </p>
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 font-mono text-xs text-stone-800 text-center font-bold">
          SUM( 1[ x_i(t) == Teacher-Led ] ) ≤ 1 for all t in [0, T]
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          The deterministic scheduling engine algorithmically guarantees this constraint holds at every minute. Simultaneous teacher-led activities are forbidden and caught by automated unit tests before any plan is rendered.
        </p>
      </div>

      {/* Section 3: Grounded Formative Benchmarks */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
          <Award className="w-4 h-4 text-blue-600" />
          <h2>3. Ethical Formative Feedback vs. Deficit Labeling</h2>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          GuruMitra strictly adheres to ethical formative assessment standards. It never assigns deficit labels or clinical diagnoses to children. Instead, it computes transparent mastery thresholds:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <strong className="text-red-800 block mb-1">&lt; 40%: Support Priority</strong>
            <span className="text-red-900">Requires concrete manipulative drills (seeds, slates) and daily buddy pairing.</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <strong className="text-amber-800 block mb-1">40% - 59%: Developing</strong>
            <span className="text-amber-900">Consolidating foundational concepts; guided error correction during slate checks.</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <strong className="text-emerald-800 block mb-1">&ge; 60%: Foundational Mastery</strong>
            <span className="text-emerald-900">Consolidating proficiency; ready to serve as peer mentor to younger grades.</span>
          </div>
        </div>
      </div>

    </div>
  );
};

