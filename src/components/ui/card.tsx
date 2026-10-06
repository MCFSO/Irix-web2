import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
}

export interface StatCardProps {
  title: string
  value: ReactNode
  description?: ReactNode
  icon?: ReactNode
  className?: string
}

export function StatCard(props: StatCardProps) {
  return (
    <Card className={props.className}>
      <CardContent className='p-5'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-medium text-muted-foreground'>{props.title}</p>
          {props.icon && <div className='text-muted-foreground'>{props.icon}</div>}
        </div>
        <div className='mt-2 text-2xl font-bold tracking-tight'>{props.value}</div>
        {props.description && (
          <div className='mt-1 text-xs text-muted-foreground'>{props.description}</div>
        )}
      </CardContent>
    </Card>
  )
}
