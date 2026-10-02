import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Edit2, Plus, Trash2 } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });

  const updateProfile = useMutation({
    mutationFn: (data) => api.put('/users/profile', data),
    onSuccess: (res) => {
      updateUser(res.data.data);
      toast.success('Updated');
      setEditing(false);
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.put('/users/avatar', fd);
    },
    onSuccess: (res) => {
      updateUser({ avatar: res.data.data.avatar });
      toast.success('Avatar updated');
    },
  });

  const profiles = user?.profiles || [];

  return (
    <div className="min-h-screen bg-bg-primary pt-16">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-8">Account</h1>
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <div className="flex items-start gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-xl bg-brand flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0]?.toUpperCase()
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-bg-elevated border border-border rounded-lg flex items-center justify-center cursor-pointer hover:bg-bg-surface">
                  <Camera size={13} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadAvatar.mutate(e.target.files[0])}
                  />
                </label>
              </div>
              <div className="flex-1">
                {editing ? (
                  <div className="space-y-3">
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
                    />
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone"
                      className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateProfile.mutate(form)}
                        className="px-4 py-2 bg-brand text-white text-sm rounded-lg hover:bg-red-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-4 py-2 bg-bg-surface text-sm rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold">{user?.name}</h2>
                      <button
                        onClick={() => setEditing(true)}
                        className="text-text-muted hover:text-white"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <p className="text-text-secondary text-sm">{user?.email}</p>
                    {user?.phone && (
                      <p className="text-text-secondary text-sm mt-0.5">{user.phone}</p>
                    )}
                    <span className="inline-flex items-center mt-2 px-2.5 py-1 bg-brand/20 text-brand rounded-full text-xs font-medium capitalize">
                      {user?.role}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Profiles</h3>
              {profiles.length < 5 && (
                <button
                  onClick={() => {
                    const n = prompt('Profile name?');
                    if (n)
                      api.post('/users/profiles', { name: n }).then(() => window.location.reload());
                  }}
                  className="flex items-center gap-1.5 text-sm text-brand hover:text-white"
                >
                  <Plus size={16} /> Add
                </button>
              )}
            </div>
            <div className="space-y-2">
              {profiles.map((p, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-3 rounded-xl ${i === user?.activeProfile ? 'bg-brand/10 border border-brand/30' : 'hover:bg-bg-surface'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center font-bold text-sm">
                    {p.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{p.name}</p>
                    {i === user?.activeProfile && <p className="text-xs text-brand">Active</p>}
                  </div>
                  {i > 0 && (
                    <button
                      onClick={() =>
                        api.delete(`/users/profiles/${i}`).then(() => window.location.reload())
                      }
                      className="text-text-muted hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
