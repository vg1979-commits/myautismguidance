import { useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChevronRight, Plus, LogOut, Trash2, Download, Bell, Shield } from 'lucide-react'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section>
      <h2 className="font-semibold text-ink-1 mb-3">{title}</h2>
      <div className="card divide-y divide-line">{children}</div>
    </section>
  )
}

function Row({
  label,
  value,
  action,
  onClick,
  danger,
}: {
  label: string
  value?: string
  action?: string
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors duration-1 hover:bg-paper-2 ${
        !onClick ? 'cursor-default hover:bg-transparent' : ''
      }`}
      disabled={!onClick}
    >
      <div>
        <p className={`text-sm font-medium ${danger ? 'text-danger' : 'text-ink-2'}`}>{label}</p>
        {value && <p className="text-xs text-ink-4 mt-0.5">{value}</p>}
      </div>
      {action && <span className="text-sm text-accent font-medium">{action}</span>}
      {onClick && !action && <ChevronRight size={16} className="text-ink-4" />}
    </button>
  )
}

export function Profile() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const { children, activeChildId, setActiveChildId } = useAppStore()
  const activeChild = children.find((c) => c.id === activeChildId)

  const [checkinDay, setCheckinDay] = useState('Monday')
  const [reminders, setReminders] = useState(true)
  const [transparencyMode, setTransparencyMode] = useState(true)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="h-14 border-b border-line bg-white flex items-center px-5 sticky top-0 z-10">
        <h1 className="font-semibold text-ink-1">Profile & settings</h1>
      </div>

      <div className="max-w-reading mx-auto px-5 py-6 space-y-6 pb-10">
        {/* Child profile */}
        {activeChild && (
          <Section title="Child profile">
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-pill bg-accent flex items-center justify-center text-white font-semibold text-lg">
                  {activeChild.firstName[0]}
                </div>
                <div>
                  <p className="font-semibold text-ink-1">{activeChild.firstName}</p>
                  <p className="text-sm text-ink-4">
                    {activeChild.schoolSetting?.replace(/-/g, ' ')} · {activeChild.diagnosisStatus}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="secondary" onClick={() => navigate('/onboarding/baseline')}>
                  Edit profile
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/onboarding/iep-upload')}>
                  Update IEP document
                </Button>
              </div>
            </div>
          </Section>
        )}

        {/* My account */}
        <Section title="My account">
          <Row label="Name" value={user?.fullName || user?.emailAddresses[0]?.emailAddress} />
          <Row label="Email" value={user?.emailAddresses[0]?.emailAddress} />
          <Row label="Change password" action="Update" onClick={() => {}} />
          <Row label="Add another caregiver" action="Invite" onClick={() => {}} />
        </Section>

        {/* Check-in settings */}
        <Section title="Check-in settings">
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-2">Check-in day</p>
                <p className="text-xs text-ink-4 mt-0.5">When to be prompted for your weekly check-in</p>
              </div>
              <select
                value={checkinDay}
                onChange={(e) => setCheckinDay(e.target.value)}
                className="text-sm border border-line-strong rounded-sm px-2 py-1 text-ink-2 focus:outline-none focus:border-accent"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-2">Reminders</p>
                <p className="text-xs text-ink-4 mt-0.5">Email reminder on check-in day</p>
              </div>
              <button
                onClick={() => setReminders(!reminders)}
                className={`w-10 h-5.5 rounded-pill relative transition-colors duration-2 ${
                  reminders ? 'bg-accent' : 'bg-paper-3'
                }`}
                style={{ height: '22px' }}
              >
                <span
                  className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform duration-2 ${
                    reminders ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                  style={{ width: '18px', height: '18px', top: '2px', left: reminders ? '18px' : '2px' }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-2">Signal review</p>
                <p className="text-xs text-ink-4 mt-0.5">Show what the app understood from each check-in</p>
              </div>
              <button
                onClick={() => setTransparencyMode(!transparencyMode)}
                className={`relative transition-colors duration-2 rounded-pill ${
                  transparencyMode ? 'bg-accent' : 'bg-paper-3'
                }`}
                style={{ width: '40px', height: '22px' }}
              >
                <span
                  className="absolute rounded-full bg-white shadow-xs transition-all duration-2"
                  style={{ width: '18px', height: '18px', top: '2px', left: transparencyMode ? '18px' : '2px' }}
                />
              </button>
            </div>
          </div>
        </Section>

        {/* Children */}
        <Section title="Children">
          {children.map((c) => (
            <Row
              key={c.id}
              label={c.firstName}
              value={c.id === activeChildId ? 'Active' : 'Switch to this child'}
              onClick={c.id !== activeChildId ? () => setActiveChildId(c.id) : undefined}
            />
          ))}
          {children.length < 3 && (
            <div className="px-5 py-3">
              <Button size="sm" variant="ghost" onClick={() => navigate('/onboarding/welcome')}>
                <Plus size={14} /> Add another child
              </Button>
            </div>
          )}
        </Section>

        {/* Subscription */}
        <Section title="Subscription">
          <Row label="Free plan" value="All features included during beta" />
          <Row label="Manage subscription" action="View" onClick={() => {}} />
        </Section>

        {/* Data & privacy */}
        <Section title="Data & privacy">
          <Row
            label="Download my data"
            action="Export"
            onClick={() => {}}
          />
          <Row
            label="Delete IEP document"
            action="Delete"
            onClick={() => {}}
            danger
          />
          <div className="px-5 py-4">
            <a href="#" className="text-sm text-accent hover:text-accent-hover">
              Privacy policy
            </a>
          </div>
        </Section>

        {/* Sign out */}
        <div className="card p-5">
          <Button variant="danger" onClick={handleSignOut} className="w-full">
            <LogOut size={16} /> Sign out
          </Button>
        </div>

        <div className="card p-5">
          <Button variant="ghost" onClick={() => {}} className="w-full text-danger hover:text-danger">
            <Trash2 size={16} /> Delete my account
          </Button>
        </div>

        <p className="text-xs text-ink-4 text-center pb-4">
          myautismguidance is not a clinical tool. Always work with your child's providers.
        </p>
      </div>
    </div>
  )
}
