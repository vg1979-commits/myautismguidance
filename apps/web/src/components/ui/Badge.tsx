import { cn, settingBadgeClass, settingLabel } from '@/lib/utils'
import type { SettingType } from '@myautismguidance/shared-types'

interface BadgeProps {
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-paper-3 text-ink-3',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-accent-soft text-accent',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-0.5 text-2xs font-medium tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

interface SettingBadgeProps {
  setting: SettingType
  className?: string
}

export function SettingBadge({ setting, className }: SettingBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-0.5 text-2xs font-medium',
        settingBadgeClass(setting),
        className
      )}
    >
      {settingLabel(setting)}
    </span>
  )
}
