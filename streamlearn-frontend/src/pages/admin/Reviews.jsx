import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';

const selectClass =
  'bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand';

export default function AdminReviews() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [rating, setRating] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', page, status, rating],
    queryFn: () =>
      api
        .get('/reviews/admin/all', {
          params: { page, limit: 20, status, rating: rating || undefined },
        })
        .then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
  const reviews = data?.reviews || [];

  const setVisible = useMutation({
    mutationFn: ({ id, visible }) => api.put(`/reviews/admin/${id}/visibility`, { visible }),
    onSuccess: (_, { visible }) => {
      toast.success(visible ? 'Review restored' : 'Review hidden');
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-text-secondary text-sm mt-1">{data?.total ?? 0} reviews</p>
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden by staff</option>
          </select>
          <select
            value={rating}
            onChange={(e) => {
              setRating(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {isLoading && <div className="h-20 bg-bg-secondary rounded-xl animate-pulse" />}
          {!isLoading && reviews.length === 0 && (
            <p className="text-center py-16 text-text-secondary">No reviews found</p>
          )}
          {reviews.map((r) => (
            <div
              key={r._id}
              className="bg-bg-secondary border border-border rounded-xl p-5 flex gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1 text-sm">
                  <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                    <Star size={14} fill="currentColor" /> {r.rating}
                  </span>
                  <span className="font-medium truncate">
                    {r.contentId?.title || 'Deleted title'}
                  </span>
                  <span className="text-text-muted text-xs">
                    by {r.userId?.name || 'unknown'} ({r.userId?.email || '-'}) ·{' '}
                    {formatDate(r.createdAt)}
                  </span>
                  {r.moderated && <Badge variant="red">Hidden</Badge>}
                </div>
                {r.title && <p className="font-medium text-sm">{r.title}</p>}
                {r.body && (
                  <p className="text-sm text-text-secondary whitespace-pre-line break-words">
                    {r.body}
                  </p>
                )}
              </div>
              <button
                onClick={() => setVisible.mutate({ id: r._id, visible: !!r.moderated })}
                className={`self-start text-xs ${r.moderated ? 'text-green-400' : 'text-red-400'}`}
              >
                {r.moderated ? 'Restore' : 'Hide'}
              </button>
            </div>
          ))}
        </div>

        {data?.pages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-5 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 bg-bg-secondary border border-border rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-text-secondary">
              Page {data.page} of {data.pages}
            </span>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-bg-secondary border border-border rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
