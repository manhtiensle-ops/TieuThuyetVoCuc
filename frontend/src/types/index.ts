// ── Shared Types ──────────────────────────────────────────────────────────────

export interface Novel {
  id: number
  slug: string
  title: string
  author: string
  cover_url: string | null
  description: string
  genres: string[]
  status: 'ongoing' | 'completed' | 'hiatus'
  total_chapters: number
  views: number
  rating: number
  updated_at: string
}

export interface Chapter {
  id: number
  novel_id: number
  number: number
  title: string
  content: string
  word_count: number
  is_premium: boolean
  published_at: string
}

export interface ChapterMeta {
  id: number
  novel_id: number
  number: number
  title: string
  is_premium: boolean
  published_at: string
}

export interface User {
  id: number
  username: string
  display_name: string
  avatar_url: string | null
  bio: string
  role: 'admin' | 'editor' | 'vip' | 'reader'
  joined_at: string
  novels_read: number
  chapters_read: number
  comments_count: number
}

export interface Comment {
  id: number
  chapter_id: number
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'role'>
  content: string
  upvotes: number
  is_spoiler: boolean
  created_at: string
  replies?: Comment[]
}

export interface AuthTokens {
  access_token: string
  token_type: 'bearer'
}

export interface ApiError {
  detail: string
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export type Theme = 'dark' | 'sepia' | 'oled'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type LineHeight = 'compact' | 'normal' | 'loose'
