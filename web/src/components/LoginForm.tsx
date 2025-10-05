"use client";

import React, { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFallbackUI } from "./AuthFallbackUI";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginForm() {
  const { login, authError, networkError, retryCount, clearError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [showNetworkError, setShowNetworkError] = useState(false);

  const validateEmail = (email: string): string | undefined => {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setErrors(prev => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setErrors(prev => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    clearError();
    
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      await login({ email, password });
      
      // Redirect to intended page or home
      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    } catch (err) {
      // Error is handled by AuthProvider
      if (networkError) {
        setShowNetworkError(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, router, searchParams, clearError, networkError]);

  // Compute validation dynamically so the submit button enables as soon as inputs are valid
  const hasErrors = Boolean(
    validateEmail(email) ||
    validatePassword(password)
  );
  const showEmailError = touched.email && errors.email;
  const showPasswordError = touched.password && errors.password;

  return (
    <>
      {showNetworkError && (
        <AuthFallbackUI
          type="network-error"
          onDismiss={() => setShowNetworkError(false)}
        />
      )}
      <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm ${
              showEmailError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
          />
          {showEmailError && (
            <p className="mt-2 text-sm text-red-600">{errors.email}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm ${
              showPasswordError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur('password')}
          />
          {showPasswordError && (
            <p className="mt-2 text-sm text-red-600">{errors.password}</p>
          )}
        </div>
      </div>

      {authError && (
        <div className={`rounded-md p-4 ${
          networkError ? 'bg-yellow-50' : 'bg-red-50'
        }`}>
          <div className="flex">
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                networkError ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {networkError ? 'Connection Error' : 'Authentication Error'}
              </h3>
              <div className={`mt-2 text-sm ${
                networkError ? 'text-yellow-700' : 'text-red-700'
              }`}>
                <p>{authError}</p>
                {retryCount > 0 && (
                  <p className="mt-1 text-xs">
                    Retry attempt {retryCount} of 3
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </div>
    </form>
    </>
  );
}


