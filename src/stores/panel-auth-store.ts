import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  clearSession,
  getSessionUser,
  hasUsers,
  registerFirstUser,
  setSession,
  verifyLogin,
  type LocalUser,
} from '@/lib/local-auth'

interface PanelAuthState {
  /** 当前登录的面板本地用户；null = 未登录 */
  user: LocalUser | null
  /** 面板是否已有本地用户（决定进注册页还是登录页） */
  initialized: boolean
  /** 应用启动时恢复会话 */
  bootstrap: () => void
  register: (username: string, password: string) => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const usePanelAuthStore = create<PanelAuthState>()(
  persist(
    (set) => ({
      user: null,
      initialized: false,
      bootstrap: () => {
        // 先从 localStorage 恢复 persisted state（persist 中间件自动做了）
        // 再从 sessionStorage 恢复当前会话（如果还活着的话）
        const sessionUser = getSessionUser()
        const hasRegistered = hasUsers()
        set({
          user: sessionUser,
          initialized: hasRegistered,
        })
      },
      register: async (username, password) => {
        const user = await registerFirstUser(username, password)
        set({ user, initialized: true })
      },
      login: async (username, password) => {
        const user = await verifyLogin(username, password)
        set({ user, initialized: true })
      },
      logout: () => {
        clearSession()
        set({ user: null })
      },
    }),
    {
      name: 'irix-panel-auth',
      // 只持久化 initialized 标记和 user（如果会话还活着）
      partialize: (state) => ({
        user: state.user,
        initialized: state.initialized,
      }),
    }
  )
)

export { setSession }
