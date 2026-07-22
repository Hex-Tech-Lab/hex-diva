'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Mail, Lock, Chrome, Apple } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsLoading(false);
    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-sapphire-600 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-serif text-charcoal-900 mb-2">GlamD</h1>
            <p className="text-gray-600 text-sm">Welcome back to luxury beauty</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <TextInput
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={value => setFormData(prev => ({ ...prev, email: value }))}
              placeholder="your@email.com"
              startIcon={<Mail size={20} />}
              isRequired
            />

            <TextInput
              label="Password"
              type="password"
              value={formData.password}
              onChange={value => setFormData(prev => ({ ...prev, password: value }))}
              placeholder="••••••••"
              startIcon={<Lock size={20} />}
              isRequired
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 accent-rose-gold rounded"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
              <Link href="/auth/reset-password" className="text-sm text-rose-gold hover:text-opacity-80 transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              label={isLoading ? 'Signing in...' : 'Sign In'}
              variant="primary"
              isLoading={isLoading}
              isDisabled={isLoading}
              className="w-full"
            />
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              label="Google"
              variant="secondary"
              icon={<Chrome size={20} />}
              className="w-full"
            />
            <Button
              type="button"
              label="Apple"
              variant="secondary"
              icon={<Apple size={20} />}
              className="w-full"
            />
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-rose-gold font-semibold hover:text-opacity-80 transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-8 text-off-white/80 text-sm">
          <p>By signing in, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-off-white transition-colors">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
