/**
 * @fileoverview Error Monitoring Page
 *
 * Dashboard for monitoring error trends and patterns.
 */

'use client';

import React from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { ErrorMonitoringDashboard } from '@/components/ErrorMonitoringDashboard';

export default function ErrorMonitoringPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <ErrorMonitoringDashboard />
      </div>
    </AuthGuard>
  );
}

