/**
 * Stripe Connect Onboarding Component
 * Allows referrers to set up Stripe Connect for payouts
 */

'use client'

import { useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

export interface StripeConnectSetupProps {
  userId: string
  accountStatus?: 'not_setup' | 'pending' | 'active'
}

export function StripeConnectSetup({
  userId,
  accountStatus = 'not_setup',
}: StripeConnectSetupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStripeConnect = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Call backend to create Stripe Connect account link
      const response = await fetch('/api/referrals/stripe-connect-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to get Stripe Connect link')
      }

      const { accountLink } = await response.json()

      if (!accountLink?.url) {
        throw new Error('No Stripe Connect URL returned')
      }

      // Redirect to Stripe onboarding
      window.location.href = accountLink.url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      Sentry.captureException(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Payout Method</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Set up Stripe Connect to receive referral commissions directly to your
          bank account.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center space-x-2">
        <div
          className={`h-3 w-3 rounded-full ${
            accountStatus === 'active'
              ? 'bg-green-500'
              : accountStatus === 'pending'
                ? 'bg-yellow-500'
                : 'bg-gray-300'
          }`}
        />
        <span className="text-sm font-medium">
          {accountStatus === 'active'
            ? 'Stripe Connect Active'
            : accountStatus === 'pending'
              ? 'Verification Pending'
              : 'Not Set Up'}
        </span>
      </div>

      {accountStatus === 'active' ? (
        <div className="rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <p className="text-sm">
            Your Stripe Connect account is active. Commissions will be paid
            monthly to your linked bank account.
          </p>
        </div>
      ) : (
        <Button
          onClick={handleStripeConnect}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading
            ? 'Redirecting...'
            : accountStatus === 'pending'
              ? 'Complete Verification'
              : 'Connect Stripe Account'}
        </Button>
      )}
    </div>
  )
}
