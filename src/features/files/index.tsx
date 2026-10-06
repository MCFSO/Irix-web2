import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Archive,
  ArrowUp,
  Copy,
  File,
  FilePlus,
  FileText,
  Folder,
  FolderPlus,
  Home,
  Pencil,
  RefreshCw,
  Scissors,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox, EmptyState, ErrorState, Label, LoadingState, Select } from '@/components/ui/misc'
import {
  compressFiles,
  copyFiles,
  deleteFiles,
  getFileList,
  getInstances,
  getTrashList,
  getUploadTicket,
  mkdir,
  moveFiles,
  readFile,
  restoreTrash,
  touchFile,
  trashFiles,
  writeFile,
  type FileItem,
} from '@/lib/api'
import { formatBytes } from '@/lib/utils'

function joinPath(base: string, name: string): string {
  if (!base || base === '/') return `/${name}`
  return `${base.replace(/\/+$/, '')}/${name}`
}

function parentPath(path: string): string {
  if (!path || path === '/') return '/'
  const parts = path.replace(/\/+$/, '').split('/')
  parts.pop()
  return parts.length <= 1 ? '/' : parts.join('/')
}

export function FilesPage() {
  const ready = useNodeReady()
  const search = useSearch({ from: '/authed/files' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [instanceUuid, setInstanceUuid] = useState(search.uuid ?? '')
  const [currentPath, setCurrentPath] = useState(search.path ?? '/')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clipboard, setClipboard] = useState<{ mode: 'copy' | 'move'; paths: string[] } | null>(null)

  // 对话框状态
  const [mkdirOpen, setMkdirOpen] = useState(false)
  const [touchOpen, setTouchOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [editTarget, setEditTarget] = useState<FileItem | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [compressOpen, setCompressOpen] = useState(false)
  const [compressName, setCompressName] = useState('archive.zip')
  const [trashOpen, setTrashOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 实例列表
  const { data: instancesData } = useQuery({
    queryKey: ['instances-all'],
    queryFn: () => getInstances({ page: 1, page_size: 200 }),
    enabled: ready,
  })
  const instances = instancesData?.data ?? []

  // 文件列表
  const {
    data: fileData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['files', instanceUuid, currentPath],
    queryFn: () => getFileList(instanceUuid, currentPath, 1, 500),
    enabled: Boolean(instanceUuid),
  })

  const files = useMemo(() => {
    const items = fileData?.items ?? []
    return [...items].sort((a, b) => {
      if ((a.type === 1) !== (b.type === 1)) return a.type === 1 ? -1 : 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })
  }, [fileData])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['files', instanceUuid, currentPath] })

  const mutateOpts = {
    onSuccess: () => {
      invalidate()
      setSelected(new Set())
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : '操作失败'),
  }

  const mkdirMutation = useMutation({
    mutationFn: (name: string) => mkdir(instanceUuid, joinPath(currentPath, name)),
    ...mutateOpts,
    onSuccess: () => {
      toast.success('目录已创建')
      setMkdirOpen(false)
      setNewName('')
      invalidate()
    },
  })

  const touchMutation = useMutation({
    mutationFn: (name: string) => touchFile(instanceUuid, joinPath(currentPath, name)),
    ...mutateOpts,
    onSuccess: () => {
      toast.success('文件已创建')
      setTouchOpen(false)
      setNewName('')
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (targets: string[]) => deleteFiles(instanceUuid, targets),
    ...mutateOpts,
    onSuccess: () => {
      toast.success('已删除')
      setDeleteOpen(false)
      setSelected(new Set())
      invalidate()
    },
  })

  const trashMutation = useMutation({
    mutationFn: (targets: string[]) => trashFiles(instanceUuid, targets),
    ...mutateOpts,
    onSuccess: () => {
      toast.success('已移入回收站')
      setSelected(new Set())
      invalidate()
    },
  })

  const renameMutation = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      moveFiles(instanceUuid, [[from, to]]),
    ...mutateOpts,
    onSuccess: () => {
      toast.success('重命名成功')
      setRenameTarget(null)
      invalidate()
    },
  })

  const pasteMutation = useMutation({
    mutationFn: (clip: { mode: 'copy' | 'move'; paths: string[] }) => {
      const pairs: [string, string][] = clip.paths.map((p) => {
        const name = p.split('/').pop() ?? p
        return [p, joinPath(currentPath, name)]
      })
      return clip.mode === 'copy' ? copyFiles(instanceUuid, pairs) : moveFiles(instanceUuid, pairs)
    },
    ...mutateOpts,
    onSuccess: () => {
      toast.success('粘贴完成')
      setClipboard(null)
      invalidate()
    },
  })

  const writeMutation = useMutation({
    mutationFn: ({ target, text }: { target: string; text: string }) =>
      writeFile(instanceUuid, target, text),
    onSuccess: () => {
      toast.success('文件已保存')
      setEditTarget(null)
      invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '保存失败'),
  })

  const compressMutation = useMutation({
    mutationFn: () =>
      compressFiles(
        instanceUuid,
        1,
        'utf-8',
        currentPath,
        [...selected].map((p) => p)
      ),
    ...mutateOpts,
    onSuccess: () => {
      toast.success('压缩任务已开始')
      setCompressOpen(false)
      invalidate()
    },
  })

  const decompressMutation = useMutation({
    mutationFn: (target: string) =>
      compressFiles(instanceUuid, 2, 'utf-8', currentPath, [target]),
    ...mutateOpts,
    onSuccess: () => {
      toast.success('解压任务已开始')
      invalidate()
    },
  })

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    try {
      const ticket = await getUploadTicket(instanceUuid, currentPath)
      for (const file of Array.from(fileList)) {
        const form = new FormData()
        form.append('file', file)
        const resp = await fetch(`/upload/${ticket.password}`, {
          method: 'POST',
          body: form,
        })
        if (!resp.ok) throw new Error(`上传 ${file.name} 失败`)
      }
      toast.success(`已上传 ${fileList.length} 个文件`)
      invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    }
  }

  const openEditor = async (item: FileItem) => {
    setEditLoading(true)
    setEditTarget(item)
    try {
      const content = await readFile(instanceUuid, joinPath(currentPath, item.name))
      setEditContent(typeof content === 'string' ? content : String(content ?? ''))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '读取文件失败')
      setEditTarget(null)
    } finally {
      setEditLoading(false)
    }
  }

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const selectedPaths = [...selected]
  const pathParts = currentPath.split('/').filter(Boolean)

  // 未连接节点
  if (!ready) {
    return (
      <div className='space-y-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>文件管理</h1>
          <p className='text-sm text-muted-foreground'>浏览与管理实例文件</p>
        </div>
        <Card>
          <CardContent>
            <NodeEmpty />
          </CardContent>
        </Card>
      </div>
    )
  }

  // 未选实例
  if (!instanceUuid) {
    return (
      <div className='space-y-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>文件管理</h1>
          <p className='text-sm text-muted-foreground'>选择实例以浏览其文件</p>
        </div>
        <Card>
          <CardContent className='p-6'>
            <Label>选择实例</Label>
            <Select
              className='mt-2 max-w-md'
              value={instanceUuid}
              onValueChange={setInstanceUuid}
              placeholder='— 选择一个实例 —'
              options={instances.map((i) => ({
                value: i.instanceUuid,
                label: i.config.nickname || i.instanceUuid,
              }))}
            />
            {instances.length === 0 && (
              <p className='mt-3 text-sm text-muted-foreground'>
                暂无实例，请先在实例管理中创建。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* 页头 */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>文件管理</h1>
          <p className='text-sm text-muted-foreground'>
            {instances.find((i) => i.instanceUuid === instanceUuid)?.config.nickname ?? instanceUuid}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Select
            className='w-48'
            value={instanceUuid}
            onValueChange={(v) => {
              setInstanceUuid(v)
              setCurrentPath('/')
              setSelected(new Set())
            }}
            options={instances.map((i) => ({
              value: i.instanceUuid,
              label: i.config.nickname || i.instanceUuid,
            }))}
          />
          <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* 面包屑 + 操作栏 */}
      <Card>
        <CardContent className='flex flex-wrap items-center gap-2 p-3'>
          <Button variant='ghost' size='icon-sm' onClick={() => setCurrentPath('/')} title='根目录'>
            <Home />
          </Button>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => setCurrentPath(parentPath(currentPath))}
            disabled={currentPath === '/'}
            title='上级目录'
          >
            <ArrowUp />
          </Button>
          <nav className='flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm'>
            <button
              className='shrink-0 rounded px-1.5 py-0.5 hover:bg-accent'
              onClick={() => setCurrentPath('/')}
            >
              /
            </button>
            {pathParts.map((part, idx) => {
              const target = '/' + pathParts.slice(0, idx + 1).join('/')
              return (
                <span key={target} className='flex shrink-0 items-center gap-1'>
                  <span className='text-muted-foreground'>/</span>
                  <button
                    className='rounded px-1.5 py-0.5 hover:bg-accent'
                    onClick={() => setCurrentPath(target)}
                  >
                    {part}
                  </button>
                </span>
              )
            })}
          </nav>
          <div className='flex flex-wrap items-center gap-1'>
            <Button variant='outline' size='sm' onClick={() => { setNewName(''); setMkdirOpen(true) }}>
              <FolderPlus />
              新建目录
            </Button>
            <Button variant='outline' size='sm' onClick={() => { setNewName(''); setTouchOpen(true) }}>
              <FilePlus />
              新建文件
            </Button>
            <Button variant='outline' size='sm' onClick={() => fileInputRef.current?.click()}>
              <Upload />
              上传
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              className='hidden'
              onChange={(e) => {
                handleUpload(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 选中操作栏 */}
      {selected.size > 0 && (
        <Card>
          <CardContent className='flex flex-wrap items-center gap-2 p-3'>
            <span className='text-sm text-muted-foreground'>已选 {selected.size} 项</span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setClipboard({ mode: 'copy', paths: selectedPaths })}
            >
              <Copy />
              复制
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setClipboard({ mode: 'move', paths: selectedPaths })}
            >
              <Scissors />
              剪切
            </Button>
            <Button variant='outline' size='sm' onClick={() => setCompressOpen(true)}>
              <Archive />
              压缩
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => trashMutation.mutate(selectedPaths)}
              disabled={trashMutation.isPending}
            >
              <Undo2 />
              回收站
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='text-destructive'
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
              删除
            </Button>
            <Button variant='ghost' size='sm' onClick={() => setSelected(new Set())}>
              取消选择
            </Button>
          </CardContent>
        </Card>
      )}

      {clipboard && (
        <Card>
          <CardContent className='flex items-center gap-2 p-3'>
            <span className='text-sm text-muted-foreground'>
              剪贴板：{clipboard.paths.length} 项（{clipboard.mode === 'copy' ? '复制' : '剪切'}）
            </span>
            <Button size='sm' onClick={() => pasteMutation.mutate(clipboard)} disabled={pasteMutation.isPending}>
              粘贴到当前目录
            </Button>
            <Button variant='ghost' size='sm' onClick={() => setClipboard(null)}>
              清除
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 文件列表 */}
      <Card>
        <CardContent className='p-0'>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState
              message={error instanceof Error ? error.message : '加载失败'}
              onRetry={() => refetch()}
            />
          ) : files.length === 0 ? (
            <EmptyState
              icon={<Folder className='size-10' />}
              title='空目录'
              description='此目录下没有文件'
            />
          ) : (
            <div className='divide-y'>
              {files.map((item) => {
                const fullPath = joinPath(currentPath, item.name)
                const isDir = item.type === 1
                const isZip = /\.(zip|tar|gz|tgz)$/i.test(item.name)
                return (
                  <div
                    key={item.name}
                    className='flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50'
                  >
                    <Checkbox
                      checked={selected.has(fullPath)}
                      onCheckedChange={() => toggleSelect(fullPath)}
                    />
                    {isDir ? (
                      <Folder className='size-4 shrink-0 text-warning' />
                    ) : (
                      <File className='size-4 shrink-0 text-muted-foreground' />
                    )}
                    <button
                      className='min-w-0 flex-1 truncate text-left text-sm hover:text-primary hover:underline'
                      onClick={() => {
                        if (isDir) {
                          setCurrentPath(fullPath)
                          setSelected(new Set())
                        } else {
                          openEditor(item)
                        }
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </button>
                    <span className='w-20 shrink-0 text-right text-xs text-muted-foreground'>
                      {isDir ? '-' : formatBytes(item.size)}
                    </span>
                    <span className='hidden w-36 shrink-0 text-right text-xs text-muted-foreground sm:block'>
                      {item.time}
                    </span>
                    <div className='flex shrink-0 items-center'>
                      {!isDir && (
                        <Button variant='ghost' size='icon-sm' title='编辑' onClick={() => openEditor(item)}>
                          <FileText />
                        </Button>
                      )}
                      {isZip && (
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          title='解压到此目录'
                          onClick={() => decompressMutation.mutate(fullPath)}
                        >
                          <Archive />
                        </Button>
                      )}
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        title='重命名'
                        onClick={() => {
                          setRenameTarget(item)
                          setRenameValue(item.name)
                        }}
                      >
                        <Pencil />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 回收站入口 */}
      <div className='flex justify-end'>
        <Button variant='outline' size='sm' onClick={() => setTrashOpen(true)}>
          <Trash2 />
          回收站
        </Button>
      </div>

      {/* 新建目录 */}
      <Dialog
        open={mkdirOpen}
        onOpenChange={setMkdirOpen}
        title='新建目录'
        footer={
          <>
            <Button variant='outline' onClick={() => setMkdirOpen(false)}>取消</Button>
            <Button disabled={!newName.trim() || mkdirMutation.isPending} onClick={() => mkdirMutation.mutate(newName.trim())}>
              创建
            </Button>
          </>
        }
      >
        <div className='space-y-1.5'>
          <Label>目录名称</Label>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='my-folder' autoFocus />
        </div>
      </Dialog>

      {/* 新建文件 */}
      <Dialog
        open={touchOpen}
        onOpenChange={setTouchOpen}
        title='新建文件'
        footer={
          <>
            <Button variant='outline' onClick={() => setTouchOpen(false)}>取消</Button>
            <Button disabled={!newName.trim() || touchMutation.isPending} onClick={() => touchMutation.mutate(newName.trim())}>
              创建
            </Button>
          </>
        }
      >
        <div className='space-y-1.5'>
          <Label>文件名称</Label>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='server.properties' autoFocus />
        </div>
      </Dialog>

      {/* 重命名 */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title='重命名'
        footer={
          <>
            <Button variant='outline' onClick={() => setRenameTarget(null)}>取消</Button>
            <Button
              disabled={!renameValue.trim() || renameMutation.isPending}
              onClick={() =>
                renameTarget &&
                renameMutation.mutate({
                  from: joinPath(currentPath, renameTarget.name),
                  to: joinPath(currentPath, renameValue.trim()),
                })
              }
            >
              确定
            </Button>
          </>
        }
      >
        <div className='space-y-1.5'>
          <Label>新名称</Label>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
        </div>
      </Dialog>

      {/* 编辑器 */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title={editTarget ? `编辑 ${editTarget.name}` : ''}
        className='max-w-3xl'
        footer={
          <>
            <Button variant='outline' onClick={() => setEditTarget(null)}>关闭</Button>
            <Button
              disabled={editLoading || writeMutation.isPending}
              onClick={() =>
                editTarget &&
                writeMutation.mutate({
                  target: joinPath(currentPath, editTarget.name),
                  text: editContent,
                })
              }
            >
              {writeMutation.isPending ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        {editLoading ? (
          <LoadingState text='读取文件中…' />
        ) : (
          <Textarea
            className='min-h-[50vh] font-mono text-xs'
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
        )}
      </Dialog>

      {/* 删除确认 */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='永久删除'
        description={`确定要永久删除选中的 ${selected.size} 项吗？此操作不可撤销（可改用回收站）。`}
        confirmText='永久删除'
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(selectedPaths)}
      />

      {/* 压缩 */}
      <Dialog
        open={compressOpen}
        onOpenChange={setCompressOpen}
        title='压缩选中项'
        footer={
          <>
            <Button variant='outline' onClick={() => setCompressOpen(false)}>取消</Button>
            <Button disabled={!compressName.trim() || compressMutation.isPending} onClick={() => compressMutation.mutate()}>
              开始压缩
            </Button>
          </>
        }
      >
        <div className='space-y-1.5'>
          <Label>压缩包名称</Label>
          <Input value={compressName} onChange={(e) => setCompressName(e.target.value)} />
          <p className='text-xs text-muted-foreground'>将 {selected.size} 项压缩到当前目录</p>
        </div>
      </Dialog>

      {/* 回收站 */}
      <TrashDialog uuid={instanceUuid} open={trashOpen} onOpenChange={setTrashOpen} onRestored={invalidate} />
    </div>
  )
}

function TrashDialog(props: {
  uuid: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestored: () => void
}) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trash', props.uuid],
    queryFn: () => getTrashList(props.uuid),
    enabled: props.open,
  })

  const restoreMutation = useMutation({
    mutationFn: (names: string[]) => restoreTrash(props.uuid, names),
    onSuccess: () => {
      toast.success('已恢复')
      refetch()
      props.onRestored()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '恢复失败'),
  })

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title='回收站'
      description='已删除的文件可在此恢复'
      className='max-w-2xl'
    >
      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<Trash2 className='size-8' />} title='回收站为空' />
      ) : (
        <div className='max-h-80 divide-y overflow-y-auto rounded-lg border'>
          {data.map((item) => (
            <div key={item.name} className='flex items-center gap-3 px-3 py-2'>
              {item.isDir ? (
                <Folder className='size-4 text-warning' />
              ) : (
                <File className='size-4 text-muted-foreground' />
              )}
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm'>{item.name}</p>
                <p className='truncate text-xs text-muted-foreground'>{item.originalPath}</p>
              </div>
              <span className='text-xs text-muted-foreground'>{formatBytes(item.size)}</span>
              <Button
                variant='outline'
                size='xs'
                onClick={() => restoreMutation.mutate([item.name])}
                disabled={restoreMutation.isPending}
              >
                恢复
              </Button>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  )
}
