// 本机（运行面板的浏览器所在机器）系统信息采集。
// 这些数据纯客户端采集，不依赖后端节点。

import { useEffect, useState } from 'react'

export interface LocalMetrics {
  /** 浏览器可用的逻辑 CPU 核心数 */
  cores: number
  /** 设备内存（GB，可能不可用） */
  memory: number | null
  /** 网络下行速率（Mbps，基于 PerformanceObserver） */
  netDownMbps: number | null
  /** 网络上行速率（Mbps，基于 fetch 上传测速估算） */
  netUpMbps: number | null
  /** 页面加载耗时（ms） */
  pageLoadMs: number | null
  /** 当前页面内存使用（MB，仅 Chromium 支持） */
  jsHeapUsed: number | null
  /** JS 堆上限（MB） */
  jsHeapTotal: number | null
  /** 在线状态 */
  online: boolean
  /** 电池电量（0~1，可能不可用） */
  battery: number | null
  /** 是否在充电 */
  charging: boolean | null
  /** 屏幕分辨率 */
  screen: string
  /** 时区 */
  timezone: string
  /** 浏览器/OS */
  platform: string
}

export function useLocalMetrics(): LocalMetrics {
  const [m, setM] = useState<LocalMetrics>(() => collectOnce())

  useEffect(() => {
    let timer = setInterval(() => setM(collectOnce()), 5000)

    // 电池
    let battery: any
    if ('getBattery' in navigator) {
      ;(navigator as any).getBattery().then((b: any) => {
        battery = b
        const update = () =>
          setM((prev) => ({
            ...prev,
            battery: b.level,
            charging: b.charging,
          }))
        update()
        b.addEventListener('levelchange', update)
        b.addEventListener('chargingchange', update)
      })
    }

    // 在线状态
    const onOnline = () => setM((prev) => ({ ...prev, online: true }))
    const onOffline = () => setM((prev) => ({ ...prev, online: false }))
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return m
}

function collectOnce(): LocalMetrics {
  const nav = navigator as any
  const mem = nav.deviceMemory ?? null
  const cores = nav.hardwareConcurrency || 0

  // performance.memory（仅 Chromium）
  let jsHeapUsed: number | null = null
  let jsHeapTotal: number | null = null
  if (performance && (performance as any).memory) {
    const pm = (performance as any).memory
    jsHeapUsed = pm.usedJSHeapSize / 1048576
    jsHeapTotal = pm.jsHeapSizeLimit / 1048576
  }

  const pageLoadMs =
    performance && performance.timing
      ? performance.timing.loadEventEnd - performance.timing.navigationStart
      : null

  const screen = `${window.screen.width}×${window.screen.height}`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '-'
  const platform = nav.userAgentData
    ? `${nav.userAgentData.platform}`
    : nav.platform || '-'

  return {
    cores,
    memory: mem,
    netDownMbps: null,
    netUpMbps: null,
    pageLoadMs: pageLoadMs && pageLoadMs > 0 ? pageLoadMs : null,
    jsHeapUsed,
    jsHeapTotal,
    online: navigator.onLine,
    battery: null,
    charging: null,
    screen,
    timezone,
    platform,
  }
}
