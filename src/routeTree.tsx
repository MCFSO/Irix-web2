import {
  createRootRoute,
  createRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { useNodeStore } from '@/stores/node-store'
import { usePanelAuthStore } from '@/stores/panel-auth-store'
import { useAuthStore } from '@/stores/auth-store'
import { AuditPage } from '@/features/audit'
import { AccountsPage } from '@/features/accounts'
import { ConnectPage } from '@/features/setup/connect'
import { ContainersPage } from '@/features/containers'
import { DashboardPage } from '@/features/dashboard'
import { FilesPage } from '@/features/files'
import { FrpPage } from '@/features/frp'
import { InstanceDetailPage } from '@/features/instances/detail'
import { InstancesPage } from '@/features/instances'
import { LoginPage } from '@/features/auth/login'
import { PanelLoginPage } from '@/features/panel-auth/login'
import { PanelRegisterPage } from '@/features/panel-auth/register'
import { SetupPage } from '@/features/auth/setup'
import { RuntimePage } from '@/features/runtime'

// 根路由
const rootRoute = createRootRoute({
  component: Outlet,
})

// 面板本地：注册（首次使用）
const panelRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/panel-register',
  component: PanelRegisterPage,
})

// 面板本地：登录
const panelLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/panel-login',
  component: PanelLoginPage,
})

// 节点账户登录（可选，获得节点上的受限权限）
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    requirePanelAuth()
  },
  component: LoginPage,
})

// root 注册节点密码（节点账户系统的强制改密）
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  beforeLoad: () => {
    requirePanelAuth()
    const { token } = useAuthStore.getState()
    if (!token) throw redirect({ to: '/login' })
  },
  component: SetupPage,
})

/** 要求面板本地已登录；未注册 → 注册页，未登录 → 登录页。 */
function requirePanelAuth() {
  const { initialized, user } = usePanelAuthStore.getState()
  if (!initialized) {
    throw redirect({ to: '/panel-register' })
  }
  if (!user) {
    throw redirect({ to: '/panel-login' })
  }
}

// 主界面布局：只要求面板登录；节点未连接时各页面自行显示「未连接」引导。
const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authed',
  beforeLoad: ({ location }) => {
    requirePanelAuth()
    // root 用配对码登录节点账户系统后强制改密
    const { mustChangePassword } = useAuthStore.getState()
    if (mustChangePassword && location.pathname !== '/setup') {
      throw redirect({ to: '/setup' })
    }
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})

const dashboardRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/',
  component: DashboardPage,
})

const instancesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/instances',
  component: InstancesPage,
})

const instanceDetailRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/instances/$uuid',
  component: InstanceDetailPage,
})

const filesRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/files',
  component: FilesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    uuid: typeof search.uuid === 'string' ? search.uuid : undefined,
    path: typeof search.path === 'string' ? search.path : undefined,
  }),
})

const containersRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/containers',
  component: ContainersPage,
})

const runtimeRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/runtime',
  component: RuntimePage,
})

const frpRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/frp',
  component: FrpPage,
})

const connectRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/connect',
  component: ConnectPage,
})

const accountsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/accounts',
  component: AccountsPage,
})

const auditRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/audit',
  component: AuditPage,
})

export const routeTree = rootRoute.addChildren([
  panelRegisterRoute,
  panelLoginRoute,
  loginRoute,
  setupRoute,
  authedRoute.addChildren([
    dashboardRoute,
    connectRoute,
    instancesRoute,
    instanceDetailRoute,
    filesRoute,
    containersRoute,
    runtimeRoute,
    frpRoute,
    accountsRoute,
    auditRoute,
  ]),
])
