import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Utility: merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format number: 10000 → "10K" */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Format relative time (Vietnamese) */
export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'vừa xong'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} ngày trước`
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

/** Reading time estimate */
export function readingTime(wordCount: number, wpm = 250): string {
  const mins = Math.ceil(wordCount / wpm)
  return mins < 60 ? `${mins} phút đọc` : `${Math.floor(mins / 60)}h ${mins % 60}m đọc`
}

/** Clamp value between min and max */
export const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max)

/** Linear interpolation */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Chuẩn hóa Unicode tiếng Việt sang dạng dựng sẵn (NFC) */
export function normalizeNFC(text: string): string {
  if (!text) return ''
  return text.normalize('NFC')
}
