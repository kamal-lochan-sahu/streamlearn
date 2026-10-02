import { useQuery } from '@tanstack/react-query';
import { Users, Film, CreditCard, TrendingUp } from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import StatsCard from '../../components/admin/StatsCard';
import { RevenueLineChart, SubscriberBarChart } from '../../components/admin/RevenueChart';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data),
    refetchInterval: 60000,
  });
  const { stats, monthlyRevenue, subscriberGrowth } = data || {};

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">Welcome back!</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Users"
            value={stats?.totalUsers?.toLocaleString() || 0}
            icon={Users}
            color="blue"
            subtitle={`+${stats?.newUsersThisMonth || 0} this month`}
          />
          <StatsCard
            title="Subscribers"
            value={stats?.activeSubscriptions?.toLocaleString() || 0}
            icon={CreditCard}
            color="green"
          />
          <StatsCard
            title="Revenue"
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon={TrendingUp}
            color="brand"
          />
          <StatsCard
            title="Content"
            value={stats?.totalContent?.toLocaleString() || 0}
            icon={Film}
            color="yellow"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-5">Revenue (6 Months)</h3>
            <RevenueLineChart data={monthlyRevenue || []} />
          </div>
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-5">New Users (30 Days)</h3>
            <SubscriberBarChart data={subscriberGrowth || []} />
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Upload Content', href: '/admin/content' },
              { l: 'Manage Plans', href: '/admin/plans' },
              { l: 'View Analytics', href: '/admin/analytics' },
              { l: 'Settings', href: '/admin/settings' },
            ].map(({ l, href }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 p-4 bg-bg-surface hover:bg-bg-elevated border border-border rounded-xl transition-all"
              >
                <span className="text-sm font-medium">{l}</span>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
