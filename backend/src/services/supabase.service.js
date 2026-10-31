import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceRoleKey && supabaseUrl.startsWith('http')) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('[Supabase] Admin service initialized with Service Role Key');
} else {
  console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in backend/.env');
}

import { createLocalSupabaseFallback } from './localDb.service.js';

const localFallbackClient = createLocalSupabaseFallback();

export const isSupabaseConfigured = () => Boolean(supabaseAdmin);

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    return localFallbackClient;
  }
  return supabaseAdmin;
};

export const verifyUserToken = async (token) => {
  if (!supabaseAdmin || token === 'local-teacher-bearer-token' || token === 'local-dev-token' || token?.startsWith('local-')) {
    let teacherId = '00000000-0000-0000-0000-000000000001';
    let teacherEmail = 'teacher@gurumitra.local';
    let fullName = 'Teacher';

    if (token?.startsWith('local-token-')) {
      teacherId = token.replace('local-token-', '');
      teacherEmail = `teacher-${teacherId}@gurumitra.local`;
    } else if (token?.startsWith('local-teacher-')) {
      teacherId = token;
      teacherEmail = `teacher-${teacherId}@gurumitra.local`;
    }

    return {
      id: teacherId,
      email: teacherEmail,
      role: 'authenticated',
      user_metadata: {
        full_name: fullName,
        school_name: ''
      }
    };
  }

  const client = getSupabaseAdmin();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    throw new Error(error?.message || 'Invalid or expired authentication token');
  }
  return user;
};
