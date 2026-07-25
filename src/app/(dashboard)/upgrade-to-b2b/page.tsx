'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { submitB2BUpgradeRequest } from './actions'
import { Button } from '@astryxdesign/core/Button'
import { TextInput } from '@astryxdesign/core/TextInput'
import { TextArea } from '@astryxdesign/core/TextArea'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { Card } from '@astryxdesign/core/Card'
import { Banner } from '@astryxdesign/core/Banner'

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
        <Banner
          status="success"
          title="Request Submitted"
          description="Your B2B upgrade request has been submitted for review. Our team will contact you shortly with updates. Redirecting to dashboard..."
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">Upgrade to B2B</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Enjoy exclusive B2B benefits including bulk discounts and a referral program.
        </p>
      </div>

      <Card className="p-6">
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
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Banner status="error" title={error} />}

        <TextInput
          label="Business Name"
          placeholder="Your Company Inc."
          value={formData.businessName}
          onChange={(value: string) => setFormData({ ...formData, businessName: value })}
          isRequired
          isDisabled={isLoading}
        />

        <div className="space-y-1">
          <TextInput
            label="Tax ID / Company Registration Number"
            placeholder="e.g., 12-3456789"
            value={formData.taxId}
            onChange={(value: string) => setFormData({ ...formData, taxId: value })}
            isRequired
            isDisabled={isLoading}
          />
          <p className="text-xs text-gray-500">
            Required for verification purposes only
          </p>
        </div>

        <TextArea
          label="Business Address (Optional)"
          placeholder="Street address, city, state, ZIP"
          value={formData.businessAddress}
          onChange={(value: string) => setFormData({ ...formData, businessAddress: value })}
          isDisabled={isLoading}
          rows={3}
        />

        <CheckboxInput
          label="I consent to a credit check for verification purposes *"
          value={formData.creditCheckConsented}
          onChange={(checked: boolean) =>
            setFormData({ ...formData, creditCheckConsented: checked })
          }
          isDisabled={isLoading}
        />

        {!formData.creditCheckConsented && (
          <Banner
            status="warning"
            title="Credit check consent is required to proceed with B2B upgrade"
          />
        )}

        <div className="flex space-x-4">
          <Button
            type="submit"
            label={isLoading ? 'Submitting...' : 'Submit Upgrade Request'}
            variant="primary"
            isLoading={isLoading}
            isDisabled={isLoading || !formData.creditCheckConsented}
          />
          <Button
            type="button"
            label="Cancel"
            variant="secondary"
            onClick={() => router.back()}
            isDisabled={isLoading}
          />
        </div>
      </form>

      <Banner
        status="info"
        title="What happens next?"
        description="Our team will review your information within 1-2 business days. You'll receive an email confirmation once your account is upgraded."
      />
    </div>
  )
}
