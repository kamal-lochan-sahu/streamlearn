import { TrendingUp, TrendingDown } from 'lucide-react'
export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendValue, color='brand' }) {
  const colors = {
    brand:  'bg-brand/10 text-brand',
    green:  'bg-green-500/10 text-green-400',
    blue:   'bg-blue-500/10 text-blue-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  }
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>
          {Icon && <Icon size={20}/>}
        </div>
        {trendValue !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend==='up'?'text-green-400':'text-red-400'}`}>
            {trend === 'up' ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
            {trendValue}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
    </div>
  )
}
