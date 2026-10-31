import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Calendar, 
  Check, 
  X, 
  Clock, 
  Filter, 
  Save, 
  AlertCircle,
  Users,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { fetchStudents, fetchAttendance, saveAttendanceBatch, fetchAttendanceStats } from '../lib/api';
import { useTranslation } from 'react-i18next';

export const Attendance = ({ activeClassroom }) => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [attendanceMap, setAttendanceMap] = useState({}); // { [studentId]: 'present' | 'absent' | 'late' | 'excused' }
  const [notesMap, setNotesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const classroomId = activeClassroom?.id;
  const grades = activeClassroom?.grades || [];

  // Load students and existing attendance for date
  useEffect(() => {
    if (!classroomId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setSaveSuccess(false);
      try {
        const [stdList, existingRecords] = await Promise.all([
          fetchStudents(classroomId),
          fetchAttendance(classroomId, selectedDate)
        ]);

        setStudents(stdList || []);

        const initialMap = {};
        const initialNotes = {};
        if (existingRecords && existingRecords.length > 0) {
          existingRecords.forEach(r => {
            initialMap[r.student_id] = r.status;
            if (r.notes) initialNotes[r.student_id] = r.notes;
          });
        }
        setAttendanceMap(initialMap);
        setNotesMap(initialNotes);
      } catch (err) {
        console.error('[Attendance] Error loading:', err);
        setError(err.message || 'Failed to load attendance records');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [classroomId, selectedDate]);

  // Filter students by selected grade
  const filteredStudents = students.filter(s => {
    if (selectedGrade === 'all') return true;
    return s.grade === parseInt(selectedGrade, 10);
  });

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
    setSaveSuccess(false);
  };

  const handleMarkAllPresent = () => {
    const updated = { ...attendanceMap };
    filteredStudents.forEach(s => {
      updated[s.id] = 'present';
    });
    setAttendanceMap(updated);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!classroomId || students.length === 0) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const entries = Object.keys(attendanceMap).map(studentId => ({
        student_id: studentId,
        status: attendanceMap[studentId],
        notes: notesMap[studentId] || null
      }));

      await saveAttendanceBatch(classroomId, selectedDate, entries);
      setSaveSuccess(true);
    } catch (err) {
      console.error('[Attendance] Save failed:', err);
      setError(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Real calculated metrics for selected date
  const recordedCount = Object.keys(attendanceMap).length;
  const presentCount = Object.values(attendanceMap).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceMap).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendanceMap).filter(s => s === 'late').length;
  const attendanceRate = recordedCount > 0 ? Math.round((presentCount / recordedCount) * 100) : null;

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#2E7D32]" />
            <span>{t('attendance.title', 'Attendance Register')}</span>
          </h1>
          <p className="text-xs text-stone-500">
            {activeClassroom?.name || 'Classroom'} • Date-specific multi-grade student attendance
          </p>
        </div>

        {/* Date and Grade Selector Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-xs">
            <Calendar className="w-4 h-4 text-stone-400" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-stone-800 outline-none bg-transparent cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-xs">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="text-xs font-semibold text-stone-800 outline-none bg-transparent cursor-pointer"
            >
              <option value="all">{t('timetable.allGrades', 'All Grades')}</option>
              {grades.map(g => (
                <option key={g} value={g}>{t('common.grade', 'Grade')} {g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-xs">
          <div className="text-[11px] font-medium text-stone-500">{t('dashboard.enrolledStudents', 'Total Enrolled')}</div>
          <div className="text-xl font-bold text-stone-900">{students.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-xs">
          <div className="text-[11px] font-medium text-emerald-700">{t('attendance.present', 'Present')}</div>
          <div className="text-xl font-bold text-emerald-800">{presentCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-xs">
          <div className="text-[11px] font-medium text-red-600">{t('attendance.absent', 'Absent')}</div>
          <div className="text-xl font-bold text-red-700">{absentCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-xs">
          <div className="text-[11px] font-medium text-stone-500">{t('attendance.rate', 'Attendance Rate')}</div>
          <div className="text-xl font-bold text-stone-900">
            {attendanceRate !== null ? `${attendanceRate}%` : t('dashboard.notRecordedYet', 'Not recorded yet')}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E7D32]" />
          <span>{t('attendance.savedSuccess', 'Attendance records saved and synced successfully.')}</span>
        </div>
      )}

      {/* Main Student List Table */}
      {!classroomId ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
          {t('classrooms.noClassrooms', 'Please select or create a classroom to take attendance.')}
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-stone-800">{t('students.noStudents', 'No students enrolled in this classroom')}</div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {t('dashboard.addStudents', 'Add students to your roster first to start recording attendance.')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          
          {/* Table Toolbar */}
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-semibold text-stone-700">
              Showing {filteredStudents.length} of {students.length} Students
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>{t('attendance.markAllPresent', 'Mark All Present')}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || Object.keys(attendanceMap).length === 0}
                className="px-4 py-1.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? t('common.loading', 'Saving...') : t('attendance.saveAttendance', 'Save Attendance')}</span>
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/50 text-stone-500 uppercase tracking-wider text-[10px] border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">{t('students.rollNumber', 'Roll')}</th>
                  <th className="py-3 px-4 font-semibold">{t('students.studentName', 'Student Name')}</th>
                  <th className="py-3 px-4 font-semibold">{t('common.grade', 'Grade')}</th>
                  <th className="py-3 px-4 font-semibold text-center">{t('common.status', 'Status')}</th>
                  <th className="py-3 px-4 font-semibold">{t('common.notes', 'Notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStudents.map((std, idx) => {
                  const status = attendanceMap[std.id];
                  return (
                    <tr key={std.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-500">
                        {std.roll_number || idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        {std.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium text-[11px]">
                          Grade {std.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'present')}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'absent')}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                              status === 'absent'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-800'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'late')}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                              status === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-amber-50 hover:text-amber-800'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'excused')}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                              status === 'excused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-blue-50 hover:text-blue-800'
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={notesMap[std.id] || ''}
                          onChange={(e) => setNotesMap({ ...notesMap, [std.id]: e.target.value })}
                          placeholder="Optional notes..."
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-200 outline-none focus:border-[#2E7D32]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};

