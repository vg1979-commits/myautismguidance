import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-base text-ink-2',
            'placeholder:text-ink-4',
            'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-1',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-base text-ink-2',
            'placeholder:text-ink-4',
            'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-1 resize-none',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
