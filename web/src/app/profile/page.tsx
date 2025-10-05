"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { UserProfile } from "@/components/UserProfile";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Profile Settings
        </h1>
        <UserProfile />
      </div>
    </AuthGuard>
  );
}
