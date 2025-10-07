'use client';

import { useState, useEffect, useCallback } from 'react';
import { CSRF_HEADER_NAME } from '@/lib/csrfService';

export function useCsrf() {
  const [token, setToken] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      const response = await fetch('/api/csrf-token');
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const { token: newToken } = await response.json();
      setToken(newToken);
    } catch (error) {
      console.error('CSRF token fetch error:', error);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const getHeaders = useCallback(() => {
    return {
      [CSRF_HEADER_NAME]: token || '',
    };
  }, [token]);

  return { token, getHeaders, refreshToken: fetchToken };
}
