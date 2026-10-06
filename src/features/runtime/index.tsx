import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Coffee } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/misc'
import { getJavaRuntime } from '@/lib/api'

export function RuntimePage() {
  const ready = useNodeReady()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['java-runtime'],
    queryFn: getJavaRuntime,
    enabled: ready,
  })

  const all = data?.all ?? []
  const def = data?.default ?? null

  return (
    <div className='space-y-4'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>运行时</h1>
        <p className='text-sm text-muted-foreground'>节点上可用的 Java 运行时环境</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Java 运行时</CardTitle>
          <CardDescription>检测到的 JDK / JRE 安装</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {!ready ? (
            <NodeEmpty />
          ) : isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState
              message={error instanceof Error ? error.message : '加载失败'}
              onRetry={() => refetch()}
            />
          ) : all.length === 0 ? (
            <EmptyState
              icon={<Coffee className='size-10' />}
              title='未检测到 Java 运行时'
              description='节点上没有找到可用的 Java 环境'
            />
          ) : (
            <div className='divide-y'>
              {all.map((rt, idx) => (
                <div key={`${rt.path}-${idx}`} className='flex items-center gap-3 px-4 py-3'>
                  <Coffee className='size-4 shrink-0 text-warning' />
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium'>
                        {rt.version || '未知版本'}
                      </span>
                      {rt.vendor && (
                        <span className='text-xs text-muted-foreground'>
                          {rt.vendor}
                        </span>
                      )}
                      {rt.major > 0 && (
                        <Badge variant='outline'>JDK {rt.major}</Badge>
                      )}
                    </div>
                    <p className='mt-0.5 truncate font-mono text-xs text-muted-foreground'>
                      {rt.path}
                    </p>
                  </div>
                  {def?.path === rt.path && (
                    <Badge variant='success'>
                      <CheckCircle2 className='size-3' />
                      默认
                    </Badge>
                  )}
                  <Badge variant={rt.available ? 'success' : 'secondary'}>
                    {rt.available ? '可用' : '不可用'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
