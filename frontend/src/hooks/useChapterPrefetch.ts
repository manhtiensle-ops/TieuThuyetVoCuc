/**
 * useChapterPrefetch.ts
 *
 * Tự động prefetch chapter tiếp theo khi user đọc đến 80% chapter hiện tại.
 *
 * Cơ chế:
 *  1. Hook nhận scrollPct (0.0–1.0) từ ReaderPage
 *  2. Khi scrollPct >= PREFETCH_THRESHOLD (0.8) lần đầu tiên → gọi API chapter kế
 *  3. Kết quả được lưu vào React Query cache → chương sau load tức thì (0 ms)
 *  4. Mỗi chapter chỉ prefetch 1 lần (ref guard), không spam request
 *
 * Tích hợp:
 *   const { isPrefetched } = useChapterPrefetch({ novelSlug, currentChapterNum, scrollPct })
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api-client'

const PREFETCH_THRESHOLD = 0.8   // prefetch khi đọc >= 80%
const PREFETCH_STALE_MS = 5 * 60 * 1000  // cache 5 phút

interface ChapterPrefetchOptions {
  novelSlug: string
  currentChapterNum: number
  totalChapters: number   // để không prefetch khi đã là chapter cuối
  scrollPct: number       // 0.0 → 1.0, cập nhật real-time từ scroll listener
  enabled?: boolean       // có thể tắt khi user chưa login hoặc chapter là premium
}

export function useChapterPrefetch({
  novelSlug,
  currentChapterNum,
  totalChapters,
  scrollPct,
  enabled = true,
}: ChapterPrefetchOptions) {
  const queryClient = useQueryClient()
  const prefetchedRef = useRef<number | null>(null)  // chapter number đã prefetch

  useEffect(() => {
    // Không prefetch nếu: disabled, chưa đến ngưỡng, đã là chapter cuối,
    // hoặc đã prefetch chapter này rồi
    const nextChapter = currentChapterNum + 1
    if (
      !enabled ||
      scrollPct < PREFETCH_THRESHOLD ||
      nextChapter > totalChapters ||
      prefetchedRef.current === nextChapter
    ) return

    prefetchedRef.current = nextChapter

    // prefetchQuery: nếu đã có trong cache thì skip, không refetch
    queryClient.prefetchQuery({
      queryKey: ['chapter', novelSlug, nextChapter],
      queryFn: () =>
        api
          .get(`/novels/${novelSlug}/chapters/${nextChapter}`)
          .then((r) => r.data),
      staleTime: PREFETCH_STALE_MS,
    })
  }, [scrollPct, currentChapterNum, novelSlug, totalChapters, enabled, queryClient])

  // Reset khi chuyển chapter (người dùng chuyển trang)
  useEffect(() => {
    prefetchedRef.current = null
  }, [currentChapterNum])

  return {
    isPrefetched: prefetchedRef.current === currentChapterNum + 1,
  }
}
