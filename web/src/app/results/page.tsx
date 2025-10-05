"use client";

import { AuthGuard } from "@/components/AuthGuard";

export default function ResultsPage() {
  return (
    <AuthGuard>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Results</h1>
        <p>Side-by-side results and metadata visualizations will appear here.</p>
      </div>
    </AuthGuard>
  );
}


