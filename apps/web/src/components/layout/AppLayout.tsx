import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />
      <main className="md:pl-[248px] pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
