import { getSupabase } from './db';

export async function getCurrentUser() {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function signUp(email: string, password: string, displayName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}
