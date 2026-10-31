import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/profile - Fetch authenticated teacher's profile
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is single row not found
      throw error;
    }

    if (!data) {
      // Create profile fallback if trigger hadn't fired yet
      const fallbackProfile = {
        id: req.user.id,
        full_name: req.user.user_metadata?.full_name || req.user.email?.split('@')[0] || 'Teacher',
        email: req.user.email,
        school_name: req.user.user_metadata?.school_name || 'Govt Primary School',
        preferred_language: req.user.user_metadata?.preferred_language || 'en'
      };

      const { data: created, error: insertErr } = await supabase
        .from('profiles')
        .insert(fallbackProfile)
        .select()
        .single();

      if (insertErr) throw insertErr;
      return res.json({ success: true, profile: created });
    }

    res.json({ success: true, profile: data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile - Update teacher's profile (name, school, preferred_language, district, state)
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { full_name, school_name, district, state, preferred_language } = req.body;

    const updates = {
      ...(full_name !== undefined && { full_name }),
      ...(school_name !== undefined && { school_name }),
      ...(district !== undefined && { district }),
      ...(state !== undefined && { state }),
      ...(preferred_language !== undefined && { preferred_language }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err) {
    next(err);
  }
});

export default router;

