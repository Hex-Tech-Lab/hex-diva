'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { submitB2BUpgradeRequest } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function UpgradeToB2BPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    businessName: '',
    taxId: '',
    businessAddress: '',
    creditCheckConsented: false,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await submitB2BUpgradeRequest({
        businessName: formData.businessName,
        taxId: formData.taxId,
        businessAddress: formData.businessAddress,
        creditCheckConsented: formData.creditCheckConsented,
      })

      if (result.success) {
        setSuccess(true)
        // Redirect after 2 seconds
        setTimeout(() => router.push('/dashboard/referrals'), 2000)
      } else {
        setError(result.error || 'Failed to submit request')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      Sentry.captureException(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 py-8">
        <div className="rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <h2 className="font-semibold">Request Submitted</h2>
          <p className="text-sm">
            Your B2B upgrade request has been submitted for review. Our team will
            contact you shortly with updates. Redirecting to dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">Upgrade to B2B</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Enjoy exclusive B2B benefits including bulk discounts and a referral
          program.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <div className="mb-6 space-y-2">
          <h2 className="text-lg font-semibold">Benefits</h2>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>✓ 25% discount on all products</li>
            <li>✓ Unique referral code for your network</li>
            <li>✓ Commission on referred sales (5-15%)</li>
            <li>✓ Monthly payout dashboard</li>
            <li>✓ Dedicated account support</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="businessName" className="block text-sm font-medium">
            Business Name *
          </label>
          <Input
            id="businessName"
            name="businessName"
            type="text"
            placeholder="Your Company Inc."
            value={formData.businessName}
            onChange={(e) =>
              setFormData({ ...formData, businessName: e.target.value })
            }
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="taxId" className="block text-sm font-medium">
            Tax ID / Company Registration Number *
          </label>
          <Input
            id="taxId"
            name="taxId"
            type="text"
            placeholder="e.g., 12-3456789"
            value={formData.taxId}
            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            required
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500">
            Required for verification purposes only
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="businessAddress" className="block text-sm font-medium">
            Business Address (Optional)
          </label>
          <textarea
            id="businessAddress"
            name="businessAddress"
            placeholder="Street address, city, state, ZIP"
            value={formData.businessAddress}
            onChange={(e) =>
              setFormData({ ...formData, businessAddress: e.target.value })
            }
            disabled={isLoading}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-start space-x-3">
          <input
            id="creditCheckConsented"
            name="creditCheckConsented"
            type="checkbox"
            checked={formData.creditCheckConsented}
            onChange={(e) =>
              setFormData({ ...formData, creditCheckConsented: e.target.checked })
            }
            disabled={isLoading}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <label
            htmlFor="creditCheckConsented"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            I consent to a credit check for verification purposes *
          </label>
        </div>

        {!formData.creditCheckConsented && (
          <div className="rounded-lg bg-yellow-50 p-4 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
            <p className="text-sm">
              Credit check consent is required to proceed with B2B upgrade
            </p>
          </div>
        )}

        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={isLoading || !formData.creditCheckConsented}
          >
            {isLoading ? 'Submitting...' : 'Submit Upgrade Request'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>

      <div className="rounded-lg bg-blue-50 p-4 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        <p className="text-sm">
          <strong>What happens next?</strong> Our team will review your
          information within 1-2 business days. You'll receive an email
          confirmation once your account is upgraded.
        </p>
      </div>
    </div>
  )
}
