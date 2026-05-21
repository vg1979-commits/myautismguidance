import { NavLink } from 'react-router-dom'
import { Home, MessageSquare, BarChart2, Share2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/checkin', icon: MessageSquare, label: 'Check-in' },
  { to: '/progress', icon: BarChart2, label: 'Progress' },
  { to: '/share', icon: Share2, label: 'Share' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper/92 backdrop-blur-[20px]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-md transition-colors duration-1 min-w-0',
                isActive ? 'text-accent' : 'text-ink-4'
              )
            }
          >
            <Icon size={22} strokeWidth={1.5} />
            <span className="text-2xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
