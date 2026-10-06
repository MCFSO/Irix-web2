import { Loader2 } from 'lucide-react'
import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} />
}

export function LoadingState({ text = '加载中…' }: { text?: string }) {
  return (
    <div className='flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground'>
      <Spinner className='size-6' />
      <p className='text-sm'>{text}</p>
    </div>
  )
}

export function EmptyState(props: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className='flex h-40 flex-col items-center justify-center gap-2 text-center'>
      {props.icon && <div className='text-muted-foreground'>{props.icon}</div>}
      <p className='text-sm font-medium'>{props.title}</p>
      {props.description && <p className='text-sm text-muted-foreground'>{props.description}</p>}
      {props.action && <div className='mt-2'>{props.action}</div>}
    </div>
  )
}

export function ErrorState(props: { message: string; onRetry?: () => void }) {
  return (
    <div className='flex h-40 flex-col items-center justify-center gap-2 text-center'>
      <p className='text-sm text-destructive'>{props.message}</p>
      {props.onRetry && (
        <button
          className='mt-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-accent'
          onClick={props.onRetry}
        >
          重试
        </button>
      )}
    </div>
  )
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all',
          clamped > 90 ? 'bg-destructive' : clamped > 70 ? 'bg-warning' : 'bg-primary'
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export function Switch(props: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={props.checked}
      disabled={props.disabled}
      onClick={() => props.onCheckedChange(!props.checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.checked ? 'bg-primary' : 'bg-input',
        props.className
      )}
    >
      <span
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-white shadow transition-transform',
          props.checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-sm font-medium leading-none text-foreground', className)}
      {...props}
    />
  )
}

export function Checkbox(props: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <input
      type='checkbox'
      checked={props.checked}
      disabled={props.disabled}
      onChange={(e) => props.onCheckedChange(e.target.checked)}
      className={cn(
        'size-4 cursor-pointer rounded border-input accent-primary disabled:cursor-not-allowed',
        props.className
      )}
    />
  )
}

export function Select(props: {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <select
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onValueChange(e.target.value)}
      className={cn(
        'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.className
      )}
    >
      {props.placeholder !== undefined && <option value=''>{props.placeholder}</option>}
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Tabs(props: {
  value: string
  onValueChange: (value: string) => void
  tabs: { value: string; label: ReactNode }[]
  className?: string
}) {
  return (
    <div className={cn('inline-flex h-9 items-center rounded-lg bg-muted p-1', props.className)}>
      {props.tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => props.onValueChange(tab.value)}
          className={cn(
            'inline-flex h-7 items-center justify-center gap-1 rounded-md px-3 text-sm font-medium transition-all',
            props.value === tab.value
              ? 'bg-background text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-border', className)} />
}

export function Tooltip(props: { content: ReactNode; children: ReactNode }) {
  return (
    <span className='group relative inline-flex'>
      {props.children}
      <span className='pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100'>
        {props.content}
      </span>
    </span>
  )
}
