import React, { useState } from 'react';
import { 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  X, 
  BookOpen, 
  Clock, 
  School, 
  CheckCircle2, 
  CalendarClock,
  Sparkles,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrintLessonPlanModal = ({ plan, onClose, activeClassroom, onApplyToTimetable }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!plan) return null;

  const content = plan.content || {};
  const gradePlans = content.grade_plans || [];
  const rotationSchedule = content.rotation_schedule || [];
  const materials = plan.zero_cost_tlm || content.zero_cost_tlm || [
    'Chalkboard & Colored Chalk',
    'Student Slates & Slate Pencils',
    'Tamarind Seeds / Small Pebbles (Counting & Grouping)',
    'State Board Textbooks & Workbooks'
  ];

  const schoolName = activeClassroom?.school_name || 'Govt Primary School';
  const classroomName = activeClassroom?.name || 'Multi-Grade Classroom';
  const gradesText = plan.grades?.join(', ') || '1, 2, 3';
  const formattedDate = plan.created_at 
    ? new Date(plan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Handle Clean Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Build structured text for clipboard sharing (WhatsApp / SMS / Teaching Diary)
  const generateShareText = () => {
    let text = `📚 GURUMITRA MULTI-GRADE TEACHING PLAN\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📌 Topic: ${plan.title || plan.topic}\n`;
    text += `🏫 School: ${schoolName} (${classroomName})\n`;
    text += `📖 Subject: ${plan.subject} | ⏱️ Duration: ${plan.duration_minutes || 60} mins\n`;
    text += `👥 Grades: ${gradesText} | 📅 Date: ${formattedDate}\n`;
    text += `📋 Status: ${plan.status === 'approved' ? 'Approved Teaching Guide' : 'AI Pedagogical Draft'}\n\n`;

    if (content.summary || plan.topic) {
      text += `🎯 MULTI-GRADE CONTEXT & OBJECTIVE:\n${content.summary || plan.topic}\n\n`;
    }

    if (materials.length > 0) {
      text += `🎒 ZERO-COST TLM / MATERIALS:\n${materials.map(m => ` • ${m}`).join('\n')}\n\n`;
    }

    if (rotationSchedule.length > 0) {
      text += `⏱️ ROTATION SCHEDULE MATRIX:\n`;
      rotationSchedule.forEach((slot, i) => {
        text += ` [Slot ${i + 1}] (${slot.time_range || `${i * 15}-${(i + 1) * 15} min`}):\n`;
        text += `   • Direct Instruction: Grade ${slot.teacher_focus_grade || 'All'}\n`;
        if (slot.peer_learning_grade) text += `   • Peer Buddy: Grade ${slot.peer_learning_grade}\n`;
        if (slot.independent_grade) text += `   • Slate Drills: Grade ${slot.independent_grade}\n`;
      });
      text += `\n`;
    }

    if (gradePlans.length > 0) {
      text += `📝 GRADE-WISE DIFFERENTIATED TASKS:\n`;
      gradePlans.forEach(gp => {
        text += `\n--- GRADE ${gp.grade}: ${gp.learning_objective || ''} ---\n`;
        if (gp.key_concept) text += ` * Core Concept: ${gp.key_concept}\n`;
        if (gp.direct_instruction) text += ` * Teacher Direct: ${gp.direct_instruction}\n`;
        if (gp.independent_activity) text += ` * Independent Slate: ${gp.independent_activity}\n`;
        if (gp.peer_learning_activity) text += ` * Peer Drill: ${gp.peer_learning_activity}\n`;
        if (gp.formative_check?.length) text += ` * Rapid Slate Check: ${gp.formative_check.join(' | ')}\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Generated with GuruMitra — Multi-Grade Planning & Student Support System`;
    return text;
  };

  const handleCopyShare = async () => {
    try {
      const shareContent = generateShareText();
      await navigator.clipboard.writeText(shareContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      alert('Could not copy to clipboard. Please use Print / PDF export.');
    }
  };

  const handleLiveLaunch = () => {
    if (onApplyToTimetable) {
      onApplyToTimetable(plan);
    } else {
      localStorage.setItem('ruralclass_active_timetable_plan', JSON.stringify(plan));
      localStorage.setItem('gurumitra_active_timetable_plan', JSON.stringify(plan));
      onClose();
      navigate('/timetable');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 printable-lesson-plan-modal">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden printable-lesson-sheet">
        
        {/* Modal Top Action Bar (Hidden during Print) */}
        <div className="no-print bg-stone-50 border-b border-stone-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2E7D32] text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 block">Printable Teaching Lesson Plan</span>
              <span className="text-[11px] text-stone-500">GuruMitra multi-grade instructional guide</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShare}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                copied 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
              }`}
              title="Copy formatted text to share via WhatsApp or paste in teacher diary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Share / Copy Plan'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Print document or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print as Teaching Guide</span>
            </button>

            <button
              type="button"
              onClick={handleLiveLaunch}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Send to timetable timer"
            >
              <CalendarClock className="w-3.5 h-3.5 text-stone-900" />
              <span className="hidden sm:inline">Launch Live Timer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE CONTENT SECTION
            Clean, professional layout suitable for printing, PDF saving, or classroom use
            ========================================================================= */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-stone-900">
          
          {/* Document Header */}
          <div className="border-b-2 border-stone-900 pb-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#2E7D32]">
                  GuruMitra &bull; Multi-Grade Classroom Teaching Plan
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight mt-0.5">
                  {plan.title || plan.topic}
                </h1>
              </div>

              <div className="text-right text-xs text-stone-600 shrink-0">
                <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  plan.status === 'approved' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {plan.status === 'approved' ? 'Approved Guide' : 'AI Draft Plan'}
                </span>
                <div className="mt-1 text-[11px] text-stone-500 font-medium">Date: {formattedDate}</div>
              </div>
            </div>

            {/* School & Classroom Metadata Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs mt-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">School</span>
                <span className="font-bold text-stone-800 truncate block">{schoolName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Classroom & Subject</span>
                <span className="font-bold text-stone-800">{classroomName} &bull; {plan.subject}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Target Grades</span>
                <span className="font-bold text-stone-800">Grades {gradesText}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Session Duration</span>
                <span className="font-bold text-stone-800">{plan.duration_minutes || 60} Minutes</span>
              </div>
            </div>
          </div>

          {/* 1. Multi-Grade Context & Pedagogical Summary */}
          {(content.summary || plan.topic) && (
            <div className="space-y-1.5 break-inside-avoid">
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                <span>Multi-Grade Lesson Flow & Pedagogical Strategy</span>
              </h2>
              <p className="text-xs text-stone-700 leading-relaxed bg-stone-50/70 p-3.5 rounded-xl border border-stone-200">
                {content.summary || plan.topic}
              </p>
            </div>
          )}

          {/* 2. Zero-Cost Rural TLM / Materials */}
          {materials.length > 0 && (
            <div className="space-y-2 break-inside-avoid">
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Zero-Cost / Low-Cost Rural TLM (Classroom Materials)</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {materials.map((tlm, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                    <span>{tlm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Multi-Grade Rotation Timetable Schedule Matrix */}
          {rotationSchedule.length > 0 && (
            <div className="space-y-2.5 break-inside-avoid">
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                <span>Synchronized Rotation Schedule (Single Teacher Conflict-Free Matrix)</span>
              </h2>
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-300 text-stone-800 font-bold">
                      <th className="p-2.5 w-24">Slot</th>
                      <th className="p-2.5 text-emerald-900 bg-emerald-50/70 border-l border-r border-stone-200">
                        Teacher-Led Direct Focus
                      </th>
                      <th className="p-2.5 text-stone-800">
                        Independent Slate Drills
                      </th>
                      <th className="p-2.5 text-amber-900 bg-amber-50/70 border-l border-stone-200">
                        Peer Buddy Learning
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {rotationSchedule.map((slot, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-2.5 font-bold font-mono text-stone-700 bg-stone-50/50">
                          {slot.time_range || `Slot ${idx + 1}`}
                        </td>
                        <td className="p-2.5 font-semibold text-emerald-900 bg-emerald-50/30 border-l border-r border-stone-200">
                          Grade {slot.teacher_focus_grade || 'All'}: {slot.teacher_activity || 'Direct explanation & chalkboard model'}
                        </td>
                        <td className="p-2.5 text-stone-700">
                          {slot.independent_grade ? `Grade ${slot.independent_grade}: ` : ''}
                          {slot.independent_activity || 'Independent slate practice / textbook copy'}
                        </td>
                        <td className="p-2.5 text-amber-900 bg-amber-50/30 border-l border-stone-200">
                          {slot.peer_learning_grade ? `Grade ${slot.peer_learning_grade}: ` : ''}
                          {slot.peer_activity || 'Peer flashcard quiz & pebble counting drill'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Grade-Wise Differentiated Pedagogical Content */}
          {gradePlans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Grade-Wise Detailed Teaching Guide & Formative Slate Checks</span>
              </h2>

              <div className="space-y-4">
                {gradePlans.map((gp, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-stone-300 bg-white space-y-3 break-inside-avoid">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-200 pb-2">
                      <div className="font-extrabold text-sm text-stone-950">
                        Grade {gp.grade}: {gp.learning_objective}
                      </div>
                      {gp.key_concept && (
                        <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 self-start sm:self-auto">
                          Core Concept: {gp.key_concept}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                      {/* Teacher-Led Direct */}
                      <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1">
                        <span className="font-bold text-emerald-950 uppercase text-[10px] block tracking-wide">
                          Teacher-Led Direct Instruction:
                        </span>
                        <p className="text-emerald-900 text-[11px] leading-relaxed">
                          {gp.direct_instruction || 'Demonstrate on chalkboard with concrete examples.'}
                        </p>
                      </div>

                      {/* Independent Slate */}
                      <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                        <span className="font-bold text-stone-800 uppercase text-[10px] block tracking-wide">
                          Independent Slate Drills:
                        </span>
                        <p className="text-stone-700 text-[11px] leading-relaxed">
                          {gp.independent_activity || 'Students solve on slates silently while teacher rotates.'}
                        </p>
                      </div>

                      {/* Peer Buddy */}
                      <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1">
                        <span className="font-bold text-amber-950 uppercase text-[10px] block tracking-wide">
                          Peer Buddy Practice:
                        </span>
                        <p className="text-amber-900 text-[11px] leading-relaxed">
                          {gp.peer_learning_activity || 'Paired quiz or checking slate calculations together.'}
                        </p>
                      </div>
                    </div>

                    {/* Formative Slate Checks */}
                    {gp.formative_check && gp.formative_check.length > 0 && (
                      <div className="pt-2 border-t border-stone-200 text-xs">
                        <span className="font-bold text-stone-900 mr-2 text-[11px] uppercase tracking-wide">
                          Rapid Slate Check Questions:
                        </span>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 text-stone-700 text-[11px]">
                          {gp.formative_check.map((q, qIdx) => (
                            <li key={qIdx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teacher Signature & Verification Footer */}
          <div className="pt-6 border-t-2 border-dashed border-stone-300 grid grid-cols-2 gap-8 text-xs text-stone-600 break-inside-avoid">
            <div>
              <div className="font-bold text-stone-800 mb-6">Teacher Notes & Observations:</div>
              <div className="border-b border-stone-400 pb-4"></div>
            </div>
            <div className="text-right">
              <div className="font-bold text-stone-800 mb-6">Teacher Signature & Date:</div>
              <div className="border-b border-stone-400 pb-4"></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

