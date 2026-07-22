'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Banner } from '@astryxdesign/core/Banner';
import { Lock, ArrowLeft } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'UK', label: 'United Kingdom' },
];

export default function CheckoutPage() {
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    paymentMethod: 'card',
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const setField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsProcessing(false);
    // Redirect to confirmation page
    window.location.href = '/checkout/confirmation';
  };

  const subtotal = 123.98;
  const shipping = 0;
  const tax = 9.92;
  const total = subtotal + shipping + tax;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-background-surface)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'var(--spacing-6)' }}>
          <Link
            href="/cart"
            className="flex items-center gap-2 transition-colors"
            style={{ color: 'var(--gold)', marginBottom: 'var(--spacing-4)' }}
          >
            <ArrowLeft size={20} />
            <span>Back to Cart</span>
          </Link>
          <h1
            style={{
              fontFamily: 'var(--font-family-heading)',
              fontSize: '2.25rem',
              fontWeight: 700,
              color: 'var(--charcoal)',
            }}
          >
            Checkout
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '896px', margin: '0 auto', padding: 'var(--spacing-12) var(--spacing-6)' }}>
        {/* Progress Steps */}
        <div className="flex gap-4" style={{ marginBottom: 'var(--spacing-12)' }}>
          {['shipping', 'payment', 'review'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                style={{
                  background:
                    step === s
                      ? 'var(--gold)'
                      : ['shipping', 'payment', 'review'].indexOf(step) > idx
                      ? 'var(--color-success)'
                      : 'var(--color-background-muted)',
                  color: step === s || ['shipping', 'payment', 'review'].indexOf(step) > idx ? '#FFFFFF' : 'var(--color-text-secondary)',
                }}
              >
                {idx + 1}
              </div>
              {idx < 2 && <div className="w-8 h-0.5 mx-2" style={{ background: 'var(--color-border)' }} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card variant="default" padding={8}>
              <form onSubmit={handleSubmit}>
                {/* Shipping Step */}
                {step === 'shipping' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--charcoal)' }}>Shipping Address</h2>

                    <TextInput
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={value => setField('email', value)}
                      placeholder="your@email.com"
                      isRequired
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <TextInput
                        label="First Name"
                        value={formData.firstName}
                        onChange={value => setField('firstName', value)}
                        placeholder="John"
                        isRequired
                      />
                      <TextInput
                        label="Last Name"
                        value={formData.lastName}
                        onChange={value => setField('lastName', value)}
                        placeholder="Doe"
                        isRequired
                      />
                    </div>

                    <TextInput
                      label="Phone Number"
                      type="text"
                      value={formData.phone}
                      onChange={value => setField('phone', value)}
                      placeholder="+1 (555) 123-4567"
                      isRequired
                    />

                    <TextInput
                      label="Street Address"
                      value={formData.address}
                      onChange={value => setField('address', value)}
                      placeholder="123 Main Street"
                      isRequired
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <TextInput
                        label="City"
                        value={formData.city}
                        onChange={value => setField('city', value)}
                        placeholder="New York"
                        isRequired
                      />
                      <TextInput
                        label="State"
                        value={formData.state}
                        onChange={value => setField('state', value)}
                        placeholder="NY"
                        isRequired
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <TextInput
                        label="ZIP Code"
                        value={formData.zip}
                        onChange={value => setField('zip', value)}
                        placeholder="10001"
                        isRequired
                      />
                      <Selector
                        label="Country"
                        options={COUNTRY_OPTIONS.map(o => o.value)}
                        renderOption={option => COUNTRY_OPTIONS.find(o => o.value === option.value)?.label ?? option.value}
                        value={formData.country}
                        onChange={value => setField('country', value)}
                      />
                    </div>

                    <Button
                      label="Continue to Payment"
                      variant="primary"
                      onClick={() => setStep('payment')}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                {/* Payment Step */}
                {step === 'payment' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--charcoal)' }}>Payment Method</h2>

                    <RadioList
                      label="Payment Method"
                      isLabelHidden
                      orientation="horizontal"
                      value={formData.paymentMethod}
                      onChange={value => setField('paymentMethod', value)}
                    >
                      <RadioListItem label="Credit Card" value="card" />
                      <RadioListItem label="PayPal" value="paypal" />
                    </RadioList>

                    <TextInput
                      label="Cardholder Name"
                      value={formData.cardName}
                      onChange={value => setField('cardName', value)}
                      placeholder="John Doe"
                      isRequired
                    />

                    <TextInput
                      label="Card Number"
                      value={formData.cardNumber}
                      onChange={value => setField('cardNumber', value)}
                      placeholder="4111 1111 1111 1111"
                      isRequired
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <TextInput
                        label="Expiry Date"
                        value={formData.expiry}
                        onChange={value => setField('expiry', value)}
                        placeholder="MM/YY"
                        isRequired
                      />
                      <TextInput
                        label="CVC"
                        value={formData.cvc}
                        onChange={value => setField('cvc', value)}
                        placeholder="123"
                        isRequired
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        label="Back"
                        variant="secondary"
                        onClick={() => setStep('shipping')}
                        style={{ flex: 1 }}
                      />
                      <Button
                        label="Review Order"
                        variant="primary"
                        onClick={() => setStep('review')}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                )}

                {/* Review Step */}
                {step === 'review' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--charcoal)' }}>Review Order</h2>

                    <Card variant="muted" padding={4}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', fontSize: '0.875rem' }}>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--charcoal)' }}>Shipping to:</p>
                          <p style={{ color: 'var(--color-text-secondary)' }}>
                            {formData.firstName} {formData.lastName}
                            <br />
                            {formData.address}
                            <br />
                            {formData.city}, {formData.state} {formData.zip}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--charcoal)' }}>Payment Method:</p>
                          <p style={{ color: 'var(--color-text-secondary)' }}>
                            Card ending in {formData.cardNumber.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        label="Back"
                        variant="secondary"
                        onClick={() => setStep('payment')}
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="submit"
                        label={isProcessing ? 'Processing...' : 'Complete Order'}
                        variant="primary"
                        icon={<Lock size={18} />}
                        isLoading={isProcessing}
                        isDisabled={isProcessing}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                )}
              </form>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card variant="default" padding={6} className="sticky top-20">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 'var(--spacing-6)' }}>
                Order Summary
              </h2>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-4)',
                  marginBottom: 'var(--spacing-6)',
                  paddingBottom: 'var(--spacing-6)',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                }}
              >
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal (3 items)</span>
                  <span className="font-medium" style={{ color: 'var(--charcoal)' }}>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Shipping</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>FREE</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Tax</span>
                  <span className="font-medium" style={{ color: 'var(--charcoal)' }}>${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between" style={{ marginBottom: 'var(--spacing-6)' }}>
                <span style={{ fontWeight: 700, color: 'var(--charcoal)' }}>Total</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--charcoal)' }}>${total.toFixed(2)}</span>
              </div>

              <Banner status="info" title="Secure checkout with SSL encryption" icon={<Lock size={14} />} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-6)' }}>
                <p className="flex items-center gap-2">
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓</span> Free returns
                </p>
                <p className="flex items-center gap-2">
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓</span> 100% authentic products
                </p>
                <p className="flex items-center gap-2">
                  <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓</span> Fast shipping
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
