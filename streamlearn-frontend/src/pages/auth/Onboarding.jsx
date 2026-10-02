import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import api from '../../services/api';
import { GENRES, LANGUAGES } from '../../utils/constants';

export default function Onboarding() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState({ genres: [], languages: [] });
  const [saving, setSaving] = useState(false);
  const toggle = (key, val) =>
    setSelected((s) => ({
      ...s,
      [key]: s[key].includes(val) ? s[key].filter((v) => v !== val) : [...s[key], val],
    }));
  const save = async () => {
    setSaving(true);
    try {
      await api.put('/users/profiles/0', { preferences: selected });
    } catch {}
    navigate('/');
  };
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">What do you like?</h1>
          <p className="text-text-secondary">Personalize your experience</p>
        </div>
        <div className="mb-8">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Genres
          </p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => {
              const active = selected.genres.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => toggle('genres', g)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${active ? 'bg-brand border-brand text-white' : 'border-border text-text-secondary hover:border-white hover:text-white'}`}
                >
                  {active && <Check size={13} />}
                  {g}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mb-10">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Languages
          </p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const active = selected.languages.includes(l);
              return (
                <button
                  key={l}
                  onClick={() => toggle('languages', l)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${active ? 'bg-brand border-brand text-white' : 'border-border text-text-secondary hover:border-white hover:text-white'}`}
                >
                  {active && <Check size={13} />}
                  {l}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={save}
            disabled={saving}
            className="px-10 py-3 bg-brand hover:bg-red-700 text-white rounded-xl font-bold text-sm disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Continue →'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 text-text-secondary hover:text-white text-sm"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
