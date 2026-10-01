import { useQuery } from '@tanstack/react-query'
import { Users, TrendingUp, Film, Star } from 'lucide-react'
import AdminSidebar from '../../components/admin/AdminSidebar'
import StatsCard from '../../components/admin/StatsCard'
import { RevenueLineChart, SubscriberBarChart } from '../../components/admin/RevenueChart'
import api from '../../services/api'
import { formatCurrency } from '../../utils/formatters'

export default function AdminAnalytics() {
  const { data: dashboard } = useQuery({ queryKey:['analytics-dash'], queryFn:()=>api.get('/analytics/dashboard').then(r=>r.data.data) })
  const { data: content }   = useQuery({ queryKey:['analytics-content'], queryFn:()=>api.get('/analytics/content').then(r=>r.data.data) })
  const stats = dashboard?.stats || {}
  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar/>
      <main className="ml-64 flex-1 p-8">
        <h1 className="text-2xl font-bold mb-8">Analytics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard title="Total Users"   value={stats.totalUsers?.toLocaleString()||0} icon={Users} color="blue"/>
          <StatsCard title="Subscribers"   value={stats.activeSubscriptions?.toLocaleString()||0} icon={Star} color="green"/>
          <StatsCard title="Revenue"       value={formatCurrency(stats.totalRevenue||0)} icon={TrendingUp} color="brand"/>
          <StatsCard title="Content"       value={stats.totalContent?.toLocaleString()||0} icon={Film} color="yellow"/>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-bg-secondary border border-border rounded-2xl p-6"><h3 className="font-semibold mb-5">Revenue Trend</h3><RevenueLineChart data={dashboard?.monthlyRevenue||[]}/></div>
          <div className="bg-bg-secondary border border-border rounded-2xl p-6"><h3 className="font-semibold mb-5">New Users</h3><SubscriberBarChart data={dashboard?.subscriberGrowth||[]}/></div>
        </div>
        {content?.topContent?.length > 0 && (
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-5">Top Content</h3>
            <div className="space-y-3">
              {content.topContent.map((c,i) => (
                <div key={c._id} className="flex items-center gap-4">
                  <span className="text-text-muted text-sm w-5 text-right">{i+1}</span>
                  <div className="w-12 h-8 bg-bg-elevated rounded overflow-hidden flex-shrink-0">
                    {c.thumbnail && <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover"/>}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.title}</p><p className="text-xs text-text-muted capitalize">{c.type}</p></div>
                  <div className="text-right"><p className="text-sm font-semibold">{c.viewCount?.toLocaleString()}</p><p className="text-xs text-text-muted">views</p></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
