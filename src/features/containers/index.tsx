import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Container,
  HardDrive,
  Layers,
  Network,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, LoadingState, Tabs } from '@/components/ui/misc'
import {
  containerAction,
  deleteContainer,
  deleteImage,
  getBastilleJails,
  getContainerInfo,
  getContainers,
  getImages,
  getNetworks,
} from '@/lib/api'
import { formatBytes, formatTime } from '@/lib/utils'

export function ContainersPage() {
  const ready = useNodeReady()
  const [tab, setTab] = useState('containers')

  const { data: info, isLoading: infoLoading, error: infoError } = useQuery({
    queryKey: ['container-info'],
    queryFn: getContainerInfo,
    retry: false,
    enabled: ready,
  })

  if (!ready)
    return (
      <div className='space-y-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>容器环境</h1>
          <p className='text-sm text-muted-foreground'>Docker / Bastille 容器管理</p>
        </div>
        <Card>
          <CardContent>
            <NodeEmpty />
          </CardContent>
        </Card>
      </div>
    )

  if (infoLoading) return <LoadingState />
  if (infoError)
    return (
      <div className='space-y-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>容器环境</h1>
        </div>
        <Card>
          <CardContent className='p-0'>
            <ErrorState message='容器环境不可用（节点未启用 Docker/Bastille 支持）' />
          </CardContent>
        </Card>
      </div>
    )

  const isBastille = info?.runtime === 'bastille'

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>容器环境</h1>
          <p className='text-sm text-muted-foreground'>
            运行时：{info?.runtime ?? '-'} · 平台：{info?.platform ?? '-'} · 版本：
            {info?.version ?? '-'}
          </p>
        </div>
        <Badge variant={info?.available ? 'success' : 'destructive'}>
          {info?.available ? '可用' : '不可用'}
        </Badge>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={
          isBastille
            ? [{ value: 'containers', label: 'Jails' }]
            : [
                { value: 'containers', label: '容器' },
                { value: 'images', label: '镜像' },
                { value: 'networks', label: '网络' },
              ]
        }
      />

      {tab === 'containers' && (isBastille ? <BastilleTab /> : <ContainersTab />)}
      {tab === 'images' && <ImagesTab />}
      {tab === 'networks' && <NetworksTab />}
    </div>
  )
}

// ---------- Docker 容器 ----------
function ContainersTab() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['containers'],
    queryFn: () => getContainers(true),
    refetchInterval: 10000,
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' | 'restart' }) =>
      containerAction(id, action),
    onSuccess: () => {
      toast.success('操作已发送')
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['containers'] }), 800)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '操作失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContainer(id, true),
    onSuccess: () => {
      toast.success('容器已删除')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '删除失败'),
  })

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base'>容器列表</CardTitle>
          <Button variant='ghost' size='icon-sm' onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error instanceof Error ? error.message : '加载失败'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<Container className='size-10' />} title='暂无容器' />
        ) : (
          <div className='divide-y'>
            {data.map((c) => {
              const running = /up|running/i.test(c.state || c.status)
              return (
                <div key={c.id} className='flex flex-wrap items-center gap-3 px-4 py-3'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='truncate font-medium'>{c.name}</span>
                      <Badge variant={running ? 'success' : 'secondary'}>
                        {c.state || c.status}
                      </Badge>
                    </div>
                    <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                      {c.image} · {c.id.slice(0, 12)}
                      {c.createdAt ? ` · 创建于 ${formatTime(c.createdAt)}` : ''}
                    </p>
                  </div>
                  <div className='flex items-center gap-1'>
                    {running ? (
                      <>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ id: c.id, action: 'stop' })}
                        >
                          <Square />
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ id: c.id, action: 'restart' })}
                        >
                          <RotateCcw />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={actionMutation.isPending}
                        onClick={() => actionMutation.mutate({ id: c.id, action: 'start' })}
                      >
                        <Play />
                      </Button>
                    )}
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-muted-foreground hover:text-destructive'
                      onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='删除容器'
        description={`确定要强制删除容器「${deleteTarget?.name}」吗？`}
        confirmText='删除'
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Card>
  )
}

// ---------- 镜像 ----------
function ImagesTab() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['images'],
    queryFn: getImages,
  })

  const deleteMutation = useMutation({
    mutationFn: (name: string) => deleteImage(name),
    onSuccess: () => {
      toast.success('镜像已删除')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '删除失败'),
  })

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base'>镜像列表</CardTitle>
          <Button variant='ghost' size='icon-sm' onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error instanceof Error ? error.message : '加载失败'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<Layers className='size-10' />} title='暂无镜像' />
        ) : (
          <div className='divide-y'>
            {data.map((img) => (
              <div key={img.id} className='flex items-center gap-3 px-4 py-3'>
                <Layers className='size-4 shrink-0 text-muted-foreground' />
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>
                    {img.tags?.join(', ') || img.id.slice(0, 12)}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {formatBytes(img.sizeBytes)} · {img.createdAt ? formatTime(img.createdAt) : ''}
                  </p>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-muted-foreground hover:text-destructive'
                  onClick={() => setDeleteTarget(img.tags?.[0] ?? img.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='删除镜像'
        description={`确定要删除镜像「${deleteTarget}」吗？`}
        confirmText='删除'
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </Card>
  )
}

// ---------- 网络 ----------
function NetworksTab() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['networks'],
    queryFn: getNetworks,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>网络列表</CardTitle>
        <CardDescription>Docker 网络</CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error instanceof Error ? error.message : '加载失败'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<Network className='size-10' />} title='暂无网络' />
        ) : (
          <div className='divide-y'>
            {data.map((n) => (
              <div key={n.name} className='flex items-center gap-3 px-4 py-3'>
                <Network className='size-4 shrink-0 text-muted-foreground' />
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-medium'>{n.name}</p>
                  <p className='text-xs text-muted-foreground'>
                    {n.driver}
                    {n.subnet ? ` · ${n.subnet}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- Bastille ----------
function BastilleTab() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bastille-jails'],
    queryFn: getBastilleJails,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Jail 列表</CardTitle>
        <CardDescription>FreeBSD Bastille jails</CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error instanceof Error ? error.message : '加载失败'} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={<HardDrive className='size-10' />} title='暂无 jail' />
        ) : (
          <div className='divide-y'>
            {data.map((jail) => (
              <div key={jail.name} className='flex items-center gap-3 px-4 py-3'>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{jail.name}</span>
                    <Badge variant={/up|running/i.test(jail.status) ? 'success' : 'secondary'}>
                      {jail.status}
                    </Badge>
                  </div>
                  <p className='mt-0.5 text-xs text-muted-foreground'>
                    {jail.release}
                    {jail.ip ? ` · ${jail.ip}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
