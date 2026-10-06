import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Skull,
  Square,
  Terminal,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ErrorState, LoadingState, Tabs } from '@/components/ui/misc'
import {
  clearInstanceLogs,
  deleteInstances,
  getInstance,
  getInstanceLogs,
  getInstanceStats,
  getOutputLog,
  InstanceStatus,
  killInstance,
  restartInstance,
  sendCommand,
  startInstance,
  stopInstance,
} from '@/lib/api'
import { formatBytes, formatPercent, formatTime } from '@/lib/utils'
import { statusBadge } from './index'
import { InstanceSettings } from './settings'
import { useNavigate } from '@tanstack/react-router'

export function InstanceDetailPage() {
  const ready = useNodeReady()
  const { uuid } = useParams({ from: '/authed/instances/$uuid' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('console')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteFiles, setDeleteFiles] = useState(false)

  const { data: instance, isLoading, error, refetch } = useQuery({
    queryKey: ['instance', uuid],
    queryFn: () => getInstance(uuid),
    refetchInterval: ready ? 5000 : false,
    enabled: ready,
  })

  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      switch (action) {
        case 'start':
          return startInstance(uuid)
        case 'stop':
          return stopInstance(uuid)
        case 'restart':
          return restartInstance(uuid)
        case 'kill':
          return killInstance(uuid)
      }
    },
    onSuccess: (_, action) => {
      const labels: Record<string, string> = {
        start: '启动',
        stop: '停止',
        restart: '重启',
        kill: '强制终止',
      }
      toast.success(`${labels[action]}指令已发送`)
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['instance', uuid] }), 800)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '操作失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteInstances([uuid], deleteFiles),
    onSuccess: () => {
      toast.success('实例已删除')
      navigate({ to: '/instances' })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '删除失败'),
  })

  if (!ready)
    return (
      <Card>
        <CardContent>
          <NodeEmpty />
        </CardContent>
      </Card>
    )
  if (isLoading) return <LoadingState />
  if (error || !instance)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : '实例不存在'}
        onRetry={() => refetch()}
      />
    )

  const running = instance.status === InstanceStatus.Running
  const stopped = instance.status === InstanceStatus.Stopped

  return (
    <div className='space-y-4'>
      {/* 页头 */}
      <div className='flex flex-wrap items-center gap-3'>
        <Link to='/instances'>
          <Button variant='ghost' size='icon-sm'>
            <ArrowLeft />
          </Button>
        </Link>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='truncate text-xl font-bold tracking-tight'>
              {instance.config.nickname || '未命名实例'}
            </h1>
            {statusBadge(instance.status)}
          </div>
          <p className='truncate text-sm text-muted-foreground'>{instance.config.cwd}</p>
        </div>
        <div className='flex items-center gap-1.5'>
          {stopped && (
            <Button size='sm' disabled={actionMutation.isPending} onClick={() => actionMutation.mutate('start')}>
              <Play />
              启动
            </Button>
          )}
          {running && (
            <>
              <Button size='sm' variant='outline' disabled={actionMutation.isPending} onClick={() => actionMutation.mutate('stop')}>
                <Square />
                停止
              </Button>
              <Button size='sm' variant='outline' disabled={actionMutation.isPending} onClick={() => actionMutation.mutate('restart')}>
                <RotateCcw />
                重启
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='text-destructive'
                disabled={actionMutation.isPending}
                onClick={() => actionMutation.mutate('kill')}
              >
                <Skull />
              </Button>
            </>
          )}
          <Button
            size='sm'
            variant='outline'
            className='text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            删除
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'console', label: '控制台' },
          { value: 'stats', label: '监控' },
          { value: 'logs', label: '历史日志' },
          { value: 'settings', label: '实例设置' },
        ]}
      />

      {tab === 'console' && <ConsoleTab uuid={uuid} running={running} />}
      {tab === 'stats' && <StatsTab uuid={uuid} />}
      {tab === 'logs' && <LogsTab uuid={uuid} />}
      {tab === 'settings' && <InstanceSettings instance={instance} />}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='删除实例'
        description={
          <div className='space-y-3'>
            <p>确定要删除实例「{instance.config.nickname}」吗？此操作不可撤销。</p>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                className='size-4 rounded border-input accent-destructive'
                checked={deleteFiles}
                onChange={(e) => setDeleteFiles(e.target.checked)}
              />
              同时删除实例工作目录下的所有文件
            </label>
          </div>
        }
        confirmText='删除'
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}

// ---------- 控制台 ----------
function ConsoleTab({ uuid, running }: { uuid: string; running: boolean }) {
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { refetch } = useQuery({
    queryKey: ['outputlog', uuid],
    queryFn: async () => {
      const text = await getOutputLog(uuid)
      setOutput(text ?? '')
      return text
    },
    refetchInterval: 3000,
  })

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [output, autoScroll])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  const sendMutation = useMutation({
    mutationFn: (cmd: string) => sendCommand(uuid, cmd),
    onSuccess: () => {
      setCommand('')
      setTimeout(() => refetch(), 500)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '发送失败'),
  })

  const handleSend = () => {
    const cmd = command.trim()
    if (!cmd) return
    sendMutation.mutate(cmd)
  }

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Terminal className='size-4 text-muted-foreground' />
            <CardTitle className='text-base'>控制台输出</CardTitle>
          </div>
          <Button variant='ghost' size='icon-sm' onClick={() => refetch()} title='刷新'>
            <RefreshCw />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className='console-view h-[480px] overflow-y-auto rounded-lg border bg-zinc-950 p-3 text-zinc-200 dark:bg-zinc-950'
        >
          {output ? output : <span className='text-zinc-500'>暂无输出…</span>}
          <div ref={bottomRef} />
        </div>
        {!autoScroll && (
          <button
            className='w-full rounded-lg bg-muted py-1 text-xs text-muted-foreground hover:bg-accent'
            onClick={() => setAutoScroll(true)}
          >
            ↓ 回到底部并开启自动滚动
          </button>
        )}
        <div className='flex gap-2'>
          <Input
            placeholder={running ? '输入命令，回车发送到实例…' : '实例未运行，无法发送命令'}
            value={command}
            disabled={!running}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend()
            }}
          />
          <Button disabled={!running || !command.trim() || sendMutation.isPending} onClick={handleSend}>
            <Send />
            发送
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- 监控 ----------
function StatsTab({ uuid }: { uuid: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['instance-stats', uuid],
    queryFn: () => getInstanceStats(uuid),
    refetchInterval: 4000,
  })

  if (isLoading) return <LoadingState />
  if (error)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : '无法获取监控数据'}
        onRetry={() => refetch()}
      />
    )

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>CPU 使用率</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-3xl font-bold'>{formatPercent(data?.cpu)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>内存占用</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-3xl font-bold'>{formatBytes(data?.memory)}</p>
          {data?.memoryLimit ? (
            <p className='mt-1 text-sm text-muted-foreground'>
              上限 {formatBytes(data.memoryLimit)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- 历史日志 ----------
function LogsTab({ uuid }: { uuid: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['instance-logs', uuid],
    queryFn: () => getInstanceLogs(uuid),
  })
  const [clearOpen, setClearOpen] = useState(false)

  const clearMutation = useMutation({
    mutationFn: () => clearInstanceLogs(uuid),
    onSuccess: () => {
      toast.success('日志已清空')
      setClearOpen(false)
      queryClient.invalidateQueries({ queryKey: ['instance-logs', uuid] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '清空失败'),
  })

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base'>历史日志</CardTitle>
            <CardDescription>实例持久化的历史输出记录</CardDescription>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? 'animate-spin' : ''} />
              刷新
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='text-destructive'
              onClick={() => setClearOpen(true)}
            >
              <Trash2 />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            message={error instanceof Error ? error.message : '加载失败'}
            onRetry={() => refetch()}
          />
        ) : !data || data.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>暂无历史日志</p>
        ) : (
          <div className='console-view max-h-[480px] overflow-y-auto rounded-lg border bg-zinc-950 p-3 text-zinc-200'>
            {(Array.isArray(data) ? data : [String(data)]).join('\n')}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title='清空历史日志'
        description='确定要清空该实例的全部历史日志吗？此操作不可撤销。'
        confirmText='清空'
        destructive
        loading={clearMutation.isPending}
        onConfirm={() => clearMutation.mutate()}
      />
    </Card>
  )
}
