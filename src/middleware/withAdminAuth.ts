/**
 * Admin Authentication Middleware
 *
 * Centralized admin access verification for API routes
 * Eliminates duplicate verifyAdminAccess() calls across routes
 *
 * ARCHITECTURAL LAW: Middleware composition for cross-cutting concerns
 * - Single source of truth for admin authorization logic
 * - Cleaner routes (no inline auth boilerplate)
 * - Easier to audit and modify authorization rules
 *
 * Usage:
 * ```typescript
 * export const POST = withAdminAuth(async (request, adminCheck) => {
 *   // request is guaranteed to be from authenticated admin
 *   // adminCheck contains email and verification metadata
 * });
 * ```
 *
 * @module middleware/withAdminAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, type AdminCheckResult } from '@/lib/admin/auth';

/**
 * Enhanced request object with admin context
 * Extends NextRequest to include verified admin metadata
 */
export interface AdminRequest extends NextRequest {
  adminCheck: AdminCheckResult;
}

/**
 * Handler function type that receives both request and admin check result
 */
export type AdminHandler = (
  request: NextRequest,
  adminCheck: AdminCheckResult
) => Promise<Response>;

/**
 * Higher-order function: wraps route handlers with admin authorization middleware
 *
 * This middleware:
 * 1. Verifies admin access via Supabase auth + email whitelist
 * 2. Returns 403 Unauthorized if not admin
 * 3. Passes adminCheck context to handler if authorized
 *
 * @param handler - Route handler function that receives request and admin check
 * @returns Wrapped handler with built-in admin verification
 *
 * @example
 * export const GET = withAdminAuth(async (request, adminCheck) => {
 *   // This code only runs if user is admin
 *   console.log(`Admin ${adminCheck.email} made request`);
 *   return NextResponse.json({ success: true });
 * });
 */
export function withAdminAuth(handler: AdminHandler) {
  return async (request: NextRequest) => {
    try {
      // Verify admin access
      const adminCheck = await verifyAdminAccess(request);

      // Reject if not admin
      if (!adminCheck.isAdmin) {
        return NextResponse.json(
          {
            error: 'Unauthorized: admin access required',
            details: adminCheck.error || 'User is not in admin whitelist',
          },
          { status: 403 }
        );
      }

      // Call handler with verified admin context
      return await handler(request, adminCheck);
    } catch (error) {
      console.error('[AdminAuthMiddleware] Unexpected error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error during authorization',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * GET handler middleware - wraps GET route with admin auth
 * @param handler - GET handler that receives request and admin check
 * @returns Wrapped GET handler
 */
export const withAdminAuthGET = (handler: AdminHandler) => withAdminAuth(handler);

/**
 * POST handler middleware - wraps POST route with admin auth
 * @param handler - POST handler that receives request and admin check
 * @returns Wrapped POST handler
 */
export const withAdminAuthPOST = (handler: AdminHandler) => withAdminAuth(handler);

/**
 * PUT handler middleware - wraps PUT route with admin auth
 * @param handler - PUT handler that receives request and admin check
 * @returns Wrapped PUT handler
 */
export const withAdminAuthPUT = (handler: AdminHandler) => withAdminAuth(handler);

/**
 * DELETE handler middleware - wraps DELETE route with admin auth
 * @param handler - DELETE handler that receives request and admin check
 * @returns Wrapped DELETE handler
 */
export const withAdminAuthDELETE = (handler: AdminHandler) => withAdminAuth(handler);
