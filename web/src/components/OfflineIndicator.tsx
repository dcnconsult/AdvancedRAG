/**
 * @fileoverview Offline Indicator Component
 *
 * Visual indicator for network status with:
 * - Online/offline state display
 * - Connection quality indicators
 * - Reconnection status
 * - Graceful degradation messaging
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

"use client";

import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface OfflineIndicatorProps {
  showConnectionQuality?: boolean;
  showReconnectionStatus?: boolean;
  className?: string;
  variant?: 'banner' | 'badge' | 'icon';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showConnectionQuality = true,
  showReconnectionStatus = true,
  className = '',
  variant = 'banner',
}) => {
  const { status, isOnline, isSlowConnection, retryConnection } = useNetworkStatus({
    enableConnectionQuality: showConnectionQuality,
    enableReconnectionTracking: showReconnectionStatus,
  });

  if (isOnline && !isSlowConnection) {
    return null; // Don't show anything when online and fast
  }

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {getStatusText(status)}
        </span>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs ${getStatusBgColor(status)} ${className}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status)}`} />
        <span className={getStatusTextColor(status)}>
          {getStatusText(status)}
        </span>
      </div>
    );
  }

  // Default banner variant
  return (
    <div className={`bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {getStatusTitle(status)}
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {getStatusMessage(status)}
              </p>
            </div>
          </div>

          {showReconnectionStatus && status.reconnectAttempts > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                Attempt {status.reconnectAttempts}
              </span>
              <button
                onClick={retryConnection}
                className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {showConnectionQuality && status.effectiveType && (
          <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            Connection: {status.effectiveType}
            {status.downlink && ` (${status.downlink} Mbps)`}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions for status styling
function getStatusColor(status: any): string {
  if (!status.isOnline) {
    return 'bg-red-500';
  }

  if (status.isSlowConnection) {
    return 'bg-yellow-500';
  }

  return 'bg-green-500';
}

function getStatusBgColor(status: any): string {
  if (!status.isOnline) {
    return 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300';
  }

  if (status.isSlowConnection) {
    return 'bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300';
  }

  return 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300';
}

function getStatusTextColor(status: any): string {
  if (!status.isOnline) {
    return 'text-red-700 dark:text-red-300';
  }

  if (status.isSlowConnection) {
    return 'text-yellow-700 dark:text-yellow-300';
  }

  return 'text-green-700 dark:text-green-300';
}

function getStatusText(status: any): string {
  if (!status.isOnline) {
    return 'Offline';
  }

  if (status.isSlowConnection) {
    return 'Slow';
  }

  return 'Online';
}

function getStatusTitle(status: any): string {
  if (!status.isOnline) {
    return 'No Internet Connection';
  }

  if (status.isSlowConnection) {
    return 'Slow Connection';
  }

  return 'Connection Issue';
}

function getStatusMessage(status: any): string {
  if (!status.isOnline) {
    return 'Some features may not work properly. Please check your connection.';
  }

  if (status.isSlowConnection) {
    return 'Connection is slow. Some operations may take longer than usual.';
  }

  return 'Connection quality may affect performance.';
}

