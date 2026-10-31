import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createTimetableBlockSchema, updateTimetableBlockSchema } from '../schemas/timetable.schema.js';
import { generateMathematicalSchedule } from '../services/scheduler.service.js';

const router = Router();

// List timetable blocks for a classroom & day
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('timetable_blocks')
      .select('*')
      .eq('teacher_id', req.user.id);

    if (req.query.classroom_id) {
      query = query.eq('classroom_id', req.query.classroom_id);
    }
    if (req.query.day_of_week) {
      query = query.eq('day_of_week', req.query.day_of_week);
    }

    const { data, error } = await query.order('block_index', { ascending: true });
    if (error) throw error;
    res.json({ success: true, blocks: data || [] });
  } catch (err) {
    next(err);
  }
});

// Generate collision-free mathematical timetable preview
router.post('/generate-schedule', requireAuth, async (req, res, next) => {
  try {
    const { grades, duration_minutes = 60, topic = 'General Study', planning_mode = 'common_theme', materials } = req.body;
    
    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ success: false, error: 'grades array is required' });
    }

    const schedule = generateMathematicalSchedule({
      grades,
      durationMinutes: duration_minutes,
      topic,
      planningMode: planning_mode,
      materials
    });

    res.json({ success: true, schedule });
  } catch (err) {
    next(err);
  }
});

// Create/Save a timetable block
router.post('/', requireAuth, validateBody(createTimetableBlockSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const payload = {
      ...req.body,
      teacher_id: req.user.id
    };

    const { data, error } = await supabase
      .from('timetable_blocks')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, block: data });
  } catch (err) {
    next(err);
  }
});

// Save entire array of generated timetable blocks for a classroom & day
router.post('/batch', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { classroom_id, day_of_week, blocks } = req.body;

    if (!classroom_id || !day_of_week || !Array.isArray(blocks)) {
      return res.status(400).json({ success: false, error: 'classroom_id, day_of_week, and blocks array are required' });
    }

    // First clear existing blocks for that day and classroom to prevent duplicates
    await supabase
      .from('timetable_blocks')
      .delete()
      .eq('classroom_id', classroom_id)
      .eq('day_of_week', day_of_week)
      .eq('teacher_id', req.user.id);

    const records = blocks.map(b => ({
      classroom_id,
      teacher_id: req.user.id,
      lesson_plan_id: b.lesson_plan_id || null,
      day_of_week,
      block_index: b.blockIndex ?? b.block_index ?? 0,
      start_minute: b.startMinute ?? b.start_minute ?? 0,
      end_minute: b.endMinute ?? b.end_minute ?? 0,
      duration_minutes: b.durationMinutes ?? b.duration_minutes ?? 15,
      title: b.title,
      focus_grade: b.focusGrade || b.focus_grade || 'All Grades',
      assignments: b.assignments || [],
      is_transition: Boolean(b.isTransition ?? b.is_transition),
      status: 'draft'
    }));

    const { data, error } = await supabase
      .from('timetable_blocks')
      .insert(records)
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, count: data?.length || 0, blocks: data });
  } catch (err) {
    next(err);
  }
});

// Update a block
router.put('/:id', requireAuth, validateBody(updateTimetableBlockSchema), async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('timetable_blocks')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, block: data });
  } catch (err) {
    next(err);
  }
});

// Explicitly approve block
router.post('/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('timetable_blocks')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Block approved', block: data });
  } catch (err) {
    next(err);
  }
});

// Delete a block
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('timetable_blocks')
      .delete()
      .eq('id', req.params.id)
      .eq('teacher_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Timetable block deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

