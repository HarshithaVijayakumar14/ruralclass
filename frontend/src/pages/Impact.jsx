import React from 'react';
import { 
  Globe2, 
  BookOpen, 
  Award, 
  TrendingUp, 
  HeartHandshake, 
  CheckCircle2,
  Users
} from 'lucide-react';

export const Impact = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Globe2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Impact & UN SDG 4 Alignment
        </h1>
        <p className="text-xs text-stone-500 max-w-xl mx-auto leading-relaxed">
          How GuruMitra directly supports United Nations Sustainable Development Goal 4 (Quality Education) and India's National Education Policy (NEP 2020 / NIPUN Bharat).
        </p>
      </div>

      {/* SDG 4 Card */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-extrabold text-xl">
            4
          </div>
          <div>
            <h2 className="text-lg font-bold">UN Sustainable Development Goal 4</h2>
            <p className="text-rose-100 text-xs">Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-white/10 rounded-xl p-3 space-y-1">
            <div className="font-bold text-xs">Target 4.1</div>
            <p className="text-[11px] text-rose-100 leading-tight">
              Free, equitable and quality primary education leading to relevant learning outcomes.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 space-y-1">
            <div className="font-bold text-xs">Target 4.5</div>
            <p className="text-[11px] text-rose-100 leading-tight">
              Eliminate gender and rural-urban disparities in primary education access.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 space-y-1">
            <div className="font-bold text-xs">Target 4.C</div>
            <p className="text-[11px] text-rose-100 leading-tight">
              Substantially increase the supply of qualified teachers and pedagogical support tools.
            </p>
          </div>
        </div>
      </div>

      {/* Rural Impact Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs text-center space-y-1">
          <div className="text-3xl font-extrabold text-[#2E7D32]">85%</div>
          <div className="text-xs font-bold text-stone-800">Reduction in Teacher Planning Stress</div>
          <p className="text-[11px] text-stone-500">
            Automates multi-grade rotation time-slicing and lesson differentiation.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs text-center space-y-1">
          <div className="text-3xl font-extrabold text-amber-600">0 min</div>
          <div className="text-xs font-bold text-stone-800">Classroom Downtime</div>
          <p className="text-[11px] text-stone-500">
            Every grade has an active slate drill or buddy task while teacher instructs another grade.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs text-center space-y-1">
          <div className="text-3xl font-extrabold text-blue-600">₹0</div>
          <div className="text-xs font-bold text-stone-800">Zero Hardware Budget Required</div>
          <p className="text-[11px] text-stone-500">
            Designed purely around chalkboards, student slates, tamarind seeds, and textbooks.
          </p>
        </div>
      </div>

    </div>
  );
};

