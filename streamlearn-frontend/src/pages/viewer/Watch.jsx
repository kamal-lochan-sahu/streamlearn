import { useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, FileText } from 'lucide-react'
import { useState } from 'react'
import VideoPlayer from '../../components/player/VideoPlayer'
import Loader from '../../components/common/Loader'
import api from '../../services/api'

export default function Watch() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const type = sp.get('type') || 'content'
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const saveTimer = useRef(null)

  const { data: streamData, isLoading } = useQuery({
    queryKey: ['stream', id, type],
    queryFn: async () => {
      if (type === 'episode') {
        return api.get(`/episodes/${id}/stream`).then(r => r.data.data)
      }
      return api.get(`/content/${id}/stream`).then(r => r.data.data).catch(() => null)
    },
  })

  const { data: progress } = useQuery({
    queryKey: ['progress-ts', id],
    queryFn: () => api.get(`/progress/content/${id}`).then(r => r.data.data).catch(() => null),
  })

  const saveProgress = useMutation({
    mutationFn: (ts) => api.put('/users/continue-watching', { contentId: id, timestamp: ts }),
  })

  const handleProgress = ({ currentTime }) => {
    if (!currentTime || currentTime < 5) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveProgress.mutate(Math.floor(currentTime)), 5000)
  }

  if (isLoading) return <Loader fullScreen/>

  if (!streamData?.url) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <p className="text-white text-lg">Stream not available.</p>
      <p className="text-text-secondary text-sm">Video may still be processing.</p>
      <button onClick={() => navigate(-1)} className="text-brand hover:underline text-sm">Go back</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft size={20}/><span className="text-sm hidden sm:block">Back</span>
        </button>
        <button onClick={() => setShowNotes(s => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${showNotes?'bg-brand text-white':'bg-white/10 text-white hover:bg-white/20'}`}>
          <FileText size={15}/> Notes
        </button>
      </div>

      <div className="flex flex-1">
        <div className={`${showNotes?'flex-1':'w-full'} flex items-center bg-black`}>
          <VideoPlayer
            src={streamData.url}
            poster={streamData.thumbnail}
            startTime={progress?.lastTimestamp || 0}
            onProgress={handleProgress}
            options={{ autoPlay: true }}
          />
        </div>
        {showNotes && (
          <div className="w-80 bg-bg-secondary border-l border-border flex flex-col">
            <div className="p-4 border-b border-border"><h3 className="font-semibold text-sm">My Notes</h3></div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Write notes here..."
              className="flex-1 bg-transparent p-4 text-sm text-white placeholder:text-text-muted focus:outline-none resize-none"/>
          </div>
        )}
      </div>
    </div>
  )
}
