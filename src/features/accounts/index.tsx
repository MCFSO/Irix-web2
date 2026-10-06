import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus, Shield, ShieldCheck, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState, Label, LoadingState, Switch } from '@/components/ui/misc'
import {
  changePassword,
  createAccount,
  deleteAccount,
  getAccounts,
  getPermCatalog,
  setAccountPermissions,
  type AccountInfo,
} from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { formatTime } from '@/lib/utils'

export function AccountsPage() {
  const ready = useNodeReady()
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [permTarget, setPermTarget] = useState<AccountInfo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountInfo | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    retry: false,
    enabled: ready,
  })

  const deleteMutation = useMutation({
    mutationFn: (username: string) => deleteAccount(username),
    onSuccess: () => {
      toast.success('账户已删除')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '删除失败'),
  })

  // 非管理员只能改自己的密码
  if (!auth.isAdmin) {
    return (
      <div className='space-y-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>账户</h1>
          <p className='text-sm text-muted-foreground'>当前账户：{auth.username}</p>
        </div>
        <ChangePasswordCard />
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>账户管理</h1>
          <p className='text-sm text-muted-foreground'>管理节点账户与端点权限</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => setPasswordOpen(true)}>
            <KeyRound />
            修改我的密码
          </Button>
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Plus />
            新建账户
          </Button>
        </div>
      </div>

      {!ready ? (
        <Card>
          <CardContent>
            <NodeEmpty />
          </CardContent>
        </Card>
      ) : isLoading ? (
        <LoadingState />
      ) : error ? (
        <Card>
          <CardContent className='p-0'>
            <ErrorState
              message={error instanceof Error ? error.message : '账户系统未启用'}
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className='p-0'>
            <EmptyState icon={<Users className='size-10' />} title='暂无账户' />
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-3'>
          {data.map((account) => (
            <Card key={account.username}>
              <CardContent className='flex flex-wrap items-center gap-4 p-4'>
                <div className='flex size-10 items-center justify-center rounded-lg bg-primary/10'>
                  {account.isAdmin ? (
                    <ShieldCheck className='size-5 text-primary' />
                  ) : (
                    <Shield className='size-5 text-muted-foreground' />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='font-semibold'>{account.username}</span>
                    {account.isAdmin && <Badge>管理员</Badge>}
                    {account.builtin && <Badge variant='secondary'>内置</Badge>}
                    {account.mustChangePassword && (
                      <Badge variant='warning'>需改密</Badge>
                    )}
                  </div>
                  {account.createdAt ? (
                    <p className='mt-0.5 text-xs text-muted-foreground'>
                      创建于 {formatTime(account.createdAt)}
                    </p>
                  ) : null}
                </div>
                <div className='flex items-center gap-1'>
                  {!account.isAdmin && (
                    <Button variant='outline' size='sm' onClick={() => setPermTarget(account)}>
                      权限
                    </Button>
                  )}
                  {!account.builtin && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-muted-foreground hover:text-destructive'
                      onClick={() => setDeleteTarget(account)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      {permTarget && (
        <PermissionsDialog
          account={permTarget}
          open={permTarget !== null}
          onOpenChange={(open) => !open && setPermTarget(null)}
        />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='删除账户'
        description={`确定要删除账户「${deleteTarget?.username}」吗？该账户的所有会话将立即失效。`}
        confirmText='删除'
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.username)}
      />
    </div>
  )
}

// ---------- 修改密码（独立卡片，供非管理员使用） ----------
export function ChangePasswordCard() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => changePassword(oldPassword, newPassword),
    onSuccess: () => {
      toast.success('密码已修改')
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '修改失败'),
  })

  return (
    <Card className='max-w-md'>
      <CardHeader>
        <CardTitle className='text-base'>修改密码</CardTitle>
        <CardDescription>修改当前登录账户的密码</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-1.5'>
          <Label>旧密码</Label>
          <Input type='password' value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        </div>
        <div className='space-y-1.5'>
          <Label>新密码</Label>
          <Input type='password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className='space-y-1.5'>
          <Label>确认新密码</Label>
          <Input type='password' value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button
          className='w-full'
          disabled={!oldPassword || !newPassword || newPassword !== confirm || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? '提交中…' : '修改密码'}
        </Button>
        {newPassword && newPassword !== confirm && (
          <p className='text-xs text-destructive'>两次输入的新密码不一致</p>
        )}
      </CardContent>
    </Card>
  )
}

function ChangePasswordDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange} title='修改我的密码'>
      <ChangePasswordCard />
    </Dialog>
  )
}

// ---------- 新建账户 ----------
function CreateAccountDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const mutation = useMutation({
    mutationFn: () => createAccount({ username: username.trim(), password, isAdmin }),
    onSuccess: () => {
      toast.success('账户已创建')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      props.onOpenChange(false)
      setUsername('')
      setPassword('')
      setIsAdmin(false)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '创建失败'),
  })

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title='新建账户'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>取消</Button>
          <Button
            disabled={!username.trim() || !password || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            创建
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label>用户名</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div className='space-y-1.5'>
          <Label>密码</Label>
          <Input type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className='flex items-center justify-between rounded-lg border p-3'>
          <div>
            <p className='text-sm font-medium'>管理员</p>
            <p className='text-xs text-muted-foreground'>拥有全部端点权限，不受权限开关限制</p>
          </div>
          <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
        </div>
      </div>
    </Dialog>
  )
}

// ---------- 权限开关 ----------
function PermissionsDialog(props: {
  account: AccountInfo
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { data: catalog, isLoading } = useQuery({
    queryKey: ['perm-catalog'],
    queryFn: getPermCatalog,
  })
  const [perms, setPerms] = useState<Record<string, boolean>>(
    props.account.permissions ?? {}
  )

  const mutation = useMutation({
    mutationFn: () => setAccountPermissions(props.account.username, perms),
    onSuccess: () => {
      toast.success('权限已保存')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      props.onOpenChange(false)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : '保存失败'),
  })

  const toggle = (pattern: string) => {
    setPerms((prev) => ({ ...prev, [pattern]: !prev[pattern] }))
  }

  const setGroup = (group: string, value: boolean) => {
    if (!catalog) return
    const g = catalog.find((c) => c.group === group)
    if (!g) return
    setPerms((prev) => {
      const next = { ...prev }
      for (const e of g.entries) next[e.pattern] = value
      return next
    })
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={`端点权限：${props.account.username}`}
      description='控制该账户可访问的 API 端点；未列出的操作一律拒绝'
      className='max-w-2xl'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>取消</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? '保存中…' : '保存权限'}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : !catalog ? (
        <EmptyState title='无法加载权限目录' />
      ) : (
        <div className='max-h-[55vh] space-y-4 overflow-y-auto pr-1'>
          {catalog.map((group) => (
            <div key={group.group} className='rounded-lg border'>
              <div className='flex items-center justify-between border-b bg-muted/40 px-3 py-2'>
                <span className='text-sm font-medium'>{group.group}</span>
                <div className='flex gap-2'>
                  <Button variant='ghost' size='xs' onClick={() => setGroup(group.group, true)}>
                    全选
                  </Button>
                  <Button variant='ghost' size='xs' onClick={() => setGroup(group.group, false)}>
                    全不选
                  </Button>
                </div>
              </div>
              <div className='divide-y'>
                {group.entries.map((entry) => (
                  <div key={entry.pattern} className='flex items-center justify-between gap-3 px-3 py-2'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm'>{entry.description}</p>
                      <p className='truncate font-mono text-xs text-muted-foreground'>{entry.pattern}</p>
                    </div>
                    <Switch
                      checked={Boolean(perms[entry.pattern])}
                      onCheckedChange={() => toggle(entry.pattern)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  )
}
