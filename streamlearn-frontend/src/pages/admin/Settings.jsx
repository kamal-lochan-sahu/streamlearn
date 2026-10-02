import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save, Palette, Zap } from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [tab, setTab] = useState('branding');
  const [branding, setBranding] = useState({ name: '', primaryColor: '#e50914', tagline: '' });
  const [features, setFeatures] = useState({});

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
  });
  useEffect(() => {
    if (settings?.platform) setBranding(settings.platform);
    if (settings?.features) setFeatures(settings.features);
  }, [settings]);

  const saveBranding = useMutation({
    mutationFn: () => api.put('/settings/branding', branding),
    onSuccess: () => toast.success('Saved'),
  });
  const saveFeatures = useMutation({
    mutationFn: () => api.put('/settings/features', features),
    onSuccess: () => toast.success('Saved'),
  });

  const LABELS = {
    ottMode: 'OTT Mode',
    educationMode: 'Education Mode',
    liveStreaming: 'Live Streaming',
    downloads: 'Downloads',
    community: 'Community',
    watchParty: 'Watch Party',
    dppSystem: 'DPP System',
    certificate: 'Certificates',
    ppv: 'Pay Per View',
    subscription: 'Subscriptions',
    freeContent: 'Free Content',
    kidsProfile: 'Kids Profile',
    adsEnabled: 'Ads',
  };

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>
        <div className="flex gap-1 mb-8 bg-bg-secondary border border-border rounded-xl p-1 w-fit">
          {[
            ['branding', 'Branding', Palette],
            ['features', 'Features', Zap],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-brand text-white' : 'text-text-secondary hover:text-white'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'branding' && (
          <div className="bg-bg-secondary border border-border rounded-2xl p-6 max-w-2xl space-y-5">
            <h2 className="font-semibold">Platform Branding</h2>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Name</label>
              <input
                value={branding.name || ''}
                onChange={(e) => setBranding((b) => ({ ...b, name: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Tagline</label>
              <input
                value={branding.tagline || ''}
                onChange={(e) => setBranding((b) => ({ ...b, tagline: e.target.value }))}
                placeholder="Watch, Learn, Grow"
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.primaryColor || '#e50914'}
                  onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <input
                  value={branding.primaryColor || '#e50914'}
                  onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                  className="flex-1 bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand font-mono"
                />
              </div>
            </div>
            <button
              onClick={() => saveBranding.mutate()}
              className="flex items-center gap-2 bg-brand hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              <Save size={15} />
              {saveBranding.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {tab === 'features' && (
          <div className="bg-bg-secondary border border-border rounded-2xl p-6 max-w-2xl">
            <h2 className="font-semibold mb-6">Feature Toggles</h2>
            <div className="space-y-3">
              {Object.entries(LABELS).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-text-muted">{key}</p>
                  </div>
                  <button
                    onClick={() => setFeatures((f) => ({ ...f, [key]: !f[key] }))}
                    className={`relative w-11 h-6 rounded-full transition-all ${features[key] ? 'bg-brand' : 'bg-bg-elevated border border-border'}`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${features[key] ? 'left-5' : 'left-0.5'}`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => saveFeatures.mutate()}
              className="flex items-center gap-2 bg-brand hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold mt-6"
            >
              <Save size={15} />
              {saveFeatures.isPending ? 'Saving...' : 'Save Features'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
