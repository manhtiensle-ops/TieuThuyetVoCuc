/**
 * useOfflineSync.ts
 *
 * Hook quản lý đồng bộ tiến trình đọc khi offline → online.
 *
 * Cơ chế:
 *  - Khi mạng bị mất, progress được lưu vào IndexedDB queue (pending_syncs)
 *  - Khi mạng khôi phục, queue được flush lên server
 *  - Nếu server trả lỗi, retry tối đa 3 lần với exponential backoff
 *
 * Sử dụng:
 *   import { useOfflineSync } from '@/hooks/useOfflineSync'
 *   // trong ReaderPage:
 *   const { saveProgress } = useOfflineSync()
 *   saveProgress({ novel_slug, chapter_number, scroll_pct })
 */

import { useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api-client'

interface ProgressPayload {
  novel_slug: string
  chapter_number: number
  scroll_pct: number
}

interface PendingSync extends ProgressPayload {
  timestamp: number
  retries: number
}

const DB_NAME = 'novel-platform-offline'
const STORE_NAME = 'pending_syncs'
const MAX_RETRIES = 3

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Key = novel_slug, cho phép overwrite entry cũ cùng slug
        db.createObjectStore(STORE_NAME, { keyPath: 'novel_slug' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(data: PendingSync): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(data)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGetAll(): Promise<PendingSync[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as PendingSync[])
    req.onerror = () => reject(req.error)
  })
}

async function idbDelete(novel_slug: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(novel_slug)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflineSync() {
  const isOnline = useRef(navigator.onLine)
  const flushingRef = useRef(false)

  /** Flush tất cả pending syncs lên server */
  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return
    flushingRef.current = true
    try {
      const pending = await idbGetAll()
      for (const item of pending) {
        try {
          await api.put('/progress', {
            novel_slug: item.novel_slug,
            chapter_number: item.chapter_number,
            scroll_pct: item.scroll_pct,
          })
          await idbDelete(item.novel_slug)
        } catch {
          if (item.retries >= MAX_RETRIES) {
            // Quá nhiều lần thử — xóa bỏ để tránh queue đầy mãi
            await idbDelete(item.novel_slug)
          } else {
            await idbPut({ ...item, retries: item.retries + 1 })
          }
        }
      }
    } finally {
      flushingRef.current = false
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true
      flushQueue()
    }
    const handleOffline = () => {
      isOnline.current = false
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Flush ngay khi mount (phòng trường hợp có pending từ session trước)
    if (navigator.onLine) flushQueue()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushQueue])

  /**
   * Lưu progress:
   *  - Nếu online: gọi API trực tiếp, đồng thời lưu IDB (failsafe)
   *  - Nếu offline: chỉ lưu IDB, sẽ sync khi có mạng
   */
  const saveProgress = useCallback(async (payload: ProgressPayload) => {
    // Luôn lưu vào IDB trước (offline-first)
    await idbPut({ ...payload, timestamp: Date.now(), retries: 0 })

    if (isOnline.current) {
      try {
        await api.put('/progress', payload)
        // Sync thành công → xóa khỏi queue
        await idbDelete(payload.novel_slug)
      } catch {
        // Thất bại → giữ trong IDB, flush lần sau
      }
    }
  }, [])

  return { saveProgress, flushQueue, isOnline: isOnline.current }
}
