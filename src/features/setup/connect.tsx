import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Globe,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  Unplug,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { ApiError, getOverview } from '@/lib/api'
import { newId, useNodeStore, type NodeConnection } from '@/stores/node-store'

/** 规范化节点地址 */
function normalizeNodeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '')
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`
  return url
}

export function ConnectPage() {
  const nodes = useNodeStore((s) => s.nodes)
  const activeId = useNodeStore((s) => s.activeId)
  const setActive = useNodeStore((s) => s.setActive)
  const removeNode = useNodeStore((s) => s.removeNode)
  const addNode = useNodeStore((s) => s.addNode)
  const updateNode = useNodeStore((s) => s.updateNode)

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<NodeConnection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NodeConnection | null>(null)

  return (
    <div className='space-y-6'>
      {/* 页头 */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Server className='size-5 text-primary' />
          <div>
            <h1 className='text-xl font-bold tracking-tight'>节点连接</h1>
            <p className='text-sm text-muted-foreground'>
              添加、切换、管理面板连接的 irix-node 后端节点
            </p>
          </div>
        </div>
        <Button size='sm' onClick={() => setAddOpen(true)}>
          <Plus />
          添加节点
        </Button>
      </div>

      {/* 节点列表 */}
      {nodes.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center gap-3 py-16 text-center'>
            <div className='flex size-14 items-center justify-center rounded-2xl bg-muted'>
              <Unplug className='size-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-medium'>尚未添加任何节点</p>
              <p className='mt-1 text-sm text-muted-foreground'>
                添加一个 irix-node 后端节点以开始管理
              </p>
            </div>
            <Button size='sm' onClick={() => setAddOpen(true)}>
              <Plus />
              添加节点
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-3'>
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              active={node.id === activeId}
              onSelect={() => setActive(node.id)}
              onEdit={() => setEditTarget(node)}
              onDelete={() => setDeleteTarget(node)}
            />
          ))}
        </div>
      )}

      {/* 添加节点 */}
      <NodeFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title='添加节点'
        submitText='添加并验证'
        onSubmit={async (data) => {
          const id = newId()
          addNode({
            id,
            name: data.name || data.url.replace(/^https?:\/\//, ''),
            url: data.url,
            apiKey: data.apiKey,
          })
          // 切换到新节点并验证
          setActive(id)
          try {
            await getOverview()
            toast.success('节点添加成功')
            setAddOpen(false)
          } catch (err) {
            toast.error(
              err instanceof ApiError
                ? err.status === 403
                  ? '已添加，但密钥验证失败，请检查 API Key'
                  : `已添加，但连接失败：${err.message}`
                : '已添加，但无法连接'
            )
            setAddOpen(false)
          }
        }}
      />

      {/* 编辑节点 */}
      {editTarget && (
        <NodeFormDialog
          open={editTarget !== null}
          onOpenChange={(open) => !open && setEditTarget(null)}
          title='编辑节点'
          submitText='保存'
          initial={editTarget}
          onSubmit={async (data) => {
            updateNode(editTarget.id, {
              name: data.name || data.url.replace(/^https?:\/\//, ''),
              url: data.url,
              apiKey: data.apiKey,
            })
            toast.success('节点信息已更新')
            setEditTarget(null)
          }}
        />
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='删除节点'
        description={`确定要从列表中移除节点「${deleteTarget?.name}」吗？不影响后端节点本身。`}
        confirmText='删除'
        destructive
        onConfirm={() => {
          if (deleteTarget) {
            removeNode(deleteTarget.id)
            toast.success('节点已从列表移除')
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}

// ---------- 节点卡片 ----------
function NodeCard(props: {
  node: NodeConnection
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { node, active } = props
  const queryClient = useQueryClient()

  // 对当前卡片对应的节点做连通性检测
  const checkMutation = useMutation({
    mutationFn: async () => {
      // 临时切换到该节点检测
      const prevActive = useNodeStore.getState().activeId
      useNodeStore.getState().setActive(node.id)
      try {
        await getOverview()
      } finally {
        useNodeStore.getState().setActive(prevActive)
      }
    },
    onSuccess: () => {
      toast.success(`${node.name} 在线`)
      queryClient.invalidateQueries()
    },
    onError: (err) => toast.error(`${node.name} 不可达：${err instanceof Error ? err.message : ''}`),
  })

  return (
    <Card className={active ? 'border-primary ring-1 ring-primary/20' : ''}>
      <CardContent className='flex flex-wrap items-center gap-3 p-4'>
        <button
          onClick={props.onSelect}
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
          title={active ? '当前选中' : '点击切换到此节点'}
        >
          {active ? <CheckCircle2 className='size-5' /> : <Globe className='size-5' />}
        </button>

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <button onClick={props.onSelect} className='font-semibold hover:text-primary'>
              {node.name}
            </button>
            {active && <Badge>当前节点</Badge>}
          </div>
          <p className='mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Globe className='size-3' />
            {node.url.replace(/^https?:\/\//, '')}
            <span className='mx-1'>·</span>
            <KeyRound className='size-3' />
            {node.apiKey.length} 位密钥
          </p>
        </div>

        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='sm'
            disabled={checkMutation.isPending}
            onClick={() => checkMutation.mutate()}
          >
            <RefreshCw className={checkMutation.isPending ? 'animate-spin' : ''} />
            检测
          </Button>
          <Button variant='ghost' size='sm' onClick={props.onEdit} title='编辑'>
            <Pencil />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='text-muted-foreground hover:text-destructive'
            onClick={props.onDelete}
            title='删除'
          >
            <Trash2 />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- 添加/编辑 共用表单 ----------
function NodeFormDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitText: string
  initial?: NodeConnection
  onSubmit: (data: { name: string; url: string; apiKey: string }) => Promise<void>
}) {
  const [name, setName] = useState(props.initial?.name ?? '')
  const [url, setUrl] = useState(props.initial?.url ?? '')
  const [apiKey, setApiKey] = useState(props.initial?.apiKey ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nodeUrl = normalizeNodeUrl(url)
    if (!nodeUrl) {
      toast.error('请输入节点地址')
      return
    }
    if (!apiKey.trim()) {
      toast.error('请输入 API Key / 配对码')
      return
    }
    setLoading(true)
    try {
      await props.onSubmit({ name: name.trim(), url: nodeUrl, apiKey: apiKey.trim() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description='配置 irix-node 后端节点的连接信息'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? '处理中…' : props.submitText}
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label>显示名称（可选）</Label>
          <Input
            placeholder='例如：家里服务器'
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className='space-y-1.5'>
          <Label>节点地址</Label>
          <Input
            placeholder='192.168.1.5:12346'
            value={url.replace(/^https?:\/\//, '')}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className='text-xs text-muted-foreground'>
            irix-node 启动时监听的地址与端口
          </p>
        </div>
        <div className='space-y-1.5'>
          <Label>API Key / 配对码</Label>
          <Input
            type='password'
            placeholder='-apikey 参数或首次启动打印的配对码'
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  )
}
