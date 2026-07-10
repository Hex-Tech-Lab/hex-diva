import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseInstance: ReturnType<typeof createClient> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

function ensureSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }
}

// Client-side Supabase client (lazy initialization)
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get: (target, prop) => {
    if (!supabaseInstance) {
      ensureSupabase();
      supabaseInstance = createClient(supabaseUrl!, supabaseKey!);
    }
    return (supabaseInstance as any)[prop];
  },
});

// Server-side Supabase client with service role (lazy initialization)
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get: (target, prop) => {
    if (!supabaseAdminInstance) {
      ensureSupabase();
      supabaseAdminInstance = createClient(supabaseUrl!, supabaseServiceKey || supabaseKey!);
    }
    return (supabaseAdminInstance as any)[prop];
  },
});

// Export types for convenience
export type { User, Session } from '@supabase/supabase-js';
