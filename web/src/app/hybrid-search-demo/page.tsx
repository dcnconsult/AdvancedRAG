"use client";

import { HybridSearchDemo } from '@/components/HybridSearchDemo';
import { AuthGuard } from '@/components/AuthGuard';

export default function HybridSearchDemoPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <HybridSearchDemo />
      </div>
    </AuthGuard>
  );
}
