'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function CheckoutPage() {
  const [step, setStep] = useState('shipping');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'shipping') setStep('payment');
    else if (step === 'payment') setStep('review');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-off-white py-6 border-b sticky top-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex gap-2 mb-8">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'shipping' || step === 'payment' ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>1</div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>2</div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-brand-600 text-white' : 'bg-gray-200'}`}>3</div>
              </div>

              {step === 'shipping' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Shipping Address</h2>
                  <input type="email" placeholder="Email" className="w-full px-4 py-3 border rounded-lg" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" className="px-4 py-3 border rounded-lg" />
                    <input type="text" placeholder="Last Name" className="px-4 py-3 border rounded-lg" />
                  </div>
                  <input type="text" placeholder="Address" className="w-full px-4 py-3 border rounded-lg" />
                  <div className="grid grid-cols-3 gap-4">
                    <input type="text" placeholder="City" className="px-4 py-3 border rounded-lg" />
                    <input type="text" placeholder="State" className="px-4 py-3 border rounded-lg" />
                    <input type="text" placeholder="ZIP" className="px-4 py-3 border rounded-lg" />
                  </div>
                </div>
              )}

              {step === 'payment' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Payment</h2>
                  <input type="text" placeholder="Card Number" className="w-full px-4 py-3 border rounded-lg" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="MM/YY" className="px-4 py-3 border rounded-lg" />
                    <input type="text" placeholder="CVV" className="px-4 py-3 border rounded-lg" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Lock size={16} />
                    Your payment is secure
                  </div>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Review Order</h2>
                  <p>Please review your order details before placing.</p>
                </div>
              )}

              <div className="flex gap-4">
                {step !== 'shipping' && (
                  <button type="button" onClick={() => { if (step === 'payment') setStep('shipping'); else setStep('payment'); }} className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50">Back</button>
                )}
                <button type="submit" className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
                  {step === 'review' ? 'Place Order' : 'Continue'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-off-white rounded-lg p-6 h-fit sticky top-32">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
            <div className="space-y-2 mb-4 pb-4 border-b">
              <div className="flex justify-between">
                <span>Luxury Eyelashes × 1</span>
                <span>$24.99</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>$24.99</span></div>
              <div className="flex justify-between"><span>Tax</span><span>$2.50</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>$9.99</span></div>
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-2xl font-bold">
                <span>Total</span>
                <span className="text-brand-600">$37.48</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
