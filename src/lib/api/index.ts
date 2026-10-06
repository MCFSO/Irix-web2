import { api } from './client'
import type {
  AccountInfo,
  AuditEntry,
  BastilleJail,
  ContainerInfo,
  ContainerItem,
  FileItem,
  FileListResponse,
  FrpStatus,
  ImageItem,
  InstanceConfig,
  InstanceInfo,
  InstanceListResponse,
  InstanceStats,
  JavaRuntime,
  JavaRuntimeResponse,
  LoadInfo,
  LoginResponse,
  NetworkItem,
  Overview,
  PermCatalogGroup,
  TaskStatus,
  TrashItem,
} from './types'

export * from './types'
export { ApiError } from './client'

// ---------- 概览 ----------
export const getOverview = () => api.get<unknown, Overview>('/api/overview')
export const getLoad = () => api.get<unknown, LoadInfo>('/api/load')

// ---------- 实例 ----------
export interface InstanceListParams {
  page?: number
  page_size?: number
  instance_name?: string
  status?: number | string
}

export const getInstances = (params: InstanceListParams = {}) =>
  api.get<unknown, InstanceListResponse>('/api/service/remote_service_instances', {
    params: { page: 1, page_size: 100, ...params },
  })

export const getInstance = (uuid: string) =>
  api.get<unknown, InstanceInfo>('/api/instance', { params: { uuid } })

export const createInstance = (config: Partial<InstanceConfig>) =>
  api.post<unknown, { instanceUuid: string }>('/api/instance', config)

export const updateInstance = (uuid: string, config: Partial<InstanceConfig>) =>
  api.put<unknown, boolean>('/api/instance', config, { params: { uuid } })

export const deleteInstances = (uuids: string[], deleteFile = false) =>
  api.delete<unknown, boolean>('/api/instance', {
    data: { uuids, deleteFile },
  })

const instanceAction = (action: string, uuid: string, extra: Record<string, string> = {}) =>
  api.get<unknown, boolean>(`/api/protected_instance/${action}`, {
    params: { uuid, ...extra },
  })

export const startInstance = (uuid: string) => instanceAction('open', uuid)
export const stopInstance = (uuid: string) => instanceAction('stop', uuid)
export const restartInstance = (uuid: string) => instanceAction('restart', uuid)
export const killInstance = (uuid: string) => instanceAction('kill', uuid)
export const sendCommand = (uuid: string, command: string) =>
  instanceAction('command', uuid, { command })
export const getOutputLog = (uuid: string, size?: number) =>
  api.get<unknown, string>('/api/protected_instance/outputlog', {
    params: { uuid, size },
  })

export const getInstanceStats = (uuid: string) =>
  api.get<unknown, InstanceStats>('/api/instance/stats', { params: { uuid } })

export const getInstanceLogs = (uuid: string) =>
  api.get<unknown, string[]>('/api/instance/logs', { params: { uuid } })

export const clearInstanceLogs = (uuid: string) =>
  api.delete<unknown, boolean>('/api/instance/logs', { params: { uuid } })

export const importInstance = (dir: string, config: Partial<InstanceConfig>) =>
  api.post<unknown, { instanceUuid: string }>('/api/instance/import', { dir, ...config })

// ---------- 文件 ----------
export const getFileList = (uuid: string, target: string, page = 1, pageSize = 100) =>
  api.get<unknown, FileListResponse>('/api/files/list', {
    params: { uuid, target, page, page_size: pageSize },
  })

export const readFile = (uuid: string, target: string) =>
  api.put<unknown, string>('/api/files/', { target }, { params: { uuid } })

export const writeFile = (uuid: string, target: string, text: string) =>
  api.put<unknown, boolean>('/api/files/', { target, text }, { params: { uuid } })

export const deleteFiles = (uuid: string, targets: string[]) =>
  api.delete<unknown, boolean>('/api/files', { data: { targets }, params: { uuid } })

export const moveFiles = (uuid: string, targets: [string, string][]) =>
  api.put<unknown, boolean>('/api/files/move', { targets }, { params: { uuid } })

export const copyFiles = (uuid: string, targets: [string, string][]) =>
  api.post<unknown, boolean>('/api/files/copy', { targets }, { params: { uuid } })

export const compressFiles = (
  uuid: string,
  type: 1 | 2,
  code: string,
  source: string,
  targets: string[]
) =>
  api.post<unknown, boolean>(
    '/api/files/compress',
    { type, code, source, targets },
    { params: { uuid } }
  )

export const mkdir = (uuid: string, target: string) =>
  api.post<unknown, boolean>('/api/files/mkdir', { target }, { params: { uuid } })

export const touchFile = (uuid: string, target: string) =>
  api.post<unknown, boolean>('/api/files/touch', { target }, { params: { uuid } })

export const trashFiles = (uuid: string, targets: string[]) =>
  api.post<unknown, boolean>('/api/files/trash', { targets }, { params: { uuid } })

export const getTrashList = (uuid: string) =>
  api.get<unknown, TrashItem[]>('/api/files/trash/list', { params: { uuid } })

export const restoreTrash = (uuid: string, names: string[]) =>
  api.post<unknown, boolean>('/api/files/trash/restore', { names }, { params: { uuid } })

export const emptyTrash = (uuid: string) =>
  api.post<unknown, boolean>('/api/files/trash/empty', {}, { params: { uuid } })

export const getDownloadTicket = (uuid: string, fileName: string) =>
  api.post<unknown, { password: string; addr: string }>(
    '/api/files/download',
    {},
    { params: { uuid, file_name: fileName } }
  )

export const getUploadTicket = (uuid: string, uploadDir: string) =>
  api.post<unknown, { password: string; addr: string }>(
    '/api/files/upload',
    {},
    { params: { uuid, upload_dir: uploadDir } }
  )

// ---------- 账户 ----------
export const login = (username: string, password: string) =>
  api.post<unknown, LoginResponse>('/api/auth/login', { username, password })

export const logout = () => api.post<unknown, boolean>('/api/auth/logout')

export const getMe = () => api.get<unknown, AccountInfo>('/api/accounts/me')

export const getAccounts = () => api.get<unknown, AccountInfo[]>('/api/accounts')

export const createAccount = (data: {
  username: string
  password: string
  isAdmin?: boolean
}) => api.post<unknown, boolean>('/api/accounts', data)

export const deleteAccount = (username: string) =>
  api.delete<unknown, boolean>('/api/accounts', { data: { username } })

export const changePassword = (oldPassword: string, newPassword: string, username?: string) =>
  api.put<unknown, boolean>('/api/accounts/password', {
    oldPassword,
    newPassword,
    username,
  })

export const getPermCatalog = () =>
  api.get<unknown, PermCatalogGroup[]>('/api/accounts/catalog')

export const setAccountPermissions = (
  username: string,
  permissions: Record<string, boolean>
) => api.put<unknown, boolean>('/api/accounts/permissions', { username, permissions })

// ---------- 容器 ----------
export const getContainerInfo = () =>
  api.get<unknown, ContainerInfo>('/api/container/info')

export const getContainers = (all = true) =>
  api.get<unknown, ContainerItem[]>('/api/container/ps', {
    params: { all: all ? 1 : 0 },
  })

export const containerAction = (id: string, action: 'start' | 'stop' | 'restart' | 'kill') =>
  api.post<unknown, boolean>(`/api/container/${id}/${action}`)

export const deleteContainer = (id: string, force = false) =>
  api.delete<unknown, boolean>(`/api/container/${id}`, {
    params: { force: force ? 1 : 0 },
  })

export const getContainerLogs = (id: string, tail = 200) =>
  api.get<unknown, string>(`/api/container/${id}/logs`, { params: { tail } })

export const getImages = () => api.get<unknown, ImageItem[]>('/api/image/list')

export const pullImage = (name: string) =>
  api.post<unknown, boolean>('/api/image/pull', { name })

export const deleteImage = (name: string) =>
  api.delete<unknown, boolean>(`/api/image/${encodeURIComponent(name)}`)

export const getNetworks = () => api.get<unknown, NetworkItem[]>('/api/network/list')

// Bastille
export const getBastilleJails = () => api.get<unknown, BastilleJail[]>('/api/bastille/jails')
export const getBastilleReleases = () =>
  api.get<unknown, { name: string; version: string }[]>('/api/bastille/releases')

// ---------- FRP ----------
export const getFrpStatus = () => api.get<unknown, FrpStatus>('/api/frp/status')
export const createFrpTunnel = (data: {
  name: string
  type: string
  localIp: string
  localPort: number
  remotePort: number
}) => api.post<unknown, boolean>('/api/frp/tunnels', data)
export const frpTunnelAction = (id: string, action: 'start' | 'stop') =>
  api.post<unknown, boolean>(`/api/frp/tunnels/${id}/${action}`)
export const deleteFrpTunnel = (id: string) =>
  api.delete<unknown, boolean>(`/api/frp/tunnels/${id}`)

// ---------- 审计 ----------
export const getAuditLog = (page = 1, pageSize = 100) =>
  api.get<unknown, { items: AuditEntry[]; total: number }>('/api/audit/log', {
    params: { page, page_size: pageSize },
  })

// ---------- 运行时 ----------
export const getJavaRuntime = () => api.get<unknown, JavaRuntimeResponse>('/api/runtime/java')
export const installJdk = (version: string) =>
  api.post<unknown, { jobId: string }>('/api/runtime/java/install', { version })
export const uninstallJdk = (version: string) =>
  api.delete<unknown, boolean>('/api/runtime/java', { params: { version } })

// ---------- 任务 ----------
export const getTaskStatus = () => api.get<unknown, TaskStatus>('/api/instance/snapshot-progress')
