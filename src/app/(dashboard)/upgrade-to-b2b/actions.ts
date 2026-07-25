'use server'

import { cookies } from 'next/headers'
import { getSupabase } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'

export interface B2BUpgradeRequest {
  businessName: string
  taxId: string
  businessAddress?: string
  creditCheckConsented: boolean
}

export interface B2BUpgradeResponse {
  success: boolean
  error?: string
  requestId?: string
}

/**
 * Restore a request-scoped Supabase session from Supabase auth cookies.
 * Mirrors the cookie-based fallback used by verifyAdminAccess()
 * (src/lib/admin/auth.ts) since this repo does not use @supabase/ssr.
 */
async function getSessionScopedSupabase() {
  const supabase = getSupabase({
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }

  return supabase
}

export async function submitB2BUpgradeRequest(
  data: B2BUpgradeRequest
): Promise<B2BUpgradeResponse> {
  try {
    const supabase = await getSessionScopedSupabase()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!data.businessName || !data.taxId) {
      return { success: false, error: 'Business name and tax ID are required' }
    }

    if (!data.creditCheckConsented) {
      return { success: false, error: 'Credit check consent is required' }
    }

    const { data: existingRequest } = await supabase
      .from('b2b_upgrade_requests' as any)
      .select('id, status')
      .eq('user_id', user.id)
      .single() as any

    if (existingRequest?.status === 'pending') {
      return {
        success: false,
        error: 'You already have a pending B2B upgrade request. Please wait for our review.',
      }
    }

    if (existingRequest?.status === 'approved') {
      return {
        success: false,
        error: 'Your account is already B2B. Please check your tier settings.',
      }
    }

    const { data: createdRequest, error: insertError } = await supabase
      .from('b2b_upgrade_requests' as any)
      .insert({
        user_id: user.id,
        business_name: data.businessName,
        tax_id: data.taxId,
        business_address: data.businessAddress || null,
        credit_check_consented: data.creditCheckConsented,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single() as any

    if (insertError || !createdRequest) {
      Sentry.captureException(insertError)
      return { success: false, error: 'Failed to create upgrade request' }
    }

    return { success: true, requestId: createdRequest.id }
  } catch (error) {
    Sentry.captureException(error)
    console.error('submitB2BUpgradeRequest error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getB2BUpgradeStatus(
  userId: string
): Promise<{ status: 'pending' | 'approved' | 'rejected'; requestedAt: string; reason?: string } | null> {
  try {
    const supabase = await getSessionScopedSupabase()

    const { data: request } = await supabase
      .from('b2b_upgrade_requests' as any)
      .select('status, created_at, rejection_reason')
      .eq('user_id', userId)
      .single() as any

    if (!request) return null

    return {
      status: request.status,
      requestedAt: request.created_at,
      reason: request.rejection_reason || undefined,
    }
  } catch (error) {
    Sentry.captureException(error)
    return null
  }
}
