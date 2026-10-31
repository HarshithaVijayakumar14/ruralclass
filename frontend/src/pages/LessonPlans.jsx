import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Layers, 
  Save, 
  FileText,
  Users,
  ChevronRight,
  Filter,
  CalendarClock,
  BellRing,
  ArrowRight
} from 'lucide-react';
import { 
  fetchLessonPlans, 
  saveLessonPlan, 
  updateLessonPlan, 
  approveLessonPlan, 
  requestAILessonPlan 
} from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useSarvam } from '../lib/sarvamTranslation';
import { PrintLessonPlanModal } from '../components/PrintLessonPlanModal';

export const LessonPlans = ({ activeClassroom }) => {
  const { t, i18n } = useTranslation();
  const { translateEntireClassroomPlan, isTranslating } = useSarvam();
  const location = useLocation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Planning form input state (with location.state prefill if sent from Photo Scanner)
  const [subject, setSubject] = useState(location.state?.prefillSubject || 'Science (Environmental Studies)');
  const [topic, setTopic] = useState(location.state?.prefillTopic || 'Plants, Roots, and Soil Conservation');
  const [duration, setDuration] = useState(activeClassroom?.daily_minutes || 60);
  const [selectedGrades, setSelectedGrades] = useState(location.state?.prefillGrades || activeClassroom?.grades || [2, 4, 5]);
  const [planningMode, setPlanningMode] = useState('common_theme');
  const [teacherPriorities, setTeacherPriorities] = useState('Focus on concrete slate drawing for lower grade and error correction for upper grade.');

  const classroomId = activeClassroom?.id;

  // Sync grades from location state or classroom changes
  useEffect(() => {
    if (location.state?.prefillTopic) {
      setTopic(location.state.prefillTopic);
      if (location.state.prefillSubject) setSubject(location.state.prefillSubject);
      if (location.state.prefillGrades?.length) setSelectedGrades(location.state.prefillGrades);
    } else if (activeClassroom?.grades) {
      setSelectedGrades(activeClassroom.grades);
      setDuration(activeClassroom.daily_minutes || 60);
    }
  }, [location.state, activeClassroom]);

  // Load existing plans from Supabase / API
  useEffect(() => {
    if (!classroomId) return;
    const loadPlans = async () => {
      setLoading(true);
      try {
        const data = await fetchLessonPlans(classroomId);
        setPlans(data || []);
        if (data && data.length > 0 && !selectedPlan) {
          setSelectedPlan(data[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadPlans();

    // Supabase Realtime subscription
    const unsub = subscribeToTable({
      table: 'lesson_plans',
      filter: `classroom_id=eq.${classroomId}`,
      onInsert: (newPlan) => {
        setPlans(prev => [newPlan, ...prev]);
        setSelectedPlan(newPlan);
      },
      onUpdate: (updatedPlan) => {
        setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
        if (selectedPlan?.id === updatedPlan.id) setSelectedPlan(updatedPlan);
      },
      onDelete: (oldPlan) => {
        setPlans(prev => prev.filter(p => p.id !== oldPlan.id));
        if (selectedPlan?.id === oldPlan.id) setSelectedPlan(null);
      }
    });

    return () => unsub();
  }, [classroomId]);

  // Trigger Gemini AI Multi-Grade Plan Generation
  const handleGenerateAIPlan = async (e) => {
    e.preventDefault();
    const targetClassroomId = classroomId || activeClassroom?.id || 'default-classroom';
    setGenerating(true);
    setErrorMsg(null);

    try {
      const response = await requestAILessonPlan({
        classroom_id: targetClassroomId,
        subject,
        topic,
        grades: selectedGrades,
        duration_minutes: duration,
        planning_mode: planningMode,
        available_materials: activeClassroom?.materials || ['Chalkboard', 'Slates & Chalk', 'Seeds / Pebbles'],
        teacher_priorities: teacherPriorities
      });

      const planToDisplay = response.plan || response.fallbackPlan;
      if (planToDisplay) {
        let saved = null;
        try {
          saved = await saveLessonPlan({
            classroom_id: targetClassroomId,
            title: planToDisplay.title,
            subject,
            topic,
            grades: selectedGrades,
            duration_minutes: duration,
            planning_mode: planningMode,
            status: 'draft',
            content: planToDisplay,
            zero_cost_tlm: planToDisplay.zero_cost_tlm || []
          });
        } catch (saveErr) {
          console.warn('[LessonPlans] Could not persist plan to server/IDB:', saveErr);
        }

        const finalPlan = saved || {
          id: `local-plan-${Date.now()}`,
          classroom_id: targetClassroomId,
          title: planToDisplay.title,
          subject,
          topic,
          grades: selectedGrades,
          duration_minutes: duration,
          planning_mode: planningMode,
          status: 'draft',
          content: planToDisplay,
          zero_cost_tlm: planToDisplay.zero_cost_tlm || []
        };

        setSelectedPlan(finalPlan);
        setPlans(prev => [finalPlan, ...prev.filter(p => p.id !== finalPlan.id)]);

        if (response.error) {
          setErrorMsg(response.error + ' (Loaded deterministic pedagogical draft).');
        }
      } else {
        throw new Error('Failed to generate lesson plan content.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate plan.');
    } finally {
      setGenerating(false);
    }
  };

  // Explicit Teacher Approval Handler
  const handleApprovePlan = async (planId) => {
    try {
      const approved = await approveLessonPlan(planId);
      setSelectedPlan(approved);
      setPlans(prev => prev.map(p => p.id === planId ? approved : p));
    } catch (err) {
      alert('Approval failed: ' + err.message);
    }
  };

  // Transfer Plan to Timetable and live bell countdown
  const handleApplyToTimetable = async () => {
    if (!selectedPlan) return;
    try {
      if (selectedPlan.status === 'draft') {
        const approved = await approveLessonPlan(selectedPlan.id);
        if (approved) setSelectedPlan(approved);
      }
    } catch (e) {}

    try {
      localStorage.setItem('ruralclass_active_timetable_plan', JSON.stringify(selectedPlan));
    } catch (e) {}

    navigate('/timetable', {
      state: {
        activePlan: selectedPlan
      }
    });
  };

  const handlePrint = () => {
    if (selectedPlan) {
      setShowPrintModal(true);
    }
  };

  const filteredPlans = filterStatus === 'all'
    ? plans
    : plans.filter(p => p.status === filterStatus);

  const planContent = selectedPlan?.content || {};

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#2E7D32]" />
            <span>{t('lessons.title', 'AI Multi-Grade Lesson Planner')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            {t('lessons.subtitle', 'Generates synchronized multi-grade rotations adhering strictly to the single-teacher invariant')}
          </p>
        </div>

        {selectedPlan && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleApplyToTimetable}
              className="px-3.5 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <CalendarClock className="w-4 h-4 text-amber-300" />
              <span>{t('lessons.setSchedule', 'Set Classroom Schedule')}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>{t('common.print', 'Printable Plan')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Generator Input & Plan Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): AI Plan Request Form */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleGenerateAIPlan} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{t('lessons.title', 'Multi-Grade Planning Studio')}</span>
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Gemini LLM
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                {t('lessons.subject', 'Subject')}
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Environmental Studies (EVS), Mathematics"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2E7D32] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                {t('lessons.topic', 'Lesson Topic')}
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Plants, Leaf Structures, and Water Cycle"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#2E7D32] outline-none"
              />
            </div>

            {/* Grades included in this lesson */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                {t('common.grades', 'Grades Sharing This Classroom Period')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(activeClassroom?.grades || [1, 2, 3, 4, 5]).map(g => {
                  const isSel = selectedGrades.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        if (isSel) {
                          if (selectedGrades.length > 1) setSelectedGrades(selectedGrades.filter(x => x !== g));
                        } else {
                          setSelectedGrades([...selectedGrades, g].sort());
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isSel
                          ? 'bg-[#2E7D32] border-[#2E7D32] text-white shadow-xs'
                          : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {t('common.grade', 'Grade')} {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Planning Mode & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  {t('lessons.planningMode', 'Planning Mode')}
                </label>
                <select
                  value={planningMode}
                  onChange={(e) => setPlanningMode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white outline-none"
                >
                  <option value="common_theme">{t('lessons.commonTopic', 'Common Theme')}</option>
                  <option value="split_topics">{t('lessons.separateTopics', 'Split Grade Topics')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  {t('timetable.slotDuration', 'Duration (Mins)')}
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white outline-none"
                >
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                  <option value={90}>90 Minutes</option>
                </select>
              </div>
            </div>

            {/* Teacher Priorities */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                {t('common.notes', 'Teacher Specific Priorities')}
              </label>
              <textarea
                rows={2}
                value={teacherPriorities}
                onChange={(e) => setTeacherPriorities(e.target.value)}
                placeholder="e.g. Focus on slate drills for Grade 2; partner quizzing for Grade 4"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#2E7D32] hover:bg-[#1B5E20] text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{generating ? t('lessons.generating', 'Synthesizing Multi-Grade Plan...') : t('lessons.generate', 'Draft Plan with Gemini AI')}</span>
            </button>
          </form>

          {/* Saved Plans Archive Mini List */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold text-stone-800">{t('nav.savedPlans', 'Saved Classroom Plans')}</span>
              <div className="flex gap-1 text-[11px]">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2 py-0.5 rounded ${filterStatus === 'all' ? 'bg-[#2E7D32] text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                >
                  {t('common.all', 'All')}
                </button>
                <button
                  onClick={() => setFilterStatus('draft')}
                  className={`px-2 py-0.5 rounded ${filterStatus === 'draft' ? 'bg-amber-500 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                >
                  Drafts
                </button>
                <button
                  onClick={() => setFilterStatus('approved')}
                  className={`px-2 py-0.5 rounded ${filterStatus === 'approved' ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                >
                  {t('lessons.approved', 'Approved')}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredPlans.length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center">No plans match filter.</p>
              ) : (
                filteredPlans.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      selectedPlan?.id === p.id 
                        ? 'border-[#2E7D32] bg-emerald-50/50 shadow-xs' 
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-stone-900 truncate">{p.title}</div>
                      <div className="text-[10px] text-stone-500 truncate">Grades {p.grades?.join(', ')} &bull; {p.duration_minutes}m</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      p.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Active Plan Details & Approval */}
        <div className="lg:col-span-7">
          {!selectedPlan ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500 space-y-3">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="text-base font-bold text-stone-800">No Plan Selected</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Generate a new coordinated plan using the studio on the left or select an existing saved plan to review.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
              
              {/* Plan Status Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                selectedPlan.status === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  {selectedPlan.status === 'approved' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {selectedPlan.status === 'approved' ? 'Approved Lesson Plan' : 'AI DRAFT PLAN (Requires Approval)'}
                    </span>
                    <p className="text-[11px] opacity-80">
                      {selectedPlan.status === 'approved'
                        ? 'This plan has been vetted and adopted for classroom delivery.'
                        : 'Review pedagogical steps below. AI output is never active without your explicit approval.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  {selectedPlan.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => handleApprovePlan(selectedPlan.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      Approve Plan
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleApplyToTimetable}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Apply to Classroom Schedule</span>
                  </button>
                </div>
              </div>

              {/* Title & Summary */}
              <div className="space-y-1.5 border-b border-stone-100 pb-4">
                <h2 className="text-lg font-extrabold text-stone-900">
                  {selectedPlan.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  <span>Subject: <strong>{selectedPlan.subject}</strong></span>
                  <span>&bull;</span>
                  <span>Grades: <strong>{selectedPlan.grades?.join(', ')}</strong></span>
                  <span>&bull;</span>
                  <span>Duration: <strong>{selectedPlan.duration_minutes} min</strong></span>
                </div>
                {planContent.summary && (
                  <p className="text-xs text-stone-700 mt-2 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                    {planContent.summary}
                  </p>
                )}
              </div>

              {/* Grade-wise pedagogical cards */}
              {planContent.grade_plans && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    Differentiated Grade-Wise Tasks
                  </h3>

                  <div className="space-y-3">
                    {planContent.grade_plans.map((gp, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                          <span className="font-bold text-stone-900 text-sm">
                            Grade {gp.grade}: {gp.learning_objective}
                          </span>
                          <span className="text-[10px] font-semibold bg-stone-200 text-stone-800 px-2 py-0.5 rounded">
                            Core: {gp.key_concept}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                            <span className="font-bold text-emerald-900 block mb-1">Teacher-Led Direct:</span>
                            <span className="text-emerald-800">{gp.direct_instruction}</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                            <span className="font-bold text-stone-800 block mb-1">Independent Slate:</span>
                            <span className="text-stone-700">{gp.independent_activity}</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                            <span className="font-bold text-amber-900 block mb-1">Peer Buddy Drill:</span>
                            <span className="text-amber-800">{gp.peer_learning_activity}</span>
                          </div>
                        </div>

                        {gp.formative_check && gp.formative_check.length > 0 && (
                          <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-600">
                            <span className="font-semibold text-stone-700 mr-1">Rapid Slate Check:</span>
                            <span>{gp.formative_check.join(' | ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zero-Cost TLM Materials List */}
              {selectedPlan.zero_cost_tlm && selectedPlan.zero_cost_tlm.length > 0 && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <span className="text-xs font-bold text-stone-800 block">Required Zero-Cost Materials (TLM):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPlan.zero_cost_tlm.map((tlm, idx) => (
                      <span key={idx} className="text-xs bg-white border border-stone-300 px-2.5 py-1 rounded-lg text-stone-700 font-medium">
                        {tlm}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Bottom Action: Take to Timetable & Live Bell */}
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80">
                <div>
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <BellRing className="w-4 h-4 text-[#2E7D32]" />
                    <span>Launch Live Multi-Grade Session</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Load this {selectedPlan.duration_minutes}-minute rotation schedule directly into the school bell countdown timer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyToTimetable}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Start Live Schedule & Timer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Modal for full teaching guide view, print, and share */}
      {showPrintModal && selectedPlan && (
        <PrintLessonPlanModal
          plan={selectedPlan}
          onClose={() => setShowPrintModal(false)}
          activeClassroom={activeClassroom}
          onApplyToTimetable={handleApplyToTimetable}
        />
      )}

    </div>
  );
};

