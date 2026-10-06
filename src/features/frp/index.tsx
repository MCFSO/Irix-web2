import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Network, Play, Plus, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState, Label, LoadingState, Select } from '@/components/ui/misc'
import {
  createFrpTunnel,
  deleteFrpTunnel,
  frpTunnelAction,
  getFrpStatus,
  type FrpTunnel,
} from '@/lib/api'

export function FrpPage() {
  const ready = useNodeReady()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FrpTunnel | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['frp-status'],
    queryFn: getFrpStatus,
    refetchInterval: ready ? 10000 : false,
    retry: false,
    enabled: ready,
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' }) =>
      frpTunnelAction(id, action),
    onSuccess: () => {
      toast.success('操作已发送')
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['frp-status'] }), 800)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '操作失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFrpTunnel(id),
    onSuccess: () => {
      toast.success('隧道已删除')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['frp-status'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '删除失败'),
  })

  if (!ready)
    return (
      <div className='space-y-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>内网穿透</h1>
          <p className='text-sm text-muted-foreground'>FRP 隧道管理</p>
        </div>
        <Card>
          <CardContent>
            <NodeEmpty />
          </CardContent>
        </Card>
      </div>
    )
  if (isLoading) return <LoadingState />
  if (error)
    return (
      <div className='space-y-4'>
        <h1 className='text-2xl font-bold tracking-tight'>内网穿透</h1>
        <Card>
          <CardContent className='p-0'>
            <ErrorState
              message={error instanceof Error ? error.message : 'FRP 功能不可用'}
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      </div>
    )

  const tunnels = data?.tunnels ?? []

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>内网穿透</h1>
          <p className='text-sm text-muted-foreground'>
            FRP 状态：
            {data?.installed ? (data.running ? '运行中' : '已安装') : '未安装'}
            {data?.version ? ` · ${data.version}` : ''}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant={data?.running ? 'success' : 'secondary'}>
            {data?.running ? '运行中' : '未运行'}
          </Badge>
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Plus />
            新建隧道
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>隧道列表</CardTitle>
          <CardDescription>共 {tunnels.length} 条隧道</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {tunnels.length === 0 ? (
            <EmptyState
              icon={<Network className='size-10' />}
              title='暂无隧道'
              description='创建一条隧道将内网服务暴露到公网'
              action={
                <Button size='sm' onClick={() => setCreateOpen(true)}>
                  <Plus />
                  新建隧道
                </Button>
              }
            />
          ) : (
            <div className='divide-y'>
              {tunnels.map((tunnel) => {
                const running = /running|online/i.test(tunnel.status ?? '')
                return (
                  <div key={tunnel.id} className='flex flex-wrap items-center gap-3 px-4 py-3'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{tunnel.name}</span>
                        <Badge variant={running ? 'success' : 'secondary'}>
                          {tunnel.status ?? '未知'}
                        </Badge>
                        <Badge variant='outline'>{tunnel.type}</Badge>
                      </div>
                      <p className='mt-0.5 text-xs text-muted-foreground'>
                        {tunnel.localIp}:{tunnel.localPort} → 远程端口 {tunnel.remotePort}
                      </p>
                    </div>
                    <div className='flex items-center gap-1'>
                      {running ? (
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ id: tunnel.id, action: 'stop' })}
                        >
                          <Square />
                        </Button>
                      ) : (
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ id: tunnel.id, action: 'start' })}
                        >
                          <Play />
                        </Button>
                      )}
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-muted-foreground hover:text-destructive'
                        onClick={() => setDeleteTarget(tunnel)}
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
      </Card>

      <CreateTunnelDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='删除隧道'
        description={`确定要删除隧道「${deleteTarget?.name}」吗？`}
        confirmText='删除'
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}

function CreateTunnelDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState('tcp')
  const [localIp, setLocalIp] = useState('127.0.0.1')
  const [localPort, setLocalPort] = useState('')
  const [remotePort, setRemotePort] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createFrpTunnel({
        name: name.trim(),
        type,
        localIp: localIp.trim(),
        localPort: Number(localPort),
        remotePort: Number(remotePort),
      }),
    onSuccess: () => {
      toast.success('隧道已创建')
      queryClient.invalidateQueries({ queryKey: ['frp-status'] })
      props.onOpenChange(false)
      setName('')
      setLocalPort('')
      setRemotePort('')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '创建失败'),
  })

  const valid =
    name.trim() &&
    Number(localPort) > 0 &&
    Number(localPort) < 65536 &&
    Number(remotePort) > 0 &&
    Number(remotePort) < 65536

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title='新建隧道'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>取消</Button>
          <Button disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            创建
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label>隧道名称</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='mc-server' />
        </div>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label>协议类型</Label>
            <Select
              value={type}
              onValueChange={setType}
              options={[
                { value: 'tcp', label: 'TCP' },
                { value: 'udp', label: 'UDP' },
              ]}
            />
          </div>
          <div className='space-y-1.5'>
            <Label>本地 IP</Label>
            <Input value={localIp} onChange={(e) => setLocalIp(e.target.value)} />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label>本地端口</Label>
            <Input
              type='number'
              value={localPort}
              onChange={(e) => setLocalPort(e.target.value)}
              placeholder='25565'
            />
          </div>
          <div className='space-y-1.5'>
            <Label>远程端口</Label>
            <Input
              type='number'
              value={remotePort}
              onChange={(e) => setRemotePort(e.target.value)}
              placeholder='25565'
            />
          </div>
        </div>
      </div>
    </Dialog>
  )
}
