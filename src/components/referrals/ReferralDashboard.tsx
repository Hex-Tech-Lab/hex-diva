'use client';

import { useEffect, useState } from 'react';
import { ReferralStats } from '@/lib/referrals';
import ReferralLinkSection from './ReferralLinkSection';
import ReferralStatsCards from './ReferralStatsCards';
import ReferralPerformanceChart from './ReferralPerformanceChart';

interface ReferralData {
  referralCode: string;
  referralUrl: string;
  stats: ReferralStats | null;
}

export default function ReferralDashboard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/referrals', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch referral data');
      }

      const referralData = await response.json();
      setData(referralData);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching referral data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading referral data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          No referral data available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Referral Program</h1>
        <p className="mt-2 text-gray-600">
          Share your referral link and earn commissions on every purchase made by your referred customers
        </p>
      </div>

      <ReferralLinkSection
        referralCode={data.referralCode}
        referralUrl={data.referralUrl}
      />

      {data.stats && <ReferralStatsCards stats={data.stats} />}

      {data.stats && <ReferralPerformanceChart stats={data.stats} />}
    </div>
  );
}
