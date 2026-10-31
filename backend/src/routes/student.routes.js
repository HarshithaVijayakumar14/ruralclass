import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createStudentSchema, updateStudentSchema, bulkCreateStudentsSchema } from '../schemas/student.schema.js';

const router = Router();

// List students (optionally filtered by classroom_id)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('students')
      .select('*')
      .eq('teacher_id', req.user.id);

    if (req.query.classroom_id) {
      query = query.eq('classroom_id', req.query.classroom_id);
    }

    const { data, error } = await query.order('grade', { ascending: true }).order('name', { ascending: true });
    if (error) throw error;
    res.json({ success: true, students: data || [] });
  } catch (err) {
    next(err);
  }
});

// Create single student
router.post('/', requireAuth, validateBody(createStudentSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const payload = {
      ...req.body,
      teacher_id: req.user.id
    };

    const { data, error } = await supabase
      .from('students')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, student: data });
  } catch (err) {
    next(err);
  }
});

// Bulk create students for a classroom roster
router.post('/bulk', requireAuth, validateBody(bulkCreateStudentsSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { classroom_id, students } = req.body;

    const records = students.map(s => ({
      ...s,
      classroom_id,
      teacher_id: req.user.id
    }));

    const { data, error } = await supabase
      .from('students')
      .insert(records)
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, count: data?.length || 0, students: data });
  } catch (err) {
    next(err);
  }
});

// Update student record (e.g., attendance, levels, notes)
router.put('/:id', requireAuth, validateBody(updateStudentSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('students')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, student: data });
  } catch (err) {
    next(err);
  }
});

// Delete student
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Student removed successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

