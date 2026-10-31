import { supabase } from './supabase';
import {
  saveToIndexedDB,
  getAllFromIndexedDB,
  getFromIndexedDB,
  deleteFromIndexedDB,
  queueOfflineMutation,
  getPendingSyncQueue,
  removeSyncQueueItem
} from './db';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get current authenticated user token from Supabase session
 */
const getAuthToken = async () => {
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch (e) {}
  }
  const local = localStorage.getItem('gurumitra_local_teacher') || localStorage.getItem('ruralclass_local_teacher');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      return parsed.token || (parsed.id ? `local-token-${parsed.id}` : 'local-teacher-bearer-token');
    } catch (e) {}
  }
  return 'local-teacher-bearer-token';
};

/**
 * Fetch with automatic Auth header and JSON error handling
 */
const request = async (endpoint, options = {}) => {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
};

// ==========================================
// 1. HEALTH CHECK
// ==========================================
export const checkApiHealth = async () => {
  try {
    return await request('/health');
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
};

// ==========================================
// 2. CLASSROOMS
// ==========================================
export const fetchClassrooms = async () => {
  try {
    const data = await request('/classrooms');
    if (data.classrooms) {
      await saveToIndexedDB('classrooms', data.classrooms);
      return data.classrooms;
    }
  } catch (err) {
    console.warn('[API] Offline: falling back to IndexedDB classrooms:', err.message);
  }
  return await getAllFromIndexedDB('classrooms');
};

export const createClassroom = async (classroomData) => {
  try {
    const res = await request('/classrooms', {
      method: 'POST',
      body: JSON.stringify(classroomData)
    });
    if (res.classroom) {
      await saveToIndexedDB('classrooms', res.classroom);
      return res.classroom;
    }
  } catch (err) {
    console.warn('[API] Offline classroom creation:', err.message);
    const offlineId = `local-${Date.now()}`;
    const localClassroom = { id: offlineId, ...classroomData, is_offline: true };
    await saveToIndexedDB('classrooms', localClassroom);
    await queueOfflineMutation({
      operation: 'INSERT',
      table_name: 'classrooms',
      record_id: offlineId,
      payload: classroomData
    });
    return localClassroom;
  }
};

export const updateClassroom = async (id, classroomData) => {
  try {
    const res = await request(`/classrooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classroomData)
    });
    if (res.classroom) {
      await saveToIndexedDB('classrooms', res.classroom);
      return res.classroom;
    }
  } catch (err) {
    console.warn('[API] Offline classroom update:', err.message);
    const existing = (await getFromIndexedDB('classrooms', id)) || {};
    const updated = { ...existing, ...classroomData, id };
    await saveToIndexedDB('classrooms', updated);
    await queueOfflineMutation({
      operation: 'UPDATE',
      table_name: 'classrooms',
      record_id: id,
      payload: classroomData
    });
    return updated;
  }
};

export const deleteClassroom = async (id) => {
  try {
    await request(`/classrooms/${id}`, { method: 'DELETE' });
    await deleteFromIndexedDB('classrooms', id);
  } catch (err) {
    console.warn('[API] Offline classroom delete:', err.message);
    await deleteFromIndexedDB('classrooms', id);
    await queueOfflineMutation({
      operation: 'DELETE',
      table_name: 'classrooms',
      record_id: id,
      payload: {}
    });
  }
};

// ==========================================
// 3. STUDENTS
// ==========================================
export const fetchStudents = async (classroomId) => {
  try {
    const url = classroomId ? `/students?classroom_id=${classroomId}` : '/students';
    const data = await request(url);
    if (data.students) {
      await saveToIndexedDB('students', data.students);
      return data.students;
    }
  } catch (err) {
    console.warn('[API] Offline: falling back to IndexedDB students:', err.message);
  }
  const allStudents = await getAllFromIndexedDB('students');
  return classroomId ? allStudents.filter(s => s.classroom_id === classroomId) : allStudents;
};

export const createStudent = async (studentData) => {
  try {
    const res = await request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
    if (res.student) {
      await saveToIndexedDB('students', res.student);
      return res.student;
    }
  } catch (err) {
    console.warn('[API] Offline student creation:', err.message);
    const offlineId = `local-std-${Date.now()}`;
    const localStudent = { id: offlineId, ...studentData, is_offline: true };
    await saveToIndexedDB('students', localStudent);
    await queueOfflineMutation({
      operation: 'INSERT',
      table_name: 'students',
      record_id: offlineId,
      payload: studentData
    });
    return localStudent;
  }
};

export const bulkCreateStudents = async (classroomId, students) => {
  try {
    const res = await request('/students/bulk', {
      method: 'POST',
      body: JSON.stringify({ classroom_id: classroomId, students })
    });
    if (res.students) {
      await saveToIndexedDB('students', res.students);
      return res.students;
    }
  } catch (err) {
    console.warn('[API] Offline bulk student creation:', err.message);
    const localStudents = students.map((s, idx) => ({
      id: `local-std-${Date.now()}-${idx}`,
      classroom_id: classroomId,
      ...s,
      is_offline: true
    }));
    await saveToIndexedDB('students', localStudents);
    for (const s of localStudents) {
      await queueOfflineMutation({
        operation: 'INSERT',
        table_name: 'students',
        record_id: s.id,
        payload: s
      });
    }
    return localStudents;
  }
};

export const updateStudent = async (id, studentData) => {
  try {
    const res = await request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
    if (res.student) {
      await saveToIndexedDB('students', res.student);
      return res.student;
    }
  } catch (err) {
    console.warn('[API] Offline student update:', err.message);
    const existing = (await getFromIndexedDB('students', id)) || {};
    const updated = { ...existing, ...studentData, id };
    await saveToIndexedDB('students', updated);
    await queueOfflineMutation({
      operation: 'UPDATE',
      table_name: 'students',
      record_id: id,
      payload: studentData
    });
    return updated;
  }
};

export const deleteStudent = async (id) => {
  try {
    await request(`/students/${id}`, { method: 'DELETE' });
    await deleteFromIndexedDB('students', id);
  } catch (err) {
    console.warn('[API] Offline student deletion:', err.message);
    await deleteFromIndexedDB('students', id);
    await queueOfflineMutation({
      operation: 'DELETE',
      table_name: 'students',
      record_id: id,
      payload: {}
    });
  }
};

// ==========================================
// 4. STUDENT PROGRESS & ASSESSMENTS
// ==========================================
export const fetchStudentProgress = async (filter = {}) => {
  try {
    const params = new URLSearchParams();
    if (filter.classroom_id) params.append('classroom_id', filter.classroom_id);
    if (filter.student_id) params.append('student_id', filter.student_id);
    if (filter.status) params.append('status', filter.status);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const data = await request(`/progress${queryStr}`);
    if (data.progress) {
      await saveToIndexedDB('student_progress', data.progress);
      return data.progress;
    }
  } catch (err) {
    console.warn('[API] Offline: falling back to IndexedDB progress:', err.message);
  }
  const allProgress = await getAllFromIndexedDB('student_progress');
  return allProgress.filter(p => {
    if (filter.classroom_id && p.classroom_id !== filter.classroom_id) return false;
    if (filter.student_id && p.student_id !== filter.student_id) return false;
    if (filter.status && p.status !== filter.status) return false;
    return true;
  });
};

export const createStudentProgress = async (progressData) => {
  try {
    const res = await request('/progress', {
      method: 'POST',
      body: JSON.stringify(progressData)
    });
    if (res.progress) {
      await saveToIndexedDB('student_progress', res.progress);
      return res.progress;
    }
  } catch (err) {
    console.warn('[API] Offline progress creation:', err.message);
    const offlineId = `local-prog-${Date.now()}`;
    const localRecord = { id: offlineId, ...progressData, status: progressData.status || 'draft', is_offline: true };
    await saveToIndexedDB('student_progress', localRecord);
    await queueOfflineMutation({
      operation: 'INSERT',
      table_name: 'student_progress',
      record_id: offlineId,
      payload: progressData
    });
    return localRecord;
  }
};

export const updateStudentProgress = async (id, progressData) => {
  try {
    const res = await request(`/progress/${id}`, {
      method: 'PUT',
      body: JSON.stringify(progressData)
    });
    if (res.progress) {
      await saveToIndexedDB('student_progress', res.progress);
      return res.progress;
    }
  } catch (err) {
    console.warn('[API] Offline progress update:', err.message);
    const existing = (await getFromIndexedDB('student_progress', id)) || {};
    const updated = { ...existing, ...progressData, id };
    await saveToIndexedDB('student_progress', updated);
    await queueOfflineMutation({
      operation: 'UPDATE',
      table_name: 'student_progress',
      record_id: id,
      payload: progressData
    });
    return updated;
  }
};

export const approveStudentProgress = async (id) => {
  return await updateStudentProgress(id, { status: 'approved' });
};

// ==========================================
// 5. LESSON PLANS
// ==========================================
export const fetchLessonPlans = async (classroomId) => {
  try {
    const url = classroomId ? `/lessons?classroom_id=${classroomId}` : '/lessons';
    const data = await request(url);
    if (data.lessonPlans) {
      await saveToIndexedDB('lesson_plans', data.lessonPlans);
      return data.lessonPlans;
    }
  } catch (err) {
    console.warn('[API] Offline: falling back to IndexedDB lesson plans:', err.message);
  }
  const allLessons = await getAllFromIndexedDB('lesson_plans');
  return classroomId ? allLessons.filter(l => l.classroom_id === classroomId) : allLessons;
};

export const saveLessonPlan = async (lessonData) => {
  try {
    const res = await request('/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData)
    });
    if (res.lessonPlan) {
      await saveToIndexedDB('lesson_plans', res.lessonPlan);
      return res.lessonPlan;
    }
  } catch (err) {
    console.warn('[API] Offline lesson plan save:', err.message);
    const offlineId = `local-plan-${Date.now()}`;
    const localPlan = { id: offlineId, ...lessonData, status: lessonData.status || 'draft', is_offline: true };
    await saveToIndexedDB('lesson_plans', localPlan);
    await queueOfflineMutation({
      operation: 'INSERT',
      table_name: 'lesson_plans',
      record_id: offlineId,
      payload: lessonData
    });
    return localPlan;
  }
};

export const updateLessonPlan = async (id, lessonData) => {
  try {
    const res = await request(`/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData)
    });
    if (res.lessonPlan) {
      await saveToIndexedDB('lesson_plans', res.lessonPlan);
      return res.lessonPlan;
    }
  } catch (err) {
    console.warn('[API] Offline lesson plan update:', err.message);
    const existing = (await getFromIndexedDB('lesson_plans', id)) || {};
    const updated = { ...existing, ...lessonData, id };
    await saveToIndexedDB('lesson_plans', updated);
    await queueOfflineMutation({
      operation: 'UPDATE',
      table_name: 'lesson_plans',
      record_id: id,
      payload: lessonData
    });
    return updated;
  }
};

export const approveLessonPlan = async (id) => {
  return await updateLessonPlan(id, { status: 'approved' });
};

// ==========================================
// 6. TIMETABLE BLOCKS
// ==========================================
export const fetchTimetableBlocks = async (classroomId, dayOfWeek = 'Monday') => {
  try {
    const url = `/timetable?classroom_id=${classroomId}&day_of_week=${dayOfWeek}`;
    const data = await request(url);
    if (data.blocks) {
      await saveToIndexedDB('timetable_blocks', data.blocks);
      return data.blocks;
    }
  } catch (err) {
    console.warn('[API] Offline: falling back to IndexedDB timetable:', err.message);
  }
  const allBlocks = await getAllFromIndexedDB('timetable_blocks');
  return allBlocks.filter(b => b.classroom_id === classroomId && b.day_of_week === dayOfWeek);
};

export const saveTimetableBatch = async (classroomId, dayOfWeek, blocks) => {
  try {
    const res = await request('/timetable/batch', {
      method: 'POST',
      body: JSON.stringify({ classroom_id: classroomId, day_of_week: dayOfWeek, blocks })
    });
    if (res.blocks) {
      await saveToIndexedDB('timetable_blocks', res.blocks);
      return res.blocks;
    }
  } catch (err) {
    console.warn('[API] Offline timetable batch save:', err.message);
    const localBlocks = blocks.map((b, idx) => ({
      id: `local-blk-${Date.now()}-${idx}`,
      classroom_id: classroomId,
      day_of_week: dayOfWeek,
      ...b,
      status: 'draft',
      is_offline: true
    }));
    await saveToIndexedDB('timetable_blocks', localBlocks);
    await queueOfflineMutation({
      operation: 'INSERT',
      table_name: 'timetable_blocks',
      record_id: `batch-${Date.now()}`,
      payload: { classroom_id: classroomId, day_of_week: dayOfWeek, blocks }
    });
    return localBlocks;
  }
};

// ==========================================
// 7. GEMINI AI APIS (BACKEND-ONLY PROXIED)
// ==========================================
export const requestAILessonPlan = async (planParams) => {
  try {
    return await request('/ai/lesson-plan', {
      method: 'POST',
      body: JSON.stringify(planParams)
    });
  } catch (err) {
    console.warn('[API] AI request network error, utilizing client-side pedagogical scheduler:', err.message);
    const { generateClientSchedule } = await import('./scheduler');
    const schedule = generateClientSchedule({
      grades: planParams.grades,
      durationMinutes: planParams.duration_minutes,
      topic: planParams.topic,
      planningMode: planParams.planning_mode,
      materials: planParams.available_materials
    });

    const fallback = {
      title: `Multi-Grade ${planParams.subject}: ${planParams.topic} (Pedagogical Draft)`,
      summary: `Structured ${planParams.duration_minutes}-minute multi-grade plan for Grades ${planParams.grades.join(', ')} on "${planParams.topic}" using zero-cost rural TLM.`,
      common_theme: `Foundational concepts of ${planParams.topic} explored through observation, slate work, and peer collaboration.`,
      grade_plans: planParams.grades.map(g => ({
        grade: g,
        learning_objective: `Grade ${g} students understand key age-appropriate foundations of ${planParams.topic} through concrete manipulatives.`,
        key_concept: `Essential grade-level core principles of ${planParams.topic}.`,
        direct_instruction: `Teacher demonstrates ${planParams.topic} concepts using chalkboard sketches and real-world rural specimens.`,
        independent_activity: `Students copy and complete 3 slate practice drills based on ${planParams.topic}.`,
        peer_learning_activity: `Partner review using pebbles/seeds to test comprehension.`,
        zero_cost_tlm: (planParams.available_materials || []).slice(0, 3),
        formative_check: [
          `Identify 1 key fact about ${planParams.topic} on your slate`,
          `Solve the sample question written on chalkboard`
        ]
      })),
      rotation_schedule: schedule.blocks.map(b => ({
        time_range: `${b.startMinute}–${b.endMinute} min`,
        duration_minutes: b.durationMinutes,
        teacher_focus_grade: b.focusGrade,
        student_assignments: b.assignments.map(a => ({
          grade: a.grade,
          mode: a.mode,
          task: a.activity
        }))
      })),
      zero_cost_tlm: planParams.available_materials || ['Chalkboard', 'Slates & Chalk', 'Seeds / Pebbles'],
      remedial_suggestions: planParams.grades.map(g => ({
        grade: g,
        recommendation: `Provide extra slate diagramming and pair struggling students with a peer mentor.`
      })),
      status: 'draft'
    };

    return {
      success: true,
      source: 'client-scheduler-fallback',
      plan: fallback,
      fallbackPlan: fallback
    };
  }
};

export const requestAIAssessment = async (assessmentParams) => {
  return await request('/ai/assess-progress', {
    method: 'POST',
    body: JSON.stringify(assessmentParams)
  });
};

// ==========================================
// 8. ATTENDANCE API
// ==========================================
export const fetchAttendance = async (classroomId, date = null, grade = null) => {
  try {
    const params = new URLSearchParams({ classroom_id: classroomId });
    if (date) params.append('date', date);
    if (grade) params.append('grade', grade);

    const res = await request(`/attendance?${params.toString()}`);
    return res.records || [];
  } catch (err) {
    console.warn('[API] Offline or error fetching attendance:', err.message);
    const allRecords = (await getAllFromIndexedDB('attendance_records')) || [];
    return allRecords.filter(r => {
      if (r.classroom_id !== classroomId) return false;
      if (date && r.date !== date) return false;
      return true;
    });
  }
};

export const fetchAttendanceStats = async (classroomId, date = null) => {
  try {
    const params = new URLSearchParams({ classroom_id: classroomId });
    if (date) params.append('date', date);

    return await request(`/attendance/stats?${params.toString()}`);
  } catch (err) {
    console.warn('[API] Failed to fetch live attendance stats:', err.message);
    return null;
  }
};

export const saveAttendanceBatch = async (classroomId, date, entries) => {
  try {
    const res = await request('/attendance/batch', {
      method: 'POST',
      body: JSON.stringify({ classroom_id: classroomId, date, entries })
    });
    if (res.records) {
      await saveToIndexedDB('attendance_records', res.records);
    }
    return res;
  } catch (err) {
    console.warn('[API] Offline attendance batch save:', err.message);
    const localRecords = entries.map((entry, idx) => ({
      id: `local-att-${Date.now()}-${idx}`,
      classroom_id: classroomId,
      student_id: entry.student_id,
      date,
      status: entry.status || 'present',
      notes: entry.notes || null,
      is_offline: true
    }));
    await saveToIndexedDB('attendance_records', localRecords);
    await queueOfflineMutation({
      operation: 'INSERT',
      table_name: 'attendance_records',
      record_id: `batch-att-${Date.now()}`,
      payload: { classroom_id: classroomId, date, entries }
    });
    return { success: true, count: localRecords.length, records: localRecords };
  }
};

// ==========================================
// 9. PROFILE API
// ==========================================
export const fetchProfile = async () => {
  return await request('/profile');
};

export const updateProfile = async (profileData) => {
  return await request('/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
};

// ==========================================
// 10. OFFLINE SYNC RECONCILIATION
// ==========================================
export const syncOfflineQueue = async () => {
  const pendingItems = await getPendingSyncQueue();
  if (!pendingItems || pendingItems.length === 0) {
    return { success: true, processed: 0 };
  }

  try {
    const res = await request('/sync', {
      method: 'POST',
      body: JSON.stringify({ items: pendingItems })
    });

    if (res.results) {
      for (const itemResult of res.results) {
        if (itemResult.status === 'synced') {
          await removeSyncQueueItem(itemResult.id);
        }
      }
    }
    return res;
  } catch (err) {
    console.error('[API Sync] Failed to sync offline queue:', err.message);
    return { success: false, error: err.message };
  }
};

// ==========================================
// 11. ASSIGNMENTS & WORKSHEETS
// ==========================================
export const fetchAssignments = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await request(`/assignments${query ? `?${query}` : ''}`);
    if (res.assignments) {
      await saveToIndexedDB('assignments', res.assignments);
      return res.assignments;
    }
  } catch (err) {
    console.warn('[API] Offline assignments fetch:', err.message);
  }
  return await getAllFromIndexedDB('assignments');
};

export const createAssignment = async (assignmentData) => {
  try {
    const res = await request('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
    if (res.assignment) {
      await saveToIndexedDB('assignments', res.assignment);
      return res.assignment;
    }
  } catch (err) {
    console.warn('[API] Offline assignment creation:', err.message);
    const offlineId = `local-assign-${Date.now()}`;
    const localAssign = { id: offlineId, ...assignmentData, is_offline: true };
    await saveToIndexedDB('assignments', localAssign);
    await queueOfflineMutation({
      operation: 'INSERT',
      table_name: 'assignments',
      record_id: offlineId,
      payload: assignmentData
    });
    return localAssign;
  }
};

export const deleteAssignment = async (id) => {
  try {
    await request(`/assignments/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('[API] Offline delete assignment:', err.message);
    await queueOfflineMutation({
      operation: 'DELETE',
      table_name: 'assignments',
      record_id: id,
      payload: {}
    });
  }
  await deleteFromIndexedDB('assignments', id);
  return { success: true };
};

// ==========================================
// 12. ADVANCED AI SERVICES
// ==========================================
export const requestAIWorksheet = async (worksheetRequest) => {
  return await request('/ai/worksheet', {
    method: 'POST',
    body: JSON.stringify(worksheetRequest)
  });
};

export const extractTextbookPhoto = async (imageBase64, mimeType = 'image/jpeg', classroomId = null) => {
  return await request('/ai/extract-textbook', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64, mime_type: mimeType, classroom_id: classroomId })
  });
};

export const chatWithAIAssistant = async (messages, classroomContext = null, language = 'en') => {
  return await request('/ai/assistant-chat', {
    method: 'POST',
    body: JSON.stringify({ messages, classroom_context: classroomContext, language })
  });
};

export const fetchAIStatus = async () => {
  try {
    return await request('/ai/status');
  } catch (err) {
    return { gemini_configured: false };
  }
};

export const configureGeminiKey = async (apiKey) => {
  return await request('/ai/configure-key', {
    method: 'POST',
    body: JSON.stringify({ apiKey })
  });
};

// ==========================================
// 13. SARVAM AI REGIONAL TRANSLATION SERVICES
// ==========================================
export const translateWithSarvamAPI = async ({ text, target_language = 'hi', source_language = 'en' }) => {
  return await request('/translate', {
    method: 'POST',
    body: JSON.stringify({ text, target_language, source_language })
  });
};

export const translateBatchWithSarvamAPI = async ({ texts, target_language = 'hi', source_language = 'en' }) => {
  return await request('/translate', {
    method: 'POST',
    body: JSON.stringify({ texts, target_language, source_language })
  });
};

export const fetchTranslatedBundleAPI = async (bundle, target_language = 'hi') => {
  return await request('/translate/bundle', {
    method: 'POST',
    body: JSON.stringify({ bundle, target_language })
  });
};

export const fetchSarvamStatusAPI = async () => {
  try {
    return await request('/translate/status');
  } catch (err) {
    return { configured: false, provider: 'sarvam-ai' };
  }
};

export const configureSarvamKeyAPI = async (sarvam_api_key) => {
  return await request('/translate/config', {
    method: 'POST',
    body: JSON.stringify({ sarvam_api_key })
  });
};



