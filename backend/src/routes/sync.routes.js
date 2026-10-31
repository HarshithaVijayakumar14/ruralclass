import { Router } from 'express';
import { getSupabaseAdmin } from '../services/supabase.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/sync
 * Reconciles offline queued mutations from client IndexedDB with Supabase PostgreSQL
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, processed: 0, results: [] });
    }

    const supabase = getSupabaseAdmin();
    const results = [];

    for (const item of items) {
      const { id, operation, table_name, record_id, payload } = item;
      try {
        let resultData = null;

        if (operation === 'INSERT') {
          const insertPayload = { ...payload, teacher_id: req.user.id };
          const { data, error } = await supabase.from(table_name).insert(insertPayload).select();
          if (error) throw error;
          resultData = data;
        } else if (operation === 'UPDATE') {
          const { data, error } = await supabase.from(table_name).update(payload).eq('id', record_id).eq('teacher_id', req.user.id).select();
          if (error) throw error;
          resultData = data;
        } else if (operation === 'DELETE') {
          const { error } = await supabase.from(table_name).delete().eq('id', record_id).eq('teacher_id', req.user.id);
          if (error) throw error;
          resultData = { deleted: true };
        }

        // Record in server sync_queue audit
        await supabase.from('sync_queue').insert({
          teacher_id: req.user.id,
          operation,
          table_name,
          record_id: String(record_id),
          payload,
          status: 'synced',
          synced_at: new Date().toISOString()
        });

        results.push({ id, status: 'synced', data: resultData });
      } catch (itemErr) {
        console.error(`[Sync] Failed item ${item.id}:`, itemErr.message);
        
        await supabase.from('sync_queue').insert({
          teacher_id: req.user.id,
          operation,
          table_name,
          record_id: String(record_id),
          payload,
          status: 'failed',
          error_message: itemErr.message
        });

        results.push({ id, status: 'failed', error: itemErr.message });
      }
    }

    res.json({
      success: true,
      processed: results.length,
      syncedCount: results.filter(r => r.status === 'synced').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      results
    });
  } catch (err) {
    next(err);
  }
});

export default router;

