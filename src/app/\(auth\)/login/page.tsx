'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Link href="/">
            <h1 className="text-4xl font-bold text-brand-600">Hex-Diva</h1>
          </Link>
          <p className="text-gray-600 mt-4">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form className="space-y-6">
            <div>
              <label className="block font-semibold mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input type="email" placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <Link href="/auth/forgot-password" className="text-brand-600 text-sm float-right mt-2 hover:text-brand-700">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="w-full px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-gray-400 font-semibold">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-700">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-brand-600 hover:text-brand-700 font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
