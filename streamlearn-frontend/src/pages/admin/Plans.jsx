import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Check } from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const DEF = {
  name: '',
  price: { monthly: 0, yearly: 0, lifetime: 0 },
  features: {
    maxProfiles: 1,
    quality: '1080p',
    simultaneousStreams: 1,
    downloadEnabled: true,
    liveAccess: true,
    adsEnabled: false,
  },
  isPopular: false,
};

export default function AdminPlans() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEF);
  const qc = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => api.get('/plans/admin/all').then((r) => r.data.data),
  });
  const createPlan = useMutation({
    mutationFn: (d) => api.post('/plans/admin/create', d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-plans']);
      setShowModal(false);
      setForm(DEF);
      toast.success('Plan created');
    },
  });
  const deletePlan = useMutation({
    mutationFn: (id) => api.delete(`/plans/admin/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-plans']);
      toast.success('Deleted');
    },
  });

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Plans</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            <Plus size={16} /> Create Plan
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`bg-bg-secondary border rounded-2xl p-6 ${plan.isPopular ? 'border-brand' : 'border-border'}`}
            >
              {plan.isPopular && (
                <Badge variant="brand" size="md" className="mb-3">
                  POPULAR
                </Badge>
              )}
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <button
                  onClick={() => deletePlan.mutate(plan._id)}
                  className="p-1.5 text-text-muted hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="space-y-1 mb-4 text-sm text-text-secondary">
                <div className="flex justify-between">
                  <span>Monthly</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(plan.price.monthly)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Yearly</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(plan.price.yearly)}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-green-400" />
                  {plan.features.maxProfiles} profiles
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-green-400" />
                  {plan.features.quality} quality
                </div>
                {plan.features.downloadEnabled && (
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-green-400" />
                    Downloads
                  </div>
                )}
              </div>
              <Badge variant={plan.isActive ? 'green' : 'default'} className="mt-4">
                {plan.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          ))}
        </div>
        <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Plan" size="lg">
          <div className="space-y-4">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Plan name *"
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand"
            />
            <div className="grid grid-cols-3 gap-3">
              {['monthly', 'yearly', 'lifetime'].map((c) => (
                <div key={c}>
                  <label className="block text-xs text-text-secondary mb-1 capitalize">
                    {c} (₹)
                  </label>
                  <input
                    type="number"
                    value={form.price[c]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        price: { ...f.price, [c]: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Max Profiles</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.features.maxProfiles}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      features: { ...f.features, maxProfiles: parseInt(e.target.value) },
                    }))
                  }
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Quality</label>
                <select
                  value={form.features.quality}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, features: { ...f.features, quality: e.target.value } }))
                  }
                  className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
                >
                  {['480p', '720p', '1080p', '4K'].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              {[
                ['downloadEnabled', 'Downloads'],
                ['liveAccess', 'Live'],
                ['isPopular', 'Popular'],
              ].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={k === 'isPopular' ? form.isPopular : form.features[k]}
                    onChange={(e) =>
                      k === 'isPopular'
                        ? setForm((f) => ({ ...f, isPopular: e.target.checked }))
                        : setForm((f) => ({
                            ...f,
                            features: { ...f.features, [k]: e.target.checked },
                          }))
                    }
                    className="accent-brand"
                  />
                  {l}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => createPlan.mutate(form)}
                disabled={!form.name || createPlan.isPending}
                className="flex-1 bg-brand hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {createPlan.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowModal(false)}
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
