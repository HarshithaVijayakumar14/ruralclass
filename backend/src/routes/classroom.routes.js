import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createClassroomSchema, updateClassroomSchema } from '../schemas/classroom.schema.js';

const router = Router();

// List all classrooms belonging to the logged-in teacher
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, classrooms: data || [] });
  } catch (err) {
    next(err);
  }
});

// Get a single classroom by ID
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .single();

    if (error) return res.status(404).json({ success: false, error: 'Classroom not found' });
    res.json({ success: true, classroom: data });
  } catch (err) {
    next(err);
  }
});

// Create a new classroom
router.post('/', requireAuth, validateBody(createClassroomSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const payload = {
      ...req.body,
      teacher_id: req.user.id
    };

    const { data, error } = await supabase
      .from('classrooms')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, classroom: data });
  } catch (err) {
    next(err);
  }
});

// Update an existing classroom
router.put('/:id', requireAuth, validateBody(updateClassroomSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('classrooms')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, classroom: data });
  } catch (err) {
    next(err);
  }
});

// Delete a classroom
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Classroom deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

