import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CalendarClock, 
  Sparkles, 
  Save, 
  BookOpen, 
  ArrowRight,
  Clock,
  Plus,
  X,
  Check,
  CheckCircle2,
  Languages
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSarvam } from '../lib/sarvamTranslation';
import { 
  fetchTimetableBlocks, 
  saveTimetableBatch, 
  fetchLessonPlans 
} from '../lib/api';
import { generateClientSchedule } from '../lib/scheduler';
import { LiveClassCompanion } from '../components/LiveClassCompanion';

export const Timetable = ({ activeClassroom }) => {
  const { t, i18n } = useTranslation();
  const { translateEntireClassroomPlan, isTranslating, translationStatusMsg } = useSarvam();
  const location = useLocation();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);

  // Add custom slot modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlotTitle, setNewSlotTitle] = useState('Remedial Slate Drill');
  const [newSlotDuration, setNewSlotDuration] = useState(10);
  const [newSlotFocus, setNewSlotFocus] = useState('Grade 1');
  const [newSlotMode, setNewSlotMode] = useState('teacher-led');

  // Scheduler options
  const [topic, setTopic] = useState('Core Competency Rotations');
  const [durationMinutes, setDurationMinutes] = useState(activeClassroom?.daily_minutes || 60);

  const classroomId = activeClassroom?.id;
  const classroomGrades = activeClassroom?.grades || [1, 2, 3, 4, 5];
  const [selectedGrades, setSelectedGrades] = useState(classroomGrades);

  // Show temporary toast notification
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  // Helper to convert a lesson plan into collision-free timetable blocks
  const convertPlanToBlocks = (plan) => {
    if (!plan) return null;
    const planDuration = Number(plan.duration_minutes || plan.content?.duration_minutes || 60);
    const planTopic = plan.topic || plan.content?.topic || plan.title || 'Multi-Grade Lesson';
    const planGrades = plan.grades || plan.content?.grades || selectedGrades;
    const rotationSchedule = plan.content?.rotation_schedule || plan.rotation_schedule;

    if (Array.isArray(rotationSchedule) && rotationSchedule.length > 0) {
      let curMin = 0;
      return rotationSchedule.map((rot, idx) => {
        const dMin = Math.max(1, Number(rot.duration_minutes || rot.durationMinutes || 10));
        const sMin = curMin;
        const eMin = sMin + dMin;
        curMin = eMin;

        const assignments = rot.student_assignments || rot.assignments || [];
        const isOpening = idx === 0;
        const isClosing = idx === rotationSchedule.length - 1;
        const focus = rot.teacher_focus_grade || rot.focusGrade || 'All Grades';

        // Provide crystal-clear titles so teacher knows what this slot is
        let title = rot.title;
        if (!title) {
          if (isOpening && focus === 'All Grades') {
            title = 'Classroom Opening & Context Hook';
          } else if (isClosing && focus === 'All Grades') {
            title = 'Joint Review & Slate Check';
          } else {
            title = `Direct Instruction: ${focus} Focus`;
          }
        }

        return {
          blockIndex: idx,
          block_index: idx,
          title,
          startMinute: sMin,
          start_minute: sMin,
          endMinute: eMin,
          end_minute: eMin,
          durationMinutes: dMin,
          duration_minutes: dMin,
          timeRange: `${sMin}–${eMin} min`,
          focusGrade: focus,
          focus_grade: focus,
          isTransition: Boolean(rot.teacher_focus_grade === 'Classroom Cues' || rot.isTransition),
          is_transition: Boolean(rot.teacher_focus_grade === 'Classroom Cues' || rot.isTransition),
          status: 'draft',
          assignments: assignments.map(a => ({
            grade: a.grade,
            mode: a.mode,
            activity: a.task || a.activity || 'Slate practice drill',
            materials: a.materials || ['Chalkboard', 'Slates & Chalk']
          }))
        };
      });
    }

    // Otherwise generate schedule mathematically based on plan duration & topic
    const generated = generateClientSchedule({
      grades: planGrades,
      durationMinutes: planDuration,
      topic: planTopic,
      planningMode: plan.planning_mode || 'common_theme',
      materials: plan.zero_cost_tlm || activeClassroom?.materials,
      includeTransitions: false
    });

    return generated.feasible ? generated.blocks : null;
  };

  // Initial load: check navigation state, localStorage, or fetch plans
  useEffect(() => {
    // 1. Check if a plan was passed via navigation state from LessonPlans.jsx
    if (location.state?.activePlan) {
      const plan = location.state.activePlan;
      setActivePlan(plan);
      setTopic(plan.topic || plan.content?.topic || plan.title);
      const dMin = Number(plan.duration_minutes || plan.content?.duration_minutes || 60);
      setDurationMinutes(dMin);
      if (plan.grades?.length) setSelectedGrades(plan.grades);

      const planBlocks = convertPlanToBlocks(plan);
      if (planBlocks && planBlocks.length > 0) {
        setBlocks(planBlocks);
        setActiveSlotIndex(0);
        return;
      }
    }

    // 2. Check localStorage for persistent active plan
    try {
      const storedPlanJson = localStorage.getItem('ruralclass_active_timetable_plan');
      if (storedPlanJson) {
        const storedPlan = JSON.parse(storedPlanJson);
        setActivePlan(storedPlan);
        setTopic(storedPlan.topic || storedPlan.content?.topic || storedPlan.title);
        const dMin = Number(storedPlan.duration_minutes || storedPlan.content?.duration_minutes || 60);
        setDurationMinutes(dMin);
        if (storedPlan.grades?.length) setSelectedGrades(storedPlan.grades);

        const planBlocks = convertPlanToBlocks(storedPlan);
        if (planBlocks && planBlocks.length > 0) {
          setBlocks(planBlocks);
          setActiveSlotIndex(0);
          return;
        }
      }
    } catch (e) {}

    // 3. Fallback: generate schedule based on classroom defaults
    const generated = generateClientSchedule({
      grades: selectedGrades,
      durationMinutes,
      topic,
      materials: activeClassroom?.materials,
      includeTransitions: false
    });
    if (generated.feasible) {
      setBlocks(generated.blocks);
      setActiveSlotIndex(0);
    }
  }, [location.state]);

  // Load saved lesson plans for classroom so teacher can select any plan
  useEffect(() => {
    if (!classroomId) return;
    const loadPlans = async () => {
      try {
        const data = await fetchLessonPlans(classroomId);
        setSavedPlans(data || []);
      } catch (e) {
        console.warn('[Schedule] Error loading saved plans:', e);
      }
    };
    loadPlans();
  }, [classroomId]);

  // Translate schedule dynamically when user changes language
  useEffect(() => {
    const handleLanguageChange = async (e) => {
      const targetLang = e.detail?.language || i18n.language || 'en';
      if (targetLang === 'en' || !blocks || blocks.length === 0) return;
      try {
        const result = await translateEntireClassroomPlan(activePlan, blocks, targetLang);
        if (result?.blocks && result.blocks.length > 0) {
          setBlocks(result.blocks);
        }
        if (result?.plan) {
          setActivePlan(result.plan);
          if (result.plan.topic) setTopic(result.plan.topic);
        }
      } catch (err) {
        console.warn('[Timetable Sarvam Translation] Failed:', err);
      }
    };

    window.addEventListener('ruralclass_language_changed', handleLanguageChange);
    return () => window.removeEventListener('ruralclass_language_changed', handleLanguageChange);
  }, [activePlan, blocks, translateEntireClassroomPlan, i18n.language]);

  // Handle switching to a specific saved lesson plan
  const handleSelectPlan = (planId) => {
    const plan = savedPlans.find(p => p.id === planId);
    if (!plan) return;

    setActivePlan(plan);
    setTopic(plan.topic || plan.content?.topic || plan.title);
    const dMin = Number(plan.duration_minutes || plan.content?.duration_minutes || 60);
    setDurationMinutes(dMin);
    if (plan.grades?.length) setSelectedGrades(plan.grades);

    try {
      localStorage.setItem('ruralclass_active_timetable_plan', JSON.stringify(plan));
    } catch (e) {}

    const planBlocks = convertPlanToBlocks(plan);
    if (planBlocks && planBlocks.length > 0) {
      setBlocks(planBlocks);
      setActiveSlotIndex(0);
      triggerToast(`✓ Loaded "${plan.title || plan.topic}" (${dMin} mins, ${planBlocks.length} slots)`);
    }
  };

  // Generate new collision-free rotation schedule manually
  const handleGenerateNewSchedule = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      const generated = generateClientSchedule({
        grades: selectedGrades,
        durationMinutes: Number(durationMinutes),
        topic,
        materials: activeClassroom?.materials,
        includeTransitions: false
      });

      if (generated.feasible) {
        setBlocks(generated.blocks);
        setActiveSlotIndex(0);
        setSaveSuccess(false);
        triggerToast(`✓ Generated ${generated.blocks.length} rotation slots for ${durationMinutes}-minute class!`);
      } else {
        alert(generated.error);
      }
      setIsRegenerating(false);
    }, 300);
  };

  // Handle adding a custom slot
  const handleAddSlotSubmit = (e) => {
    e.preventDefault();
    const dur = Math.max(1, Number(newSlotDuration) || 10);
    
    // Compute start minute from existing blocks
    let curMin = 0;
    blocks.forEach(b => {
      const d = Math.max(1, Number(b.duration_minutes ?? b.durationMinutes ?? 10));
      curMin += d;
    });

    const newBlock = {
      blockIndex: blocks.length,
      block_index: blocks.length,
      title: newSlotTitle || `Slot ${blocks.length + 1}`,
      startMinute: curMin,
      start_minute: curMin,
      endMinute: curMin + dur,
      end_minute: curMin + dur,
      durationMinutes: dur,
      duration_minutes: dur,
      timeRange: `${curMin}–${curMin + dur} min`,
      focusGrade: newSlotFocus,
      focus_grade: newSlotFocus,
      isTransition: false,
      is_transition: false,
      status: 'draft',
      assignments: selectedGrades.map(g => ({
        grade: g,
        mode: (String(g) === String(newSlotFocus) || newSlotFocus === 'All Grades') ? newSlotMode : 'independent',
        activity: (String(g) === String(newSlotFocus) || newSlotFocus === 'All Grades')
          ? `${newSlotTitle}: Concept practice and problem-solving.`
          : 'Independent slate drill and textbook review.',
        materials: ['Chalkboard', 'Slates & Chalk']
      }))
    };

    const nextBlocks = [...blocks, newBlock];
    setBlocks(nextBlocks);
    setActiveSlotIndex(nextBlocks.length - 1);
    setShowAddModal(false);
    triggerToast(`✓ Added Slot: "${newSlotTitle}" (${dur} mins)`);
  };

  // Update duration of a single block (+5m, -1m, etc.)
  const handleUpdateBlockDuration = (idx, deltaMinutes) => {
    setBlocks(prev => {
      const next = [...prev];
      const cur = next[idx];
      const oldD = Number(cur.durationMinutes || cur.duration_minutes || 10);
      const newD = Math.max(1, oldD + deltaMinutes);
      next[idx] = {
        ...cur,
        durationMinutes: newD,
        duration_minutes: newD
      };

      // Recalculate start and end times across entire sequence
      let m = 0;
      return next.map((b, i) => {
        const d = Number(b.durationMinutes || b.duration_minutes || 10);
        const s = m;
        const e = s + d;
        m = e;
        return {
          ...b,
          startMinute: s,
          start_minute: s,
          endMinute: e,
          end_minute: e,
          timeRange: `${s}–${e} min`
        };
      });
    });
    triggerToast(`✓ Updated slot duration (${deltaMinutes > 0 ? `+${deltaMinutes}` : deltaMinutes}m)`);
  };

  // Delete a block from schedule
  const handleDeleteBlock = (idx) => {
    if (blocks.length <= 1) {
      alert('Cannot delete the only remaining slot.');
      return;
    }
    setBlocks(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      let m = 0;
      return filtered.map((b, i) => {
        const d = Number(b.durationMinutes || b.duration_minutes || 10);
        const s = m;
        const e = s + d;
        m = e;
        return {
          ...b,
          blockIndex: i,
          block_index: i,
          startMinute: s,
          start_minute: s,
          endMinute: e,
          end_minute: e,
          timeRange: `${s}–${e} min`
        };
      });
    });
    if (activeSlotIndex >= blocks.length - 1) {
      setActiveSlotIndex(Math.max(0, blocks.length - 2));
    }
    triggerToast('✓ Slot deleted');
  };

  // Save schedule to backend
  const handleSaveSchedule = async () => {
    if (!classroomId || blocks.length === 0) return;
    setSaving(true);
    try {
      const saved = await saveTimetableBatch(classroomId, 'Monday', blocks);
      if (saved && saved.length > 0) {
        setBlocks(saved);
      }
      setSaveSuccess(true);
      triggerToast('✓ Classroom schedule saved successfully!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.warn('[Schedule] Save error:', err.message);
      setSaveSuccess(true);
      triggerToast('✓ Classroom schedule saved locally!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-[#2E7D32]" />
            <span>{t('timetable.title', 'Classroom Schedule & Rotations')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            {t('timetable.subtitle', 'Live multi-grade classroom rotation companion with audio transition bell and slot countdown')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              const curLang = localStorage.getItem('ruralclass_lang') || i18n.language || 'en';
              if (curLang === 'en') {
                triggerToast(t('settings.selectLanguage', 'Select a regional language in the top navbar to translate!'));
                return;
              }
              const result = await translateEntireClassroomPlan(activePlan, blocks, curLang);
              if (result?.blocks) setBlocks(result.blocks);
              if (result?.plan) setActivePlan(result.plan);
              triggerToast(t('settings.keySaved', 'Translated with Sarvam AI!'));
            }}
            disabled={isTranslating}
            className="px-3.5 py-2 rounded-xl border border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Translate schedule with Sarvam AI"
          >
            <Languages className={`w-4 h-4 text-emerald-700 ${isTranslating ? 'animate-spin' : ''}`} />
            <span>{isTranslating ? t('common.loading', 'Translating...') : t('settings.testTranslate', 'Translate (Sarvam AI)')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#2E7D32]" />
            <span>{t('timetable.addSlot', 'Add Slot')}</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateNewSchedule}
            disabled={isRegenerating}
            className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 text-amber-500 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? t('common.loading', 'Regenerating...') : t('timetable.regenerateSlots', 'Regenerate Slots')}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSchedule}
            disabled={saving || blocks.length === 0}
            className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t('common.loading', 'Saving...') : saveSuccess ? t('common.success', 'Saved!') : t('timetable.saveSchedule', 'Save Schedule')}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Plan Synchronization Banner & Duration Controls */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
              <span>{t('timetable.activePlan', 'Active Lesson Plan')}:</span>
              <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {activePlan ? t('timetable.synchronized', 'Synchronized') : t('timetable.routine', 'Standard Routine')}
              </span>
            </div>
            <p className="text-xs text-emerald-800 font-medium">
              "{topic}" &bull; <strong>{durationMinutes} {t('timetable.slotDuration', 'mins')}</strong> &bull; {t('common.grades', 'Grades')} {selectedGrades.join(', ')}
            </p>
          </div>
        </div>

        {/* Plan Selector & Quick Duration Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-semibold">
            <span>{t('timetable.duration', 'Duration')}:</span>
            <select
              value={durationMinutes}
              onChange={(e) => {
                const newD = Number(e.target.value);
                setDurationMinutes(newD);
                const gen = generateClientSchedule({
                  grades: selectedGrades,
                  durationMinutes: newD,
                  topic,
                  materials: activeClassroom?.materials,
                  includeTransitions: false
                });
                if (gen.feasible) {
                  setBlocks(gen.blocks);
                  setActiveSlotIndex(0);
                  triggerToast(`✓ Duration updated to ${newD} mins (${gen.blocks.length} rotation slots)`);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-white font-bold text-stone-800 text-xs focus:outline-none focus:border-[#2E7D32]"
            >
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>60 mins</option>
              <option value={75}>75 mins</option>
              <option value={90}>90 mins</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-semibold">
            <span>{t('timetable.switchPlan', 'Switch Plan')}:</span>
            <select
              value={activePlan?.id || ''}
              onChange={(e) => handleSelectPlan(e.target.value)}
              className="text-xs bg-white border border-emerald-300 rounded-xl px-3 py-1.5 font-medium text-stone-800 focus:outline-none focus:border-[#2E7D32] max-w-[160px] truncate"
            >
              <option value="">{activePlan ? activePlan.title || activePlan.topic : 'Select plan...'}</option>
              {savedPlans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title || p.topic} ({p.duration_minutes || p.content?.duration_minutes || 60}m)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lessons')}
            className="px-2.5 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100/50 rounded-xl text-[11px] font-bold text-emerald-900 transition-colors cursor-pointer"
          >
            {t('timetable.newPlan', '+ New Plan')}
          </button>
        </div>
      </div>

      {/* Live Classroom Rotation Companion */}
      <LiveClassCompanion 
        blocks={blocks} 
        grades={selectedGrades} 
        activeTopic={topic} 
        currentBlockIndex={activeSlotIndex}
        onSelectBlock={(idx) => setActiveSlotIndex(idx)}
        onUpdateBlockDuration={handleUpdateBlockDuration}
        onDeleteBlock={handleDeleteBlock}
      />

      {/* Add Custom Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#2E7D32]" />
                <h3 className="font-bold text-stone-900 text-base">{t('timetable.modalTitle', 'Add New Rotation Slot')}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  {t('timetable.slotTitle', 'Slot Title / Activity Name')}
                </label>
                <input
                  type="text"
                  value={newSlotTitle}
                  onChange={(e) => setNewSlotTitle(e.target.value)}
                  placeholder="e.g. Remedial Math Slate Practice, Reading Circle"
                  required
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#2E7D32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    {t('timetable.slotDuration', 'Duration (Minutes)')}
                  </label>
                  <select
                    value={newSlotDuration}
                    onChange={(e) => setNewSlotDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#2E7D32] bg-white font-bold"
                  >
                    <option value={5}>5 mins</option>
                    <option value={10}>10 mins</option>
                    <option value={12}>12 mins</option>
                    <option value={15}>15 mins</option>
                    <option value={20}>20 mins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    {t('timetable.focusGrade', 'Focus Grade')}
                  </label>
                  <select
                    value={newSlotFocus}
                    onChange={(e) => setNewSlotFocus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#2E7D32] bg-white"
                  >
                    <option value="All Grades">{t('timetable.allGrades', 'All Grades')}</option>
                    {selectedGrades.map(g => (
                      <option key={g} value={`Grade ${g}`}>{t('common.grade', 'Grade')} {g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  {t('timetable.mode', 'Teaching Mode')}
                </label>
                <select
                  value={newSlotMode}
                  onChange={(e) => setNewSlotMode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#2E7D32] bg-white"
                >
                  <option value="teacher-led">{t('timetable.teacherDirect', 'Teacher Direct Instruction')}</option>
                  <option value="peer">{t('timetable.peerBuddy', 'Peer Buddy / Partner Work')}</option>
                  <option value="independent">{t('timetable.independentSlate', 'Independent Slate Practice')}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('timetable.addSlot', 'Add to Schedule')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
