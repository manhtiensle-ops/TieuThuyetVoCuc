import api from '@/lib/api-client'
import type {
  Novel,
  Chapter,
  ChapterMeta,
  Comment,
  CommentCreateInput,
  CommentsSummary,
  CommentReactionResult,
  ReactionType,
  AdminComment,
  User,
  PaginatedResponse,
  AuthTokens,
  AdminStats,
  NovelCreateInput,
  ChapterCreateInput,
  Report,
  BlockedIP,
  TaxonomyData,
} from '@/types'

// ── Novels ────────────────────────────────────────────────
export const novelsApi = {
  list: (params?: { page?: number; per_page?: number; genre?: string; tag?: string; status?: string; q?: string; uploader?: string }) =>
    api.get<PaginatedResponse<Novel>>('/novels', { params }).then((r) => r.data),

  get: (slug: string) =>
    api.get<Novel>(`/novels/${slug}`).then((r) => r.data),

  getChapters: (slug: string) =>
    api.get<ChapterMeta[]>(`/novels/${slug}/chapters`).then((r) => r.data),

  getFeatured: () =>
    api.get<Novel[]>('/novels/featured').then((r) => r.data),

  getHot: () =>
    api.get<Novel[]>('/novels/hot').then((r) => r.data),

  getTaxonomy: () =>
    api.get<TaxonomyData>('/novels/taxonomy/all').then((r) => r.data),

  create: (data: NovelCreateInput) =>
    api.post<Novel>('/novels', data).then((r) => r.data),

  addChapter: (slug: string, data: ChapterCreateInput) =>
    api.post<ChapterMeta>(`/novels/${slug}/chapters`, data).then((r) => r.data),

  report: (slug: string, data: { reason: string; details: string }) =>
    api.post<{ success: boolean; message: string; report_id: number }>(`/novels/${slug}/report`, data).then((r) => r.data),
}

// ── Upload ────────────────────────────────────────────────
export const uploadApi = {
  uploadImage: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<{ url: string; filename: string; width?: number; height?: number; size?: number }>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
  uploadFromUrl: async (url: string) => {
    const res = await api.post<{ url: string; filename: string; width?: number; height?: number; size?: number }>('/upload/from-url', { url })
    return res.data
  },
}

// ── Chapters ──────────────────────────────────────────────
export const chaptersApi = {
  get: (novelSlug: string, chapterNumber: number) =>
    api.get<Chapter>(`/novels/${novelSlug}/chapters/${chapterNumber}`).then((r) => r.data),

  getComments: (chapterId: number, page = 1) =>
    commentsApi.list(chapterId, { page, per_page: 20 }),

  addComment: (chapterId: number, body: CommentCreateInput) =>
    commentsApi.create(chapterId, body),

  upvoteComment: (commentId: number) =>
    commentsApi.react(commentId, 'like'),
}

// ── Comments ──────────────────────────────────────────────
export const commentsApi = {
  getSummary: (chapterId: number) =>
    api.get<CommentsSummary>(`/chapters/${chapterId}/comments/summary`).then((r) => r.data),

  list: (
    chapterId: number,
    params?: { paragraph_index?: number | null; all_comments?: boolean; page?: number; per_page?: number }
  ) =>
    api.get<PaginatedResponse<Comment>>(`/chapters/${chapterId}/comments`, { params }).then((r) => r.data),

  create: (chapterId: number, body: CommentCreateInput) =>
    api.post<Comment>(`/chapters/${chapterId}/comments`, body).then((r) => r.data),

  react: (commentId: number, reaction_type: ReactionType) =>
    api.post<CommentReactionResult>(`/comments/${commentId}/react`, { reaction_type }).then((r) => r.data),

  delete: (commentId: number) =>
    api.delete<{ message: string }>(`/comments/${commentId}`).then((r) => r.data),
}

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }).then((r) => {
      localStorage.setItem('access_token', r.data.access_token)
      return r.data
    }),

  register: (data: { username: string; email: string; password: string }) =>
    api.post<AuthTokens>('/auth/register', data).then((r) => {
      localStorage.setItem('access_token', r.data.access_token)
      return r.data
    }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<User>('/auth/me').then((r) => r.data),
}

// ── Users / Profile ───────────────────────────────────────
export const usersApi = {
  getProfile: (username: string) =>
    api.get<User>(`/users/${username}`).then((r) => r.data),

  getReadingHistory: (username: string) =>
    api.get<Novel[]>(`/users/${username}/history`).then((r) => r.data),

  getFavorites: (username: string) =>
    api.get<Novel[]>(`/users/${username}/favorites`).then((r) => r.data),

  addFavorite: (novelId: number) =>
    api.post(`/users/me/favorites/${novelId}`),

  removeFavorite: (novelId: number) =>
    api.delete(`/users/me/favorites/${novelId}`),
}

// ── Admin API ─────────────────────────────────────────────
export const adminApi = {
  getStats: () =>
    api.get<AdminStats>('/admin/stats').then((r) => r.data),

  listUsers: (params?: { page?: number; per_page?: number; role?: string; q?: string }) =>
    api.get<PaginatedResponse<User>>('/admin/users', { params }).then((r) => r.data),

  updateUser: (userId: number, body: { role?: string; is_active?: boolean; is_banned?: boolean; ban_reason?: string }) =>
    api.put<User>(`/admin/users/${userId}`, body).then((r) => r.data),

  banUser: (userId: number, reason?: string) =>
    api.post<{ success: boolean; message: string }>(`/admin/users/${userId}/ban`, null, { params: { reason } }).then((r) => r.data),

  unbanUser: (userId: number) =>
    api.post<{ success: boolean; message: string }>(`/admin/users/${userId}/unban`).then((r) => r.data),

  createNovel: (data: NovelCreateInput) =>
    api.post<Novel>('/admin/novels', data).then((r) => r.data),

  updateNovel: (novelId: number, data: Partial<NovelCreateInput>) =>
    api.put<Novel>(`/admin/novels/${novelId}`, data).then((r) => r.data),

  deleteNovel: (novelId: number) =>
    api.delete(`/admin/novels/${novelId}`),

  createChapter: (novelId: number, data: ChapterCreateInput) =>
    api.post<Chapter>(`/admin/novels/${novelId}/chapters`, data).then((r) => r.data),

  updateChapter: (chapterId: number, data: Partial<ChapterCreateInput>) =>
    api.put<Chapter>(`/admin/chapters/${chapterId}`, data).then((r) => r.data),

  deleteChapter: (chapterId: number) =>
    api.delete(`/admin/chapters/${chapterId}`),

  listReports: (params?: { page?: number; per_page?: number; status?: string }) =>
    api.get<PaginatedResponse<Report>>('/admin/reports', { params }).then((r) => r.data),

  handleReportAction: (reportId: number, body: { action: string; notes?: string }) =>
    api.post<{ success: boolean; message: string }>(`/admin/reports/${reportId}/action`, body).then((r) => r.data),

  listBlockedIPs: () =>
    api.get<BlockedIP[]>('/admin/blocked-ips').then((r) => r.data),

  blockIP: (data: { ip_address: string; reason: string }) =>
    api.post<BlockedIP>('/admin/blocked-ips', data).then((r) => r.data),

  unblockIP: (ipId: number) =>
    api.delete(`/admin/blocked-ips/${ipId}`),

  listComments: (params?: { page?: number; per_page?: number; q?: string }) =>
    api.get<PaginatedResponse<AdminComment>>('/admin/comments', { params }).then((r) => r.data),

  deleteComment: (commentId: number) =>
    commentsApi.delete(commentId),

  syncFolders: () =>
    api.post<{ novels_synced: number; chapters_synced: number }>('/admin/sync-folders').then((r) => r.data),

  exportFolders: () =>
    api.post<{ novels_exported: number; chapters_exported: number }>('/admin/export-folders').then((r) => r.data),
}
