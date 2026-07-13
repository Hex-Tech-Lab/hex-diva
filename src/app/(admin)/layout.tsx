'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { checkAdminStatus } from '@/lib/admin/auth';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const result = await checkAdminStatus();

        if (!result.isAdmin) {
          setError(result.error || 'Admin access required');
          setIsAdmin(false);
          // Redirect after a brief delay to show message
          setTimeout(() => {
            router.push('/');
          }, 2000);
          return;
        }

        setIsAdmin(true);
        setAdminEmail(result.email || '');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Verification failed';
        setError(message);
        setIsAdmin(false);
      }
    }

    verifyAdmin();
  }, [router]);

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-slate-300">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="max-w-md w-full mx-auto px-6 py-8 rounded-lg border border-red-900/30 bg-red-950/20 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-slate-300 mb-2">{error}</p>
          <p className="text-slate-500 text-sm">
            You are not authorized to access the admin panel. Redirecting to home...
          </p>
        </div>
      </div>
    );
  }

  // Render admin panel
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Hex-Diva Admin</h1>
            <p className="text-sm text-slate-400">
              Logged in as: <span className="text-cyan-400">{adminEmail}</span>
            </p>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="/"
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Back to Store
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
