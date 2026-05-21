import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-sm border transition-all duration-1 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.985]'

    const variants = {
      primary:
        'bg-accent text-white border-transparent hover:bg-accent-hover active:bg-accent-press',
      secondary:
        'bg-transparent text-ink-2 border-line-strong hover:bg-paper-2 active:bg-paper-3',
      ghost: 'bg-transparent text-ink-2 border-transparent hover:bg-paper-2 active:bg-paper-3',
      danger: 'bg-danger text-white border-transparent hover:opacity-90',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
