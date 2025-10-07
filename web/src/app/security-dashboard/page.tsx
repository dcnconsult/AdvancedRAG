'use client';

import { SecurityDashboard } from '@/components/SecurityDashboard';
import { AuthGuard } from '@/components/AuthGuard';

export default function SecurityDashboardPage() {
  return (
    <AuthGuard>
      <SecurityDashboard />
    </AuthGuard>
  );
}
