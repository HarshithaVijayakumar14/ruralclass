import React, { useState, useEffect } from 'react';
import { 
  School, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Download, 
  Upload, 
  UserPlus, 
  Sparkles,
  BookOpen,
  Clock,
  Layers,
  AlertCircle,
  PlusCircle,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { 
  fetchClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  fetchStudents, 
  createStudent, 
  bulkCreateStudents, 
  updateStudent, 
  deleteStudent 
} from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
const STANDARD_TLM = [
  'Chalkboard & Colored Chalk',
  'Student Slates & Chalk',
  'Tamarind Seeds / Pebbles (Counting Aids)',
  'Textbooks & Workbooks',
  'Garden Specimens / Leaves',
  'Handmade Chart Paper / Cards'
];

export const Classroom = ({ activeClassroom, classrooms = [], onSelectClassroom, onClassroomUpdated }) => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Classroom Create Modal state
  const [isCreateClassroomOpen, setIsCreateClassroomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('Govt Higher Primary School');
  const [newGrades, setNewGrades] = useState([1, 2, 3]);
  const [newDailyMinutes, setNewDailyMinutes] = useState(60);
  const [newPeriodCount, setNewPeriodCount] = useState(6);
  const [newMaterials, setNewMaterials] = useState(STANDARD_TLM.slice(0, 4));

  // Classroom Edit settings state
  const [isEditingClassroom, setIsEditingClassroom] = useState(false);
  const [editSchoolName, setEditSchoolName] = useState(activeClassroom?.school_name || '');
  const [editRoomName, setEditRoomName] = useState(activeClassroom?.name || '');
  const [editGrades, setEditGrades] = useState(activeClassroom?.grades || [1, 2, 3, 4, 5]);
  const [editDailyMinutes, setEditDailyMinutes] = useState(activeClassroom?.daily_minutes || 60);
  const [editPeriodCount, setEditPeriodCount] = useState(activeClassroom?.period_count || 6);
  const [editMaterials, setEditMaterials] = useState(activeClassroom?.materials || STANDARD_TLM.slice(0, 4));

  // Classroom Delete Confirmation
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const classroomId = activeClassroom?.id;

  // Sync edit form when activeClassroom changes
  useEffect(() => {
    if (activeClassroom) {
      setEditSchoolName(activeClassroom.school_name || '');
      setEditRoomName(activeClassroom.name || '');
      setEditGrades(activeClassroom.grades || [1, 2, 3, 4, 5]);
      setEditDailyMinutes(activeClassroom.daily_minutes || 60);
      setEditPeriodCount(activeClassroom.period_count || 6);
      setEditMaterials(activeClassroom.materials || STANDARD_TLM.slice(0, 4));
    }
  }, [activeClassroom]);

  // Load students for active classroom
  useEffect(() => {
    if (!classroomId) {
      setStudents([]);
      setLoading(false);
      return;
    }
    const loadRoster = async () => {
      setLoading(true);
      try {
        const roster = await fetchStudents(classroomId);
        setStudents(roster || []);
      } finally {
        setLoading(false);
      }
    };
    loadRoster();

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

  // Handle classroom creation
  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const payload = {
      name: newRoomName.trim(),
      school_name: newSchoolName.trim() || 'Govt Higher Primary School',
      grades: newGrades.sort((a, b) => a - b),
      daily_minutes: parseInt(newDailyMinutes, 10),
      period_count: parseInt(newPeriodCount, 10),
      materials: newMaterials
    };

    const created = await createClassroom(payload);
    if (created && onClassroomUpdated) {
      onClassroomUpdated(created);
      if (onSelectClassroom) onSelectClassroom(created);
    }

    setIsCreateClassroomOpen(false);
    setNewRoomName('');
  };

  // Handle classroom settings update
  const handleSaveClassroomSettings = async (e) => {
    e.preventDefault();
    if (!classroomId) return;
    const updated = await updateClassroom(classroomId, {
      name: editRoomName.trim() || editSchoolName,
      school_name: editSchoolName.trim(),
      grades: editGrades.sort((a, b) => a - b),
      daily_minutes: editDailyMinutes,
      period_count: editPeriodCount,
      materials: editMaterials
    });
    if (onClassroomUpdated) onClassroomUpdated(updated);
    setIsEditingClassroom(false);
  };

  // Handle classroom deletion
  const handleDeleteClassroom = async () => {
    if (!classroomId) return;
    await deleteClassroom(classroomId);
    setIsDeleteConfirmOpen(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <School className="w-6 h-6 text-[#2E7D32]" />
            <span>Classroom Management & Parameters</span>
          </h1>
          <p className="text-xs text-stone-500">
            Configure multi-grade room parameters, teaching time blocks, and zero-cost TLM
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeClassroom && (
            <button
              onClick={() => setIsEditingClassroom(!isEditingClassroom)}
              className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Edit3 className="w-4 h-4 text-stone-500" />
              <span>{isEditingClassroom ? 'Close Edit' : 'Edit Classroom'}</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateClassroomOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Classroom</span>
          </button>
        </div>
      </div>

      {/* When no classrooms exist */}
      {!activeClassroom && classrooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#2E7D32] flex items-center justify-center mx-auto">
            <School className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-stone-900">
              {t('classrooms.noClassrooms', 'No Classroom Configured Yet')}
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Set up your first multi-grade classroom by entering your school name, selecting the grades you teach together (Grades 1–8), and defining your daily teaching time.
            </p>
          </div>
          <button
            onClick={() => setIsCreateClassroomOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('classrooms.create', 'Create Classroom Now')}</span>
          </button>
        </div>
      ) : activeClassroom && (
        <div className="space-y-6">
          
          {/* Active Classroom Details Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Active Classroom</span>
                <h2 className="text-lg font-bold text-stone-900">{activeClassroom.name}</h2>
                <p className="text-xs text-stone-500">{activeClassroom.school_name}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('classrooms.deleteClassroom', 'Delete Classroom')}</span>
                </button>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-stone-500 font-medium text-[11px]">Grades in Room</div>
                <div className="font-bold text-stone-900 text-sm">
                  Grades {activeClassroom.grades?.join(', ')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-stone-500 font-medium text-[11px]">Daily Session Time</div>
                <div className="font-bold text-stone-900 text-sm">
                  {activeClassroom.daily_minutes} Minutes
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-stone-500 font-medium text-[11px]">Periods / Blocks</div>
                <div className="font-bold text-stone-900 text-sm">
                  {activeClassroom.period_count} Time Blocks
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-stone-500 font-medium text-[11px]">Enrolled Students</div>
                <div className="font-bold text-stone-900 text-sm">
                  {students.length} Students
                </div>
              </div>
            </div>

            {/* Teaching Learning Materials */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Configured Zero-Cost Local TLM:
              </div>
              <div className="flex flex-wrap gap-2">
                {activeClassroom.materials?.map((m, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
                  >
                    ✓ {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Classroom Settings Edit Form */}
          {isEditingClassroom && (
            <form onSubmit={handleSaveClassroomSettings} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="text-sm font-bold text-stone-900">Edit Multi-Grade Parameters</h3>
                <button 
                  type="button" 
                  onClick={() => setIsEditingClassroom(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Classroom Label</label>
                  <input
                    type="text"
                    required
                    value={editRoomName}
                    onChange={(e) => setEditRoomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">School Name</label>
                  <input
                    type="text"
                    required
                    value={editSchoolName}
                    onChange={(e) => setEditSchoolName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Daily Session Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={editDailyMinutes}
                    onChange={(e) => setEditDailyMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Periods or Time Blocks</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editPeriodCount}
                    onChange={(e) => setEditPeriodCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  />
                </div>
              </div>

              {/* Grades Checkboxes */}
              <div className="space-y-2">
                <label className="font-semibold text-stone-700 block text-xs">
                  Grades Taught in this Classroom (Grades 1–8)
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_GRADES.map(g => {
                    const selected = editGrades.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            if (editGrades.length > 1) setEditGrades(editGrades.filter(x => x !== g));
                          } else {
                            setEditGrades([...editGrades, g].sort());
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          selected
                            ? 'bg-[#2E7D32] border-[#2E7D32] text-white shadow-xs'
                            : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        Grade {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TLM Checkboxes */}
              <div className="space-y-2">
                <label className="font-semibold text-stone-700 block text-xs">
                  Zero-Cost Teaching Learning Materials (TLM)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {STANDARD_TLM.map(tlm => {
                    const selected = editMaterials.includes(tlm);
                    return (
                      <label 
                        key={tlm}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer ${
                          selected ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-stone-200 text-stone-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            if (selected) {
                              setEditMaterials(editMaterials.filter(m => m !== tlm));
                            } else {
                              setEditMaterials([...editMaterials, tlm]);
                            }
                          }}
                          className="rounded text-[#2E7D32] focus:ring-[#2E7D32]"
                        />
                        <span>{tlm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditingClassroom(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs shadow-xs"
                >
                  Save Classroom Settings
                </button>
              </div>
            </form>
          )}

          {/* Quick link to Student Management */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-stone-800">Looking for Student Roster?</div>
              <p className="text-[11px] text-stone-500">
                Add, bulk-paste, or edit student profiles and baseline competencies in the Student Roster page.
              </p>
            </div>
            <Link
              to="/students"
              className="px-4 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold text-xs transition-colors self-start sm:self-auto shadow-xs"
            >
              Open Student Roster →
            </Link>
          </div>

        </div>
      )}

      {/* Create Classroom Modal */}
      {isCreateClassroomOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">Create New Multi-Grade Classroom</h3>
              <button 
                onClick={() => setIsCreateClassroomOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Classroom Name</label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Primary Room (Grades 1-3)"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">School Name</label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g. Govt Higher Primary School"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Daily Teaching Time (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={newDailyMinutes}
                    onChange={(e) => setNewDailyMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-stone-700 block">Number of Periods/Blocks</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={newPeriodCount}
                    onChange={(e) => setNewPeriodCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#2E7D32]"
                  />
                </div>
              </div>

              {/* Grades Checkboxes */}
              <div className="space-y-2">
                <label className="font-semibold text-stone-700 block text-xs">
                  Select Grades Taught Together
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_GRADES.map(g => {
                    const selected = newGrades.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            if (newGrades.length > 1) setNewGrades(newGrades.filter(x => x !== g));
                          } else {
                            setNewGrades([...newGrades, g].sort());
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          selected
                            ? 'bg-[#2E7D32] border-[#2E7D32] text-white shadow-xs'
                            : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        Grade {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateClassroomOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs shadow-xs"
                >
                  Create Classroom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Classroom Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-stone-900">Delete Classroom?</h3>
              <p className="text-xs text-stone-500">
                Are you sure you want to delete <span className="font-semibold text-stone-800">{activeClassroom?.name}</span>? This will permanently remove all associated students, lesson plans, and timetable blocks.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClassroom}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
