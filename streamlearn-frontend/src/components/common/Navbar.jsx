import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, ChevronDown, Menu, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { navTransparent, setNavTransparent } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfile, setShowProfile] = useState(false)
  const [showSearch, setShowSearch]   = useState(false)
  const [mobileMenu, setMobileMenu]   = useState(false)
  const [searchQ, setSearchQ]         = useState('')

  useEffect(() => {
    const fn = () => setNavTransparent(window.scrollY < 80)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setShowProfile(false); setMobileMenu(false) }, [location])

  const { data: unread = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data.data?.count || 0),
    refetchInterval: 60000,
    enabled: !!user,
  })

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/browse', label: 'Browse' },
    { to: '/live', label: 'Live' },
    { to: '/my-courses', label: 'Courses' },
    { to: '/watchlist', label: 'Watchlist' },
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQ.trim()) { navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`); setShowSearch(false); setSearchQ('') }
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navTransparent ? 'bg-transparent' : 'bg-bg-secondary/95 backdrop-blur-sm shadow-lg'}`}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-0.5 flex-shrink-0">
            <span className="text-brand font-black text-2xl tracking-tighter">STREAM</span>
            <span className="text-white font-black text-2xl tracking-tighter">LEARN</span>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`text-sm font-medium transition-colors ${location.pathname===l.to?'text-white':'text-text-secondary hover:text-white'}`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {showSearch ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search..." onBlur={() => !searchQ && setShowSearch(false)}
                  className="bg-bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-brand w-44"/>
                <button type="button" onClick={() => { setShowSearch(false); setSearchQ('') }}
                  className="text-text-secondary hover:text-white"><X size={16}/></button>
              </form>
            ) : (
              <button onClick={() => setShowSearch(true)} className="p-2 text-text-secondary hover:text-white">
                <Search size={19}/>
              </button>
            )}

            <button onClick={() => navigate('/notifications')} className="p-2 text-text-secondary hover:text-white relative">
              <Bell size={19}/>
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            <div className="relative">
              <button onClick={() => setShowProfile(s => !s)} className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover"/> : user?.name?.[0]?.toUpperCase()}
                </div>
                <ChevronDown size={14} className="text-text-secondary hidden sm:block"/>
              </button>
              {showProfile && (
                <div className="absolute right-0 top-11 w-52 bg-bg-secondary border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-semibold text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    {[
                      { to: '/profile', label: 'Account' },
                      { to: '/subscription', label: 'Subscription' },
                      ...(user?.role !== 'viewer' ? [{ to: '/admin', label: '⚡ Admin' }] : []),
                    ].map(item => (
                      <Link key={item.to} to={item.to}
                        className="block px-4 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-white transition-colors">
                        {item.label}
                      </Link>
                    ))}
                    <hr className="border-border my-1"/>
                    <button onClick={() => { logout(); navigate('/login') }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-bg-elevated transition-colors">
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button className="md:hidden p-2" onClick={() => setMobileMenu(s => !s)}>
              {mobileMenu ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} className="block px-2 py-2 text-sm text-text-secondary hover:text-white rounded-lg hover:bg-bg-surface">{l.label}</Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
