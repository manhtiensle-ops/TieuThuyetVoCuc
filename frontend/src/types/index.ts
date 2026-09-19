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

export interface CommentAuthor {
  id: number
  username: string
  display_name: string
  avatar_url: string | null
  role: 'admin' | 'editor' | 'vip' | 'reader'
}

export type ReactionType = 'like' | 'laugh' | 'fire' | 'shock'

export interface CommentReactionsCount {
  like?: number
  laugh?: number
  fire?: number
  shock?: number
  [key: string]: number | undefined
}

export interface Comment {
  id: number
  chapter_id: number
  user_id: number
  paragraph_index: number | null
  parent_id: number | null
  content: string
  upvotes?: number
  is_spoiler: boolean
  created_at: string
  updated_at?: string | null
  user: CommentAuthor
  reactions_count: CommentReactionsCount
  my_reaction: ReactionType | null
  replies_count: number
  replies: Comment[]
}

export interface CommentsSummary {
  chapter_id: number
  total_comments: number
  chapter_comments_count: number
  paragraph_counts: Record<string, number>
}

export interface CommentCreateInput {
  content: string
  paragraph_index?: number | null
  parent_id?: number | null
  is_spoiler?: boolean
}

export interface CommentReactionResult {
  comment_id: number
  user_id: number
  reaction_type: ReactionType | null
  reactions_count: CommentReactionsCount
}

export interface AdminComment {
  id: number
  content: string
  chapter_id: number
  chapter_title: string | null
  chapter_number: number | null
  novel_title: string | null
  novel_slug: string | null
  paragraph_index: number | null
  parent_id: number | null
  is_spoiler: boolean
  created_at: string
  user: CommentAuthor | null
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
