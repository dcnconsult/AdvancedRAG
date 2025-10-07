'use client';

import React, { useState, useEffect } from 'react';

// This is a placeholder for the actual security event data structure
interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'csrf_fail' | 'rate_limit' | 'xss_detected';
  timestamp: string;
  ip: string;
  userId?: string;
  details: Record<string, any>;
}

export function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would fetch data from a secure endpoint
    const mockEvents: SecurityEvent[] = [
      { id: '1', type: 'failed_login', timestamp: new Date().toISOString(), ip: '127.0.0.1', userId: 'user1', details: { reason: 'Incorrect password' } },
      { id: '2', type: 'csrf_fail', timestamp: new Date().toISOString(), ip: '192.168.1.1', details: { path: '/api/sessions' } },
      { id: '3', type: 'rate_limit', timestamp: new Date().toISOString(), ip: '10.0.0.5', details: { path: '/api/rag-orchestrator' } },
    ];
    setEvents(mockEvents);
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading security events...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Security Dashboard</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Type</th>
              <th className="py-2 px-4 border-b">Timestamp</th>
              <th className="py-2 px-4 border-b">IP Address</th>
              <th className="py-2 px-4 border-b">User ID</th>
              <th className="py-2 px-4 border-b">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="py-2 px-4 border-b">{event.type}</td>
                <td className="py-2 px-4 border-b">{new Date(event.timestamp).toLocaleString()}</td>
                <td className="py-2 px-4 border-b">{event.ip}</td>
                <td className="py-2 px-4 border-b">{event.userId || 'N/A'}</td>
                <td className="py-2 px-4 border-b">{JSON.stringify(event.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
