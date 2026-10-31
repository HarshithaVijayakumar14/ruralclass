import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  BookOpen,
  Filter,
  Download,
  Save,
  Trash2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { 
  fetchAssignments, 
  createAssignment, 
  deleteAssignment, 
  requestAIWorksheet 
} from '../lib/api';

export const Worksheets = ({ activeClassroom }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const [selectedGrade, setSelectedGrade] = useState(2);
  const [difficulty, setDifficulty] = useState('on_level');
  const [subject, setSubject] = useState('Mathematics');
  const [topic, setTopic] = useState('Basic Regrouping & Addition');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'saved'

  // Generated worksheet content
  const [generatedWorksheet, setGeneratedWorksheet] = useState(null);
  const [savedAssignments, setSavedAssignments] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const classroomId = activeClassroom?.id;
  const classroomGrades = activeClassroom?.grades || [1, 2, 3, 4, 5];

  // Prefill from route state (e.g. from SupportRecommendations)
  useEffect(() => {
    if (location.state) {
      if (location.state.prefillGrade) setSelectedGrade(location.state.prefillGrade);
      if (location.state.prefillSubject) setSubject(location.state.prefillSubject);
      if (location.state.prefillTopic) setTopic(location.state.prefillTopic);
      if (location.state.prefillDifficulty) setDifficulty(location.state.prefillDifficulty);
    }
  }, [location.state]);

  // Load saved assignments
  useEffect(() => {
    if (!classroomId) return;
    const loadSaved = async () => {
      const data = await fetchAssignments({ classroom_id: classroomId });
      setSavedAssignments(data || []);
    };
    loadSaved();
  }, [classroomId]);

  // Handle generation via backend AI / rule-based service
  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccessMsg(null);

    try {
      const res = await requestAIWorksheet({
        classroom_id: classroomId,
        grade: selectedGrade,
        subject,
        topic,
        difficulty_level: difficulty,
        language: i18n.language || 'en'
      });

      if (res.worksheet) {
        setGeneratedWorksheet(res.worksheet);
      } else if (res.fallbackWorksheet) {
        setGeneratedWorksheet(res.fallbackWorksheet);
      }
    } catch (err) {
      console.warn('[Worksheets] AI generation failed, using local rule fallback:', err.message);
      // Client-side fallback if backend unavailable
      setGeneratedWorksheet({
        title: `Grade ${selectedGrade} ${subject}: ${topic} (${difficulty.toUpperCase()})`,
        grade: selectedGrade,
        subject,
        topic,
        difficulty_level: difficulty,
        remedial_pedagogical_note: difficulty === 'remedial' 
          ? 'Use concrete manipulatives (tamarind seeds, pebbles, slates) to model groupings before writing answers.'
          : 'Standard on-level practice.',
        concrete_slate_activity: [
          `Slate Step 1: Arrange ${difficulty === 'remedial' ? '10' : '20'} seeds or pebbles on your slate to model ${topic}.`,
          `Slate Step 2: Draw your seed arrangement on your slate with chalk and show your bench partner.`,
          `Slate Step 3: Complete the matching challenge written on the chalkboard.`
        ],
        written_problems: [
          {
            question_number: 'Q1',
            prompt: `Solve using your seeds: Draw 3 groups of 2 pebbles on your slate. How many total?`,
            type: 'calculation'
          },
          {
            question_number: 'Q2',
            prompt: `Word Problem: A farmer collects 12 coconuts in the morning and 15 in the evening. How many coconuts were collected in all?`,
            type: 'word_problem'
          }
        ],
        answer_key: {
          "Q1": "6 total pebbles (3 groups of 2)",
          "Q2": "27 coconuts (12 + 15 = 27)"
        },
        zero_cost_tlm: ["Student Slates & Chalk", "Tamarind Seeds / Pebbles", "Chalkboard"],
        status: 'draft'
      });
    } finally {
      setLoading(false);
    }
  };

  // Save generated worksheet to database / IndexedDB
  const handleSaveWorksheet = async () => {
    if (!generatedWorksheet || !classroomId) return;
    setSaving(true);
    try {
      const saved = await createAssignment({
        classroom_id: classroomId,
        grade: generatedWorksheet.grade,
        title: generatedWorksheet.title,
        subject: generatedWorksheet.subject,
        assignment_type: 'worksheet',
        difficulty_level: generatedWorksheet.difficulty_level,
        content: {
          topic: generatedWorksheet.topic,
          remedial_pedagogical_note: generatedWorksheet.remedial_pedagogical_note,
          concrete_slate_activity: generatedWorksheet.concrete_slate_activity,
          written_problems: generatedWorksheet.written_problems,
          zero_cost_tlm: generatedWorksheet.zero_cost_tlm
        },
        answer_key: generatedWorksheet.answer_key,
        status: 'assigned',
        assigned_date: new Date().toISOString().split('T')[0]
      });

      if (saved) {
        setSavedAssignments(prev => [saved, ...prev]);
        setSaveSuccessMsg('Worksheet successfully saved to your classroom assignments!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      alert(`Could not save worksheet: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete saved assignment
  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Are you sure you want to remove this saved worksheet?')) return;
    try {
      await deleteAssignment(id);
      setSavedAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[#2E7D32]" />
            <span>{t('worksheets.title', 'Differentiated Worksheets & Practice')}</span>
          </h1>
          <p className="text-xs text-stone-500">
            {activeClassroom?.name || 'Classroom'} • {t('worksheets.subtitle', 'Printable, zero-cost slate exercises and contextual rural problems')}
          </p>
        </div>

        {/* Action Tabs & Print */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'generator' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {t('worksheets.generateNew', 'Generator')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'saved' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>{t('nav.savedPlans', 'Saved')}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 text-[10px]">
                {savedAssignments.length}
              </span>
            </button>
          </div>

          {generatedWorksheet && activeTab === 'generator' && (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {activeTab === 'generator' ? (
        <div className="space-y-6">
          
          {/* Generator Form Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 print:hidden">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-stone-900">Configure Assignment & Worksheet</h2>
            </div>

            <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Grade</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs outline-none focus:border-[#2E7D32]"
                >
                  {classroomGrades.map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs outline-none focus:border-[#2E7D32]"
                >
                  <option value="remedial">1. Support / Remedial (Concrete Manipulatives)</option>
                  <option value="on_level">2. On-Level (Foundational Practice)</option>
                  <option value="extension">3. Extension (Peer Challenge)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#2E7D32]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 block">Topic / Struggling Skill</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Seed Counting & Regrouping"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#2E7D32]"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white font-semibold text-xs shadow-xs flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{loading ? 'Synthesizing Worksheet...' : 'Generate Differentiated Worksheet'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Generated Worksheet Paper Preview (Print-friendly) */}
          {generatedWorksheet && (
            <div className="space-y-4">
              
              {/* Save Button Toolbar */}
              <div className="flex justify-end gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handleSaveWorksheet}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs shadow-xs flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save to Classroom Assignments'}</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-stone-300 p-6 sm:p-10 shadow-sm space-y-6 print:border-none print:p-0">
                
                {/* Header on Paper */}
                <div className="border-b-2 border-stone-800 pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider font-bold text-stone-500">
                      {activeClassroom?.school_name || 'Govt Higher Primary School'}
                    </div>
                    <h2 className="text-xl font-extrabold text-stone-900">
                      {generatedWorksheet.title}
                    </h2>
                    <div className="text-xs text-stone-600">
                      Level: <span className="font-semibold uppercase">{generatedWorksheet.difficulty_level.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="text-xs text-stone-600 text-right space-y-1">
                    <div>Student Name: ________________________</div>
                    <div>Roll No: _______ Date: ____________</div>
                  </div>
                </div>

                {/* Remedial Pedagogical Note */}
                {generatedWorksheet.remedial_pedagogical_note && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong className="font-bold">Pedagogical Focus:</strong> {generatedWorksheet.remedial_pedagogical_note}
                  </div>
                )}

                {/* Section A: Slate & Concrete Activity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 bg-stone-100 p-2 rounded">
                    Part A: Concrete Exploration (Slates & Seeds)
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-stone-800 leading-relaxed pl-2">
                    {generatedWorksheet.concrete_slate_activity?.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                {/* Section B: Written Practice Questions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 bg-stone-100 p-2 rounded">
                    Part B: Written Problems
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    {generatedWorksheet.written_problems?.map((prob, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg border border-stone-200 space-y-2">
                        <div className="font-semibold text-stone-900">{prob.question_number}. ({prob.type})</div>
                        <p className="text-stone-700 leading-relaxed">{prob.prompt}</p>
                        <div className="pt-4 text-stone-400 font-mono text-[11px]">Answer: __________________</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section C: Teacher Answer Key */}
                {generatedWorksheet.answer_key && (
                  <div className="mt-8 pt-4 border-t border-dashed border-stone-300 text-xs text-stone-500 space-y-1">
                    <div className="font-bold text-stone-700">Teacher Quick Answer Key:</div>
                    {Object.entries(generatedWorksheet.answer_key).map(([k, v]) => (
                      <div key={k}><strong className="font-semibold">{k}:</strong> {String(v)}</div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      ) : (
        /* Saved Assignments Tab */
        <div className="space-y-4">
          {savedAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-stone-800">No saved worksheets yet</div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Use the generator to create and save differentiated worksheets and assignments for your multi-grade class.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className="px-4 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-semibold"
              >
                Go to Generator
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedAssignments.map(assign => (
                <div key={assign.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold mr-2">
                        Grade {assign.grade}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                        {assign.difficulty_level}
                      </span>
                      <h3 className="text-sm font-bold text-stone-900 mt-1">{assign.title}</h3>
                      <div className="text-xs text-stone-500">{assign.subject} • Assigned: {assign.assigned_date}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAssignment(assign.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {assign.content?.remedial_pedagogical_note && (
                    <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      {assign.content.remedial_pedagogical_note}
                    </p>
                  )}

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <div>{assign.content?.written_problems?.length || 0} questions</div>
                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedWorksheet({
                          title: assign.title,
                          grade: assign.grade,
                          subject: assign.subject,
                          topic: assign.content?.topic || assign.title,
                          difficulty_level: assign.difficulty_level,
                          remedial_pedagogical_note: assign.content?.remedial_pedagogical_note,
                          concrete_slate_activity: assign.content?.concrete_slate_activity || [],
                          written_problems: assign.content?.written_problems || [],
                          answer_key: assign.answer_key || {},
                          zero_cost_tlm: assign.content?.zero_cost_tlm || []
                        });
                        setActiveTab('generator');
                      }}
                      className="text-[#2E7D32] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>View & Print</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

