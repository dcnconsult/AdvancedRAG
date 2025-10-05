"use client";

import { LexicalSearchDemo } from '@/components/LexicalSearchDemo';
import { AuthGuard } from '@/components/AuthGuard';

export default function LexicalSearchDemoPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <LexicalSearchDemo />
      </div>
    </AuthGuard>
  );
}
