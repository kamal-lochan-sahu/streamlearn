import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';

export default function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
  });

  const markRead = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const notifications = data?.notifications || [];
  const unread = data?.unread || 0;

  const TYPE_ICONS = {
    new_content: '🎬',
    live_reminder: '📡',
    sub_expiry: '⚠️',
    system: '🔔',
    welcome: '👋',
    payment: '💳',
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell size={22} className="text-brand" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unread > 0 && (
              <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="flex items-center gap-1.5 text-sm text-brand hover:text-white transition-colors"
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-bg-secondary rounded-xl animate-pulse" />
            ))
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bell size={48} className="text-text-muted mb-4" />
              <h3 className="text-lg font-bold mb-1">All caught up!</h3>
              <p className="text-text-secondary text-sm">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-bg-surface ${
                  n.isRead
                    ? 'bg-bg-secondary border-border opacity-70'
                    : 'bg-bg-secondary border-brand/30'
                }`}
                onClick={() => !n.isRead && markRead.mutate(n._id)}
              >
                <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center text-lg flex-shrink-0">
                  {TYPE_ICONS[n.type] || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-sm ${n.isRead ? 'text-text-secondary' : 'text-white'}`}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-text-muted mt-1">{formatDate(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
