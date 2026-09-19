// ── Shared Types ──────────────────────────────────────────────────────────────

export interface Novel {
  id: number
  slug: string
  title: string
  author: string
  cover_url: string | null
  description: string
  genres: string[]
  tags: string[]
  status: 'ongoing' | 'completed' | 'hiatus'
  total_chapters: number
  views: number
  rating: number
  uploader_id?: number | null
  uploader_name?: string | null
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
  email?: string
  display_name: string
  avatar_url: string | null
  bio: string
  role: 'admin' | 'editor' | 'vip' | 'reader'
  is_active?: boolean
  is_banned?: boolean
  ban_reason?: string | null
  joined_at: string
  novels_read: number
  chapters_read: number
  comments_count: number
}

export interface AdminStats {
  total_users: number
  total_novels: number
  total_chapters: number
  total_views: number
  pending_reports?: number
  blocked_ips_count?: number
}

export interface Report {
  id: number
  novel_id: number
  novel_title: string
  novel_slug: string
  novel_cover_url: string | null
  uploader_id: number | null
  uploader_name: string | null
  uploader_ip: string | null
  reporter_id: number | null
  reporter_name: string | null
  reporter_ip: string | null
  reason: string
  details: string
  status: 'pending' | 'resolved' | 'dismissed'
  admin_action: string | null
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
}

export interface BlockedIP {
  id: number
  ip_address: string
  reason: string
  created_at: string
  blocked_by_id: number | null
  blocked_by_name: string | null
}

export interface TaxonomyItem {
  name: string
  count: number
}

export interface TaxonomyData {
  genres: TaxonomyItem[]
  tags: TaxonomyItem[]
}

export interface NovelCreateInput {
  title: string
  author?: string
  slug?: string
  description?: string
  cover_url?: string
  status?: 'ongoing' | 'completed' | 'hiatus'
  genres?: string[]
  tags?: string[]
  first_chapter_title?: string
  first_chapter_content?: string
}

export interface ChapterCreateInput {
  number: number
  title: string
  content: string
  is_premium?: boolean
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

export type Theme = 'dark' | 'light' | 'sepia' | 'oled'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type LineHeight = 'compact' | 'normal' | 'loose'
