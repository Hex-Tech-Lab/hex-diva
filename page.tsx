'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 to-sapphire-600 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
        <h1 className="text-3xl font-bold font-serif text-charcoal-900 mb-2">Hex-Diva</h1>
        <p className="text-gray-600 mb-8">Welcome back to luxury beauty</p>

        <form onSubmit={(e) => { e.preventDefault(); window.location.href = '/dashboard'; }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="pl-10" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" required />
            </div>
          </div>
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2"><input type="checkbox" /><span className="text-sm">Remember me</span></label>
            <Link href="/auth/reset-password" className="text-sm text-rose-gold">Forgot password?</Link>
          </div>
          <Button type="submit" size="lg" className="w-full bg-charcoal-900">Sign In</Button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Don't have an account? <Link href="/auth/signup" className="text-rose-gold font-semibold">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
