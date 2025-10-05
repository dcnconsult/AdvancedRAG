"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  initializing: boolean;
  authError: string | null;
  networkError: boolean;
  retryCount: number;
  signup: (params: { email: string; password: string }) => Promise<void>;
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Retry utility function
  const withRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a network error
        const isNetworkError = error instanceof TypeError || 
          (error as any)?.message?.includes('fetch') ||
          (error as any)?.message?.includes('network') ||
          (error as any)?.code === 'NETWORK_ERROR';
        
        if (isNetworkError) {
          setNetworkError(true);
        }
        
        if (attempt === maxRetries) {
          throw lastError;
        }
      }
    }
    
    throw lastError!;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: NodeJS.Timeout | null = null;

    const init = async () => {
      try {
        await withRetry(async () => {
          const { data, error } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (error) {
            console.error("Auth initialization error:", error);
            setAuthError(error.message);
          } else {
            setSession(data.session ?? null);
            setAuthError(null);
            setNetworkError(false);
          }
        });
      } catch (err) {
        console.error("Auth initialization failed:", err);
        setAuthError("Failed to initialize authentication. Please check your connection.");
      } finally {
        if (isMounted) setInitializing(false);
      }
    };

    const setupTokenRefresh = (session: Session | null) => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      if (session?.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // Refresh token 5 minutes before expiry
        const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0);
        
        refreshTimer = setTimeout(async () => {
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error("Token refresh error:", error);
              setAuthError("Session expired. Please sign in again.");
            } else {
              setSession(data.session);
              setAuthError(null);
            }
          } catch (err) {
            console.error("Token refresh failed:", err);
            setAuthError("Session refresh failed. Please sign in again.");
          }
        }, refreshTime);
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email);
        
        if (!isMounted) return;
        
        setSession(newSession);
        setAuthError(null);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setupTokenRefresh(newSession);
        } else if (event === 'SIGNED_OUT') {
          if (refreshTimer) {
            clearTimeout(refreshTimer);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signup = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setAuthError(null);
    setNetworkError(false);
    try {
      await withRetry(async () => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
          throw error;
        }
        
        // Handle email verification requirement
        if (data.user && !data.session) {
          setAuthError("Please check your email for verification link before signing in.");
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed";
      setAuthError(networkError ? "Network error. Please check your connection and try again." : errorMessage);
      throw err;
    }
  }, [withRetry, networkError]);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setAuthError(null);
    setNetworkError(false);
    try {
      await withRetry(async () => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAuthError(error.message);
          throw error;
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setAuthError(networkError ? "Network error. Please check your connection and try again." : errorMessage);
      throw err;
    }
  }, [withRetry, networkError]);

  const logout = useCallback(async () => {
    setAuthError(null);
    try {
      // Clear session state immediately for better UX
      setSession(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        setAuthError(error.message);
        throw error;
      }
      
      // Clear any local storage or session data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      }
      
      console.log("User logged out successfully");
    } catch (err) {
      console.error("Logout failed:", err);
      setAuthError(err instanceof Error ? err.message : "Logout failed");
      throw err;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setAuthError(null);
    setNetworkError(false);
    try {
      await withRetry(async () => {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          setAuthError(error.message);
          throw error;
        }
        setSession(data.session);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Session refresh failed";
      setAuthError(networkError ? "Network error. Please check your connection and try again." : errorMessage);
      throw err;
    }
  }, [withRetry, networkError]);

  const clearError = useCallback(() => {
    setAuthError(null);
    setNetworkError(false);
    setRetryCount(0);
  }, []);

  const retryAuth = useCallback(async () => {
    setAuthError(null);
    setNetworkError(false);
    setRetryCount(0);
    
    try {
      await withRetry(async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setAuthError(error.message);
          throw error;
        }
        setSession(data.session);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication retry failed";
      setAuthError(networkError ? "Network error. Please check your connection and try again." : errorMessage);
      throw err;
    }
  }, [withRetry, networkError]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    initializing,
    authError,
    networkError,
    retryCount,
    signup,
    login,
    logout,
    refreshSession,
    clearError,
    retryAuth,
  }), [session, initializing, authError, networkError, retryCount, signup, login, logout, refreshSession, clearError, retryAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}


