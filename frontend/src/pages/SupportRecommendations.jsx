import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Check, 
  BookOpen, 
  Users, 
  Sparkles,
  Info,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchStudents, fetchStudentProgress } from '../lib/api';

export const SupportRecommendations = ({ activeClassroom }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState([]);

  const classroomId = activeClassroom?.id;

  useEffect(() => {
    if (!classroomId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [stdList, progList] = await Promise.all([
          fetchStudents(classroomId),
          fetchStudentProgress({ classroom_id: classroomId })
        ]);
        setStudents(stdList || []);
        setProgressRecords(progList || []);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [classroomId]);

  // Derive evidence-based support recommendations from recorded student assessments
  const recommendations = [];
  students.forEach(student => {
    const studentAssessments = progressRecords.filter(p => p.student_id === student.id);
    const lowAssessments = studentAssessments.filter(p => p.score !== null && p.score !== undefined && p.score < 40);

    if (lowAssessments.length > 0) {
      lowAssessments.forEach(rec => {
        recommendations.push({
          id: `rec-${student.id}-${rec.id}`,
          student,
          assessment: rec,
          skill: rec.skill_tested || 'Foundational Skill',
          score: rec.score,
          priority: 'high',
          evidence: `Recorded score of ${rec.score}% in "${rec.skill_tested}" (${rec.subject}) on ${rec.assessment_date}.`,
          recommended_action: `Provide 10-minute daily concrete slate drill using tamarind seed manipulatives and pair with a Grade ${student.grade} peer buddy.`
        });
      });
    } else if (studentAssessments.some(p => p.priority_level === 'high')) {
      const highFlag = studentAssessments.find(p => p.priority_level === 'high');
      recommendations.push({
        id: `rec-${student.id}-${highFlag.id}`,
        student,
        assessment: highFlag,
        skill: highFlag.skill_tested || 'Teacher Observation',
        score: highFlag.score,
        priority: 'high',
        evidence: `Teacher recorded high-priority observation: "${highFlag.observations || 'Needs reinforcement'}" on ${highFlag.assessment_date}.`,
        recommended_action: `Check slate work during independent practice time; verify letter recognition or number sense.`
      });
    }
  });

  const activeRecs = recommendations.filter(r => !dismissedIds.includes(r.id));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <span>Evidence-Based Support & Remedial Recommendations</span>
        </h1>
        <p className="text-xs text-stone-500">
          {activeClassroom?.name || 'Classroom'} • Transparent pedagogical next steps linked strictly to recorded assessment history
        </p>
      </div>

      {/* Ethical AI and Transparency Notice */}
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-emerald-800">
          <Info className="w-4 h-4 text-[#2E7D32]" />
          <span>Ethical & Transparent Support Guidelines</span>
        </div>
        <p className="leading-relaxed">
          GuruMitra recommendations are derived strictly from teacher-entered assessment records and observations. They provide actionable zero-cost slate suggestions and peer pairings. Recommendations never make clinical or definitive judgments about any student.
        </p>
      </div>

      {/* Recommendations List */}
      {activeRecs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#2E7D32] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-stone-800">
            {progressRecords.length === 0 
              ? 'No assessment records entered yet.' 
              : 'All students currently meet or exceed foundational benchmarks.'}
          </div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {progressRecords.length === 0
              ? 'Record formative quiz scores or slate checks in the Student Progress tab to automatically generate support recommendations.'
              : 'Keep up the multi-grade rotation schedule!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeRecs.map(rec => (
            <div 
              key={rec.id}
              className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-900">
                    {rec.student.name}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold">
                    Grade {rec.student.grade}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 uppercase">
                    High Priority
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDismissedIds(prev => [...prev, rec.id])}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 text-xs flex items-center gap-1"
                    title="Dismiss Recommendation"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>

              {/* Evidence Statement */}
              <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100">
                <div className="font-semibold text-stone-800 text-[11px] uppercase tracking-wider mb-0.5">
                  Recorded Evidence:
                </div>
                <p className="leading-relaxed">{rec.evidence}</p>
              </div>

              {/* Suggested Action */}
              <div className="text-xs text-emerald-900 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <div className="font-semibold text-emerald-800 text-[11px] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Recommended Action (Zero-Cost TLM):</span>
                </div>
                <p className="leading-relaxed">{rec.recommended_action}</p>
              </div>

              {/* Action Button: Create Remedial Slate Drill */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/worksheets', {
                    state: {
                      prefillGrade: rec.student.grade,
                      prefillSubject: rec.assessment?.subject || 'Mathematics',
                      prefillTopic: rec.skill,
                      prefillDifficulty: 'remedial'
                    }
                  })}
                  className="px-3.5 py-1.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                  <span>Generate Remedial Slate Drill in Worksheets</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
