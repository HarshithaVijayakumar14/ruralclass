import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Upload, 
  Check, 
  X, 
  AlertCircle,
  GraduationCap,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { 
  fetchStudents, 
  createStudent, 
  bulkCreateStudents, 
  updateStudent, 
  deleteStudent 
} from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

export const StudentManagement = ({ activeClassroom }) => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Single Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState(1);
  const [studentRoll, setStudentRoll] = useState('');
  const [readingLevel, setReadingLevel] = useState('developing');
  const [mathLevel, setMathLevel] = useState('developing');
  const [studentNotes, setStudentNotes] = useState('');

  // Bulk Add Modal state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkGrade, setBulkGrade] = useState(1);
  const [bulkNames, setBulkNames] = useState('');

  // Delete Confirmation state
  const [studentToDelete, setStudentToDelete] = useState(null);

  const classroomId = activeClassroom?.id;
  const classroomGrades = activeClassroom?.grades || [1, 2, 3, 4, 5];

  useEffect(() => {
    if (!classroomId) {
      setLoading(false);
      return;
    }

    const loadStudents = async () => {
      setLoading(true);
      try {
        const data = await fetchStudents(classroomId);
        setStudents(data || []);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();

    // Supabase Realtime subscription
    const unsub = subscribeToTable({
      table: 'students',
      filter: `classroom_id=eq.${classroomId}`,
      onInsert: (newStd) => setStudents(prev => [...prev, newStd]),
      onUpdate: (updatedStd) => setStudents(prev => prev.map(s => s.id === updatedStd.id ? updatedStd : s)),
      onDelete: (oldStd) => setStudents(prev => prev.filter(s => s.id !== oldStd.id))
    });

    return () => unsub();
  }, [classroomId]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setStudentName('');
    setStudentGrade(classroomGrades[0] || 1);
    setStudentRoll('');
    setReadingLevel('developing');
    setMathLevel('developing');
    setStudentNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setStudentName(student.name);
    setStudentGrade(student.grade);
    setStudentRoll(student.roll_number || '');
    setReadingLevel(student.reading_level || 'developing');
    setMathLevel(student.math_level || 'developing');
    setStudentNotes(student.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !classroomId) return;

    const payload = {
      classroom_id: classroomId,
      name: studentName.trim(),
      grade: parseInt(studentGrade, 10),
      roll_number: studentRoll.trim() || null,
      reading_level: readingLevel,
      math_level: mathLevel,
      notes: studentNotes.trim() || null
    };

    if (editingStudent) {
      await updateStudent(editingStudent.id, payload);
    } else {
      await createStudent(payload);
    }

    setIsModalOpen(false);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkNames.trim() || !classroomId) return;

    const lines = bulkNames
      .split('\n')
      .map(n => n.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const studentObjects = lines.map((name, idx) => ({
      name,
      grade: parseInt(bulkGrade, 10),
      roll_number: `${bulkGrade}${String(idx + 1).padStart(2, '0')}`,
      reading_level: 'developing',
      math_level: 'developing',
      attendance_status: 'present'
    }));

    await bulkCreateStudents(classroomId, studentObjects);
    setBulkNames('');
    setIsBulkOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    await deleteStudent(studentToDelete.id);
    setStudentToDelete(null);
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.roll_number && s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGrade = gradeFilter === 'all' || s.grade === parseInt(gradeFilter, 10);
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#2E7D32]" />
            <span>{t('nav.students', 'Student Roster')}</span>
          </h1>
          <p className="text-xs text-stone-500">
            {activeClassroom?.name || 'Classroom'} • Manage student profiles across Grades 1–8
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBulkOpen(true)}
            disabled={!classroomId}
            className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-stone-500" />
            <span>{t('students.bulkAdd', 'Bulk Paste')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            disabled={!classroomId}
            className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('students.addStudent', 'Add Student')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('students.searchPlaceholder', 'Search student by name or roll number...')}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-[#2E7D32]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">{t('timetable.allGrades', 'All Grades')} ({students.length})</option>
            {classroomGrades.map(g => (
              <option key={g} value={g}>
                {t('common.grade', 'Grade')} {g} ({students.filter(s => s.grade === g).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student List */}
      {!classroomId ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
          {t('classrooms.noClassrooms', 'Please select or create a classroom to manage students.')}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-stone-800">
            {students.length === 0 ? t('students.noStudents', 'No students added yet') : 'No students match your search'}
          </div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {students.length === 0 
              ? t('students.bulkAdd', 'Click "Add Student" or "Bulk Paste" to enter student names line by line.')
              : 'Try clearing your search query or grade filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/50 text-stone-500 uppercase tracking-wider text-[10px] border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">{t('students.rollNumber', 'Roll')}</th>
                  <th className="py-3 px-4 font-semibold">{t('students.studentName', 'Student Name')}</th>
                  <th className="py-3 px-4 font-semibold">{t('common.grade', 'Grade')}</th>
                  <th className="py-3 px-4 font-semibold">Reading Level</th>
                  <th className="py-3 px-4 font-semibold">Math Level</th>
                  <th className="py-3 px-4 font-semibold">{t('common.notes', 'Notes')}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStudents.map((std, idx) => (
                  <tr key={std.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-500">
                      {std.roll_number || idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      {std.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold text-[11px]">
                        Grade {std.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        std.reading_level === 'fluent' ? 'bg-emerald-100 text-emerald-800' :
                        std.reading_level === 'emerging' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {std.reading_level}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        std.math_level === 'fluent' ? 'bg-emerald-100 text-emerald-800' :
                        std.math_level === 'emerging' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {std.math_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                      {std.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(std)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                          title="Edit Student"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentToDelete(std)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Grade</label>
                  <select
                    value={studentGrade}
                    onChange={(e) => setStudentGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  >
                    {classroomGrades.map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Roll / Slate ID</label>
                  <input
                    type="text"
                    value={studentRoll}
                    onChange={(e) => setStudentRoll(e.target.value)}
                    placeholder="e.g. 201"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Reading Level</label>
                  <select
                    value={readingLevel}
                    onChange={(e) => setReadingLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  >
                    <option value="emerging">Emerging</option>
                    <option value="developing">Developing</option>
                    <option value="fluent">Fluent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Math Level</label>
                  <select
                    value={mathLevel}
                    onChange={(e) => setMathLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  >
                    <option value="emerging">Emerging</option>
                    <option value="developing">Developing</option>
                    <option value="fluent">Fluent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Pedagogical Notes (Optional)</label>
                <textarea
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="e.g. Needs concrete seed counting aids for regrouping."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs shadow-xs"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">Bulk Paste Student Names</h3>
              <button 
                onClick={() => setIsBulkOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Assign To Grade</label>
                <select
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                >
                  {classroomGrades.map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">
                  Paste Names (one student per line)
                </label>
                <textarea
                  required
                  value={bulkNames}
                  onChange={(e) => setBulkNames(e.target.value)}
                  placeholder={`Ananya\nBasavaraj\nChaitra\nDeepak\nEshwar`}
                  rows={6}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-xs focus:outline-none focus:border-[#2E7D32]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs shadow-xs"
                >
                  Add Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-stone-900">Remove Student?</h3>
              <p className="text-xs text-stone-500">
                Are you sure you want to remove <span className="font-semibold text-stone-800">{studentToDelete.name}</span> from Grade {studentToDelete.grade}? This will also delete their associated attendance and assessment records.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

