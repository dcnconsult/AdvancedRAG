import { PerformanceMonitoringDashboard } from '@/components/PerformanceMonitoringDashboard';
import { useSession } from '@/hooks/useSession';
import dynamic from 'next/dynamic';

const PerformanceDashboard = dynamic(() => import('@/components/PerformanceMonitoringDashboard').then(mod => mod.PerformanceMonitoringDashboard), {
  ssr: false,
  loading: () => <p>Loading Performance Data...</p>
});

export default function PerformanceMonitoringPage() {
  const { session, loading } = useSession();

  if (loading) return <div>Loading...</div>;
  if (!session) return <div>Access Denied - Please login</div>;

  return (
    <div className="container mx-auto p-4">
      <h1>Performance Monitoring Dashboard</h1>
      <PerformanceDashboard />
    </div>
  );
}
