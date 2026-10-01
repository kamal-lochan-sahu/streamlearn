import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Users, Send, ArrowLeft, Copy } from 'lucide-react'
import VideoPlayer from '../../components/player/VideoPlayer'
import Loader from '../../components/common/Loader'
import { useAuthStore } from '../../store/authStore'
import { watchPartySocket, connectWatchParty } from '../../socket/socket'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function WatchParty() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [partyState, setPartyState] = useState(null)

  const { data: party, isLoading } = useQuery({
    queryKey: ['party', id],
    queryFn: () => api.get(`/watchparty/${id}`).then(r => r.data.data),
  })

  const { data: streamData } = useQuery({
    queryKey: ['party-stream', party?.contentId?._id],
    queryFn: () => api.get(`/content/${party.contentId._id}/stream`).then(r => r.data.data),
    enabled: !!party?.contentId?._id,
  })

  useEffect(() => {
    connectWatchParty()
    watchPartySocket.emit('join-party', { partyId: id })
    watchPartySocket.on('party-state', (state) => setPartyState(state))
    watchPartySocket.on('sync-update', ({ timestamp, isPlaying }) => {
      setPartyState(s => ({ ...s, currentTimestamp: timestamp, isPlaying }))
    })
    watchPartySocket.on('party-chat', (msg) => setMessages(m => [...m.slice(-100), msg]))
    return () => {
      watchPartySocket.off('party-state')
      watchPartySocket.off('sync-update')
      watchPartySocket.off('party-chat')
    }
  }, [id])

  const sendMessage = () => {
    if (!input.trim()) return
    watchPartySocket.emit('chat', { partyId: id, message: input.trim() })
    setInput('')
  }

  const sync = (timestamp, isPlaying) => {
    if (party?.hostId?._id === user?._id || party?.hostId === user?._id) {
      watchPartySocket.emit('sync', { partyId: id, timestamp, isPlaying })
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(party?.code || '')
    toast.success('Party code copied!')
  }

  if (isLoading) return <Loader fullScreen/>

  const isHost = party?.hostId?._id === user?._id || party?.hostId === user?._id

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-white">
          <ArrowLeft size={20}/>
        </button>
        <div className="flex-1">
          <p className="font-semibold text-sm">{party?.contentId?.title}</p>
          <p className="text-xs text-text-secondary">{(partyState?.participants?.length || party?.participants?.length || 0)} watching</p>
        </div>
        <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border border-border rounded-lg text-xs hover:border-white transition-colors">
          <Copy size={12}/> {party?.code}
        </button>
        {isHost && <span className="text-xs text-brand font-medium">Host</span>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video */}
        <div className="flex-1 flex items-center bg-black">
          {streamData?.url
            ? <VideoPlayer src={streamData.url} startTime={partyState?.currentTimestamp || 0}
                onProgress={({ currentTime, duration }) => sync(currentTime, true)}
                options={{ autoPlay: true }}/>
            : <div className="flex items-center justify-center w-full h-full text-text-secondary">Loading stream...</div>
          }
        </div>

        {/* Party chat */}
        <div className="w-72 bg-bg-secondary border-l border-border flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Users size={15} className="text-text-secondary"/>
            <span className="text-sm font-semibold">Party Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.userId === user?._id ? 'text-right' : ''}`}>
                {msg.userId !== user?._id && (
                  <span className="text-xs text-brand font-medium block">{msg.name}</span>
                )}
                <span className={`inline-block px-3 py-1.5 rounded-xl text-sm ${
                  msg.userId === user?._id
                    ? 'bg-brand text-white'
                    : 'bg-bg-elevated text-text-secondary'
                }`}>{msg.message}</span>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Message..." className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-brand"/>
            <button onClick={sendMessage} className="p-2 bg-brand rounded-lg hover:bg-red-700 transition-colors">
              <Send size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
