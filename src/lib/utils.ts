import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB', 'PB']
  let value = bytes
  let i = -1
  do {
    value = value / 1024
    i++
  } while (value >= 1024 && i < units.length - 1)
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`
}

export function formatBytesRate(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null) return '-'
  return `${formatBytes(bytes)}/s`
}

export function formatPercent(ratio: number | undefined | null): string {
  if (ratio === undefined || ratio === null || Number.isNaN(ratio)) return '-'
  return `${(ratio * 100).toFixed(1)}%`
}

export function formatUptime(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null) return '-'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d} 天 ${h} 小时`
  if (h > 0) return `${h} 小时 ${m} 分钟`
  return `${m} 分钟`
}

export function formatTime(ms: number | undefined | null): string {
  if (!ms) return '-'
  return new Date(ms).toLocaleString('zh-CN', { hour12: false })
}
