import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  PlusCircle, 
  CalendarClock,
  CheckCircle2,
  TrendingUp,
  School,
  ClipboardCheck,
  Check,
  Circle,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { fetchStudents, fetchStudentProgress, fetchLessonPlans, fetchTimetableBlocks, fetchAttendanceStats } from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import { LiveClassCompanion } from '../components/LiveClassCompanion';
import { useTranslation } from 'react-i18next';

export const Dashboard = ({ activeClassroom, classrooms = [], onCreateClassroomClick }) => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const [students, setStudents] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [timetableBlocks, setTimetableBlocks] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const classroomId = activeClassroom?.id;
  const teacherName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teacher';

  // Load real classroom data from Supabase/API
  useEffect(() => {
    if (!classroomId) {
      setStudents([]);
      setProgressRecords([]);
      setLessonPlans([]);
      setTimetableBlocks([]);
      setAttendanceStats(null);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [stdData, progData, lessonData, timeData, attData] = await Promise.all([
          fetchStudents(classroomId).catch(() => []),
          fetchStudentProgress({ classroom_id: classroomId }).catch(() => []),
          fetchLessonPlans(classroomId).catch(() => []),
          fetchTimetableBlocks(classroomId, 'Monday').catch(() => []),
          fetchAttendanceStats(classroomId).catch(() => null)
        ]);

        setStudents(stdData || []);
        setProgressRecords(progData || []);
        setLessonPlans(lessonData || []);
        setTimetableBlocks(timeData || []);
        setAttendanceStats(attData);
      } catch (err) {
        console.warn('[Dashboard] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Supabase Realtime Subscriptions with clean-up on unmount
    const unsubStudents = subscribeToTable({
      table: 'students',
      filter: `classroom_id=eq.${classroomId}`,
      onInsert: (newStd) => setStudents(prev => [...prev, newStd]),
      onUpdate: (updatedStd) => setStudents(prev => prev.map(s => s.id === updatedStd.id ? updatedStd : s)),
      onDelete: (oldStd) => setStudents(prev => prev.filter(s => s.id !== oldStd.id))
    });

    const unsubProgress = subscribeToTable({
      table: 'student_progress',
      filter: `classroom_id=eq.${classroomId}`,
      onInsert: (newProg) => setProgressRecords(prev => [newProg, ...prev]),
      onUpdate: (updatedProg) => setProgressRecords(prev => prev.map(p => p.id === updatedProg.id ? updatedProg : p)),
      onDelete: (oldProg) => setProgressRecords(prev => prev.filter(p => p.id !== oldProg.id))
    });

    const unsubLessons = subscribeToTable({
      table: 'lesson_plans',
      filter: `classroom_id=eq.${classroomId}`,
      onInsert: (newPlan) => setLessonPlans(prev => [newPlan, ...prev]),
      onUpdate: (updatedPlan) => setLessonPlans(prev => prev.map(l => l.id === updatedPlan.id ? updatedPlan : l)),
      onDelete: (oldPlan) => setLessonPlans(prev => prev.filter(l => l.id !== oldPlan.id))
    });

    const unsubTimetable = subscribeToTable({
      table: 'timetable_blocks',
      filter: `classroom_id=eq.${classroomId}`,
      onInsert: (newBlk) => setTimetableBlocks(prev => [...prev, newBlk]),
      onUpdate: (updatedBlk) => setTimetableBlocks(prev => prev.map(b => b.id === updatedBlk.id ? updatedBlk : b)),
      onDelete: (oldBlk) => setTimetableBlocks(prev => prev.filter(b => b.id !== oldBlk.id))
    });

    return () => {
      unsubStudents();
      unsubProgress();
      unsubLessons();
      unsubTimetable();
    };
  }, [classroomId]);

  // Derived real metrics
  const totalStudents = students.length;
  const activeGrades = activeClassroom?.grades || [];
  const approvedLessonPlans = lessonPlans.filter(p => p.status === 'approved');
  const draftLessonPlans = lessonPlans.filter(p => p.status === 'draft');

  // Grounded support flag: only students with recorded assessments below 40% or marked high priority
  const supportFlaggedStudents = students.filter(s => {
    const studentProg = progressRecords.filter(p => p.student_id === s.id);
    const hasLowScore = studentProg.some(p => p.score !== null && p.score !== undefined && p.score < 40);
    const hasHighFlag = studentProg.some(p => p.priority_level === 'high');
    return hasLowScore || hasHighFlag;
  });

  // Checklist completion states
  const hasClassroom = classrooms.length > 0;
  const hasStudents = totalStudents > 0;
  const hasRecordedAttendance = attendanceStats && attendanceStats.has_recorded;
  const hasLessonPlan = lessonPlans.length > 0;

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
            <School className="w-4 h-4" />
            <span>{activeClassroom?.school_name || 'GuruMitra Primary'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome, {teacherName}!
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-xl">
            {hasClassroom ? (
              activeGrades.length > 0 
                ? `Managing Grades ${activeGrades.join(', ')} in one classroom. Direct focus while rotating slate drills and peer learning.`
                : 'No grades selected yet for this classroom.'
            ) : (
              'Get started by creating your first multi-grade classroom.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <Link
            to="/lessons"
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-900 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-stone-900" />
            <span>{t('dashboard.createLessonPlan', 'Create Lesson Plan')}</span>
          </Link>
          <Link
            to="/timetable"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-4 h-4" />
            <span>Timetable</span>
          </Link>
        </div>
      </div>

      {/* Get Started Checklist for New Teachers (Section 6) */}
      {(!hasClassroom || !hasStudents || !hasRecordedAttendance || !hasLessonPlan) && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#2E7D32]" />
              <h2 className="text-sm font-bold text-stone-900">
                {t('dashboard.getStarted', 'Get Started Checklist')}
              </h2>
            </div>
            <span className="text-xs font-medium text-stone-500">
              {[hasClassroom, hasStudents, hasRecordedAttendance, hasLessonPlan].filter(Boolean).length} of 4 Completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Step 1: Create Classroom */}
            <Link
              to="/classroom"
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                hasClassroom 
                  ? 'bg-emerald-50/50 border-emerald-200 text-stone-800' 
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              {hasClassroom ? (
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">1. Create Classroom</div>
                <div className="text-[11px] text-stone-500">
                  {hasClassroom ? activeClassroom?.name || 'Classroom ready' : 'Configure school & grades'}
                </div>
              </div>
            </Link>

            {/* Step 2: Add Students */}
            <Link
              to="/students"
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                hasStudents 
                  ? 'bg-emerald-50/50 border-emerald-200 text-stone-800' 
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              {hasStudents ? (
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">2. Add Students</div>
                <div className="text-[11px] text-stone-500">
                  {hasStudents ? `${totalStudents} students added` : 'Add or bulk-paste names'}
                </div>
              </div>
            </Link>

            {/* Step 3: Record Attendance */}
            <Link
              to="/attendance"
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                hasRecordedAttendance 
                  ? 'bg-emerald-50/50 border-emerald-200 text-stone-800' 
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              {hasRecordedAttendance ? (
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">3. Take Attendance</div>
                <div className="text-[11px] text-stone-500">
                  {hasRecordedAttendance ? 'Attendance recorded today' : 'Mark present / absent'}
                </div>
              </div>
            </Link>

            {/* Step 4: Create Lesson Plan */}
            <Link
              to="/lessons"
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                hasLessonPlan 
                  ? 'bg-emerald-50/50 border-emerald-200 text-stone-800' 
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              {hasLessonPlan ? (
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">4. Draft Lesson Plan</div>
                <div className="text-[11px] text-stone-500">
                  {hasLessonPlan ? `${lessonPlans.length} plans created` : 'Multi-grade rotation plan'}
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Metric Cards Row - 100% Calculated Real Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Enrolled Students */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>{t('dashboard.enrolledStudents', 'Enrolled Students')}</span>
            <Users className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">
            {totalStudents}
          </div>
          <div className="text-[11px] text-stone-500">
            {totalStudents === 0 ? 'No students added yet' : `${totalStudents} students in roster`}
          </div>
        </div>

        {/* Card 2: Multi-Grade Groupings */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>{t('dashboard.activeGrades', 'Grades Managed')}</span>
            <GraduationCap className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">
            {activeGrades.length > 0 ? `${activeGrades.length} Grades` : '0 Grades'}
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            {activeGrades.length > 0 ? `Grades ${activeGrades.join(', ')}` : 'None configured'}
          </div>
        </div>

        {/* Card 3: Saved Lesson Plans */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>{t('dashboard.lessonPlans', 'Saved Plans')}</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">
            {approvedLessonPlans.length}
          </div>
          <div className="text-[11px] text-stone-500">
            {draftLessonPlans.length > 0 
              ? `${draftLessonPlans.length} drafts awaiting approval`
              : '0 drafts awaiting approval'}
          </div>
        </div>

        {/* Card 4: Attendance Today */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>{t('dashboard.attendanceToday', 'Attendance')}</span>
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">
            {attendanceStats && attendanceStats.has_recorded
              ? `${attendanceStats.percentage}%`
              : '—'}
          </div>
          <div className="text-[11px] text-stone-500">
            {attendanceStats && attendanceStats.has_recorded
              ? `${attendanceStats.present_count} of ${attendanceStats.total_students} present`
              : t('dashboard.notRecordedYet', 'Not recorded yet')}
          </div>
        </div>

        {/* Card 5: Remedial Support */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>{t('dashboard.needsSupport', 'Needs Support')}</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900">
            {progressRecords.length === 0 ? '0' : supportFlaggedStudents.length}
          </div>
          <div className="text-[11px] text-stone-500">
            {progressRecords.length === 0 
              ? t('dashboard.noRecordsYet', 'No records yet')
              : `${supportFlaggedStudents.length} students < 40% benchmark`}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!hasClassroom ? (
        /* Empty State: No Classrooms */
        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#2E7D32] flex items-center justify-center mx-auto">
            <School className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-stone-900">
              {t('dashboard.noClassroomsYet', 'No classrooms created yet.')}
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Create your multi-grade classroom to start organizing students across grades, generating rotation timetables, and planning lessons.
            </p>
          </div>
          <Link
            to="/classroom"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('dashboard.createFirstClassroom', 'Create Classroom')}</span>
          </Link>
        </div>
      ) : totalStudents === 0 ? (
        /* Empty State: Classroom exists, but no students */
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-stone-900">
              Classroom created: {activeClassroom.name}
            </h3>
            <p className="text-xs text-stone-500">
              Next step: Add students to Grades {activeGrades.join(', ')} so you can track attendance, assessments, and rotation groups.
            </p>
          </div>
          <Link
            to="/students"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <Users className="w-4 h-4" />
            <span>{t('dashboard.addStudents', 'Add Students')}</span>
          </Link>
        </div>
      ) : (
        /* Active Multi-Grade Workspace Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Live Rotation & Plans */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Class Rotation Swimlane Preview */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-[#2E7D32]" />
                    <span>Multi-Grade Rotation Schedule</span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Strict Single-Teacher Invariant: ≤ 1 Teacher-Led grade at any minute
                  </p>
                </div>
                <Link
                  to="/timetable"
                  className="text-xs text-[#2E7D32] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Full Timetable</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {timetableBlocks.length === 0 ? (
                <div className="p-6 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-2">
                  <p className="text-xs text-stone-600">
                    No timetable rotation blocks scheduled for today yet.
                  </p>
                  <Link
                    to="/timetable"
                    className="inline-flex items-center gap-1.5 text-xs text-[#2E7D32] font-semibold hover:underline"
                  >
                    <span>Generate rotation schedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {timetableBlocks.slice(0, 4).map((block, idx) => (
                    <div 
                      key={block.id || idx}
                      className="p-3 rounded-xl border border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1 rounded-lg bg-emerald-100 text-[#2E7D32] font-mono font-bold text-[11px]">
                          {block.start_minute}m - {block.end_minute}m
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">{block.title}</div>
                          <div className="text-[11px] text-stone-500">
                            Focus: <span className="font-medium text-emerald-800">{block.focus_grade}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                        {block.duration_minutes} min
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Lesson Plans */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>Recent Multi-Grade Lesson Plans</span>
                </h3>
                <Link
                  to="/lessons"
                  className="text-xs text-[#2E7D32] font-semibold hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {lessonPlans.length === 0 ? (
                <div className="p-6 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-2">
                  <p className="text-xs text-stone-600">
                    No lesson plans saved yet. Create a differentiated plan across Grades {activeGrades.join(', ')}.
                  </p>
                  <Link
                    to="/lessons"
                    className="inline-flex items-center gap-1.5 text-xs text-[#2E7D32] font-semibold hover:underline"
                  >
                    <span>Create lesson plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {lessonPlans.slice(0, 3).map((plan) => (
                    <div key={plan.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-stone-900">{plan.title}</div>
                        <div className="text-[11px] text-stone-500">
                          {plan.subject} • {plan.duration_minutes} min • Grades {plan.grades?.join(', ')}
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        plan.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {plan.status === 'approved' ? 'Approved' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Live Companion & Rapid Actions */}
          <div className="space-y-6">
            
            {/* Live Class Timer Companion */}
            <LiveClassCompanion activeClassroom={activeClassroom} />

            {/* Student Support Watchlist */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Support Watchlist</span>
                </h3>
                <Link to="/recommendations" className="text-[11px] text-[#2E7D32] hover:underline font-semibold">
                  Details
                </Link>
              </div>

              {supportFlaggedStudents.length === 0 ? (
                <p className="text-xs text-stone-500">
                  {progressRecords.length === 0 
                    ? 'Record formative slate checks to see evidence-based support recommendations.'
                    : 'All assessed students meet or exceed the 40% foundational benchmark.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {supportFlaggedStudents.slice(0, 4).map((std) => (
                    <div key={std.id} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-stone-900">{std.name}</span>
                        <span className="text-stone-500 text-[11px]"> (Grade {std.grade})</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        Review Needed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-2">
              <div className="text-xs font-bold text-stone-700">{t('dashboard.quickActions', 'Quick Actions')}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/attendance"
                  className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 flex flex-col items-center gap-1 text-center font-medium"
                >
                  <ClipboardCheck className="w-4 h-4 text-[#2E7D32]" />
                  <span>{t('dashboard.recordAttendance', 'Take Attendance')}</span>
                </Link>
                <Link
                  to="/worksheets"
                  className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 flex flex-col items-center gap-1 text-center font-medium"
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>{t('nav.worksheets', 'Make Worksheet')}</span>
                </Link>
                <Link
                  to="/images"
                  className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 flex flex-col items-center gap-1 text-center font-medium"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{t('nav.imageUploads', 'Scan Textbook')}</span>
                </Link>
                <Link
                  to="/timetable"
                  className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 flex flex-col items-center gap-1 text-center font-medium"
                >
                  <CalendarClock className="w-4 h-4 text-emerald-700" />
                  <span>{t('nav.timetable', 'Classroom Schedule')}</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
