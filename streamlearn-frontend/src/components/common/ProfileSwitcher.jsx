import { useAuthStore } from '../../store/authStore'
import { getInitials } from '../../utils/formatters'

export default function ProfileSwitcher({ onSwitch }) {
  const { user, activeProfileIndex, switchProfile } = useAuthStore()
  const profiles = user?.profiles || []

  const handleSwitch = (index) => {
    switchProfile(index)
    onSwitch?.(index)
  }

  return (
    <div className="flex flex-col gap-4">
      {profiles.map((profile, index) => (
        <button key={index} onClick={() => handleSwitch(index)}
          className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
            index === activeProfileIndex
              ? 'bg-brand/20 border border-brand/50'
              : 'hover:bg-bg-surface border border-transparent'
          }`}>
          <div className="w-10 h-10 rounded-full bg-bg-surface flex items-center justify-center font-bold text-sm">
            {profile.avatar
              ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover rounded-full" />
              : getInitials(profile.name)
            }
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">{profile.name}</p>
            {profile.kidMode && <p className="text-xs text-text-secondary">Kids</p>}
          </div>
        </button>
      ))}
    </div>
  )
}
