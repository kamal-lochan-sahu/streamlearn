import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Crown, Zap, Star } from 'lucide-react'
import Navbar from '../../components/common/Navbar'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/formatters'
import toast from 'react-hot-toast'

const ICONS = [Zap, Star, Crown]

export default function Subscription() {
  const { user } = useAuthStore()
  const [cycle, setCycle] = useState('monthly')
  const [loading, setLoading] = useState(null)

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/plans').then(r => r.data.data),
  })
  const { data: currentSub } = useQuery({
    queryKey: ['my-sub'],
    queryFn: () => api.get('/subscriptions/my').then(r => r.data.data),
  })

  const subscribe = async (plan) => {
    setLoading(plan._id)
    try {
      const { data } = await api.post('/payments/razorpay/create-order', { planId: plan._id, billingCycle: cycle })
      const options = {
        key: data.data.keyId, amount: data.data.amount, currency: data.data.currency,
        name: 'StreamLearn', description: `${plan.name} - ${cycle}`, order_id: data.data.orderId,
        handler: async (response) => {
          await api.post('/payments/razorpay/verify', response)
          toast.success('Subscription activated! 🎉')
          window.location.reload()
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#e50914' }
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed')
    } finally { setLoading(null) }
  }

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar/>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">Choose Your Plan</h1>
          <p className="text-text-secondary">Unlock unlimited streaming and learning</p>
        </div>

        {currentSub && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8 flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-400">✓ Active Subscription</p>
              <p className="text-sm text-text-secondary mt-0.5">Expires {formatDate(currentSub.endDate)}</p>
            </div>
            <button onClick={async () => { if(confirm('Cancel?')) { await api.put('/subscriptions/cancel'); toast.success('Cancelled'); window.location.reload() } }}
              className="text-xs text-text-secondary hover:text-red-400 border border-border rounded-lg px-3 py-1.5 transition-colors">Cancel</button>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mb-8">
          {['monthly','yearly'].map(c => (
            <button key={c} onClick={() => setCycle(c)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${cycle===c?'bg-brand text-white':'bg-bg-surface text-text-secondary hover:text-white'}`}>
              {c.charAt(0).toUpperCase()+c.slice(1)}
              {c==='yearly' && <span className="ml-1.5 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Save 20%</span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const Icon = ICONS[i % 3]
            const price = plan.price[cycle] || plan.price.monthly
            const isActive = currentSub?.planId?._id === plan._id || currentSub?.planId === plan._id
            return (
              <div key={plan._id}
                className={`relative bg-bg-secondary border rounded-2xl p-6 transition-all ${plan.isPopular?'border-brand shadow-lg shadow-brand/10 scale-105':'border-border hover:border-brand/40'}`}>
                {plan.isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-bold px-4 py-1 rounded-full">POPULAR</div>}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand/10 text-brand rounded-lg"><Icon size={20}/></div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black">{formatCurrency(price)}</span>
                  <span className="text-text-secondary text-sm">/{cycle==='monthly'?'mo':'yr'}</span>
                </div>
                <div className="space-y-2 mb-8">
                  {[
                    `${plan.features.maxProfiles} Profile${plan.features.maxProfiles>1?'s':''}`,
                    `${plan.features.quality} quality`,
                    plan.features.downloadEnabled && 'Downloads',
                    plan.features.liveAccess && 'Live streaming',
                    !plan.features.adsEnabled && 'Ad-free',
                  ].filter(Boolean).map((f,fi) => (
                    <div key={fi} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Check size={14} className="text-green-400 flex-shrink-0"/>{f}
                    </div>
                  ))}
                </div>
                <button onClick={() => !isActive && subscribe(plan)} disabled={isActive||loading===plan._id}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isActive?'bg-green-500/20 text-green-400 cursor-default':plan.isPopular?'bg-brand hover:bg-red-700 text-white':'bg-bg-surface hover:bg-bg-elevated text-white border border-border'} disabled:opacity-60`}>
                  {isActive?'✓ Current Plan':loading===plan._id?'Processing...':'Get Started'}
                </button>
              </div>
            )
          })}
        </div>
        {!plans.length && <div className="text-center py-16 text-text-secondary">No plans available yet.</div>}
      </div>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async/>
    </div>
  )
}
