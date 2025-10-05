"use client";

import { AuthGuard } from "@/components/AuthGuard";

export default function SessionsPage() {
  return (
    <AuthGuard>
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Sessions</h1>
        <p>Saved sessions will be listed here.</p>
      </div>
    </AuthGuard>
  );
}


