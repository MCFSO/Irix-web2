import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Boxes,
  Cpu,
  HardDrive,
  LayoutDashboard,
  MemoryStick,
  Monitor,
  Server,
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
import { ErrorState, LoadingState, Progress } from '@/components/ui/misc'
import { getOverview } from '@/lib/api'
import { formatBytes, formatBytesRate, formatPercent, formatTime, formatUptime } from '@/lib/utils'

interface NetSample {
  time: string
  down: number
  up: number
}

const MAX_SAMPLES = 40

export function DashboardPage() {
  const ready = useNodeReady()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: getOverview,
    refetchInterval: ready ? 5000 : false,
    enabled: ready,
  })

  const [netHistory, setNetHistory] = useState<NetSample[]>([])
  const lastUpdate = useRef<number>(0)

  useEffect(() => {
    if (!data?.system) return
    const t = Date.now()
    if (t - lastUpdate.current < 4500) return
    lastUpdate.current = t
    setNetHistory((prev) => {
      const next = [
        ...prev,
        {
          time: new Date(t).toLocaleTimeString('zh-CN', { hour12: false }),
          down: data.system.networkDownload ?? 0,
          up: data.system.networkUpload ?? 0,
        },
      ]
      return next.slice(-MAX_SAMPLES)
    })
  }, [data])

  const sys = data?.system
  const remote = data?.remote?.[0]

  return (
    <div className='space-y-6'>
      {/* 页头 */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <LayoutDashboard className='size-5 text-primary' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>仪表盘</h1>
            <p className='text-sm text-muted-foreground'>节点资源与运行状态总览</p>
          </div>
        </div>
        {ready && (
          <div className='flex items-center gap-2'>
            <Badge variant={remote?.available ? 'success' : 'destructive'}>
              {remote?.available ? '在线' : '离线'}
            </Badge>
            <Badge variant='secondary'>版本 {data?.version}</Badge>
          </div>
        )}
      </div>

      {!ready ? (
        <Card>
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
      ) : !data ? null : (
        <>
      {/* 主机信息 */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center gap-2'>
            <Monitor className='size-4 text-muted-foreground' />
            <CardTitle className='text-base'>主机信息</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6'>
            <InfoItem label='主机名' value={sys?.hostname} />
            <InfoItem label='系统' value={`${sys?.type} ${sys?.version || sys?.release}`} />
            <InfoItem label='平台' value={sys?.platform} />
            <InfoItem label='内核' value={sys?.release} />
            <InfoItem label='运行时间' value={formatUptime(sys?.uptime)} />
            <InfoItem label='运行时' value={sys?.node ?? '-'} />
          </div>
        </CardContent>
      </Card>

      {/* 资源卡片 */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <ResourceCard
          icon={<Cpu className='size-4' />}
          title='CPU 使用率'
          percent={sys?.cpuUsage}
          detail='系统整体占用'
        />
        <ResourceCard
          icon={<MemoryStick className='size-4' />}
          title='内存'
          percent={sys?.memUsage}
          detail={`${formatBytes(sys ? sys.totalmem - sys.freemem : null)} / ${formatBytes(sys?.totalmem)}`}
        />
        <ResourceCard
          icon={<HardDrive className='size-4' />}
          title='磁盘'
          percent={sys?.diskusage}
          detail={`${formatBytes(sys?.diskused)} / ${formatBytes(sys?.disktotal)}`}
        />
        <Card>
          <CardContent className='p-5'>
            <div className='flex items-center justify-between'>
              <p className='text-sm font-medium text-muted-foreground'>实例</p>
              <Boxes className='size-4 text-muted-foreground' />
            </div>
            <div className='mt-2 text-2xl font-bold tracking-tight'>
              {remote?.instance.running ?? 0}
              <span className='text-base font-normal text-muted-foreground'>
                {' '}
                / {remote?.instance.total ?? 0}
              </span>
            </div>
            <p className='mt-1 text-xs text-muted-foreground'>运行中 / 总数</p>
          </CardContent>
        </Card>
      </div>

      {/* 网络吞吐 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-base'>网络吞吐</CardTitle>
              <CardDescription>每 5 秒采样</CardDescription>
            </div>
            <div className='flex items-center gap-4 text-sm'>
              <span className='flex items-center gap-1.5'>
                <span className='size-2.5 rounded-full bg-primary' />
                下载 {formatBytesRate(sys?.networkDownload)}
              </span>
              <span className='flex items-center gap-1.5'>
                <span className='size-2.5 rounded-full bg-success' />
                上传 {formatBytesRate(sys?.networkUpload)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='h-64'>
            {netHistory.length < 2 ? (
              <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                <Activity className='mr-2 size-4 animate-pulse' />
                正在采集数据…
              </div>
            ) : (
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={netHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id='gradDown' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='0%' stopColor='var(--primary)' stopOpacity={0.35} />
                      <stop offset='100%' stopColor='var(--primary)' stopOpacity={0.02} />
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
                      formatBytesRate(value),
                      name === 'down' ? '下载' : '上传',
                    ]}
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='down'
                    stroke='var(--primary)'
                    strokeWidth={1.5}
                    fill='url(#gradDown)'
                    isAnimationActive={false}
                  />
                  <Area
                    type='monotone'
                    dataKey='up'
                    stroke='var(--success)'
                    strokeWidth={1.5}
                    fill='url(#gradUp)'
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 守护进程列表 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>守护进程</CardTitle>
          <CardDescription>
            共 {data.remoteCount?.total ?? 0} 个，{data.remoteCount?.available ?? 0} 个可用
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {(data.remote ?? []).map((r) => (
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
                <div className='text-center'>
                  <p className='font-semibold'>{formatPercent(r.system?.cpuUsage)}</p>
                  <p className='text-xs text-muted-foreground'>CPU</p>
                </div>
                <div className='text-center'>
                  <p className='font-semibold'>{formatPercent(r.system?.memUsage)}</p>
                  <p className='text-xs text-muted-foreground'>内存</p>
                </div>
                <div className='text-center'>
                  <p className='font-semibold'>
                    {r.instance.running}/{r.instance.total}
                  </p>
                  <p className='text-xs text-muted-foreground'>实例</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className='text-center text-xs text-muted-foreground'>
        数据更新于 {formatTime(Date.now())} · 每 5 秒自动刷新
      </p>
        </>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className='min-w-0'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='truncate font-medium' title={value}>
        {value || '-'}
      </p>
    </div>
  )
}

function ResourceCard(props: {
  icon: React.ReactNode
  title: string
  percent: number | undefined | null
  detail: string
}) {
  const pct = (props.percent ?? 0) * 100
  return (
    <Card>
      <CardContent className='p-5'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-medium text-muted-foreground'>{props.title}</p>
          <span className='text-muted-foreground'>{props.icon}</span>
        </div>
        <div className='mt-2 text-2xl font-bold tracking-tight'>{pct.toFixed(1)}%</div>
        <Progress value={pct} className='mt-3' />
        <p className='mt-2 text-xs text-muted-foreground'>{props.detail}</p>
      </CardContent>
    </Card>
  )
}
