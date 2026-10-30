import { useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText } from 'lucide-react';
import VideoPlayer from '../../components/player/VideoPlayer';
import Loader from '../../components/common/Loader';
import useProgressSaver from '../../hooks/useProgressSaver';
import api from '../../services/api';

// Reasons the server can refuse a stream, as the viewer should read them
const BLOCKED_TEXT = {
  401: ['Please sign in to watch.', 'Your session has ended.'],
  403: ['Subscription or purchase required.', 'Subscribe or buy this title to start watching.'],
  404: [
    'Stream not available.',
    'The video may still be processing, or it is no longer available.',
  ],
};

/**
 * /player/:id            id is a title slug (an id works too)
 * /player/:id?type=episode   id is an episode id
 */
export default function Watch() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const type = sp.get('type') === 'episode' ? 'episode' : 'content';
  // a new key per video: saving state starts fresh, and the old video's last position is saved
  // with the old video's id when the next episode takes over
  return <WatchVideo key={`${type}:${id}`} id={id} type={type} />;
}

function WatchVideo({ id, type }) {
  const navigate = useNavigate();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const contentIdRef = useRef(null);

  const { data: streamData, isLoading } = useQuery({
    queryKey: ['stream', id, type],
    // a signed link is short-lived and the resume position changes: never reuse an old answer
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const url = type === 'episode' ? `/episodes/${id}/stream` : `/content/${id}/stream`;
      try {
        const res = await api.get(url, { silent: true });
        return res.data.data;
      } catch (err) {
        return { blocked: err.response?.status || 0, message: err.response?.data?.message };
      }
    },
  });
  contentIdRef.current = streamData?.contentId || null;

  const { onProgress, onPause, finish } = useProgressSaver((seconds) => {
    if (!contentIdRef.current) return null;
    return api.put(
      '/users/continue-watching',
      {
        contentId: contentIdRef.current,
        episodeId: type === 'episode' ? id : undefined,
        timestamp: seconds,
      },
      { silent: true }
    );
  });

  const handleEnded = async () => {
    finish();
    // next episode starts by itself; anything else leaves "continue watching"
    if (type === 'episode' && streamData?.nextEpisodeId) {
      navigate(`/player/${streamData.nextEpisodeId}?type=episode`, { replace: true });
      return;
    }
    if (streamData?.contentId)
      api
        .delete(`/users/continue-watching/${streamData.contentId}`, { silent: true })
        .catch(() => {});
  };

  if (isLoading) return <Loader fullScreen />;

  if (!streamData?.url) {
    const [title, hint] = BLOCKED_TEXT[streamData?.blocked] || BLOCKED_TEXT[404];
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-white text-lg">{title}</p>
        <p className="text-text-secondary text-sm">{streamData?.message || hint}</p>
        {streamData?.blocked === 401 && (
          <button onClick={() => navigate('/login')} className="text-brand hover:underline text-sm">
            Sign in
          </button>
        )}
        {streamData?.blocked === 403 && (
          <button
            onClick={() => navigate('/subscription')}
            className="text-brand hover:underline text-sm"
          >
            See plans
          </button>
        )}
        <button onClick={() => navigate(-1)} className="text-brand hover:underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white hover:text-white/80"
        >
          <ArrowLeft size={20} />
          <span className="text-sm hidden sm:block">Back</span>
        </button>
        <button
          onClick={() => setShowNotes((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${showNotes ? 'bg-brand text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <FileText size={15} /> Notes
        </button>
      </div>

      <div className="flex flex-1">
        <div className={`${showNotes ? 'flex-1' : 'w-full'} flex items-center bg-black`}>
          <VideoPlayer
            src={streamData.url}
            poster={streamData.thumbnail}
            startTime={streamData.resumeAt || 0}
            onProgress={onProgress}
            onPause={onPause}
            onEnded={handleEnded}
            options={{ autoPlay: true }}
          />
        </div>
        {showNotes && (
          <div className="w-80 bg-bg-secondary border-l border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm">My Notes</h3>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write notes here..."
              className="flex-1 bg-transparent p-4 text-sm text-white placeholder:text-text-muted focus:outline-none resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
