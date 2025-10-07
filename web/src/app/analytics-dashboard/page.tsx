/**
 * @fileoverview Analytics Dashboard Page
 * 
 * Real-time analytics and KPI tracking dashboard for MVP validation.
 * Displays key metrics from analytics_events table.
 */

'use client';

import React from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import dynamic from 'next/dynamic';

const AnalyticsDashboard = dynamic(() => import('@/components/AnalyticsDashboard'), {
  ssr: false,
  loading: () => <p>Loading Dashboard...</p>
});

export default function AnalyticsDashboardPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AnalyticsDashboard />
      </div>
    </AuthGuard>
  );
}

