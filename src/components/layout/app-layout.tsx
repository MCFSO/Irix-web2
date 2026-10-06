import {
  Boxes,
  CircleUserRound,
  Container,
  Cpu,
  FileClock,
  FolderOpen,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Sun,
  SunMoon,
  Unplug,
  Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useNodeStore } from '@/stores/node-store'
import { usePanelAuthStore } from '@/stores/panel-auth-store'
import { useThemeStore } from '@/stores/theme-store'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  { to: '/', label: '仪表盘', icon: <LayoutDashboard className='size-4' /> },
  { to: '/connect', label: '节点连接', icon: <Unplug className='size-4' /> },
  { to: '/instances', label: '实例管理', icon: <Boxes className='size-4' /> },
  { to: '/files', label: '文件管理', icon: <FolderOpen className='size-4' /> },
  { to: '/containers', label: '容器环境', icon: <Container className='size-4' /> },
  { to: '/runtime', label: '运行时', icon: <Cpu className='size-4' /> },
  { to: '/frp', label: '内网穿透', icon: <Network className='size-4' /> },
  { to: '/accounts', label: '账户管理', icon: <Users className='size-4' /> },
  { to: '/audit', label: '审计日志', icon: <FileClock className='size-4' /> },
]

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : SunMoon
  return (
    <button
      onClick={() => setTheme(next)}
      className='inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
      title={`当前主题：${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}`}
    >
      <Icon className='size-4' />
    </button>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const panelUser = usePanelAuthStore((s) => s.user)
  const panelLogout = usePanelAuthStore((s) => s.logout)
  const activeNode = useNodeStore((s) => s.nodes.find((n) => n.id === s.activeId))

  const handlePanelLogout = () => {
    panelLogout()
    toast.success('已退出面板')
    navigate({ to: '/panel-login' })
  }

  return (
    <div className='flex h-screen flex-col overflow-hidden'>
      {/* 顶栏 */}
      <header className='flex h-12 shrink-0 items-center gap-1.5 border-b bg-background px-2 sm:gap-2 sm:px-3'>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className='inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <PanelLeftOpen className='size-4' /> : <PanelLeftClose className='size-4' />}
        </button>
        <div className='flex items-center gap-2'>
          <Server className='size-5 text-primary' />
          <span className='text-sm font-semibold'>IriX Node</span>
          {activeNode && (
            <span className='hidden max-w-48 truncate rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground sm:inline'>
              {activeNode.name}
            </span>
          )}
        </div>
        <div className='ml-auto flex items-center gap-1'>
          <ThemeToggle />
          <div className='mx-1 h-5 w-px bg-border' />
          {/* 面板本地用户 */}
          <div className='flex items-center gap-2 rounded-lg px-2 py-1 text-sm'>
            <CircleUserRound className='size-4 text-muted-foreground' />
            <span className='max-w-32 truncate'>{panelUser?.username}</span>
            {panelUser?.isAdmin && (
              <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'>
                管理员
              </span>
            )}
          </div>
          <button
            onClick={handlePanelLogout}
            className='inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive'
            title='退出面板登录'
          >
            <LogOut className='size-4' />
          </button>
          <Link
            to='/connect'
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              activeNode ? '' : 'text-warning hover:bg-warning/10'
            )}
            title={activeNode ? `当前节点：${activeNode.name}` : '尚未连接节点，点击去连接'}
          >
            <Unplug className='size-4' />
          </Link>
        </div>
      </header>

      <div className='flex min-h-0 flex-1'>
        {/* 侧边栏 */}
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r bg-background transition-all duration-200',
            collapsed ? 'w-12' : 'w-56'
          )}
        >
          <nav className='flex-1 space-y-1 overflow-y-auto px-2 py-3'>
            {navItems.map((item) => {
              const active =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    collapsed && 'justify-center px-0'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>
          <div className='border-t p-2'>
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground',
                collapsed && 'justify-center px-0'
              )}
            >
              <HardDrive className='size-4 shrink-0' />
              {!collapsed && activeNode && (
                <span className='truncate' title={activeNode.url}>
                  {activeNode.url.replace(/^https?:\/\//, '')}
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* 主内容 */}
        <main className='min-w-0 flex-1 overflow-y-auto bg-muted/30'>
          <div className='mx-auto max-w-[1400px] p-4 sm:p-6'>{children}</div>
        </main>
      </div>
    </div>
  )
}
