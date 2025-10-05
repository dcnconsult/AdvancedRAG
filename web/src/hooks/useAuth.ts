"use client";

import { useAuthContext } from "@/providers/AuthProvider";

export function useAuth() {
  const context = useAuthContext();
  return {
    ...context,
    // Expose commonly used properties for convenience
    isAuthenticated: !!context.user,
    isLoading: context.initializing,
  };
}


