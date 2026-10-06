import { Moon, Server, ShieldCheck, Sun, SunMoon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { usePanelAuthStore } from '@/stores/panel-auth-store'
import { useThemeStore } from '@/stores/theme-store'

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : SunMoon
  return (
    <button
      onClick={() => setTheme(next)}
      className='inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
    >
      <Icon className='size-4' />
    </button>
  )
}

/** 首次使用：注册面板本地管理员（与后端节点账户无关）。 */
export function PanelRegisterPage() {
  const navigate = useNavigate()
  const register = usePanelAuthStore((s) => s.register)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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
      await register(username.trim(), password)
      toast.success(`管理员「${username.trim()}」注册成功`)
      navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4'>
      <div className='absolute right-4 top-4'>
        <ThemeToggle />
      </div>

      <div className='mb-8 flex items-center gap-3'>
        <div className='flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground'>
          <Server className='size-6' />
        </div>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>IriX Node</h1>
          <p className='text-sm text-muted-foreground'>节点管理面板</p>
        </div>
      </div>

      <Card className='w-full max-w-sm'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='size-5 text-primary' />
            <CardTitle>注册面板管理员</CardTitle>
          </div>
          <CardDescription>
            首次使用，请先创建一个本地管理员账户。
            该账户只保存在本浏览器中，用于保护这个面板，与后端节点账户无关。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='reg-username'>用户名</Label>
              <Input
                id='reg-username'
                placeholder='admin'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete='username'
                autoFocus
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='reg-password'>密码</Label>
              <Input
                id='reg-password'
                type='password'
                placeholder='至少 8 位'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete='new-password'
              />
              {password.length > 0 && password.length < 8 && (
                <p className='text-xs text-destructive'>密码至少 8 位</p>
              )}
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='reg-confirm'>确认密码</Label>
              <Input
                id='reg-confirm'
                type='password'
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete='new-password'
              />
              {confirm.length > 0 && password !== confirm && (
                <p className='text-xs text-destructive'>两次输入的密码不一致</p>
              )}
            </div>
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? '注册中…' : '注册并继续'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className='mt-8 max-w-sm text-center text-xs text-muted-foreground'>
        密码经 PBKDF2-SHA256 加盐哈希后存储，不会以明文保存
      </p>
    </div>
  )
}
