import { NavLink, useNavigate } from 'react-router-dom'
import { Home, MessageSquare, BarChart2, Share2, User, LogOut } from 'lucide-react'
import { useClerk } from '@clerk/clerk-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app'

const navItems = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/checkin', icon: MessageSquare, label: 'Check-in' },
  { to: '/progress', icon: BarChart2, label: 'Progress' },
  { to: '/share', icon: Share2, label: 'Share' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function Sidebar() {
  const children = useAppStore((s) => s.children)
  const activeChildId = useAppStore((s) => s.activeChildId)
  const setActiveChildId = useAppStore((s) => s.setActiveChildId)
  const activeChild = children.find((c) => c.id === activeChildId)
  const { signOut } = useClerk()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/landing')
  }

  return (
    <aside className="hidden md:flex flex-col w-[248px] min-h-screen border-r border-line bg-white fixed top-0 left-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-line">
        <span className="font-serif text-xl text-ink-1 tracking-tight">myautismguidance</span>
      </div>

      {/* Child selector */}
      {activeChild && (
        <div className="px-4 py-3 border-b border-line">
          <p className="text-2xs text-ink-4 uppercase tracking-caps mb-1">Active child</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-pill bg-accent-soft flex items-center justify-center text-accent font-semibold text-sm">
              {activeChild.firstName[0]}
            </div>
            <span className="text-sm font-medium text-ink-2">{activeChild.firstName}</span>
          </div>
          {children.length > 1 && (
            <div className="mt-2 space-y-1">
              {children.filter((c) => c.id !== activeChildId).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChildId(c.id)}
                  className="w-full text-left text-xs text-ink-4 hover:text-ink-2 transition-colors px-1"
                >
                  Switch to {c.firstName}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-3">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-1 mb-0.5',
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-3 hover:bg-paper-2 hover:text-ink-2'
              )
            }
          >
            <Icon size={18} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-line space-y-2">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-ink-4 hover:bg-paper-2 hover:text-ink-2 transition-colors duration-1"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sign out
        </button>
        <p className="text-2xs text-ink-4 px-2">
          Not a clinical tool. Always consult your child's providers.
        </p>
      </div>
    </aside>
  )
}
