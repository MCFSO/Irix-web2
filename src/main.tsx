import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import '@fontsource-variable/public-sans'
import { routeTree } from './routeTree'
import { usePanelAuthStore } from '@/stores/panel-auth-store'
import '@/stores/theme-store'
import './styles/index.css'

// 启动时恢复面板本地会话
usePanelAuthStore.getState().bootstrap()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position='top-center' richColors closeButton duration={4000} />
    </QueryClientProvider>
  </StrictMode>
)
