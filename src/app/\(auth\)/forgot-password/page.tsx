'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Check } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Link href="/">
            <h1 className="text-4xl font-bold text-brand-600">Hex-Diva</h1>
          </Link>
          <p className="text-gray-600 mt-4">Reset your password</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-gray-600 text-center mb-6">
                Enter your email to receive a password reset link.
              </p>

              <div>
                <label className="block font-semibold mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-semibold">
                Send Reset Link
              </button>

              <div className="text-center">
                <Link href="/auth/login" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-semibold">
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <Check className="text-green-600" size={32} />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-3">Check your email</h2>
                <p className="text-gray-600">
                  We've sent a password reset link to<br />
                  <span className="font-semibold text-gray-900">{email}</span>
                </p>
              </div>

              <Link href="/auth/login" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-semibold">
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
