import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { KeyRound, Server, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { ApiError, changePassword } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 首次使用引导：root 使用配对码首次登录后（mustChangePassword），
 * 必须设置新密码才能进入面板。
 */
export function SetupPage() {
  const navigate = useNavigate()
  const auth = useAuthStore()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => changePassword(oldPassword, newPassword),
    onSuccess: () => {
      auth.setMustChange(false)
      toast.success('密码设置成功，欢迎使用 IriX Node')
      navigate({ to: '/' })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : '设置失败'),
  })

  const valid =
    oldPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirm

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4'>
      <div className='mb-8 flex items-center gap-3'>
        <div className='flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground'>
          <Server className='size-6' />
        </div>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>IriX Node</h1>
          <p className='text-sm text-muted-foreground'>首次使用引导</p>
        </div>
      </div>

      <Card className='w-full max-w-sm'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='size-5 text-primary' />
            <CardTitle>注册管理员账户</CardTitle>
          </div>
          <CardDescription>
            首次使用，请为 root 管理员注册一个独立密码。
            注册后配对码将不再用于登录（API 调用不受影响）。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='setup-old'>配对码（验证身份）</Label>
            <div className='relative'>
              <KeyRound className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                id='setup-old'
                type='password'
                className='pl-9'
                placeholder='首次启动时控制台显示的配对码'
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete='current-password'
              />
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='setup-new'>设置管理员密码</Label>
            <Input
              id='setup-new'
              type='password'
              placeholder='至少 8 位'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete='new-password'
            />
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className='text-xs text-destructive'>密码至少 8 位</p>
            )}
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='setup-confirm'>确认密码</Label>
            <Input
              id='setup-confirm'
              type='password'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete='new-password'
            />
            {confirm.length > 0 && newPassword !== confirm && (
              <p className='text-xs text-destructive'>两次输入的密码不一致</p>
            )}
          </div>
          <Button
            className='w-full'
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? '注册中…' : '注册并进入面板'}
          </Button>
          <p className='text-center text-xs text-muted-foreground'>
            此步骤为强制要求，完成前无法使用面板
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
