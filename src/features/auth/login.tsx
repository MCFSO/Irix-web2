import { KeyRound, Lock, Moon, Server, Sun, SunMoon, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label, Tabs } from '@/components/ui/misc'
import { ApiError, getOverview, login } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useNodeStore } from '@/stores/node-store'
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

export function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuthStore()
  const [mode, setMode] = useState<'account' | 'apikey'>('account')
  const [username, setUsername] = useState('root')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAccountLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('请输入用户名和密码')
      return
    }
    setLoading(true)
    try {
      const res = await login(username.trim(), password)
      auth.setToken(res.token, res.username, res.isAdmin, res.mustChangePassword)
      if (res.mustChangePassword) {
        toast.info('首次使用，请注册管理员密码')
        navigate({ to: '/setup' })
        return
      }
      toast.success(`欢迎回来，${res.username}`)
      navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleApiKeyLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      toast.error('请输入 API Key / 配对码')
      return
    }
    setLoading(true)
    try {
      // 更新当前选中节点的密钥
      const state = useNodeStore.getState()
      const node = state.nodes.find((n) => n.id === state.activeId)
      if (!node) {
        toast.error('尚未选择节点，请先在节点连接页添加')
        navigate({ to: '/connect' })
        return
      }
      state.updateNode(node.id, { apiKey: apiKey.trim() })
      auth.clear()
      await getOverview()
      toast.success('密钥已更新')
      navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '密钥无效')
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
          <p className='text-sm text-muted-foreground'>本地节点管理面板</p>
        </div>
      </div>

      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>登录节点账户</CardTitle>
          <CardDescription>
            登录节点上的账户系统，获得对应的端点权限；不登录则使用节点密钥（root）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            className='mb-4 w-full justify-stretch'
            value={mode}
            onValueChange={(v) => setMode(v as 'account' | 'apikey')}
            tabs={[
              { value: 'account', label: '账户登录' },
              { value: 'apikey', label: '更换密钥' },
            ]}
          />

          {mode === 'account' ? (
            <form onSubmit={handleAccountLogin} className='space-y-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='username'>用户名</Label>
                <div className='relative'>
                  <User className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    id='username'
                    className='pl-9'
                    placeholder='root'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete='username'
                  />
                </div>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='password'>密码 / 配对码</Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    id='password'
                    type='password'
                    className='pl-9'
                    placeholder='••••••••'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete='current-password'
                  />
                </div>
                <p className='text-xs text-muted-foreground'>
                  首次使用请输入配对码，之后将引导注册管理员密码
                </p>
              </div>
              <Button type='submit' className='w-full' disabled={loading}>
                {loading ? '登录中…' : '登录'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleApiKeyLogin} className='space-y-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='apikey'>API Key / 配对码</Label>
                <div className='relative'>
                  <KeyRound className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    id='apikey'
                    type='password'
                    className='pl-9'
                    placeholder='20 位配对码或固定 API Key'
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <p className='text-xs text-muted-foreground'>
                  首次启动节点时控制台显示的配对码，或 -apikey 启动参数
                </p>
              </div>
              <Button type='submit' className='w-full' disabled={loading}>
                {loading ? '验证中…' : '连接'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className='mt-8 text-xs text-muted-foreground'>
        IriX Node · 与 MCSManager 兼容的本地节点守护进程
      </p>
    </div>
  )
}
