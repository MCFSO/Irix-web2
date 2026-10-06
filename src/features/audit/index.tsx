import { useQuery } from '@tanstack/react-query'
import { FileClock, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/misc'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAuditLog } from '@/lib/api'
import { formatTime } from '@/lib/utils'

export function AuditPage() {
  const ready = useNodeReady()
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => getAuditLog(page, 50),
    retry: false,
    enabled: ready,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const maxPage = Math.max(1, Math.ceil(total / 50))

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>审计日志</h1>
          <p className='text-sm text-muted-foreground'>节点 API 请求审计记录（共 {total} 条）</p>
        </div>
        <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          刷新
        </Button>
      </div>

      <Card>
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
          ) : items.length === 0 ? (
            <EmptyState icon={<FileClock className='size-10' />} title='暂无审计记录' />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-40'>时间</TableHead>
                    <TableHead className='w-20'>方法</TableHead>
                    <TableHead>路径</TableHead>
                    <TableHead className='w-20'>状态</TableHead>
                    <TableHead className='w-28'>身份</TableHead>
                    <TableHead className='w-28'>来源 IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((entry, idx) => (
                    <TableRow key={`${entry.time}-${idx}`}>
                      <TableCell className='text-xs text-muted-foreground'>
                        {formatTime(entry.time)}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{entry.method}</Badge>
                      </TableCell>
                      <TableCell className='max-w-0 truncate font-mono text-xs' title={entry.path}>
                        {entry.path}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status < 300
                              ? 'success'
                              : entry.status < 500
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-xs'>{entry.identity || '-'}</TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {entry.ip || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {maxPage > 1 && (
                <div className='flex items-center justify-between border-t px-4 py-3'>
                  <p className='text-xs text-muted-foreground'>
                    第 {page} / {maxPage} 页
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page >= maxPage}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
