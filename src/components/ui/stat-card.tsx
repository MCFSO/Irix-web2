import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'accent-1' | 'accent-2' | 'accent-3'

const TONE_BG: Record<Tone, string> = {
  'accent-1': 'bg-[color-mix(in_oklch,var(--overview-accent-1)_8%,var(--card))]',
  'accent-2': 'bg-[color-mix(in_oklch,var(--overview-accent-2)_8%,var(--card))]',
  'accent-3': 'bg-[color-mix(in_oklch,var(--overview-accent-3)_8%,var(--card))]',
}

const TONE_ICON: Record<Tone, string> = {
  'accent-1': 'text-[var(--overview-accent-1)]',
  'accent-2': 'text-[var(--overview-accent-2)]',
  'accent-3': 'text-[var(--overview-accent-3)]',
}

const TONE_BAR: Record<Tone, string> = {
  'accent-1': 'bg-[var(--overview-accent-1)]',
  'accent-2': 'bg-[var(--overview-accent-2)]',
  'accent-3': 'bg-[var(--overview-accent-3)]',
}

export interface StatCardProps {
  title: string
  value: ReactNode
  description?: ReactNode
  icon: LucideIcon
  tone?: Tone
  /** 0~100 的进度条值 */
  progress?: number
  className?: string
}

export function StatCard(props: StatCardProps) {
  const Icon = props.icon
  const tone = props.tone ?? 'accent-3'
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border p-4',
        TONE_BG[tone],
        props.className
      )}
    >
      <div className='flex items-center gap-2'>
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-lg bg-card',
            TONE_ICON[tone]
          )}
        >
          <Icon className='size-4' />
        </div>
        <span className='text-xs font-medium text-muted-foreground'>
          {props.title}
        </span>
      </div>
      <div className='font-mono text-xl font-semibold tracking-tight tabular-nums'>
        {props.value}
      </div>
      {props.description && (
        <div className='text-xs text-muted-foreground'>{props.description}</div>
      )}
      {props.progress !== undefined && props.progress >= 0 && (
        <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
          <div
            className={cn('h-full rounded-full transition-all', TONE_BAR[tone])}
            style={{ width: `${Math.min(100, Math.max(0, props.progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
