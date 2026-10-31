import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Mic, 
  MicOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Award, 
  BookOpen, 
  Plus, 
  Trash2,
  Calendar,
  Layers
} from 'lucide-react';
import { 
  fetchStudents, 
  fetchStudentProgress, 
  createStudentProgress, 
  approveStudentProgress, 
  requestAIAssessment 
} from '../lib/api';
import { isSpeechRecognitionSupported, createSpeechRecognizer } from '../lib/voice';
import { subscribeToTable } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

export const StudentProgress = ({ activeClassroom }) => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Formative Assessment Form State
  const [assessmentType, setAssessmentType] = useState('formative_quiz');
  const [subject, setSubject] = useState('Science (Environmental Studies)');
  const [skillTested, setSkillTested] = useState('Seed Germination & Plant Needs');
  const [score, setScore] = useState(35); // Defaults to <40 to illustrate concrete remedial priority
  const [maxScore, setMaxScore] = useState(100);
  const [teacherObservations, setTeacherObservations] = useState('Student understands sunlight requirement but struggles with explaining why seeds need moisture.');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognizer, setSpeechRecognizer] = useState(null);

  // Active AI Diagnostic result (starts as needs_review)
  const [latestDiagnostic, setLatestDiagnostic] = useState(null);

  const classroomId = activeClassroom?.id;

  // Load students & progress
  useEffect(() => {
    if (!classroomId) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [stdData, progData] = await Promise.all([
          fetchStudents(classroomId),
          fetchStudentProgress({ classroom_id: classroomId })
        ]);
        setStudents(stdData || []);
        setProgressRecords(progData || []);
        if (stdData && stdData.length > 0 && !selectedStudentId) {
          setSelectedStudentId(stdData[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Supabase Realtime subscription
    const unsub = subscribeToTable({
      table: 'student_progress',
      filter: `classroom_id=eq.${classroomId}`,
      onInsert: (newProg) => setProgressRecords(prev => [newProg, ...prev]),
      onUpdate: (updatedProg) => setProgressRecords(prev => prev.map(p => p.id === updatedProg.id ? updatedProg : p)),
      onDelete: (oldProg) => setProgressRecords(prev => prev.filter(p => p.id !== oldProg.id))
    });

    return () => unsub();
  }, [classroomId]);

  // Voice recording toggle using Web Speech API
  const handleToggleVoiceRecording = () => {
    if (isRecording) {
      if (speechRecognizer) speechRecognizer.stop();
      setIsRecording(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      alert('Web Speech API is not supported in this browser. Please type observation notes manually.');
      return;
    }

    const recognizer = createSpeechRecognizer({
      onResult: ({ fullText }) => {
        setVoiceTranscript(fullText);
      },
      onError: (err) => {
        console.warn('Voice error:', err);
        setIsRecording(false);
      },
      onEnd: () => {
        setIsRecording(false);
      }
    });

    if (recognizer) {
      try {
        recognizer.start();
        setSpeechRecognizer(recognizer);
        setIsRecording(true);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Generate AI Grounded Diagnostic Assessment with Gemini
  const handleDiagnoseWithAI = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !classroomId) return;

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    setDiagnosing(true);
    setErrorMsg(null);

    try {
      const response = await requestAIAssessment({
        classroom_id: classroomId,
        student_id: selectedStudentId,
        student_name: student.name,
        grade: student.grade,
        subject,
        skill_tested: skillTested,
        score: parseFloat(score) || 0,
        voice_note_transcript: voiceTranscript,
        teacher_observations: teacherObservations
      });

      const diagnosticData = response.assessment || response.fallbackAssessment;
      setLatestDiagnostic(diagnosticData);

      // Save to Supabase with status 'needs_review' (strictly DRAFT, not approved)
      await createStudentProgress({
        classroom_id: classroomId,
        student_id: selectedStudentId,
        assessment_type: assessmentType,
        subject,
        skill_tested: skillTested,
        score: parseFloat(score) || 0,
        max_score: parseFloat(maxScore) || 100,
        priority_level: diagnosticData.priority_level,
        observations: `${teacherObservations}\n\n[Grounded AI Recommendation]: ${diagnosticData.recommended_action}`,
        voice_note_transcript: voiceTranscript || undefined,
        status: 'needs_review' // Strictly needs review!
      });

    } catch (err) {
      setErrorMsg(err.message || 'Diagnostic assessment failed.');
    } finally {
      setDiagnosing(false);
    }
  };

  // Explicit Teacher Approval of Student Assessment
  const handleApproveRecord = async (recordId) => {
    try {
      await approveStudentProgress(recordId);
      setProgressRecords(prev => prev.map(p => p.id === recordId ? { ...p, status: 'approved' } : p));
    } catch (err) {
      alert('Approval failed: ' + err.message);
    }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#2E7D32]" />
          <span>{t('progress.title', 'Foundational Learning & Formative Progress')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          {t('progress.subtitle', 'Track foundational literacy/numeracy benchmarks, capture hands-free voice notes, and receive explainable zero-cost remedial support.')}
        </p>
      </div>

      {/* Benchmark Rules Card */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-red-900">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>&lt; 40% High Priority</span>
          </div>
          <p className="text-red-800 text-[11px] leading-relaxed">
            {t('progress.highPriority', 'Requires daily concrete manipulative drills (tamarind seeds / pebbles) + slate mentor drills.')}
          </p>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>40%–59% Developing</span>
          </div>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            {t('progress.mediumPriority', 'Developing proficiency; benefits from guided error correction and partner whisper checks.')}
          </p>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>&ge; 60% Foundational Mastery</span>
          </div>
          <p className="text-emerald-800 text-[11px] leading-relaxed">
            {t('progress.mastery', 'Peer buddy mentor; ready for extension challenges and independent reading.')}
          </p>
        </div>
      </div>

      {/* Main Grid: Formative Recorder & Progress History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): Record Formative Assessment & Voice Dictation */}
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleDiagnoseWithAI} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Record Formative Assessment</span>
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                AI Diagnostic
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Student Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Select Student *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl bg-white outline-none"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Grade {s.grade}) — Roll: {s.roll_number || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject & Skill */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Skill Tested
                </label>
                <input
                  type="text"
                  required
                  value={skillTested}
                  onChange={(e) => setSkillTested(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Assessment Type & Score */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Method
                </label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white outline-none"
                >
                  <option value="formative_quiz">Formative Quiz</option>
                  <option value="slate_drill">Slate Drill</option>
                  <option value="oral_reading">Oral Reading</option>
                  <option value="teacher_observation">Observation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Score (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Voice Dictation (Web Speech API) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>Teacher Voice Dictation Note</span>
                </label>
                <button
                  type="button"
                  onClick={handleToggleVoiceRecording}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    isRecording 
                      ? 'bg-red-600 text-white animate-pulse' 
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecording ? 'Listening...' : 'Dictate'}</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                placeholder="Spoken observation notes will appear here automatically via speech recognition..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl outline-none"
              />
            </div>

            {/* Manual Observation */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Written Observations
              </label>
              <textarea
                rows={2}
                value={teacherObservations}
                onChange={(e) => setTeacherObservations(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={diagnosing || !selectedStudentId}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#2E7D32] hover:bg-[#1B5E20] text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{diagnosing ? 'Analyzing Benchmarks...' : 'Diagnose Support with Gemini AI'}</span>
            </button>
          </form>
        </div>

        {/* Right Column (7 Cols): Grounded Support & Formative Records */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Latest AI Support Diagnostic Alert */}
          {latestDiagnostic && (
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-stone-900">
                    AI Pedagogical Diagnostic for {selectedStudent?.name}
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  DRAFT (Needs Review)
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="font-bold text-stone-700 block mb-0.5">Grounded Evidence:</span>
                  <p className="text-stone-600 leading-relaxed">{latestDiagnostic.grounded_evidence}</p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-emerald-900 block mb-0.5">Recommended Zero-Cost Remedial Action:</span>
                  <p className="text-emerald-800 leading-relaxed font-medium">{latestDiagnostic.recommended_action}</p>
                </div>

                {latestDiagnostic.slate_drill_exercises && latestDiagnostic.slate_drill_exercises.length > 0 && (
                  <div>
                    <span className="font-bold text-stone-700 block mb-1">Targeted Slate Drills:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                      {latestDiagnostic.slate_drill_exercises.map((drill, idx) => (
                        <li key={idx}>{drill}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formative Progress History Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Recorded Formative Assessments ({progressRecords.length})
              </span>
              <span className="text-[11px] text-stone-500">
                AI assessments require explicit approval
              </span>
            </div>

            <div className="overflow-x-auto">
              {progressRecords.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  No formative assessments recorded yet. Use the tool on the left to record observations.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px]">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Skill Tested</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Teacher Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {progressRecords.map(rec => {
                      const studentName = rec.students?.name || 'Student';
                      const grade = rec.students?.grade || '';
                      const isNeedsReview = rec.status === 'needs_review' || rec.status === 'draft';

                      return (
                        <tr key={rec.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-stone-900">
                            {studentName} {grade ? `(G${grade})` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-stone-700">
                            {rec.skill_tested}
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            {rec.score !== null ? `${rec.score}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rec.priority_level === 'high'
                                ? 'bg-red-100 text-red-800'
                                : rec.priority_level === 'mastery'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}>
                              {rec.priority_level}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rec.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {rec.status === 'approved' ? 'Approved' : 'Needs Review'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isNeedsReview ? (
                              <button
                                onClick={() => handleApproveRecord(rec.id)}
                                className="px-2.5 py-1 rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-[11px] font-semibold transition-colors shadow-xs"
                              >
                                Approve
                              </button>
                            ) : (
                              <span className="text-emerald-700 text-[11px] font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

