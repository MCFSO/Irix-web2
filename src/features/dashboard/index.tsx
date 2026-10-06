import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Boxes,
  Cpu,
  Globe,
  HardDrive,
  LayoutDashboard,
  MemoryStick,
  Monitor,
  Network,
  Server,
  Wifi,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { NodeEmpty, useNodeReady } from '@/components/node-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/ui/misc'
import { StatCard } from '@/components/ui/stat-card'
import { getOverview, getInstances } from '@/lib/api'
import { useLocalMetrics } from '@/lib/local-metrics'
import { formatBytes, formatPercent, formatUptime } from '@/lib/utils'
import { useNodeStore } from '@/stores/node-store'

interface NetSample {
  time: string
  down: number
  up: number
}

const MAX_SAMPLES = 40

export function DashboardPage() {
  const ready = useNodeReady()
  const local = useLocalMetrics()
  const nodes = useNodeStore((s) => s.nodes)
  const activeId = useNodeStore((s) => s.activeId)

  // 当前选中节点的概览
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: getOverview,
    refetchInterval: ready ? 5000 : false,
    enabled: ready,
  })

  // 节点上的实例列表（用于统计总数）
  const { data: instData } = useQuery({
    queryKey: ['instances-summary'],
    queryFn: () => getInstances({ page: 1, page_size: 500 }),
    refetchInterval: ready ? 15000 : false,
    enabled: ready,
  })

  // 本机网络采样（基于 PerformanceObserver 粗估）
  const [netHistory, setNetHistory] = useState<NetSample[]>([])
  const lastTick = useRef(0)
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now()
      setNetHistory((prev) => {
        const next = [
          ...prev,
          {
            time: new Date(now).toLocaleTimeString('zh-CN', { hour12: false }),
            down: 0,
            up: 0,
          },
        ]
        return next.slice(-MAX_SAMPLES)
      })
      lastTick.current = now
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const sys = data?.system
  const remote = data?.remote?.[0]
  const allRemotes = data?.remote ?? []
  const runningInstances = allRemotes.reduce(
    (sum, r) => sum + (r.instance?.running ?? 0),
    0
  )
  const totalInstances = instData?.data?.length ?? allRemotes.reduce((sum, r) => sum + (r.instance?.total ?? 0), 0)

  return (
    <div className='space-y-6'>
      {/* 页头 */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <LayoutDashboard className='size-5 text-primary' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>仪表盘</h1>
            <p className='text-sm text-muted-foreground'>本机性能与节点总览</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant={local.online ? 'success' : 'destructive'}>
            {local.online ? '本机在线' : '本机离线'}
          </Badge>
          {ready && (
            <Badge variant={remote?.available ? 'success' : 'warning'}>
              {nodes.length} 个节点 · {runningInstances} 个实例运行中
            </Badge>
          )}
        </div>
      </div>

      {/* 本机性能卡片 */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='CPU 核心'
          icon={Cpu}
          tone='accent-1'
          value={`${local.cores}`}
          description={local.platform}
        />
        <StatCard
          title='JS 堆内存'
          icon={MemoryStick}
          tone='accent-2'
          value={
            local.jsHeapUsed != null
              ? `${local.jsHeapUsed.toFixed(1)} MB`
              : '不可用'
          }
          description={
            local.jsHeapTotal != null
              ? `上限 ${local.jsHeapTotal.toFixed(0)} MB`
              : local.memory != null
                ? `设备内存 ${local.memory} GB`
                : undefined
          }
          progress={
            local.jsHeapUsed != null && local.jsHeapTotal != null
              ? (local.jsHeapUsed / local.jsHeapTotal) * 100
              : undefined
          }
        />
        <StatCard
          title='节点数'
          icon={Server}
          tone='accent-3'
          value={nodes.length}
          description={`${nodes.filter((n) => n.id === activeId).length > 0 ? '当前选中 1 个' : '未选中'}`}
        />
        <StatCard
          title='实例总数'
          icon={Boxes}
          tone='accent-1'
          value={totalInstances}
          description={`${runningInstances} 个运行中`}
        />
      </div>

      {/* 第二行：本机环境详情 */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='网络状态'
          icon={Wifi}
          tone='accent-2'
          value={local.online ? '已连接' : '离线'}
          description={local.screen}
        />
        <StatCard
          title='电池'
          icon={Activity}
          tone='accent-3'
          value={
            local.battery != null
              ? `${(local.battery * 100).toFixed(0)}%`
              : '不可用'
          }
          description={
            local.charging != null
              ? local.charging
                ? '充电中'
                : '使用电池'
              : undefined
          }
          progress={local.battery != null ? local.battery * 100 : undefined}
        />
        <StatCard
          title='屏幕分辨率'
          icon={Monitor}
          tone='accent-1'
          value={local.screen}
          description={`时区 ${local.timezone}`}
        />
        <StatCard
          title='页面加载'
          icon={HardDrive}
          tone='accent-2'
          value={
            local.pageLoadMs != null
              ? `${(local.pageLoadMs / 1000).toFixed(2)}s`
              : '-'
          }
          description={local.platform}
        />
      </div>

      {/* 节点数据区 */}
      {!ready ? (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>节点资源</CardTitle>
            <CardDescription>连接节点后查看后端服务器性能</CardDescription>
          </CardHeader>
          <CardContent>
            <NodeEmpty />
          </CardContent>
        </Card>
      ) : isLoading ? (
        <LoadingState />
      ) : error ? (
        <Card>
          <CardContent>
            <ErrorState
              message={error instanceof Error ? error.message : '无法获取节点信息'}
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* 节点资源卡片 */}
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <StatCard
              title='节点 CPU'
              icon={Cpu}
              tone='accent-1'
              value={formatPercent(sys?.cpuUsage)}
              description={sys?.type}
              progress={sys ? sys.cpuUsage * 100 : undefined}
            />
            <StatCard
              title='节点内存'
              icon={MemoryStick}
              tone='accent-2'
              value={formatPercent(sys?.memUsage)}
              description={`${formatBytes(sys ? sys.totalmem - sys.freemem : null)} / ${formatBytes(sys?.totalmem)}`}
              progress={sys ? sys.memUsage * 100 : undefined}
            />
            <StatCard
              title='节点磁盘'
              icon={HardDrive}
              tone='accent-3'
              value={formatPercent(sys?.diskusage)}
              description={`${formatBytes(sys?.diskused)} / ${formatBytes(sys?.disktotal)}`}
              progress={sys ? sys.diskusage * 100 : undefined}
            />
            <StatCard
              title='运行时间'
              icon={Server}
              tone='accent-1'
              value={formatUptime(sys?.uptime)}
              description={`v${data.version}`}
            />
          </div>

          {/* 节点网络吞吐 */}
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='text-base'>节点网络吞吐</CardTitle>
                  <CardDescription>每 5 秒采样</CardDescription>
                </div>
                <div className='flex items-center gap-4 text-sm'>
                  <span className='flex items-center gap-1.5'>
                    <span className='size-2.5 rounded-full bg-[var(--overview-accent-1)]' />
                    下载 {formatBytes(sys?.networkDownload)}/s
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <span className='size-2.5 rounded-full bg-[var(--success)]' />
                    上传 {formatBytes(sys?.networkUpload)}/s
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='h-56'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={netHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id='gradDown' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0%' stopColor='var(--overview-accent-1)' stopOpacity={0.35} />
                        <stop offset='100%' stopColor='var(--overview-accent-1)' stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id='gradUp' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0%' stopColor='var(--success)' stopOpacity={0.35} />
                        <stop offset='100%' stopColor='var(--success)' stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' vertical={false} />
                    <XAxis
                      dataKey='time'
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={40}
                    />
                    <YAxis
                      tickFormatter={(v: number) => formatBytes(v)}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${formatBytes(value)}/s`,
                        name === 'down' ? '下载' : '上传',
                      ]}
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type='monotone' dataKey='down' stroke='var(--overview-accent-1)' strokeWidth={1.5} fill='url(#gradDown)' isAnimationActive={false} />
                    <Area type='monotone' dataKey='up' stroke='var(--success)' strokeWidth={1.5} fill='url(#gradUp)' isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 守护进程列表 */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>节点列表</CardTitle>
              <CardDescription>
                共 {data.remoteCount?.total ?? 0} 个，{data.remoteCount?.available ?? 0} 个可用
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {allRemotes.map((r) => (
                <div
                  key={r.uuid}
                  className='flex flex-wrap items-center gap-4 rounded-lg border p-4'
                >
                  <div className='flex size-10 items-center justify-center rounded-lg bg-primary/10'>
                    <Server className='size-5 text-primary' />
                  </div>
                  <div className='min-w-40 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{r.remarks || '本地节点'}</span>
                      <Badge variant={r.available ? 'success' : 'destructive'}>
                        {r.available ? '可用' : '不可用'}
                      </Badge>
                    </div>
                    <p className='mt-0.5 text-xs text-muted-foreground'>
                      {r.ip}:{r.port} · v{r.version} · {r.system?.type} {r.system?.version}
                    </p>
                  </div>
                  <div className='flex items-center gap-6 text-sm'>
                    <Metric label='CPU' value={formatPercent(r.system?.cpuUsage)} />
                    <Metric label='内存' value={formatPercent(r.system?.memUsage)} />
                    <Metric label='实例' value={`${r.instance.running}/${r.instance.total}`} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='text-center'>
      <p className='font-semibold tabular-nums'>{value}</p>
      <p className='text-xs text-muted-foreground'>{label}</p>
    </div>
  )
}
