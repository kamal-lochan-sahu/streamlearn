import { useQuery } from '@tanstack/react-query';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';

export default function AdminUsers() {
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/users/profile').then((r) => r.data.data),
  });
  const users = profile ? [profile] : [];

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <h1 className="text-2xl font-bold mb-8">Users</h1>
        <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['User', 'Role', 'Subscription', 'Joined', 'Status'].map((h) => (
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-text-secondary">
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
                      <Badge
                        variant={u.role === 'owner' ? 'brand' : 'default'}
                        className="capitalize"
                      >
                        {u.role}
                      </Badge>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
