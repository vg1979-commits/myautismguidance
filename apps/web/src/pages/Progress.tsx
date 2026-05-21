import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppStore } from '@/store/app'
import { getProgress } from '@/lib/api'
import { cn, trendIcon, trendColor } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { DOMAIN_LABELS } from '@myautismguidance/shared-types'
import type { ProgressData, DomainCode } from '@myautismguidance/shared-types'

const MOCK_PROGRESS: ProgressData = {
  domainStates: [
    { id: '1', childId: 'c1', domainCode: 'regulation', state: 'ACTIVE', trendDirection: 'improving', weeksInState: 3, enteredAt: new Date().toISOString() },
    { id: '2', childId: 'c1', domainCode: 'social', state: 'ACTIVE', trendDirection: 'stable', weeksInState: 6, enteredAt: new Date().toISOString() },
    { id: '3', childId: 'c1', domainCode: 'communication', state: 'ACTIVE', trendDirection: 'improving', weeksInState: 4, enteredAt: new Date().toISOString() },
    { id: '4', childId: 'c1', domainCode: 'sensory', state: 'ACTIVE', trendDirection: 'deteriorating', weeksInState: 2, enteredAt: new Date().toISOString() },
    { id: '5', childId: 'c1', domainCode: 'adl', state: 'ACHIEVED', trendDirection: 'stable', weeksInState: 8, enteredAt: new Date().toISOString() },
  ],
  weeklyTrends: [
    { week: 1, domain: 'regulation', direction: 'stable' },
    { week: 2, domain: 'regulation', direction: 'stable' },
    { week: 3, domain: 'regulation', direction: 'improving' },
    { week: 4, domain: 'regulation', direction: 'improving' },
  ],
  recentWins: [
    { domainCode: 'adl', achievedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  ],
  topStrategies: [
    { strategyType: 'Countdown warnings', thumbsUpRate: 0.87 },
    { strategyType: 'Interest-based scripts', thumbsUpRate: 0.75 },
    { strategyType: 'Sensory breaks', thumbsUpRate: 0.68 },
  ],
}

const TREND_DATA = [
  { week: 'Wk 1', regulation: 2, social: 2, communication: 1 },
  { week: 'Wk 2', regulation: 2, social: 2, communication: 2 },
  { week: 'Wk 3', regulation: 3, social: 2, communication: 2 },
  { week: 'Wk 4', regulation: 3, social: 2, communication: 3 },
]

type Period = '4w' | '8w' | '12w' | 'all'
const PERIOD_LABELS: Record<Period, string> = {
  '4w': 'Last 4 weeks',
  '8w': 'Last 8 weeks',
  '12w': 'Last 12 weeks',
  all: 'Since start',
}

const STATE_LABELS: Record<string, string> = {
  CALIBRATING: 'Calibrating',
  ACTIVE: 'Active focus',
  PLATEAU: 'Plateau',
  REGRESSING: 'Regressing',
  ACHIEVED: 'Achieved',
  GENERALIZING: 'Generalizing',
  ARCHIVED: 'Archived',
}

const STATE_VARIANT: Record<string, string> = {
  ACHIEVED: 'text-success bg-success-soft border-success/20',
  ACTIVE: 'text-accent bg-accent-soft border-accent/20',
  CALIBRATING: 'text-ink-4 bg-paper-3 border-line',
  PLATEAU: 'text-warning bg-warning-soft border-warning/20',
  REGRESSING: 'text-danger bg-danger-soft border-danger/20',
  GENERALIZING: 'text-success bg-success-soft border-success/20',
  ARCHIVED: 'text-ink-4 bg-paper-3 border-line',
}

export function Progress() {
  const navigate = useNavigate()
  const { activeChildId } = useAppStore()
  const [period, setPeriod] = useState<Period>('4w')
  const [data, setData] = useState<ProgressData>(MOCK_PROGRESS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeChildId) return
    setLoading(true)
    getProgress(activeChildId, period === '4w' ? 4 : period === '8w' ? 8 : 12)
      .then(setData)
      .catch(() => setData(MOCK_PROGRESS))
      .finally(() => setLoading(false))
  }, [activeChildId, period])

  const activeDomains = data.domainStates.filter((d) => d.state !== 'ACHIEVED' && d.state !== 'ARCHIVED')
  const achievedDomains = data.domainStates.filter((d) => d.state === 'ACHIEVED')

  return (
    <div className="min-h-screen bg-paper">
      <div className="h-14 border-b border-line bg-white flex items-center px-5 gap-3 sticky top-0 z-10">
        <h1 className="font-semibold text-ink-1">Progress</h1>
      </div>

      <div className="max-w-dashboard mx-auto px-5 md:px-8 py-6">
        {/* Period selector */}
        <div className="flex gap-1 mb-6 p-1 bg-paper-2 rounded-sm w-fit">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-xs transition-colors duration-1',
                period === p ? 'bg-white text-ink-1 font-medium shadow-xs' : 'text-ink-4 hover:text-ink-2'
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Domain status grid */}
        <section className="mb-8">
          <h2 className="font-serif text-2xl text-ink-1 mb-4">Domain status</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {activeDomains.map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/progress/domain/${d.domainCode}`)}
                  className="card p-4 text-left hover:shadow-md transition-shadow duration-2 cursor-pointer active:scale-[0.985]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={cn(
                        'text-2xs font-medium px-2 py-0.5 rounded-pill border',
                        STATE_VARIANT[d.state]
                      )}
                    >
                      {STATE_LABELS[d.state]}
                    </span>
                    <span className={cn('text-lg font-medium', trendColor(d.trendDirection))}>
                      {trendIcon(d.trendDirection)}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-ink-1">{DOMAIN_LABELS[d.domainCode]}</p>
                  <p className="text-xs text-ink-4 mt-1">{d.weeksInState} weeks in this state</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent wins */}
        {achievedDomains.length > 0 && (
          <section className="mb-8">
            <h2 className="font-serif text-2xl text-ink-1 mb-4">Recent wins</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievedDomains.map((d) => (
                <div key={d.id} className="card p-4 border-success/20 bg-success-soft flex items-center gap-4">
                  <div className="w-10 h-10 rounded-pill bg-success flex items-center justify-center text-white text-lg flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-ink-1">{DOMAIN_LABELS[d.domainCode]}</p>
                    <p className="text-xs text-success">Achieved — {d.weeksInState} weeks ago</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trend chart */}
        <section className="mb-8">
          <h2 className="font-serif text-2xl text-ink-1 mb-4">Trends</h2>
          <div className="card p-5">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={TREND_DATA}>
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#8A8273' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 4]} hide />
                <Tooltip
                  contentStyle={{ border: '1px solid var(--line)', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="regulation" stroke="#1F4E79" strokeWidth={2} dot={false} name="Regulation" />
                <Line type="monotone" dataKey="social" stroke="#375623" strokeWidth={2} dot={false} name="Social" />
                <Line type="monotone" dataKey="communication" stroke="#6A1B9A" strokeWidth={2} dot={false} name="Communication" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-3">
              {[
                { label: 'Regulation', color: '#1F4E79' },
                { label: 'Social', color: '#375623' },
                { label: 'Communication', color: '#6A1B9A' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-ink-4">
                  <span className="w-4 h-0.5 inline-block rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top strategies */}
        <section>
          <h2 className="font-serif text-2xl text-ink-1 mb-4">What's working</h2>
          <div className="card divide-y divide-line">
            {data.topStrategies.map(({ strategyType, thumbsUpRate }) => (
              <div key={strategyType} className="flex items-center justify-between px-5 py-4">
                <span className="text-sm text-ink-2">{strategyType}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-paper-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: `${thumbsUpRate * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-4 w-8 text-right">
                    {Math.round(thumbsUpRate * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
