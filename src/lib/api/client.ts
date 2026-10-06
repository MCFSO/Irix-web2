import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiResponse } from './types'
import { useAuthStore } from '@/stores/auth-store'
import { getActiveNode } from '@/stores/node-store'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** 计算请求的基础地址：当前选中节点的地址。 */
export function resolveBaseURL(): string {
  const node = getActiveNode()
  if (node?.url) {
    return node.url.replace(/\/+$/, '')
  }
  return ''
}

function createClient(): AxiosInstance {
  const client = axios.create({
    timeout: 30000,
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })

  client.interceptors.request.use((config) => {
    // 每次请求动态决定 baseURL，节点切换即时生效
    config.baseURL = resolveBaseURL() || undefined

    const auth = useAuthStore.getState()
    if (auth.token) {
      config.headers.set('X-Auth-Token', auth.token)
    } else if (auth.apiKey) {
      config.headers.set('X-Api-Key', auth.apiKey)
    } else {
      // 未登录账户时，使用当前选中节点保存的密钥
      const nodeKey = getActiveNode()?.apiKey
      if (nodeKey) {
        config.headers.set('X-Api-Key', nodeKey)
      }
    }
    return config
  })

  client.interceptors.response.use(
    (response) => {
      const body = response.data as ApiResponse
      if (body && typeof body === 'object' && 'status' in body) {
        if (body.status === 200) {
          return body.data as never
        }
        throw new ApiError(
          body.status,
          typeof body.data === 'string' ? body.data : '请求失败'
        )
      }
      return response.data as never
    },
    (error: AxiosError<ApiResponse>) => {
      if (error.response?.data && typeof error.response.data === 'object') {
        const body = error.response.data
        const msg = typeof body.data === 'string' ? body.data : '请求失败'
        if (error.response.status === 403 || error.response.status === 401) {
          useAuthStore.getState().clear()
        }
        throw new ApiError(error.response.status, msg)
      }
      if (error.code === 'ECONNABORTED') {
        throw new ApiError(0, '请求超时，节点可能离线')
      }
      throw new ApiError(0, error.message || '网络错误，无法连接节点')
    }
  )

  return client
}

export const api = createClient()
