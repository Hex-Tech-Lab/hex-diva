/**
 * Admin Authentication & Authorization
 * Verifies user email against ADMIN_EMAIL_WHITELIST environment variable
 */

import { NextRequest } from 'next/server';
import { getSupabase, getSupabaseAdmin } from '@/lib/db';

export interface AdminCheckResult {
  isAdmin: boolean;
  email?: string;
  verifiedAt?: Date;
  error?: string;
}

/**
 * Parse ADMIN_EMAIL_WHITELIST from environment
 * Format: "admin1@example.com,admin2@example.com"
 */
function getAdminWhitelist(): string[] {
  const whitelist = process.env.ADMIN_EMAIL_WHITELIST || '';
  return whitelist
    .split(',')
    .map((email) => email.toLowerCase().trim())
    .filter((email) => email.length > 0);
}

/**
 * Verify if email is admin
 */
function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const whitelist = getAdminWhitelist();
  return whitelist.includes(email.toLowerCase().trim());
}

/**
 * Verify admin access from request (checks Supabase auth + email whitelist)
 * Returns admin status and email if authenticated via Bearer token or session
 * @param request Optional NextRequest to extract Bearer token from Authorization header
 */
export async function verifyAdminAccess(
  request?: NextRequest
): Promise<AdminCheckResult> {
  try {
    // Try Bearer token first if request provided
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const supabaseAdmin = getSupabaseAdmin();

        try {
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

          if (!error && user?.email) {
            const isAdmin = isEmailAdmin(user.email);
            return {
              isAdmin,
              email: user.email,
              verifiedAt: new Date(),
            };
          }
        } catch (authErr) {
          // Don't log the full error object - may contain sensitive data like token fragments
          // Log only the error type to avoid exposing JWT or authentication details
          if (authErr instanceof Error) {
            console.error(`Bearer auth verification failed: ${authErr.constructor.name}`);
          } else {
            console.error('Bearer auth verification failed: unknown error');
          }
          // Fall through to session-based auth
        }
      }
    }

    // Fallback to session-based auth (request-scoped client per Law #2)
    const supabase = getSupabase({
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Restore session from cookies if request provided
    if (request) {
      const accessToken = request.cookies.get('sb-access-token')?.value;
      const refreshToken = request.cookies.get('sb-refresh-token')?.value;

      if (accessToken && refreshToken) {
        try {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } catch (sessionError) {
          console.error('Failed to restore session from cookies');
        }
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return {
        isAdmin: false,
        error: 'No authenticated user found',
      };
    }

    const isAdmin = isEmailAdmin(user.email);
    return {
      isAdmin,
      email: user.email,
      verifiedAt: new Date(),
    };
  } catch (error) {
    // Sanitize error logging to avoid exposing sensitive authentication details
    if (error instanceof Error) {
      console.error(`Admin verification error: ${error.constructor.name}`);
    } else {
      console.error('Admin verification error: unknown error');
    }
    return {
      isAdmin: false,
      error: 'Verification failed',
    };
  }
}

/**
 * Client-side check to see if current user is admin
 * Requires being called from a browser context (must have Supabase session)
 */
export async function checkAdminStatus(): Promise<AdminCheckResult> {
  try {
    const supabase = getSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return {
        isAdmin: false,
        error: 'Not authenticated',
      };
    }

    const isAdmin = isEmailAdmin(user.email);
    return {
      isAdmin,
      email: user.email,
      verifiedAt: new Date(),
    };
  } catch (error) {
    // Sanitize error logging to avoid exposing sensitive authentication details
    if (error instanceof Error) {
      console.error(`Admin status check error: ${error.constructor.name}`);
    } else {
      console.error('Admin status check error: unknown error');
    }
    return {
      isAdmin: false,
      error: 'Check failed',
    };
  }
}

/**
 * Check if email is admin (for validation without full auth)
 */
export function isAdminEmail(email: string): boolean {
  return isEmailAdmin(email);
}

/**
 * Get admin whitelist (for debugging)
 */
export function getAdminEmails(): string[] {
  return getAdminWhitelist();
}
