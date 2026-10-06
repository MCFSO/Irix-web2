import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  /** 会话 token（账户登录） */
  token: string
  /** API Key（配对码 / 固定密钥） */
  apiKey: string
  username: string
  isAdmin: boolean
  mustChangePassword: boolean
  setToken: (token: string, username: string, isAdmin: boolean, mustChange: boolean) => void
  setApiKey: (key: string) => void
  setMustChange: (v: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: '',
      apiKey: '',
      username: '',
      isAdmin: false,
      mustChangePassword: false,
      setToken: (token, username, isAdmin, mustChangePassword) =>
        set({ token, username, isAdmin, mustChangePassword }),
      setApiKey: (apiKey) => set({ apiKey }),
      setMustChange: (mustChangePassword) => set({ mustChangePassword }),
      clear: () =>
        set({
          token: '',
          apiKey: '',
          username: '',
          isAdmin: false,
          mustChangePassword: false,
        }),
    }),
    { name: 'irix-node-auth' }
  )
)

export function useIsAuthenticated() {
  return useAuthStore((s) => Boolean(s.token || s.apiKey))
}
