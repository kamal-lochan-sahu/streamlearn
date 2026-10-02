import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, Check, Star, Clock, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Badge from '../../components/ui/Badge';
import Loader from '../../components/common/Loader';
import api from '../../services/api';
import { formatDuration } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ContentDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandSection, setExpandSection] = useState(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', slug],
    queryFn: () => api.get(`/content/${slug}`).then((r) => r.data.data),
  });

  const { data: wlCheck } = useQuery({
    queryKey: ['wl-check', content?._id],
    queryFn: () => api.get(`/watchlist/check/${content._id}`).then((r) => r.data.data),
    enabled: !!content?._id,
  });

  const { data: progress } = useQuery({
    queryKey: ['progress', content?._id],
    queryFn: () => api.get(`/progress/content/${content._id}`).then((r) => r.data.data),
    enabled: !!content?._id && content?.type === 'course',
  });

  const toggleWL = useMutation({
    mutationFn: () =>
      wlCheck?.inWatchlist
        ? api.delete(`/watchlist/remove/${content._id}`)
        : api.post(`/watchlist/add/${content._id}`),
    onSuccess: () => {
      qc.invalidateQueries(['wl-check', content._id]);
      toast.success(wlCheck?.inWatchlist ? 'Removed from watchlist' : 'Added to watchlist');
    },
  });

  const handlePlay = () => {
    if (content.type === 'series') {
      const ep = content.episodes?.[0];
      if (ep) navigate(`/player/${ep._id}?type=episode`);
      else toast.error('No episodes yet');
    } else if (content.type === 'course') {
      const lec = content.sections?.[0]?.lectures?.[0];
      if (lec) navigate(`/learn/${content._id}/${lec._id}`);
      else toast.error('No lectures yet');
    } else {
      navigate(`/player/${content._id}`);
    }
  };

  if (isLoading) return <Loader fullScreen />;
  if (!content)
    return (
      <div className="min-h-screen bg-bg-primary pt-16 flex items-center justify-center">
        <Navbar />
        <p className="text-text-secondary">Content not found.</p>
      </div>
    );

  const isCourse = content.type === 'course';

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="relative h-[60vh] overflow-hidden">
        <img
          src={content.banner || content.thumbnail}
          alt={content.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-3xl">
          <Badge variant="brand" size="md" className="mb-3 capitalize">
            {content.type}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight">
            {content.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-text-secondary">
            {content.rating?.average > 0 && (
              <span className="flex items-center gap-1 text-green-400 font-semibold">
                <Star size={14} fill="currentColor" /> {content.rating.average.toFixed(1)}
              </span>
            )}
            {content.releaseYear && <span>{content.releaseYear}</span>}
            {content.duration && (
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {formatDuration(content.duration)}
              </span>
            )}
            {isCourse && (
              <span className="flex items-center gap-1">
                <BookOpen size={13} />
                {content.totalLectures} lectures
              </span>
            )}
          </div>
          {content.genre?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {content.genre.map((g) => (
                <Badge key={g}>{g}</Badge>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 bg-white text-black font-bold px-7 py-3 rounded-lg hover:bg-white/90 transition-colors"
            >
              <Play size={18} fill="black" />
              {progress?.completionPercent > 0 ? 'Resume' : isCourse ? 'Start Course' : 'Play'}
            </button>
            <button
              onClick={() => toggleWL.mutate()}
              className={`flex items-center gap-2 font-semibold px-5 py-3 rounded-lg border transition-all ${wlCheck?.inWatchlist ? 'bg-white/20 border-white' : 'bg-bg-surface/80 border-border hover:border-white text-text-secondary hover:text-white'}`}
            >
              {wlCheck?.inWatchlist ? <Check size={18} /> : <Plus size={18} />}
              {wlCheck?.inWatchlist ? 'Saved' : 'Watchlist'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-3">About</h2>
              <p className="text-text-secondary leading-relaxed">{content.description}</p>
            </div>

            {isCourse && content.sections?.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Curriculum</h2>
                <div className="space-y-2">
                  {content.sections.map((section, si) => (
                    <div
                      key={section._id}
                      className="border border-border rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandSection(expandSection === si ? null : si)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-bg-secondary hover:bg-bg-surface transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{section.title}</span>
                          <Badge>{section.lectures?.length || 0} lectures</Badge>
                        </div>
                        {expandSection === si ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {expandSection === si &&
                        section.lectures?.map((lec, li) => (
                          <button
                            key={lec._id}
                            onClick={() => navigate(`/learn/${content._id}/${lec._id}`)}
                            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-bg-elevated transition-colors border-t border-border/50 text-left"
                          >
                            <span className="text-xs text-text-muted w-5">{li + 1}</span>
                            <Play size={14} className="text-text-muted" />
                            <span className="text-sm flex-1">{lec.title}</span>
                            {lec.isFreePreview && <Badge variant="green">Free</Badge>}
                            {lec.duration && (
                              <span className="text-xs text-text-muted">
                                {formatDuration(lec.duration)}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {content.type === 'series' && content.episodes?.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Episodes</h2>
                <div className="space-y-2">
                  {content.episodes.map((ep) => (
                    <button
                      key={ep._id}
                      onClick={() => navigate(`/player/${ep._id}?type=episode`)}
                      className="w-full flex items-center gap-4 p-4 bg-bg-secondary border border-border rounded-xl hover:bg-bg-surface transition-colors text-left"
                    >
                      {ep.thumbnail && (
                        <img
                          src={ep.thumbnail}
                          alt={ep.title}
                          className="w-28 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          S{ep.seasonNumber}E{ep.episodeNumber} — {ep.title}
                        </p>
                        {ep.description && (
                          <p className="text-text-secondary text-xs mt-1 line-clamp-2">
                            {ep.description}
                          </p>
                        )}
                      </div>
                      {ep.duration && (
                        <span className="text-xs text-text-muted">
                          {formatDuration(ep.duration)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {isCourse && progress && (
              <div className="bg-bg-secondary border border-border rounded-xl p-5">
                <p className="font-semibold mb-3">Your Progress</p>
                <div className="w-full bg-bg-elevated rounded-full h-2 mb-2">
                  <div
                    className="bg-brand h-2 rounded-full"
                    style={{ width: `${progress.completionPercent}%` }}
                  />
                </div>
                <p className="text-sm text-text-secondary">
                  {progress.completionPercent}% complete
                </p>
              </div>
            )}
            <div className="bg-bg-secondary border border-border rounded-xl p-5 space-y-3">
              {content.language?.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Language</span>
                  <span>{content.language.join(', ')}</span>
                </div>
              )}
              {content.releaseYear && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Year</span>
                  <span>{content.releaseYear}</span>
                </div>
              )}
              {content.duration && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Duration</span>
                  <span>{formatDuration(content.duration)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
