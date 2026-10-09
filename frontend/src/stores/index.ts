import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Theme, FontSize, LineHeight } from '@/types'
import { tokenStore } from '@/lib/tokenStore'

// ── Auth Store ────────────────────────────────────────────────────────────────
// [FIX] Không dùng persist middleware cho auth state — token lưu in-memory qua
// tokenStore, user object được tải lại sau page reload bằng silent-refresh
// (HttpOnly refresh cookie → GET /auth/me → setUser)
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    // [FIX] Xóa in-memory token thay vì localStorage
    tokenStore.clear()
    set({ user: null, isAuthenticated: false })
  },
}))

// ── Reading Preferences Store (persisted) ─────────────────────────────────────
interface ReaderState {
  theme: Theme
  fontSize: FontSize
  lineHeight: LineHeight
  fontFamily: 'serif' | 'sans'
  setTheme: (t: Theme) => void
  setFontSize: (f: FontSize) => void
  setLineHeight: (l: LineHeight) => void
  setFontFamily: (f: 'serif' | 'sans') => void
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 'md',
      lineHeight: 'normal',
      fontFamily: 'serif',
      setTheme:      (theme)      => set({ theme }),
      setFontSize:   (fontSize)   => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
    }),
    { name: 'novel-reader-prefs' },
  ),
)

// ── UI Store ──────────────────────────────────────────────────────────────────
interface UIState {
  navOpen: boolean
  readerControlsVisible: boolean
  setNavOpen: (v: boolean) => void
  setReaderControlsVisible: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  navOpen: false,
  readerControlsVisible: true,
  setNavOpen: (navOpen) => set({ navOpen }),
  setReaderControlsVisible: (readerControlsVisible) => set({ readerControlsVisible }),
}))
