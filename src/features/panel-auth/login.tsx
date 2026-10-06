import { Lock, Moon, Server, Sun, SunMoon, User } from 'lucide-react'
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

/** 面板本地登录（与后端节点账户无关）。 */
export function PanelLoginPage() {
  const navigate = useNavigate()
  const login = usePanelAuthStore((s) => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(username.trim(), password)
      toast.success(`欢迎回来，${username.trim()}`)
      navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败')
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
          <CardTitle>登录面板</CardTitle>
          <CardDescription>使用本机面板账户登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='login-username'>用户名</Label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='login-username'
                  className='pl-9'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete='username'
                  autoFocus
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='login-password'>密码</Label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='login-password'
                  type='password'
                  className='pl-9'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete='current-password'
                />
              </div>
            </div>
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? '登录中…' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className='mt-8 text-center text-xs text-muted-foreground'>
        此账户仅用于本机面板访问控制
      </p>
    </div>
  )
}
