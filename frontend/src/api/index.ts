import api from '@/lib/api-client'
import type {
  Novel, Chapter, ChapterMeta, Comment, User,
  PaginatedResponse, AuthTokens,
} from '@/types'

// ── Novels ────────────────────────────────────────────────
export const novelsApi = {
  list: (params?: { page?: number; genre?: string; status?: string; q?: string }) =>
    api.get<PaginatedResponse<Novel>>('/novels', { params }).then((r) => r.data),

  get: (slug: string) =>
    api.get<Novel>(`/novels/${slug}`).then((r) => r.data),

  getChapters: (slug: string) =>
    api.get<ChapterMeta[]>(`/novels/${slug}/chapters`).then((r) => r.data),

  getFeatured: () =>
    api.get<Novel[]>('/novels/featured').then((r) => r.data),

  getHot: () =>
    api.get<Novel[]>('/novels/hot').then((r) => r.data),
}

// ── Chapters ──────────────────────────────────────────────
export const chaptersApi = {
  get: (novelSlug: string, chapterNumber: number) =>
    api.get<Chapter>(`/novels/${novelSlug}/chapters/${chapterNumber}`).then((r) => r.data),

  getComments: (chapterId: number, page = 1) =>
    api.get<PaginatedResponse<Comment>>(`/chapters/${chapterId}/comments`, {
      params: { page, per_page: 20 },
    }).then((r) => r.data),

  addComment: (chapterId: number, body: { content: string; is_spoiler?: boolean }) =>
    api.post<Comment>(`/chapters/${chapterId}/comments`, body).then((r) => r.data),

  upvoteComment: (commentId: number) =>
    api.post(`/comments/${commentId}/upvote`).then((r) => r.data),
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
