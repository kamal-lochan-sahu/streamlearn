import { Link, useLocation } from 'react-router-dom'
import { Home, Search, Video, BookOpen, User } from 'lucide-react'

const tabs = [
  { to: '/',           icon: Home,     label: 'Home'    },
  { to: '/browse',     icon: Search,   label: 'Browse'  },
  { to: '/live',       icon: Video,    label: 'Live'    },
  { to: '/my-courses', icon: BookOpen, label: 'Learn'   },
  { to: '/profile',    icon: User,     label: 'Profile' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg-secondary/95 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <Link key={to} to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                active ? 'text-brand' : 'text-text-muted'
              }`}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5}/>
              <span className={`text-[10px] font-medium ${active ? 'text-brand' : 'text-text-muted'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
