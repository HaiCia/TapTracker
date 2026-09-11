import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const clientCreator = typeof createSupabaseClient === 'function'
  ? createSupabaseClient
  : (typeof window !== 'undefined' && window.supabase && window.supabase.createClient
      ? window.supabase.createClient
      : (typeof supabase !== 'undefined' && supabase.createClient ? supabase.createClient : null));

export const supabaseClient = clientCreator
  ? clientCreator(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

