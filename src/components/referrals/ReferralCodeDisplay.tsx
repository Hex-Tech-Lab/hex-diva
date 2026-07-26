/**
 * Referral Code Display Component
 * Shows user's referral code with copy-to-clipboard functionality
 */

'use client'

import { useState } from 'react'
import { formatReferralCodeForDisplay } from '@/lib/referral-codes'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Banner } from '@astryxdesign/core/Banner'

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
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Referral Code</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Upgrade to B2B to unlock your referral code and start earning commissions.
        </p>
      </Card>
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
    <Card className="space-y-4 p-6 border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10">
      <div>
        <h3 className="text-lg font-semibold">Your Referral Code</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Share this code with your network to earn commissions
        </p>
      </div>

      <div className="space-y-3">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Code</p>
          <div className="mt-2 flex items-center space-x-2">
            <code className="flex-1 font-mono text-2xl font-bold">
              {displayCode}
            </code>
            <Button
              onClick={handleCopyCode}
              size="sm"
              variant="secondary"
              label={copied ? 'Copied' : 'Copy'}
              className="shrink-0"
            />
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-gray-500">Full Referral Link</p>
          <div className="mt-2 flex items-start space-x-2">
            <code className="flex-1 break-all rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
              {fullUrl}
            </code>
            <Button
              onClick={handleCopyLink}
              size="sm"
              variant="secondary"
              label={copied ? 'Copied' : 'Copy'}
              className="shrink-0"
            />
          </div>
        </Card>
      </div>

      <Banner
        status="success"
        title="Tip"
        description="Each person who signs up using your referral code becomes an active referral, and you'll earn 5-15% commission on their purchases."
      />
    </Card>
  )
}
