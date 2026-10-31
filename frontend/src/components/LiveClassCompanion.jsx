import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Clock, 
  BellRing,
  UserCheck,
  Sparkles,
  Users,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSarvam } from '../lib/sarvamTranslation';

export const LiveClassCompanion = ({ 
  blocks = [], 
  grades = [1, 2, 3, 4, 5], 
  activeTopic = 'Multi-Grade Lesson',
  currentBlockIndex = 0,
  onSelectBlock,
  onUpdateBlockDuration,
  onDeleteBlock
}) => {
  const { t } = useTranslation();
  const { isTranslating } = useSarvam();
  const [localIndex, setLocalIndex] = useState(currentBlockIndex);
  const [isActive, setIsActive] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  // Keep local index synchronized if parent changes it
  useEffect(() => {
    setLocalIndex(currentBlockIndex);
  }, [currentBlockIndex]);

  const activeIndex = localIndex;
  const currentBlock = blocks[activeIndex] || null;

  // Calculate total class minutes from all blocks
  const totalClassMinutes = blocks.reduce((acc, b) => {
    const d = Math.max(1, Number(b?.duration_minutes ?? b?.durationMinutes ?? 10));
    return acc + d;
  }, 0);

  // Normalize active block properties safely
  const blockDuration = Math.max(1, Number(currentBlock?.duration_minutes ?? currentBlock?.durationMinutes ?? 10));
  const blockStart = Number(currentBlock?.start_minute ?? currentBlock?.startMinute ?? 0);
  const blockEnd = Number(currentBlock?.end_minute ?? currentBlock?.endMinute ?? (blockStart + blockDuration));
  const blockTitle = currentBlock?.title || `${t('companion.slot', 'Slot')} ${activeIndex + 1}`;
  const blockFocus = currentBlock?.focus_grade || currentBlock?.focusGrade || currentBlock?.teacher_focus_grade || t('companion.allGrades', 'All Grades');
  const isTransition = Boolean(currentBlock?.is_transition || currentBlock?.isTransition);

  const [secondsRemaining, setSecondsRemaining] = useState(blockDuration * 60);
  const [hasChimed, setHasChimed] = useState(false);

  // Synthesized school bell chime using native Web Audio API
  const playSchoolBellChime = () => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Tone 1: E5 (659Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.35, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.9);

      // Tone 2: A5 (880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 1.4);
    } catch (err) {
      console.warn('[Audio] Chime error:', err);
    }
  };

  // Reset seconds safely when block changes
  useEffect(() => {
    if (currentBlock) {
      const safeDuration = Math.max(1, Number(currentBlock.duration_minutes ?? currentBlock.durationMinutes ?? 10));
      setSecondsRemaining(safeDuration * 60);
      setHasChimed(false);
    }
  }, [activeIndex, currentBlock]);

  // Countdown timer loop
  useEffect(() => {
    let interval = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    } else if (secondsRemaining === 0 && isActive && !hasChimed) {
      playSchoolBellChime();
      setHasChimed(true);
      // Auto-advance to next slot after 2 seconds
      if (activeIndex < blocks.length - 1) {
        setTimeout(() => {
          changeSlot(activeIndex + 1);
        }, 1500);
      } else {
        setIsActive(false);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, secondsRemaining, hasChimed, activeIndex, blocks.length]);

  const changeSlot = (newIdx) => {
    if (newIdx >= 0 && newIdx < blocks.length) {
      setLocalIndex(newIdx);
      if (onSelectBlock) onSelectBlock(newIdx);
      setIsActive(false);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setSecondsRemaining(blockDuration * 60);
    setHasChimed(false);
  };

  const handleNextBlock = () => {
    if (activeIndex < blocks.length - 1) {
      changeSlot(activeIndex + 1);
    }
  };

  const handlePrevBlock = () => {
    if (activeIndex > 0) {
      changeSlot(activeIndex - 1);
    }
  };

  // Quick duration adjuster (+5m, +1m, -1m)
  const handleTweakDuration = (deltaMinutes) => {
    if (onUpdateBlockDuration) {
      onUpdateBlockDuration(activeIndex, deltaMinutes);
    } else {
      const newD = Math.max(1, blockDuration + deltaMinutes);
      setSecondsRemaining(newD * 60);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs == null || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!blocks || blocks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 space-y-2">
        <Clock className="w-8 h-8 text-stone-300 mx-auto" />
        <p className="text-sm font-bold text-stone-700">{t('companion.noBlocksLoaded', 'No Timetable Blocks Loaded Yet')}</p>
        <p className="text-xs text-stone-400 max-w-sm mx-auto">
          {t('companion.noBlocksDesc', 'Click "Regenerate Slots" or "+ Add Slot" above to initialize your rotation schedule.')}
        </p>
      </div>
    );
  }

  const totalSecs = Math.max(1, blockDuration * 60);
  const slotProgressPercent = Math.min(100, Math.max(0, ((totalSecs - secondsRemaining) / totalSecs) * 100));

  // Determine assignments for display
  const assignments = currentBlock?.assignments || currentBlock?.student_assignments || [];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      
      {/* Header Bar */}
      <div className="bg-[#2E7D32] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <BellRing className={`w-5 h-5 text-amber-300 ${isActive ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold">{t('companion.title', 'Live Classroom Rotation Companion')}</h2>
              <span className="bg-amber-400 text-amber-950 font-bold px-2 py-0.5 rounded-full text-[10px] tracking-wide">
                {totalClassMinutes} {t('companion.minutesLesson', 'MIN LESSON')}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 font-medium truncate max-w-md">
              {t('companion.topic', 'Topic')}: <strong>{activeTopic}</strong> &bull; {blocks.length} {t('companion.rotationSlots', 'Rotation Slots')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="font-semibold bg-white/20 px-2.5 py-1 rounded-full text-[11px]">
            {t('companion.slot', 'Slot')} {activeIndex + 1} {t('companion.of', 'of')} {blocks.length}
          </span>
          <button
            type="button"
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
            title={isSoundEnabled ? t('companion.muteChime', 'Mute school bell chime') : t('companion.enableChime', 'Enable school bell chime')}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4 text-stone-300" />}
          </button>
        </div>
      </div>

      {/* Interactive Horizontal Slot Stepper / Timeline Bar */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 py-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>{t('companion.timelineTitle', 'Class Rotation Timeline')} ({totalClassMinutes} {t('companion.minsTotal', 'Mins Total')}) — {t('companion.timelineSub', 'Click any slot to view or jump:')}</span>
          </div>
          <span className="text-stone-400 font-normal lowercase">
            {t('companion.slot', 'slot')} {activeIndex + 1} {t('companion.active', 'active')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {blocks.map((b, idx) => {
            const dur = Math.max(1, Number(b.duration_minutes ?? b.durationMinutes ?? 10));
            const isCurrent = idx === activeIndex;
            const isPast = idx < activeIndex;
            const focus = b.focus_grade || b.focusGrade || b.teacher_focus_grade || t('companion.allGrades', 'All Grades');
            const sMin = Number(b.start_minute ?? b.startMinute ?? 0);
            const eMin = Number(b.end_minute ?? b.endMinute ?? (sMin + dur));

            return (
              <button
                key={idx}
                type="button"
                onClick={() => changeSlot(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-[#2E7D32] text-white shadow-md ring-2 ring-emerald-500 ring-offset-1 font-bold'
                    : isPast
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
                }`}
                title={`${t('companion.slot', 'Slot')} ${idx + 1}: ${focus} (${dur} ${t('companion.minsSlot', 'mins')}, ${sMin}–${eMin} min)`}
              >
                {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                <span>
                  {idx === 0 && (focus === 'All Grades' || focus === t('companion.allGrades', 'All Grades'))
                    ? `1. ${t('companion.opening', 'Opening')}` 
                    : idx === blocks.length - 1 && (focus === 'All Grades' || focus === t('companion.allGrades', 'All Grades'))
                      ? `${idx + 1}. ${t('companion.wrapUp', 'Wrap-up')}` 
                      : `${idx + 1}. ${focus}`}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isCurrent ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-600'
                }`}>
                  {dur}m
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slot Countdown Progress Bar */}
      <div className="w-full bg-stone-100 h-1.5">
        <div 
          className="bg-amber-500 h-1.5 transition-all duration-1000"
          style={{ width: `${slotProgressPercent}%` }}
        />
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        
        {/* Main Countdown Timer & Controls Row */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-50 to-emerald-50/40 border border-emerald-100 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            
            {/* Left: Timer Display with Clear Explanations */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  {t('companion.slot', 'Slot')} {activeIndex + 1} {t('companion.of', 'of')} {blocks.length}: {blockTitle}
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                  {blockDuration} {t('companion.minsSlot', 'Mins Slot')}
                </span>
                {isTransition && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    {t('companion.transitionCue', 'Transition Cue')}
                  </span>
                )}
              </div>

              {/* Big Timer Digits */}
              <div className="flex items-baseline gap-3">
                <div className="text-4xl sm:text-5xl font-mono font-extrabold text-stone-900 tracking-tight">
                  {formatTime(secondsRemaining)}
                </div>
                <div className="text-xs text-stone-500">
                  <span className="font-semibold text-emerald-800">{t('companion.slotCountdown', 'Slot Countdown')}</span>
                  <div className="text-[11px] text-stone-400">
                    {t('companion.timeWindow', 'Window')}: {blockStart}–{blockEnd} {t('companion.minOf', 'min of')} {totalClassMinutes} {t('companion.minClass', 'min class')}
                  </div>
                </div>
              </div>

              {/* Teacher Guidance Note */}
              <div className="mt-2 text-xs text-stone-600 flex items-center gap-1.5 bg-white/80 p-2 rounded-lg border border-stone-200">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {t('companion.focusGrade', 'Focus Grade')}: <strong className="text-emerald-800 font-bold">{blockFocus}</strong> &bull; {t('companion.guidanceNote', 'When this slot finishes, the school bell rings and you advance to the next grade.')}
                </span>
              </div>
            </div>

            {/* Right: Timer Controls & Quick Tweak Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              
              {/* Quick Duration Adjuster */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
                <span className="text-[10px] font-bold text-stone-400 px-2">{t('companion.slot', 'Slot')}:</span>
                <button
                  type="button"
                  onClick={() => handleTweakDuration(5)}
                  className="px-2 py-1 text-xs font-bold text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg transition-colors cursor-pointer"
                  title="+5 min"
                >
                  +5m
                </button>
                <button
                  type="button"
                  onClick={() => handleTweakDuration(1)}
                  className="px-2 py-1 text-xs font-bold text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg transition-colors cursor-pointer"
                  title="+1 min"
                >
                  +1m
                </button>
                <button
                  type="button"
                  onClick={() => handleTweakDuration(-1)}
                  disabled={blockDuration <= 1}
                  className="px-2 py-1 text-xs font-bold text-stone-700 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                  title="-1 min"
                >
                  -1m
                </button>
              </div>

              {/* Navigation & Playback Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevBlock}
                  disabled={activeIndex === 0}
                  className="p-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 disabled:opacity-30 transition-colors cursor-pointer shadow-2xs"
                  title={t('companion.prevSlot', 'Previous rotation slot')}
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={toggleTimer}
                  className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-white shadow-sm transition-all cursor-pointer ${
                    isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2E7D32] hover:bg-[#1B5E20]'
                  }`}
                >
                  {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span>{isActive ? t('companion.pause', 'Pause') : t('companion.startSlot', 'Start Slot')}</span>
                </button>

                <button
                  type="button"
                  onClick={resetTimer}
                  className="p-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer shadow-2xs"
                  title={t('companion.reset', 'Reset')}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleNextBlock}
                  disabled={activeIndex === blocks.length - 1}
                  className="p-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 disabled:opacity-30 transition-colors cursor-pointer shadow-2xs"
                  title={t('companion.nextSlot', 'Next rotation slot')}
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {onDeleteBlock && blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteBlock(activeIndex)}
                    className="p-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer shadow-2xs ml-1"
                    title={t('companion.deleteSlot', 'Delete Slot')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* Simultaneous Grade Roles Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-700 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#2E7D32]" />
              <span>{t('companion.simultaneousRoles', 'Simultaneous Grade Roles')} ({t('companion.slot', 'Slot')} {activeIndex + 1})</span>
            </span>
            <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
              {t('companion.strictInvariant', '≤ 1 Teacher-Led Direct')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignments.map((assignment, idx) => {
              const gradeNum = assignment.grade;
              const mode = assignment.mode;
              const isTeacherDirect = mode === 'teacher-led';
              const isPeer = mode === 'peer';
              const taskText = assignment.activity || assignment.task || 'Slate practice drill';

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isTeacherDirect
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-xs ring-1 ring-emerald-400'
                      : isPeer
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-stone-900">
                      {t('common.grade', 'Grade')} {gradeNum}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isTeacherDirect
                        ? 'bg-emerald-600 text-white'
                        : isPeer
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-stone-200 text-stone-800'
                    }`}>
                      {isTeacherDirect ? t('companion.teacherDirect', 'Teacher Direct') : isPeer ? t('companion.peerBuddy', 'Peer Buddy') : t('companion.independentSlate', 'Independent Slate')}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed">
                    {taskText}
                  </p>

                  {assignment.materials && assignment.materials.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap gap-1">
                      {assignment.materials.map((m, mIdx) => (
                        <span key={mIdx} className="text-[10px] bg-white/80 border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
