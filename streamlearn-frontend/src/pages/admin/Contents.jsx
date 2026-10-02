import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';

export default function AdminContents() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'movie',
    description: '',
    access: 'subscribers',
    genre: '',
  });
  const [uploading, setUploading] = useState({});
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content'],
    queryFn: () => api.get('/content?limit=50').then((r) => r.data.data),
  });

  const createContent = useMutation({
    mutationFn: (d) => api.post('/content/admin/create', d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-content']);
      setShowCreate(false);
      toast.success('Created!');
    },
  });
  const toggleContent = useMutation({
    mutationFn: (id) => api.put(`/content/admin/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries(['admin-content']),
  });
  const deleteContent = useMutation({
    mutationFn: (id) => api.delete(`/content/admin/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-content']);
      toast.success('Deleted');
    },
  });

  const uploadVideo = async (contentId, file) => {
    setUploading((u) => ({ ...u, [contentId]: 0 }));
    const fd = new FormData();
    fd.append('video', file);
    try {
      await api.post(`/content/admin/${contentId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) =>
          setUploading((u) => ({ ...u, [contentId]: Math.round((e.loaded * 100) / e.total) })),
      });
      toast.success('Upload complete! Transcoding started.');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading((u) => {
        const n = { ...u };
        delete n[contentId];
        return n;
      });
    }
  };

  const items = data?.items || [];

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Content</h1>
            <p className="text-text-secondary text-sm mt-1">{items.length} items</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Content', 'Type', 'Status', 'Video', 'Created', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-5 py-4">
                        <div className="h-4 bg-bg-elevated rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : items.map((item) => (
                    <tr key={item._id} className="hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 bg-bg-elevated rounded-lg overflow-hidden flex-shrink-0">
                            {item.thumbnail && (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-text-muted capitalize">{item.access}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className="capitalize">{item.type}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={item.isActive ? 'green' : 'default'}>
                          {item.isActive ? 'Live' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {uploading[item._id] !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-bg-elevated rounded-full h-1.5 w-20">
                              <div
                                className="bg-brand h-1.5 rounded-full"
                                style={{ width: `${uploading[item._id]}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-muted">{uploading[item._id]}%</span>
                          </div>
                        ) : (
                          <Badge
                            variant={
                              item.transcodeStatus === 'done'
                                ? 'green'
                                : item.transcodeStatus === 'processing'
                                  ? 'yellow'
                                  : 'default'
                            }
                          >
                            {item.transcodeStatus || 'none'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-text-secondary">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <label
                            className="p-1.5 text-text-muted hover:text-white cursor-pointer"
                            title="Upload video"
                          >
                            <Upload size={15} />
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) =>
                                e.target.files?.[0] && uploadVideo(item._id, e.target.files[0])
                              }
                            />
                          </label>
                          <button
                            onClick={() => toggleContent.mutate(item._id)}
                            className="p-1.5 text-text-muted hover:text-white"
                          >
                            {item.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete?')) deleteContent.mutate(item._id);
                            }}
                            className="p-1.5 text-text-muted hover:text-red-400"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Content">
          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Title *"
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand"
                >
                  {['movie', 'series', 'course', 'documentary', 'short'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Access</label>
                <select
                  value={form.access}
                  onChange={(e) => setForm((f) => ({ ...f, access: e.target.value }))}
                  className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand"
                >
                  <option value="free">Free</option>
                  <option value="subscribers">Subscribers</option>
                  <option value="ppv">Pay Per View</option>
                </select>
              </div>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
              rows={3}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() =>
                  createContent.mutate({
                    ...form,
                    genre: form.genre ? form.genre.split(',').map((g) => g.trim()) : [],
                  })
                }
                disabled={!form.title || createContent.isPending}
                className="flex-1 bg-brand hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {createContent.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 bg-bg-surface border border-border rounded-xl hover:bg-bg-elevated text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
