import {
  Boxes,
  CircleUserRound,
  KeyRound,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox, EmptyState, Label, LoadingState, Switch } from '@/components/ui/misc'
import {
  addUser,
  changeLocalPassword,
  listUsers,
  removeUser,
  updateUserInstances,
  updateUserRole,
  type LocalUser,
} from '@/lib/local-auth'
import { usePanelAuthStore } from '@/stores/panel-auth-store'
import { formatTime } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getInstances } from '@/lib/api'
import { useNodeReady } from '@/components/node-guard'

export function AccountsPage() {
  const panelUser = usePanelAuthStore((s) => s.user)
  const [createOpen, setCreateOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<LocalUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LocalUser | null>(null)

  const users = listUsers()

  const handleDelete = () => {
    if (!deleteTarget) return
    try {
      removeUser(deleteTarget.username)
      toast.success(`用户「${deleteTarget.username}」已删除`)
      setDeleteTarget(null)
      // 触发重新渲染
      usePanelAuthStore.setState({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  // 非管理员只能改自己密码
  if (!panelUser?.isAdmin) {
    return (
      <div className='space-y-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>账户</h1>
          <p className='text-sm text-muted-foreground'>当前账户：{panelUser?.username}</p>
        </div>
        <ChangePasswordCard />
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Users className='size-5 text-primary' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>面板用户管理</h1>
            <p className='text-sm text-muted-foreground'>
              管理本机面板的用户账户；普通用户只能使用被分配的实例
            </p>
          </div>
        </div>
        <Button size='sm' onClick={() => setCreateOpen(true)}>
          <Plus />
          添加用户
        </Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={<Users className='size-10' />} title='暂无用户' />
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-3'>
          {users.map((u) => (
            <UserCard
              key={u.username}
              user={u}
              isCurrentUser={u.username === panelUser.username}
              onAssign={() => setAssignTarget(u)}
              onDelete={() => setDeleteTarget(u)}
            />
          ))}
        </div>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      {assignTarget && (
        <AssignInstancesDialog
          user={assignTarget}
          open={assignTarget !== null}
          onOpenChange={(open) => !open && setAssignTarget(null)}
        />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='删除用户'
        description={`确定要删除用户「${deleteTarget?.username}」吗？该用户将无法再登录面板。`}
        confirmText='删除'
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}

// ---------- 用户卡片 ----------
function UserCard(props: {
  user: LocalUser
  isCurrentUser: boolean
  onAssign: () => void
  onDelete: () => void
}) {
  const { user, isCurrentUser } = props
  const [editingRole, setEditingRole] = useState(false)

  const handleRoleChange = (isAdmin: boolean) => {
    try {
      updateUserRole(user.username, isAdmin)
      toast.success(`${user.username} 角色已更新为${isAdmin ? '管理员' : '普通用户'}`)
      usePanelAuthStore.setState({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    }
    setEditingRole(false)
  }

  return (
    <Card>
      <CardContent className='flex flex-wrap items-center gap-4 p-4'>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
            user.isAdmin ? 'bg-primary/10' : 'bg-muted'
          }`}
        >
          {user.isAdmin ? (
            <ShieldCheck className='size-5 text-primary' />
          ) : (
            <Shield className='size-5 text-muted-foreground' />
          )}
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <CircleUserRound className='size-4 text-muted-foreground' />
            <span className='font-semibold'>{user.username}</span>
            {user.isAdmin ? (
              <Badge>管理员</Badge>
            ) : (
              <Badge variant='secondary'>普通用户</Badge>
            )}
            {isCurrentUser && <Badge variant='outline'>当前登录</Badge>}
          </div>
          <p className='mt-1 text-xs text-muted-foreground'>
            创建于 {formatTime(user.createdAt)}
            {!user.isAdmin && user.assignedInstances !== undefined && (
              <span className='ml-2'>
                · 已分配 {user.assignedInstances.length} 个实例
              </span>
            )}
          </p>
        </div>

        <div className='flex items-center gap-1'>
          {!user.isAdmin && (
            <Button variant='outline' size='sm' onClick={props.onAssign}>
              <Boxes />
              分配实例
            </Button>
          )}
          {!editingRole ? (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setEditingRole(true)}
              disabled={isCurrentUser}
              title={isCurrentUser ? '不能修改自己的角色' : ''}
            >
              切换角色
            </Button>
          ) : (
            <>
              <Button
                variant='outline'
                size='xs'
                onClick={() => handleRoleChange(true)}
              >
                设为管理员
              </Button>
              <Button
                variant='outline'
                size='xs'
                onClick={() => handleRoleChange(false)}
              >
                设为普通用户
              </Button>
              <Button variant='ghost' size='xs' onClick={() => setEditingRole(false)}>
                取消
              </Button>
            </>
          )}
          <Button
            variant='ghost'
            size='sm'
            className='text-muted-foreground hover:text-destructive'
            disabled={isCurrentUser}
            onClick={props.onDelete}
            title={isCurrentUser ? '不能删除自己' : ''}
          >
            <Trash2 />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- 创建用户 ----------
function CreateUserDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setUsername('')
    setPassword('')
    setConfirm('')
    setIsAdmin(false)
  }

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast.error('请输入用户名')
      return
    }
    if (password.length < 8) {
      toast.error('密码至少 8 位')
      return
    }
    if (password !== confirm) {
      toast.error('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await addUser(username.trim(), password, isAdmin)
      toast.success(`用户「${username.trim()}」已创建`)
      usePanelAuthStore.setState({})
      reset()
      props.onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title='添加用户'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? '创建中…' : '创建'}
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
          <Input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password.length > 0 && password.length < 8 && (
            <p className='text-xs text-destructive'>密码至少 8 位</p>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label>确认密码</Label>
          <Input
            type='password'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm.length > 0 && password !== confirm && (
            <p className='text-xs text-destructive'>两次输入的密码不一致</p>
          )}
        </div>
        <div className='flex items-center justify-between rounded-lg border p-3'>
          <div>
            <p className='text-sm font-medium'>管理员</p>
            <p className='text-xs text-muted-foreground'>
              管理员可管理所有实例和用户；普通用户只能使用被分配的实例
            </p>
          </div>
          <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
        </div>
      </div>
    </Dialog>
  )
}

// ---------- 分配实例 ----------
function AssignInstancesDialog(props: {
  user: LocalUser
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const ready = useNodeReady()
  const { data, isLoading } = useQuery({
    queryKey: ['instances-all'],
    queryFn: () => getInstances({ page: 1, page_size: 500 }),
    enabled: ready,
  })
  const instances = data?.data ?? []
  const [selected, setSelected] = useState<Set<string>>(
    new Set(props.user.assignedInstances ?? [])
  )

  const toggle = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  const handleSave = () => {
    try {
      updateUserInstances(props.user.username, [...selected])
      toast.success(`已为「${props.user.username}」分配 ${selected.size} 个实例`)
      usePanelAuthStore.setState({})
      props.onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={`分配实例：${props.user.username}`}
      description='选中的实例将对该用户可见可操作；未选中的实例该用户无法访问'
      className='max-w-xl'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存分配</Button>
        </>
      }
    >
      {!ready ? (
        <div className='py-8 text-center text-sm text-muted-foreground'>
          请先连接节点，才能选择实例分配给用户
        </div>
      ) : isLoading ? (
        <LoadingState text='加载实例列表中…' />
      ) : instances.length === 0 ? (
        <EmptyState title='节点上暂无实例' description='先在实例管理中创建实例后再分配' />
      ) : (
        <div className='max-h-[50vh] space-y-1 overflow-y-auto'>
          {instances.map((inst) => (
            <label
              key={inst.instanceUuid}
              className='flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer'
            >
              <Checkbox
                checked={selected.has(inst.instanceUuid)}
                onCheckedChange={() => toggle(inst.instanceUuid)}
              />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>
                  {inst.config.nickname || '未命名实例'}
                </p>
                <p className='truncate text-xs text-muted-foreground'>{inst.config.cwd}</p>
              </div>
              <Badge variant='outline'>{inst.config.type}</Badge>
            </label>
          ))}
        </div>
      )}
    </Dialog>
  )
}

// ---------- 修改密码（独立卡片） ----------
export function ChangePasswordCard() {
  const panelUser = usePanelAuthStore((s) => s.user)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!panelUser) return
    if (newPassword.length < 8) {
      toast.error('新密码至少 8 位')
      return
    }
    if (newPassword !== confirm) {
      toast.error('两次输入的新密码不一致')
      return
    }
    setLoading(true)
    try {
      await changeLocalPassword(panelUser.username, oldPassword, newPassword)
      toast.success('密码已修改')
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '修改失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className='max-w-md'>
      <CardContent className='space-y-4 pt-5'>
        <div>
          <p className='font-medium'>修改密码</p>
          <p className='text-sm text-muted-foreground'>修改当前登录账户的密码</p>
        </div>
        <div className='space-y-1.5'>
          <Label>旧密码</Label>
          <Input
            type='password'
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className='space-y-1.5'>
          <Label>新密码</Label>
          <Input
            type='password'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {newPassword.length > 0 && newPassword.length < 8 && (
            <p className='text-xs text-destructive'>密码至少 8 位</p>
          )}
        </div>
        <div className='space-y-1.5'>
          <Label>确认新密码</Label>
          <Input
            type='password'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm.length > 0 && newPassword !== confirm && (
            <p className='text-xs text-destructive'>两次输入的密码不一致</p>
          )}
        </div>
        <Button
          className='w-full'
          disabled={!oldPassword || !newPassword || loading}
          onClick={handleSubmit}
        >
          {loading ? '提交中…' : '修改密码'}
        </Button>
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
