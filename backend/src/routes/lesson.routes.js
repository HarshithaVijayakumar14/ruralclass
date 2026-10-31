import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createLessonPlanSchema, updateLessonPlanSchema } from '../schemas/lesson.schema.js';

const router = Router();

// List lesson plans (optionally filtered by classroom_id or status)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('lesson_plans')
      .select('*')
      .eq('teacher_id', req.user.id);

    if (req.query.classroom_id) {
      query = query.eq('classroom_id', req.query.classroom_id);
    }
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, lessonPlans: data || [] });
  } catch (err) {
    next(err);
  }
});

// Get a single lesson plan
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lesson_plans')
      .select('*')
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .single();

    if (error) return res.status(404).json({ success: false, error: 'Lesson plan not found' });
    res.json({ success: true, lessonPlan: data });
  } catch (err) {
    next(err);
  }
});

// Create/Save a lesson plan (starts as 'draft' by default)
router.post('/', requireAuth, validateBody(createLessonPlanSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const payload = {
      ...req.body,
      teacher_id: req.user.id,
      status: req.body.status || 'draft'
    };

    const { data, error } = await supabase
      .from('lesson_plans')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, lessonPlan: data });
  } catch (err) {
    next(err);
  }
});

// Update lesson plan
router.put('/:id', requireAuth, validateBody(updateLessonPlanSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lesson_plans')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, lessonPlan: data });
  } catch (err) {
    next(err);
  }
});

// Teacher Explicit Approval Endpoint for a Lesson Plan
router.post('/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lesson_plans')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Lesson plan explicitly approved by teacher', lessonPlan: data });
  } catch (err) {
    next(err);
  }
});

// Delete lesson plan
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('lesson_plans')
      .delete()
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Lesson plan deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

