import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SettingType } from '@myautismguidance/shared-types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function settingBadgeClass(setting: SettingType): string {
  const map: Record<SettingType, string> = {
    home: 'badge-home',
    school: 'badge-school',
    therapy: 'badge-therapy',
    community: 'badge-community',
  }
  return map[setting]
}

export function settingLabel(setting: SettingType): string {
  const map: Record<SettingType, string> = {
    home: 'Home',
    school: 'School',
    therapy: 'Therapy',
    community: 'Community',
  }
  return map[setting]
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

export function formatWeekRange(date: string | Date): string {
  const d = new Date(date)
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (dt: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dt)
  return `${fmt(start)} – ${fmt(end)}`
}

export function trendIcon(direction: string): string {
  if (direction === 'improving') return '↑'
  if (direction === 'deteriorating') return '↓'
  return '→'
}

export function trendColor(direction: string): string {
  if (direction === 'improving') return 'text-success'
  if (direction === 'deteriorating') return 'text-danger'
  return 'text-ink-4'
}
