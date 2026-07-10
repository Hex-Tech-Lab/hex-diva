'use client';

import { useEffect, useState } from 'react';
import AdminCommissionsPanel from '@/components/admin/AdminCommissionsPanel';

export default function AdminCommissionsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setIsLoading(true);
      // In a real app, verify admin status from session/auth
      setIsAdmin(true); // Placeholder
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Access denied: Admin access required
        </div>
      </div>
    );
  }

  return <AdminCommissionsPanel />;
}
