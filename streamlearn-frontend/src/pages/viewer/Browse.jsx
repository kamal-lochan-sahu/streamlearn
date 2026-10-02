import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, X } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import ContentCard from '../../components/content/ContentCard';
import { ContentCardSkeleton } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { GENRES, LANGUAGES, CONTENT_TYPES } from '../../utils/constants';

export default function Browse() {
  const [filters, setFilters] = useState({ type: '', genre: '', language: '', page: 1 });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['browse', filters],
    queryFn: () => {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
      return api.get(`/content?${p}`).then((r) => r.data.data);
    },
  });

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: f[k] === v ? '' : v, page: 1 }));
  const active = Object.entries(filters).filter(([k, v]) => v && k !== 'page');

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Browse All</h1>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-border rounded-lg text-sm hover:border-white/40 transition-colors"
          >
            <Filter size={16} /> Filters
            {active.length > 0 && <Badge variant="brand">{active.length}</Badge>}
          </button>
        </div>

        {active.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {active.map(([k, v]) => (
              <button
                key={k}
                onClick={() => setFilter(k, v)}
                className="flex items-center gap-1 px-3 py-1 bg-brand/20 text-brand rounded-full text-xs font-medium hover:bg-brand/30"
              >
                {v} <X size={12} />
              </button>
            ))}
            <button
              onClick={() => setFilters({ type: '', genre: '', language: '', page: 1 })}
              className="text-xs text-text-secondary hover:text-white px-2"
            >
              Clear all
            </button>
          </div>
        )}

        {showFilters && (
          <div className="bg-bg-secondary border border-border rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                ['Type', 'type', CONTENT_TYPES],
                ['Genre', 'genre', GENRES],
                ['Language', 'language', LANGUAGES],
              ].map(([label, key, opts]) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {opts.map((o) => (
                      <button
                        key={o}
                        onClick={() => setFilter(key, o)}
                        className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${filters[key] === o ? 'bg-brand text-white' : 'bg-bg-surface hover:bg-bg-elevated text-text-secondary'}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(18)].map((_, i) => (
              <ContentCardSkeleton key={i} />
            ))}
          </div>
        ) : data?.items?.length > 0 ? (
          <>
            <p className="text-text-secondary text-sm mb-4">{data.total} titles</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {data.items.map((item) => (
                <ContentCard key={item._id} content={item} />
              ))}
            </div>
            {data.pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {[...Array(Math.min(data.pages, 10))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFilters((f) => ({ ...f, page: i + 1 }))}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${filters.page === i + 1 ? 'bg-brand text-white' : 'bg-bg-surface hover:bg-bg-elevated text-text-secondary'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">No content found</h3>
            <p className="text-text-secondary text-sm">Try different filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
