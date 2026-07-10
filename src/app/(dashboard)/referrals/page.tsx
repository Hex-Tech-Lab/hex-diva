'use client';

import { useEffect, useState } from 'react';
import ReferralDashboard from '@/components/referrals/ReferralDashboard';

export default function ReferralsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return <ReferralDashboard />;
}
