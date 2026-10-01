import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Radio, Calendar, Users } from 'lucide-react'
import Navbar from '../../components/common/Navbar'
import Badge from '../../components/ui/Badge'
import api from '../../services/api'
import { formatDate } from '../../utils/formatters'

export default function LiveList() {
  const navigate = useNavigate()
  const { data: streams = [], isLoading } = useQuery({
    queryKey: ['live-streams'],
    queryFn: () => api.get('/live').then(r => r.data.data),
    refetchInterval: 30000,
  })

  const live     = streams.filter(s => s.status === 'live')
  const upcoming = streams.filter(s => s.status === 'scheduled')
  const past     = streams.filter(s => s.status === 'ended').slice(0, 9)

  const Card = ({ s }) => (
    <button onClick={() => navigate(`/live/${s._id}`)}
      className="group text-left bg-bg-secondary border border-border rounded-xl overflow-hidden hover:border-brand/50 transition-all">
      <div className="relative aspect-video bg-bg-surface overflow-hidden">
        {s.thumbnail
          ? <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
          : <div className="w-full h-full flex items-center justify-center"><Radio size={32} className="text-text-muted"/></div>
        }
        {s.status === 'live' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>LIVE
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-sm line-clamp-2 mb-2">{s.title}</p>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          {s.ownerId?.name && <span>{s.ownerId.name}</span>}
          {s.scheduledAt && <span className="flex items-center gap-1"><Calendar size={11}/>{formatDate(s.scheduledAt)}</span>}
        </div>
      </div>
    </button>
  )

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar/>
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl font-bold mb-8">Live Streams</h1>
        {live.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/><h2 className="font-semibold text-red-400">Live Now</h2></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{live.map(s => <Card key={s._id} s={s}/>)}</div>
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="mb-10">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Calendar size={18}/> Upcoming</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{upcoming.map(s => <Card key={s._id} s={s}/>)}</div>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <h2 className="font-semibold mb-4 text-text-secondary">Past Streams</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{past.map(s => <Card key={s._id} s={s}/>)}</div>
          </div>
        )}
        {!live.length && !upcoming.length && !isLoading && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Radio size={48} className="text-text-muted mb-4"/>
            <h3 className="text-xl font-bold mb-2">No live streams</h3>
            <p className="text-text-secondary text-sm">Check back later for upcoming events.</p>
          </div>
        )}
      </div>
    </div>
  )
}
