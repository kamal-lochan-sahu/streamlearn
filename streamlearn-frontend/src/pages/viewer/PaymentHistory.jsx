import { useQuery } from '@tanstack/react-query'
import { CreditCard, Download } from 'lucide-react'
import Navbar from '../../components/common/Navbar'
import Badge from '../../components/ui/Badge'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/formatters'

export default function PaymentHistory() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => api.get('/payments/history').then(r => r.data.data),
  })

  const STATUS_COLORS = { success:'green', pending:'yellow', failed:'red', refunded:'blue' }

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar/>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <CreditCard size={22} className="text-brand"/>
          <h1 className="text-2xl font-bold">Payment History</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_,i) => <div key={i} className="h-16 bg-bg-secondary rounded-xl animate-pulse"/>)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CreditCard size={48} className="text-text-muted mb-4"/>
            <h3 className="text-xl font-bold mb-2">No payments yet</h3>
            <p className="text-text-secondary text-sm">Your payment history will appear here.</p>
          </div>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
            {transactions.map((t, i) => (
              <div key={t._id} className={`flex items-center gap-4 p-4 ${i < transactions.length-1 ? 'border-b border-border' : ''} hover:bg-bg-elevated transition-colors`}>
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
                  <CreditCard size={18}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm capitalize">{t.planId?.name || t.type}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{formatDate(t.createdAt)} · {t.gateway}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatCurrency(t.amount, t.currency)}</p>
                  <Badge variant={STATUS_COLORS[t.status] || 'default'} className="mt-1">{t.status}</Badge>
                </div>
                {t.invoiceUrl && (
                  <a href={t.invoiceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-text-muted hover:text-white transition-colors">
                    <Download size={15}/>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
