import { PerformanceMonitoringDashboard } from '@/components/PerformanceMonitoringDashboard';
import { useSession } from '@/hooks/useSession';

export default function PerformanceMonitoringPage() {
  const { session, loading } = useSession();

  if (loading) return <div>Loading...</div>;
  if (!session) return <div>Access Denied - Please login</div>;

  return (
    <div className="container mx-auto p-4">
      <h1>Performance Monitoring Dashboard</h1>
      <PerformanceMonitoringDashboard />
    </div>
  );
}
