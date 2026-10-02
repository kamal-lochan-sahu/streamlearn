import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import VideoPlayer from '../../components/player/VideoPlayer';
import LiveChat from '../../components/live/LiveChat';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';

export default function LiveWatch() {
  const { id } = useParams();
  const { data: stream } = useQuery({
    queryKey: ['live', id],
    queryFn: () => api.get(`/live/${id}`).then((r) => r.data.data),
    refetchInterval: 10000,
  });
  const { data: streamUrl } = useQuery({
    queryKey: ['live-url', id],
    queryFn: () => api.get(`/live/${id}/stream-url`).then((r) => r.data.data),
    enabled: stream?.status === 'live',
    retry: 3,
  });

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="bg-bg-secondary border-b border-border px-6 py-3 flex items-center gap-3">
        {stream?.status === 'live' ? (
          <Badge variant="red" size="md">
            🔴 LIVE
          </Badge>
        ) : (
          <Badge>{stream?.status}</Badge>
        )}
        <h1 className="font-semibold text-sm truncate">{stream?.title}</h1>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-black">
          {streamUrl?.hlsUrl ? (
            <VideoPlayer src={streamUrl.hlsUrl} options={{ autoPlay: true }} />
          ) : (
            <div className="flex flex-col items-center gap-3 text-text-secondary">
              {stream?.status === 'scheduled' ? (
                <>
                  <div className="text-4xl">📅</div>
                  <p className="font-semibold">{stream?.title}</p>
                  <p className="text-sm">Stream hasn't started yet.</p>
                </>
              ) : (
                <>
                  <div className="text-4xl">📺</div>
                  <p>Stream ended.</p>
                </>
              )}
            </div>
          )}
        </div>
        <div className="w-80 flex-shrink-0">
          <LiveChat streamId={id} />
        </div>
      </div>
    </div>
  );
}
