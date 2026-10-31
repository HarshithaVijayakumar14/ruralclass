import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createAssignmentSchema, updateAssignmentSchema } from '../schemas/assignment.schema.js';

const router = Router();

// List assignments (optionally filtered by classroom_id or grade)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('assignments')
      .select('*')
      .eq('teacher_id', req.user.id);

    if (req.query.classroom_id) {
      query = query.eq('classroom_id', req.query.classroom_id);
    }
    if (req.query.grade) {
      query = query.eq('grade', parseInt(req.query.grade, 10));
    }
    if (req.query.assignment_type) {
      query = query.eq('assignment_type', req.query.assignment_type);
    }

    const { data, error } = await query.order('assigned_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, assignments: data || [] });
  } catch (err) {
    next(err);
  }
});

// Get a single assignment
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .single();

    if (error) return res.status(404).json({ success: false, error: 'Assignment not found' });
    res.json({ success: true, assignment: data });
  } catch (err) {
    next(err);
  }
});

// Create new assignment / worksheet
router.post('/', requireAuth, validateBody(createAssignmentSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const payload = {
      ...req.body,
      teacher_id: req.user.id
    };

    const { data, error } = await supabase
      .from('assignments')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, assignment: data });
  } catch (err) {
    next(err);
  }
});

// Update assignment
router.put('/:id', requireAuth, validateBody(updateAssignmentSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('assignments')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, assignment: data });
  } catch (err) {
    next(err);
  }
});

// Delete assignment
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

