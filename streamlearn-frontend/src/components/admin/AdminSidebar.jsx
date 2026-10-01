import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Film, Users, BarChart3,
  Settings, CreditCard, ListOrdered, Video,
  Tag, Bell
} from 'lucide-react'

const links = [
  { to:'/admin',              label:'Dashboard',    icon:LayoutDashboard },
  { to:'/admin/content',      label:'Content',      icon:Film },
  { to:'/admin/users',        label:'Users',        icon:Users },
  { to:'/admin/analytics',    label:'Analytics',    icon:BarChart3 },
  { to:'/admin/plans',        label:'Plans',        icon:ListOrdered },
  { to:'/admin/transactions', label:'Transactions', icon:CreditCard },
  { to:'/admin/settings',     label:'Settings',     icon:Settings },
]

export default function AdminSidebar() {
  const { pathname } = useLocation()
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-bg-secondary border-r border-border flex flex-col z-40">
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-0.5">
          <span className="text-brand font-black text-xl tracking-tighter">STREAM</span>
          <span className="text-white font-black text-xl tracking-tighter">LEARN</span>
        </Link>
        <p className="text-xs text-text-muted mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {links.map(({ to, label, icon:Icon }) => (
          <Link key={to} to={to}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
              pathname === to
                ? 'bg-brand/10 text-brand border-r-2 border-brand'
                : 'text-text-secondary hover:text-white hover:bg-bg-surface'
            }`}>
            <Icon size={17}/>
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <Link to="/" className="text-xs text-text-muted hover:text-white transition-colors">← Back to site</Link>
      </div>
    </aside>
  )
}
