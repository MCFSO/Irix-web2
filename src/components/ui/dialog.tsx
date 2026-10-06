import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Dialog(props: DialogProps) {
  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [props.open, props.onOpenChange])

  if (!props.open) return null

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={() => props.onOpenChange(false)}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-xl border bg-card p-5 shadow-lg',
          'max-h-[85vh] overflow-y-auto',
          props.className
        )}
        role='dialog'
        aria-modal='true'
      >
        <button
          className='absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground'
          onClick={() => props.onOpenChange(false)}
          aria-label='关闭'
        >
          <X className='size-4' />
        </button>
        {props.title && <h2 className='text-lg font-semibold'>{props.title}</h2>}
        {props.description && (
          <p className='mt-1 text-sm text-muted-foreground'>{props.description}</p>
        )}
        <div className={cn(props.title || props.description ? 'mt-4' : '')}>
          {props.children}
        </div>
        {props.footer && <div className='mt-5 flex justify-end gap-2'>{props.footer}</div>}
      </div>
    </div>,
    document.body
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmText?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={props.description}
      footer={
        <>
          <button
            className='inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 text-sm hover:bg-accent'
            onClick={() => props.onOpenChange(false)}
          >
            取消
          </button>
          <button
            className={
              props.destructive
                ? 'inline-flex h-9 items-center rounded-lg bg-destructive px-4 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50'
                : 'inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
            }
            disabled={props.loading}
            onClick={props.onConfirm}
          >
            {props.loading ? '处理中…' : props.confirmText ?? '确认'}
          </button>
        </>
      }
    >
      <span />
    </Dialog>
  )
}
