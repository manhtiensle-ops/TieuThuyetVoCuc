/**
 * useScrollProgress.ts
 *
 * Track vị trí scroll của reader container, trả về scrollPct (0.0–1.0).
 *
 * - Debounce 500ms để không update state quá nhiều khi scroll nhanh
 * - Dùng chung cho useChapterPrefetch + useOfflineSync
 *
 * Sử dụng:
 *   const { scrollPct, containerRef } = useScrollProgress()
 *   // gán containerRef vào div chứa nội dung chapter
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const DEBOUNCE_MS = 500

export function useScrollProgress() {
  const [scrollPct, setScrollPct] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScroll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      const { scrollTop, scrollHeight, clientHeight } = el
      const scrollable = scrollHeight - clientHeight
      if (scrollable <= 0) {
        setScrollPct(1)
        return
      }
      setScrollPct(Math.min(scrollTop / scrollable, 1))
    }, DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [handleScroll])

  return { scrollPct, containerRef }
}
