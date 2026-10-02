import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function ProfileSelect() {
  const navigate = useNavigate();
  const { user, switchProfile } = useAuthStore();
  const profiles = user?.profiles || [];
  const handleSelect = async (index) => {
    try {
      await api.put(`/users/profiles/${index}/switch`);
    } catch {}
    switchProfile(index);
    navigate('/');
  };
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-black mb-12">Who's watching?</h1>
      <div className="flex flex-wrap gap-6 justify-center">
        {profiles.map((profile, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            className="flex flex-col items-center gap-3 group"
          >
            <div
              className={`w-24 h-24 rounded-xl flex items-center justify-center text-3xl font-black text-white border-4 transition-all ${i === user?.activeProfile ? 'border-brand' : 'border-transparent group-hover:border-white'} ${profile.kidMode ? 'bg-blue-600' : 'bg-brand'}`}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                profile.name?.[0]?.toUpperCase()
              )}
            </div>
            <span
              className={`text-sm font-medium transition-colors ${i === user?.activeProfile ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}
            >
              {profile.name}
            </span>
          </button>
        ))}
        {profiles.length < 5 && (
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border group-hover:border-white transition-colors flex items-center justify-center">
              <Plus
                size={32}
                className="text-text-muted group-hover:text-white transition-colors"
              />
            </div>
            <span className="text-sm text-text-secondary group-hover:text-white transition-colors">
              Add Profile
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
