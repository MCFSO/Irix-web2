// IriX Node 后端 API 类型定义（对齐 MCSM 风格 {status, data, time} 响应）。

export interface ApiResponse<T = unknown> {
  status: number
  data: T
  time: number
}

// ---------- 概览 ----------
export interface OverviewSystem {
  type: string
  platform: string
  hostname: string
  release: string
  version: string
  uptime: number
  totalmem: number
  freemem: number
  cpuUsage: number
  memUsage: number
  diskusage: number
  disktotal: number
  diskused: number
  networkDownload: number
  networkUpload: number
  node?: string
  cwd?: string
  time?: number
}

export interface OverviewRemote {
  uuid: string
  ip: string
  port: number
  remarks: string
  version: string
  available: boolean
  instance: { running: number; total: number }
  system: OverviewSystem
}

export interface Overview {
  version: string
  system: OverviewSystem
  remote: OverviewRemote[]
  remoteCount: { available: number; total: number }
}

// ---------- 实例 ----------
export const InstanceStatus = {
  Busy: -1,
  Stopped: 0,
  Stopping: 1,
  Starting: 2,
  Running: 3,
} as const

export interface EventTask {
  autoStart: boolean
  autoRestart: boolean
  ignore: boolean
}

export interface PingConfig {
  ip: string
  port: number
  type: number
}

export interface InstanceConfig {
  nickname: string
  startCommand: string
  stopCommand: string
  cwd: string
  ie: string
  oe: string
  createDatetime: number
  lastDatetime: number
  type: string
  tag: string[]
  endTime: number
  fileCode: string
  processType: string
  updateCommand: string
  actionCommandList: string[]
  crlf: number
  eventTask: EventTask
  pingConfig: PingConfig
  vaultFiles?: boolean
}

export interface InstanceInfo {
  instanceUuid: string
  started: number
  status: number
  config: InstanceConfig
  info?: Record<string, unknown>
}

export interface InstanceListResponse {
  maxPage: number
  page: number
  pageSize: number
  data: InstanceInfo[]
}

export interface InstanceStats {
  cpu?: number
  memory?: number
  memoryLimit?: number
  [key: string]: unknown
}

// ---------- 文件 ----------
export interface FileItem {
  name: string
  size: number
  time: string
  mode?: number
  type: number // 0 = 文件, 1 = 目录
}

export interface FileListResponse {
  items: FileItem[]
  total: number
  page: number
  pageSize: number
  absolutePath?: string
}

// ---------- 账户 ----------
export interface AccountInfo {
  username: string
  isAdmin: boolean
  mustChangePassword?: boolean
  builtin?: boolean
  createdAt?: number
  permissions?: Record<string, boolean> | null
}

export interface PermCatalogEntry {
  pattern: string
  description: string
}

export interface PermCatalogGroup {
  group: string
  entries: PermCatalogEntry[]
}

export interface LoginResponse {
  token: string
  username: string
  isAdmin: boolean
  mustChangePassword: boolean
  expiresAt: number
}

// ---------- 容器 ----------
export interface ContainerInfo {
  runtime: 'docker' | 'bastille'
  platform: string
  version: string
  available: boolean
}

export interface ContainerItem {
  id: string
  name: string
  image: string
  status: string
  state: string
  ports?: string[]
  createdAt?: number
  restartPolicy?: string
}

export interface ImageItem {
  id: string
  tags: string[]
  sizeBytes: number
  createdAt: number
}

export interface NetworkItem {
  name: string
  driver: string
  subnet?: string
}

export interface BastilleJail {
  name: string
  release: string
  status: string
  state?: string
  ip?: string
}

// ---------- FRP ----------
export interface FrpStatus {
  installed: boolean
  running: boolean
  version?: string
  tunnels?: FrpTunnel[]
}

export interface FrpTunnel {
  id: string
  name: string
  type: string
  localIp: string
  localPort: number
  remotePort: number
  status?: string
}

// ---------- 审计 ----------
export interface AuditEntry {
  time: number
  method: string
  path: string
  status: number
  identity?: string
  ip?: string
  detail?: string
}

// ---------- 运行时 ----------
export interface JavaRuntime {
  path: string
  version: string
  vendor: string
  major: number
  available: boolean
}

export interface JavaRuntimeResponse {
  default: JavaRuntime | null
  all: JavaRuntime[]
}

// ---------- 任务 ----------
export interface TaskStatus {
  status: 'running' | 'done' | 'failed'
  progress?: number
  message?: string
  log?: string[]
}

// ---------- 回收站 ----------
export interface TrashItem {
  name: string
  originalPath: string
  size: number
  deletedAt: number
  isDir: boolean
}

// ---------- 负载调谐 ----------
export interface LoadInfo {
  enabled: boolean
  level?: string
  [key: string]: unknown
}
