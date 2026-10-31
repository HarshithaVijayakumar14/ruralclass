import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 20
  );
};

// Create client if configured, otherwise provide null or fallback client
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

/**
 * Helper to subscribe to Supabase Realtime table changes
 * Automatically cleans up on unmount
 */
export const subscribeToTable = ({ table, filter, onInsert, onUpdate, onDelete }) => {
  if (!supabase) return () => {};

  const channelName = `public:${table}${filter ? `:${filter}` : ''}`;
  const channel = supabase.channel(channelName);

  if (onInsert) {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, payload => {
      onInsert(payload.new);
    });
  }
  if (onUpdate) {
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, payload => {
      onUpdate(payload.new);
    });
  }
  if (onDelete) {
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table, filter }, payload => {
      onDelete(payload.old);
    });
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[Supabase Realtime] Subscribed to ${table}`);
    }
  });

  // Return unsubscribe cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
};

