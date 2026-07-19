/**
 * Referral Code Display Component
 * Shows user's referral code with copy-to-clipboard functionality
 */

'use client'

import { useState } from 'react'
import { formatReferralCodeForDisplay } from '@/lib/referral-codes'
import { Button } from '@/components/ui/button'

export interface ReferralCodeDisplayProps {
  referralCode: string | null
  baseUrl: string
}

export function ReferralCodeDisplay({
  referralCode,
  baseUrl,
}: ReferralCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  if (!referralCode) {
    return (
      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Referral Code</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Upgrade to B2B to unlock your referral code and start earning commissions.
        </p>
      </div>
    )
  }

  const displayCode = formatReferralCodeForDisplay(referralCode)
  const referralUrl = new URL(baseUrl)
  referralUrl.searchParams.set('ref', referralCode)
  const fullUrl = referralUrl.toString()

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900/30 dark:bg-green-900/10">
      <div>
        <h3 className="text-lg font-semibold">Your Referral Code</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Share this code with your network to earn commissions
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg bg-white p-4 dark:bg-gray-900">
          <p className="text-xs text-gray-500">Code</p>
          <div className="mt-2 flex items-center space-x-2">
            <code className="flex-1 font-mono text-2xl font-bold">
              {displayCode}
            </code>
            <Button
              onClick={handleCopyCode}
              size="sm"
              variant="outline"
              className="shrink-0"
            >
              {copied ? '✓' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 dark:bg-gray-900">
          <p className="text-xs text-gray-500">Full Referral Link</p>
          <div className="mt-2 flex items-start space-x-2">
            <code className="flex-1 break-all rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
              {fullUrl}
            </code>
            <Button
              onClick={handleCopyLink}
              size="sm"
              variant="outline"
              className="shrink-0"
            >
              {copied ? '✓' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-green-100 p-3 text-green-800 dark:bg-green-900/20 dark:text-green-200">
        <p className="text-xs">
          <strong>💡 Tip:</strong> Each person who signs up using your referral
          code becomes an active referral, and you'll earn 5-15% commission on
          their purchases.
        </p>
      </div>
    </div>
  )
}
