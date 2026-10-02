import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, Play } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { formatDuration } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function Watchlist() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.get('/watchlist').then((r) => r.data.data),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/watchlist/remove/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['watchlist']);
      toast.success('Removed');
    },
  });

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark size={24} className="text-brand" />
          <h1 className="text-2xl font-bold">My Watchlist</h1>
          {items.length > 0 && <Badge variant="brand">{items.length}</Badge>}
        </div>
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item._id}
                className="group bg-bg-secondary border border-border rounded-xl overflow-hidden hover:border-brand/40 transition-all"
              >
                <div
                  className="relative aspect-video bg-bg-surface overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/watch/${item.slug}`)}
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
                      No Image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <Play
                      size={32}
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white"
                    />
                  </div>
                </div>
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="capitalize text-xs">{item.type}</Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => remove.mutate(item._id)}
                    className="p-1 text-text-muted hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Bookmark size={48} className="text-text-muted mb-4" />
            <h3 className="text-xl font-bold mb-2">Watchlist is empty</h3>
            <p className="text-text-secondary text-sm mb-6">Save content to watch later.</p>
            <button
              onClick={() => navigate('/browse')}
              className="bg-brand hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Browse Content
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
