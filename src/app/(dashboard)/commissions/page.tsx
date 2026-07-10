'use client';

import { useEffect, useState } from 'react';
import CommissionDashboard from '@/components/commissions/CommissionDashboard';

export default function CommissionsPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return <CommissionDashboard />;
}
