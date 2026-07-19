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
 * Submit B2B upgrade request from authenticated user
 * Creates a pending request record in b2b_upgrade_requests table
 * Law #2: Request-scoped Supabase client
 */
export async function submitB2BUpgradeRequest(
  data: B2BUpgradeRequest
): Promise<B2BUpgradeResponse> {
  try {
    // Create request-scoped Supabase client (Law #2)
    const cookieStore = await cookies()
    const supabase = getSupabase(cookieStore)

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    // Validate input
    if (!data.businessName || !data.taxId) {
      return {
        success: false,
        error: 'Business name and tax ID are required',
      }
    }

    if (!data.creditCheckConsented) {
      return {
        success: false,
        error: 'Credit check consent is required',
      }
    }

    // Check if user already has a pending or approved request
    // Note: b2b_upgrade_requests table may not be in generated types yet
    // Cast to 'any' to avoid type errors during migration phase
    const { data: existingRequest, error: queryError } = await (
      supabase
        .from('b2b_upgrade_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .single() as any
    )

    if (!queryError && existingRequest) {
      if (existingRequest.status === 'pending') {
        return {
          success: false,
          error:
            'You already have a pending B2B upgrade request. Please wait for our review.',
        }
      }
      if (existingRequest.status === 'approved') {
        return {
          success: false,
          error: 'Your account is already B2B. Please check your tier settings.',
        }
      }
    }

    // Create B2B upgrade request
    const { data: createdRequest, error: insertError } = await (
      supabase
        .from('b2b_upgrade_requests')
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
    )

    if (insertError || !createdRequest) {
      Sentry.captureException(insertError)
      return {
        success: false,
        error: 'Failed to create upgrade request',
      }
    }

    // TODO: Send verification email to admin
    // TODO: Send confirmation email to user

    return {
      success: true,
      requestId: createdRequest.id,
    }
  } catch (error) {
    Sentry.captureException(error)
    console.error('submitB2BUpgradeRequest error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Fetch user's B2B upgrade request status
 * Used to check if upgrade is pending/approved/rejected
 */
export async function getB2BUpgradeStatus(
  userId: string
): Promise<
  | {
      status: 'pending' | 'approved' | 'rejected'
      requestedAt: string
      reason?: string
    }
  | null
> {
  try {
    const cookieStore = await cookies()
    const supabase = getSupabase(cookieStore)

    const { data: request } = await (
      supabase
        .from('b2b_upgrade_requests')
        .select('status, created_at, rejection_reason')
        .eq('user_id', userId)
        .single() as any
    )

    if (!request) return null

    return {
      status: request.status as 'pending' | 'approved' | 'rejected',
      requestedAt: request.created_at,
      reason: request.rejection_reason || undefined,
    }
  } catch (error) {
    Sentry.captureException(error)
    return null
  }
}
