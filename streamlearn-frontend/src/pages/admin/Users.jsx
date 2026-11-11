import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

const ROLES = ['viewer', 'creator', 'admin'];
const selectClass =
  'bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand';

export default function AdminUsers() {
  const me = useAuthStore((s) => s.user);
  const isOwner = me?.role === 'owner';
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, role, status],
    queryFn: () =>
      api
        .get('/users/admin/all', {
          params: {
            page,
            limit: 20,
            search: search || undefined,
            role: role || undefined,
            status: status || undefined,
          },
        })
        .then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
  const users = data?.users || [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/users/admin/${id}/status`, { isActive }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      refresh();
    },
  });
  const setUserRole = useMutation({
    mutationFn: ({ id, role: newRole }) => api.put(`/users/admin/${id}/role`, { role: newRole }),
    onSuccess: () => {
      toast.success('Role updated');
      refresh();
    },
  });

  // Same rules as the server: nobody edits themselves or the owner, only the owner edits admins
  const canEdit = (u) => u._id !== me?._id && u.role !== 'owner' && (u.role !== 'admin' || isOwner);

  const reset = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-text-secondary text-sm mt-1">{data?.total ?? 0} accounts</p>
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            value={search}
            onChange={reset(setSearch)}
            placeholder="Search name or email..."
            className={`${selectClass} w-64`}
          />
          <select value={role} onChange={reset(setRole)} className={selectClass}>
            <option value="">All roles</option>
            {[...ROLES, 'owner'].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={status} onChange={reset(setStatus)} className={selectClass}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['User', 'Role', 'Subscription', 'Joined', 'Status', ''].map((h) => (
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
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8">
                    <div className="h-4 bg-bg-elevated rounded animate-pulse" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-text-secondary">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-bg-elevated/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            u.name?.[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.name}</p>
                          <p className="text-xs text-text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {isOwner && canEdit(u) ? (
                        <select
                          value={u.role}
                          onChange={(e) => setUserRole.mutate({ id: u._id, role: e.target.value })}
                          className="bg-bg-elevated border border-border rounded-lg px-2 py-1 text-xs capitalize"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge
                          variant={u.role === 'owner' ? 'brand' : 'default'}
                          className="capitalize"
                        >
                          {u.role}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={u.subscription?.status === 'active' ? 'green' : 'default'}>
                        {u.subscription?.status || 'none'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-xs text-text-secondary">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={u.isActive ? 'green' : 'red'}>
                        {u.isActive ? 'Active' : 'Banned'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      {canEdit(u) && (
                        <button
                          onClick={() => {
                            const verb = u.isActive ? 'Ban' : 'Restore';
                            if (confirm(`${verb} ${u.email}?`))
                              setActive.mutate({ id: u._id, isActive: !u.isActive });
                          }}
                          className={`text-xs ${u.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                        >
                          {u.isActive ? 'Ban' : 'Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
