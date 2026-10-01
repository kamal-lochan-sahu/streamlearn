import { useQuery } from '@tanstack/react-query'
import AdminSidebar from '../../components/admin/AdminSidebar'
import Badge from '../../components/ui/Badge'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/formatters'

export default function AdminTransactions() {
  const { data=[], isLoading } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => api.get('/payments/history?limit=50').then(r => r.data.data),
  })
  const STATUS = { success:'green', pending:'yellow', failed:'red', refunded:'blue' }
  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar/>
      <main className="ml-64 flex-1 p-8">
        <h1 className="text-2xl font-bold mb-8">Transactions</h1>
        <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {['Transaction','Amount','Gateway','Status','Date'].map(h => (
                <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {isLoading ? [...Array(8)].map((_,i)=><tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-bg-elevated rounded animate-pulse"/></td></tr>)
              : !data.length ? <tr><td colSpan={5} className="text-center py-16 text-text-secondary">No transactions yet</td></tr>
              : data.map(t => (
                <tr key={t._id} className="hover:bg-bg-elevated/50">
                  <td className="px-5 py-4"><p className="text-sm font-medium capitalize">{t.type}</p><p className="text-xs text-text-muted font-mono">{t._id?.slice(-8)}</p></td>
                  <td className="px-4 py-4 font-semibold text-sm">{formatCurrency(t.amount, t.currency)}</td>
                  <td className="px-4 py-4"><Badge className="capitalize">{t.gateway||'manual'}</Badge></td>
                  <td className="px-4 py-4"><Badge variant={STATUS[t.status]||'default'}>{t.status}</Badge></td>
                  <td className="px-4 py-4 text-xs text-text-secondary">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
