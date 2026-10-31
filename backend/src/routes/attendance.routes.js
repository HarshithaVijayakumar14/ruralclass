import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/attendance - Fetch attendance records for a classroom and optional date/grade
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { classroom_id, date, grade } = req.query;
    if (!classroom_id) {
      return res.status(400).json({ success: false, error: 'classroom_id query parameter is required' });
    }

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('attendance_records')
      .select('*, students!inner(id, name, grade, roll_number)')
      .eq('classroom_id', classroom_id)
      .eq('teacher_id', req.user.id);

    if (date) {
      query = query.eq('date', date);
    }
    if (grade) {
      query = query.eq('students.grade', parseInt(grade, 10));
    }

    query = query.order('date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, records: data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/stats - Calculate real attendance stats for a classroom
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const { classroom_id, date } = req.query;
    if (!classroom_id) {
      return res.status(400).json({ success: false, error: 'classroom_id is required' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const supabase = getSupabaseAdmin();

    // 1. Fetch total enrolled students in classroom
    const { data: students, error: stdErr } = await supabase
      .from('students')
      .select('id, grade')
      .eq('classroom_id', classroom_id)
      .eq('teacher_id', req.user.id);

    if (stdErr) throw stdErr;

    const totalStudents = students?.length || 0;

    // 2. Fetch attendance records for target date
    const { data: records, error: recErr } = await supabase
      .from('attendance_records')
      .select('id, student_id, status')
      .eq('classroom_id', classroom_id)
      .eq('teacher_id', req.user.id)
      .eq('date', targetDate);

    if (recErr) throw recErr;

    if (!records || records.length === 0) {
      return res.json({
        success: true,
        has_recorded: false,
        date: targetDate,
        total_students: totalStudents,
        recorded_count: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        percentage: null,
        message: 'No attendance recorded'
      });
    }

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const recordedCount = records.length;
    const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    res.json({
      success: true,
      has_recorded: true,
      date: targetDate,
      total_students: totalStudents,
      recorded_count: recordedCount,
      present_count: presentCount,
      absent_count: absentCount,
      late_count: lateCount,
      percentage
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/attendance/batch - Record or update attendance for multiple students
router.post('/batch', requireAuth, async (req, res, next) => {
  try {
    const { classroom_id, date, entries } = req.body;
    if (!classroom_id || !date || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, error: 'classroom_id, date, and entries array are required' });
    }

    const supabase = getSupabaseAdmin();
    const rows = entries.map(entry => ({
      teacher_id: req.user.id,
      classroom_id,
      student_id: entry.student_id,
      date,
      status: entry.status || 'present',
      notes: entry.notes || null,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(rows, { onConflict: 'student_id,date' })
      .select();

    if (error) throw error;

    // Also update student's attendance_status for quick filtering
    for (const entry of entries) {
      await supabase
        .from('students')
        .update({ attendance_status: entry.status || 'present' })
        .eq('id', entry.student_id)
        .eq('teacher_id', req.user.id);
    }

    res.json({ success: true, count: data?.length || 0, records: data });
  } catch (err) {
    next(err);
  }
});

export default router;

