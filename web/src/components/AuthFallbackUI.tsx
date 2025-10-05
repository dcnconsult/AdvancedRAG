"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";

interface AuthFallbackUIProps {
  type: 'network-error' | 'session-expired' | 'verification-required' | 'general-error';
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function AuthFallbackUI({ 
  type, 
  message, 
  onRetry, 
  onDismiss 
}: AuthFallbackUIProps) {
  const { clearError, retryAuth } = useAuth();

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    } else {
      clearError();
      await retryAuth();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      clearError();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'network-error':
        return (
          <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75A9.75 9.75 0 0112 2.25z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8.25v.75m0 3v.75" />
          </svg>
        );
      case 'session-expired':
        return (
          <svg className="mx-auto h-12 w-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'verification-required':
        return (
          <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'network-error':
        return 'Connection Problem';
      case 'session-expired':
        return 'Session Expired';
      case 'verification-required':
        return 'Email Verification Required';
      default:
        return 'Authentication Error';
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (type) {
      case 'network-error':
        return 'Unable to connect to the authentication server. Please check your internet connection and try again.';
      case 'session-expired':
        return 'Your session has expired. Please sign in again to continue.';
      case 'verification-required':
        return 'Please check your email and click the verification link before signing in.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const getActions = () => {
    switch (type) {
      case 'network-error':
        return (
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Retry Connection
            </button>
            <button
              onClick={handleDismiss}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Dismiss
            </button>
          </div>
        );
      case 'session-expired':
        return (
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In Again
            </button>
          </div>
        );
      case 'verification-required':
        return (
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Sign In
            </button>
            <button
              onClick={handleDismiss}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Dismiss
            </button>
          </div>
        );
      default:
        return (
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Again
            </button>
            <button
              onClick={handleDismiss}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Dismiss
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4 bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="mb-4">
          {getIcon()}
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {getTitle()}
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          {getMessage()}
        </p>

        {getActions()}

        {type === 'network-error' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If the problem persists, please check your internet connection or try again later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
