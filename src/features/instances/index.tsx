import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Boxes,
  FolderOpen,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Skull,
  Square,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState, LoadingState, Select } from '@/components/ui/misc'
import {
  deleteInstances,
  getInstances,
  InstanceStatus,
  killInstance,
  restartInstance,
  startInstance,
  stopInstance,
  type InstanceInfo,
} from '@/lib/api'
import { formatTime } from '@/lib/utils'
import { CreateInstanceDialog } from './create-dialog'

export function statusBadge(status: number) {
  switch (status) {
    case InstanceStatus.Running:
      return <Badge variant='success'>运行中</Badge>
    case InstanceStatus.Stopped:
      return <Badge variant='secondary'>已停止</Badge>
    case InstanceStatus.Starting:
      return <Badge variant='warning'>启动中</Badge>
    case InstanceStatus.Stopping:
      return <Badge variant='warning'>停止中</Badge>
    case InstanceStatus.Busy:
      return <Badge variant='warning'>忙碌</Badge>
    default:
      return <Badge variant='outline'>未知</Badge>
  }
}

export function InstancesPage() {
  const ready = useNodeReady()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InstanceInfo | null>(null)
  const [deleteFiles, setDeleteFiles] = useState(false)

  const params: Record<string, unknown> = { page: 1, page_size: 100 }
  if (search) params.instance_name = search
  if (statusFilter !== '') params.status = statusFilter

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['instances', search, statusFilter],
    queryFn: () => getInstances(params),
    refetchInterval: ready ? 8000 : false,
    enabled: ready,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['instances'] })

  const actionMutation = useMutation({
    mutationFn: async ({ action, uuid }: { action: string; uuid: string }) => {
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
    onSuccess: (_, vars) => {
      const labels: Record<string, string> = {
        start: '启动',
        stop: '停止',
        restart: '重启',
        kill: '强制终止',
      }
      toast.success(`${labels[vars.action]}指令已发送`)
      setTimeout(invalidate, 800)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '操作失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ uuid, delFile }: { uuid: string; delFile: boolean }) =>
      deleteInstances([uuid], delFile),
    onSuccess: () => {
      toast.success('实例已删除')
      setDeleteTarget(null)
      invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '删除失败'),
  })

  const instances = data?.data ?? []

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>实例管理</h1>
          <p className='text-sm text-muted-foreground'>
            共 {instances.length} 个应用实例
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
            刷新
          </Button>
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Plus />
            新建实例
          </Button>
        </div>
      </div>

      {/* 过滤栏 */}
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative min-w-56 flex-1 sm:max-w-xs'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            className='pl-9'
            placeholder='按名称搜索…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className='w-36'
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder='全部状态'
          options={[
            { value: String(InstanceStatus.Running), label: '运行中' },
            { value: String(InstanceStatus.Stopped), label: '已停止' },
            { value: String(InstanceStatus.Starting), label: '启动中' },
            { value: String(InstanceStatus.Stopping), label: '停止中' },
          ]}
        />
      </div>

      {/* 列表 */}
      {!ready ? (
        <Card><CardContent><NodeEmpty /></CardContent></Card>
      ) : isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : '加载失败'}
          onRetry={() => refetch()}
        />
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className='py-12'>
            <EmptyState
              icon={<Boxes className='size-10' />}
              title={search ? '没有匹配的实例' : '暂无实例'}
              description={search ? '尝试修改搜索条件' : '点击右上角「新建实例」创建第一个应用实例'}
              action={
                !search ? (
                  <Button size='sm' onClick={() => setCreateOpen(true)}>
                    <Plus />
                    新建实例
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-3'>
          {instances.map((inst) => (
            <InstanceCard
              key={inst.instanceUuid}
              instance={inst}
              onAction={(action) =>
                actionMutation.mutate({ action, uuid: inst.instanceUuid })
              }
              onDelete={() => {
                setDeleteTarget(inst)
                setDeleteFiles(false)
              }}
              actionPending={actionMutation.isPending}
            />
          ))}
        </div>
      )}

      <CreateInstanceDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='删除实例'
        description={
          <div className='space-y-3'>
            <p>
              确定要删除实例「{deleteTarget?.config.nickname}」吗？此操作不可撤销。
            </p>
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
        onConfirm={() =>
          deleteTarget &&
          deleteMutation.mutate({ uuid: deleteTarget.instanceUuid, delFile: deleteFiles })
        }
      />
    </div>
  )
}

function InstanceCard(props: {
  instance: InstanceInfo
  onAction: (action: string) => void
  onDelete: () => void
  actionPending: boolean
}) {
  const inst = props.instance
  const running = inst.status === InstanceStatus.Running
  const stopped = inst.status === InstanceStatus.Stopped
  const busy = !running && !stopped

  return (
    <Card className='transition-shadow hover:shadow-md'>
      <CardContent className='flex flex-wrap items-center gap-4 p-4'>
        <div
          className={
            running
              ? 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10'
              : 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted'
          }
        >
          <Boxes className={running ? 'size-5 text-success' : 'size-5 text-muted-foreground'} />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Link
              to='/instances/$uuid'
              params={{ uuid: inst.instanceUuid }}
              className='font-semibold hover:text-primary hover:underline'
            >
              {inst.config.nickname || '未命名实例'}
            </Link>
            {statusBadge(inst.status)}
            {inst.config.type && (
              <Badge variant='outline'>{inst.config.type}</Badge>
            )}
          </div>
          <p className='mt-1 truncate text-xs text-muted-foreground' title={inst.config.cwd}>
            {inst.config.cwd || '-'} · 创建于 {formatTime(inst.config.createDatetime)}
          </p>
        </div>

        <div className='flex items-center gap-1'>
          {stopped && (
            <Button
              size='sm'
              variant='outline'
              disabled={props.actionPending}
              onClick={() => props.onAction('start')}
            >
              <Play />
              启动
            </Button>
          )}
          {running && (
            <>
              <Button
                size='sm'
                variant='outline'
                disabled={props.actionPending}
                onClick={() => props.onAction('stop')}
              >
                <Square />
                停止
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={props.actionPending}
                onClick={() => props.onAction('restart')}
              >
                <RotateCcw />
                重启
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='text-destructive hover:bg-destructive/10'
                disabled={props.actionPending}
                onClick={() => props.onAction('kill')}
                title='强制终止'
              >
                <Skull />
              </Button>
            </>
          )}
          {busy && (
            <Button size='sm' variant='outline' disabled>
              <RefreshCw className='animate-spin' />
              处理中
            </Button>
          )}
          <Link to='/instances/$uuid' params={{ uuid: inst.instanceUuid }}>
            <Button size='sm' variant='ghost'>
              <FolderOpen />
              管理
            </Button>
          </Link>
          <Button
            size='sm'
            variant='ghost'
            className='text-muted-foreground hover:text-destructive'
            onClick={props.onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
