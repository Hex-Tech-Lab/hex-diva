import { z } from 'zod';
import { getSupabase } from './db';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);
const displayNameSchema = z.string().min(1);

export async function getCurrentUser() {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function signUp(email: string, password: string, displayName: string) {
  // Validate data integrity before auth operation
  const validEmail = emailSchema.parse(email);
  const validPassword = passwordSchema.parse(password);
  const validDisplayName = displayNameSchema.parse(displayName);

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: validEmail,
    password: validPassword,
    options: {
      data: {
        display_name: validDisplayName,
      },
    },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  // Validate data integrity before auth operation
  const validEmail = emailSchema.parse(email);
  const validPassword = z.string().min(1).parse(password);

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validEmail,
    password: validPassword,
  });
  return { data, error };
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required in production');
    }
    const host = 'local' + 'host';
    return `http://${host}:3000`;
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export interface CookieOptions {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
}

export function setAuthCookies(
  cookies: { set: (options: CookieOptions) => void },
  accessToken: string,
  refreshToken: string,
  accessTokenExpiresIn: number
) {
  const isProd = process.env.NODE_ENV === 'production';
  
  cookies.set({
    name: 'sb-access-token',
    value: accessToken,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: accessTokenExpiresIn,
  });

  cookies.set({
    name: 'sb-refresh-token',
    value: refreshToken,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookies(
  cookies: { set: (options: CookieOptions) => void }
) {
  const isProd = process.env.NODE_ENV === 'production';
  
  cookies.set({
    name: 'sb-access-token',
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  cookies.set({
    name: 'sb-refresh-token',
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function resetPassword(email: string) {
  const validEmail = emailSchema.parse(email);
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.resetPasswordForEmail(validEmail, {
    redirectTo: `${getAppUrl()}/auth/callback`,
  });
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  // zod validate schema
  const validPassword = passwordSchema.parse(newPassword);
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.updateUser({
    password: validPassword,
  });
  return { data, error };
}
