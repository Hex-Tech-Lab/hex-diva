'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ArrowLeft } from 'lucide-react';

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
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
    <div className="min-h-screen bg-off-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/cart" className="flex items-center gap-2 text-rose-gold hover:text-opacity-80 transition-colors mb-4">
            <ArrowLeft size={20} />
            <span>Back to Cart</span>
          </Link>
          <h1 className="text-4xl font-bold text-charcoal-900 font-serif">Checkout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="flex gap-4 mb-12">
          {['shipping', 'payment', 'review'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  step === s
                    ? 'bg-rose-gold text-white'
                    : ['shipping', 'payment', 'review'].indexOf(step) > idx
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {idx + 1}
              </div>
              {idx < 2 && <div className="w-8 h-0.5 mx-2 bg-gray-300" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-gray-200">
              {/* Shipping Step */}
              {step === 'shipping' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-charcoal-900 mb-6">Shipping Address</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <Input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <Input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <Input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="123 Main Street"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <Input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="New York"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <Input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="NY"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <Input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleChange}
                        placeholder="10001"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-gold"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="UK">United Kingdom</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    size="md"
                    className="w-full bg-rose-gold hover:bg-opacity-90"
                    onClick={() => setStep('payment')}
                  >
                    Continue to Payment
                  </Button>
                </div>
              )}

              {/* Payment Step */}
              {step === 'payment' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-charcoal-900 mb-6">Payment Method</h2>

                  <div className="flex gap-4 mb-6">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        defaultChecked
                        className="sr-only"
                      />
                      <div className="border-2 border-rose-gold p-4 rounded-lg text-center bg-rose-gold/5">
                        <p className="font-semibold text-charcoal-900">Credit Card</p>
                      </div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="paypal"
                        className="sr-only"
                      />
                      <div className="border-2 border-gray-300 p-4 rounded-lg text-center hover:border-gray-400">
                        <p className="font-semibold text-charcoal-900">PayPal</p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name
                    </label>
                    <Input
                      type="text"
                      name="cardName"
                      value={formData.cardName}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <Input
                      type="text"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleChange}
                      placeholder="4111 1111 1111 1111"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <Input
                        type="text"
                        name="expiry"
                        value={formData.expiry}
                        onChange={handleChange}
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVC
                      </label>
                      <Input
                        type="text"
                        name="cvc"
                        value={formData.cvc}
                        onChange={handleChange}
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      className="flex-1"
                      onClick={() => setStep('shipping')}
                    >
                      Back
                    </Button>
                    <Button
                      size="md"
                      className="flex-1 bg-rose-gold hover:bg-opacity-90"
                      onClick={() => setStep('review')}
                    >
                      Review Order
                    </Button>
                  </div>
                </div>
              )}

              {/* Review Step */}
              {step === 'review' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-charcoal-900 mb-6">Review Order</h2>

                  <div className="bg-off-white p-4 rounded-lg space-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-charcoal-900">Shipping to:</p>
                      <p className="text-gray-600">
                        {formData.firstName} {formData.lastName}
                        <br />
                        {formData.address}
                        <br />
                        {formData.city}, {formData.state} {formData.zip}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal-900">Payment Method:</p>
                      <p className="text-gray-600">Card ending in {formData.cardNumber.slice(-4)}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      className="flex-1"
                      onClick={() => setStep('payment')}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      size="md"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 gap-2"
                      disabled={isProcessing}
                    >
                      <Lock size={18} />
                      {isProcessing ? 'Processing...' : 'Complete Order'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg border border-gray-200 sticky top-20">
              <h2 className="text-xl font-bold text-charcoal-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal (3 items)</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Shipping</span>
                  <span className="font-medium text-emerald-600 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <span className="font-bold text-charcoal-900">Total</span>
                <span className="text-xl font-bold text-charcoal-900">${total.toFixed(2)}</span>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mb-6">
                <p className="text-xs text-blue-900 flex items-center gap-2">
                  <Lock size={14} />
                  Secure checkout with SSL encryption
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <p className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Free returns
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> 100% authentic products
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Fast shipping
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
