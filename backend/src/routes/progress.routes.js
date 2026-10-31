import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createProgressSchema, updateProgressSchema } from '../schemas/progress.schema.js';

const router = Router();

// List progress records (optionally filtered by student_id or classroom_id)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('student_progress')
      .select('*, students(name, grade, roll_number)')
      .eq('teacher_id', req.user.id);

    if (req.query.student_id) {
      query = query.eq('student_id', req.query.student_id);
    }
    if (req.query.classroom_id) {
      query = query.eq('classroom_id', req.query.classroom_id);
    }
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }

    const { data, error } = await query.order('assessment_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, progress: data || [] });
  } catch (err) {
    next(err);
  }
});

// Create new progress / assessment record (default status is 'draft')
router.post('/', requireAuth, validateBody(createProgressSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    // Guarantee teacher tenancy and default draft status
    const payload = {
      ...req.body,
      teacher_id: req.user.id,
      status: req.body.status || 'draft'
    };

    const { data, error } = await supabase
      .from('student_progress')
      .insert(payload)
      .select('*, students(name, grade, roll_number)')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, progress: data });
  } catch (err) {
    next(err);
  }
});

// Update progress record (e.g. Teacher Approves an AI Draft Assessment)
router.put('/:id', requireAuth, validateBody(updateProgressSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('student_progress')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select('*, students(name, grade, roll_number)')
      .single();

    if (error) throw error;
    res.json({ success: true, progress: data });
  } catch (err) {
    next(err);
  }
});

// Teacher explicit approval endpoint
router.post('/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('student_progress')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select('*, students(name, grade, roll_number)')
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Assessment explicitly approved by teacher', progress: data });
  } catch (err) {
    next(err);
  }
});

// Delete progress record
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('student_progress')
      .delete()
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Progress record removed' });
  } catch (err) {
    next(err);
  }
});

export default router;

