'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ReRankingDemo } from '@/components/ReRankingDemo';
import { AuthGuard } from '@/components/AuthGuard';

const ReRankingDemoPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Re-ranking RAG Technique Demo
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Experience advanced document re-ranking using sophisticated models to improve 
              retrieval accuracy and relevance scoring.
            </p>
          </div>

          {user && (
            <ReRankingDemo userId={user.id} />
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default ReRankingDemoPage;
