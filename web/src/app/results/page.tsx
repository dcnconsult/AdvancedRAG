"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { useEffect } from "react";
import analytics from "@/lib/analyticsService";

export default function ResultsPage() {
  useEffect(() => {
    // Fire results_rendered when page mounts (no session id context here)
    analytics.track('results_rendered', { page: 'results' }).catch(() => {});
  }, []);
  return (
    <AuthGuard>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Results</h1>
        <p>Side-by-side results and metadata visualizations will appear here.</p>
      </div>
    </AuthGuard>
  );
}


