import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  BookOpen,
  FileText,
  Eye,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  ArrowLeft,
  Shield,
  RefreshCw,
  Download,
  Flag,
  ShieldAlert,
  AlertTriangle,
  X,
  MessageSquare,
} from 'lucide-react'
import { novelsApi, adminApi } from '@/api'
import { useAuthStore } from '@/stores'
import { formatCount, timeAgo, cn } from '@/lib/utils'
import type {
  Novel,
  NovelCreateInput,
  ChapterCreateInput,
  Report,
  AdminComment,
} from '@/types'

// Simple Toast fallback
const toast = {
  success: (msg: string) => alert(`✓ ${msg}`),
  error: (msg: string) => alert(`✕ ${msg}`),
}

export default function AdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'novels' | 'users' | 'reports' | 'blacklist' | 'comments'>('overview')

  // Search / Filters
  const [novelQuery, setNovelQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all')
  const [commentQuery, setCommentQuery] = useState('')
  const [commentPage, setCommentPage] = useState(1)

  // Modals state
  const [isNovelModalOpen, setIsNovelModalOpen] = useState(false)
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null)
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false)
  const [selectedNovelForChapter, setSelectedNovelForChapter] = useState<Novel | null>(null)

  // Report Action Modal
  const [selectedReportForAction, setSelectedReportForAction] = useState<Report | null>(null)
  const [actionType, setActionType] = useState<'dismiss' | 'delete_novel' | 'ban_user' | 'block_ip'>('delete_novel')
  const [actionNotes, setActionNotes] = useState('')
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)

  // Manual IP Blacklist Form
  const [manualIP, setManualIP] = useState('')
  const [manualReason, setManualReason] = useState('')

  // Forms state
  const [novelForm, setNovelForm] = useState<NovelCreateInput>({
    title: '',
    author: '',
    description: '',
    cover_url: '',
    status: 'ongoing',
    genres: ['Huyền Huyễn'],
    tags: [],
  })

  const [chapterForm, setChapterForm] = useState<ChapterCreateInput>({
    number: 1,
    title: '',
    content: '',
    is_premium: false,
  })

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    enabled: isAuthenticated && (user?.role === 'admin' || user?.role === 'editor'),
  })

  const { data: novelsData } = useQuery({
    queryKey: ['admin', 'novels', novelQuery],
    queryFn: () => novelsApi.list({ q: novelQuery, per_page: 50 }),
    enabled: activeTab === 'novels' || activeTab === 'overview',
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users', userQuery, userRoleFilter],
    queryFn: () => adminApi.listUsers({ q: userQuery, role: userRoleFilter || undefined, per_page: 50 }),
    enabled: (activeTab === 'users' || activeTab === 'overview') && user?.role === 'admin',
  })

  const { data: reportsData } = useQuery({
    queryKey: ['admin', 'reports', reportStatusFilter],
    queryFn: () => adminApi.listReports({ status: reportStatusFilter === 'all' ? undefined : reportStatusFilter, per_page: 50 }),
    enabled: activeTab === 'reports' || activeTab === 'overview',
  })

  const { data: blockedIPs = [] } = useQuery({
    queryKey: ['admin', 'blocked-ips'],
    queryFn: adminApi.listBlockedIPs,
    enabled: (activeTab === 'blacklist' || activeTab === 'overview') && user?.role === 'admin',
  })

  const { data: commentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ['admin', 'comments', commentPage, commentQuery],
    queryFn: () => adminApi.listComments({ page: commentPage, per_page: 20, q: commentQuery || undefined }),
    enabled: activeTab === 'comments' || activeTab === 'overview',
  })

  // Mutations
  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteComment(id),
    onSuccess: () => {
      toast.success('Đã xóa bình luận thành công!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: () => toast.error('Không thể xóa bình luận!'),
  })
  const createNovelMutation = useMutation({
    mutationFn: adminApi.createNovel,
    onSuccess: () => {
      toast.success('Đăng tiểu thuyết mới thành công!')
      setIsNovelModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'novels'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
    onError: () => toast.error('Không thể tạo truyện. Vui lòng kiểm tra lại!'),
  })

  const updateNovelMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NovelCreateInput> }) =>
      adminApi.updateNovel(id, data),
    onSuccess: () => {
      toast.success('Cập nhật tiểu thuyết thành công!')
      setEditingNovel(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'novels'] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
    onError: () => toast.error('Cập nhật thất bại!'),
  })

  const deleteNovelMutation = useMutation({
    mutationFn: adminApi.deleteNovel,
    onSuccess: () => {
      toast.success('Đã xóa tiểu thuyết!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'novels'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
    onError: () => toast.error('Xóa truyện thất bại!'),
  })

  const createChapterMutation = useMutation({
    mutationFn: ({ novelId, data }: { novelId: number; data: ChapterCreateInput }) =>
      adminApi.createChapter(novelId, data),
    onSuccess: () => {
      toast.success('Đăng chương mới thành công!')
      setIsChapterModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'novels'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
    onError: () => toast.error('Không thể đăng chương. Vui lòng kiểm tra lại!'),
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: { role?: string; is_active?: boolean; is_banned?: boolean; ban_reason?: string } }) =>
      adminApi.updateUser(userId, body),
    onSuccess: () => {
      toast.success('Cập nhật người dùng thành công!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: () => toast.error('Cập nhật quyền thất bại!'),
  })

  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason?: string }) =>
      adminApi.banUser(userId, reason),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Khóa tài khoản thất bại!'),
  })

  const unbanUserMutation = useMutation({
    mutationFn: (userId: number) => adminApi.unbanUser(userId),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Mở khóa thất bại!'),
  })

  const reportActionMutation = useMutation({
    mutationFn: ({ reportId, action, notes }: { reportId: number; action: string; notes?: string }) =>
      adminApi.handleReportAction(reportId, { action, notes }),
    onSuccess: (data) => {
      toast.success(data.message)
      setIsActionModalOpen(false)
      setSelectedReportForAction(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'novels'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'blocked-ips'] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Xử lý báo cáo thất bại!'),
  })

  const blockIPMutation = useMutation({
    mutationFn: (data: { ip_address: string; reason: string }) => adminApi.blockIP(data),
    onSuccess: () => {
      toast.success('Đã đưa IP vào danh sách đen!')
      setManualIP('')
      setManualReason('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'blocked-ips'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Khóa IP thất bại!'),
  })

  const unblockIPMutation = useMutation({
    mutationFn: (ipId: number) => adminApi.unblockIP(ipId),
    onSuccess: () => {
      toast.success('Đã gỡ IP khỏi danh sách đen!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'blocked-ips'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Gỡ IP thất bại!'),
  })

  const syncFoldersMutation = useMutation({
    mutationFn: adminApi.syncFolders,
    onSuccess: (data) => {
      toast.success(`Đã đồng bộ xong! Nhập ${data.novels_synced} truyện, ${data.chapters_synced} chương.`)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
    onError: () => toast.error('Đồng bộ thư mục thất bại!'),
  })

  const exportFoldersMutation = useMutation({
    mutationFn: adminApi.exportFolders,
    onSuccess: (data) => {
      toast.success(`Đã xuất toàn bộ Database ra /data/novels! (${data.novels_exported} truyện, ${data.chapters_exported} chương)`)
    },
    onError: () => toast.error('Xuất file thất bại!'),
  })

  const openActionModal = (report: Report, action: 'dismiss' | 'delete_novel' | 'ban_user' | 'block_ip') => {
    setSelectedReportForAction(report)
    setActionType(action)
    setActionNotes('')
    setIsActionModalOpen(true)
  }

  const handleNovelSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingNovel) {
      updateNovelMutation.mutate({ id: editingNovel.id, data: novelForm })
    } else {
      createNovelMutation.mutate(novelForm)
    }
  }

  const openNewChapterModal = (novel: Novel) => {
    setSelectedNovelForChapter(novel)
    setChapterForm({
      number: (novel.total_chapters || 0) + 1,
      title: `Chương ${(novel.total_chapters || 0) + 1}: `,
      content: '',
      is_premium: false,
    })
    setIsChapterModalOpen(true)
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'editor')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg-deep)' }}>
        <div className="p-8 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-center max-w-md font-ui">
          <Shield size={48} className="mx-auto text-[var(--color-accent-amber)] mb-4" />
          <h2 className="text-xl font-heading font-medium text-[var(--color-text-primary)] mb-2">Truy Cập Bị Từ Chối</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-6">
            Trang Quản Trị chỉ dành riêng cho Admin và Editor của Thư Viện Vô Cực.
          </p>
          <button onClick={() => navigate('/')} className="btn-gold text-xs py-2 px-6">
            Về Trang Chủ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-8 py-24 max-w-7xl mx-auto font-ui" style={{ background: 'var(--color-bg-deep)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border-subtle)] mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)] flex items-center gap-1 transition-colors">
              <ArrowLeft size={13} /> Trang Chủ
            </Link>
            <span className="text-[var(--color-border-medium)]">/</span>
            <span className="text-xs font-semibold text-[var(--color-accent-gold)] uppercase tracking-wider font-display">Bảng Quản Trị Hệ Thống</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-light text-[var(--color-text-primary)]">
            Trung Tâm Điều Hành CMS
          </h1>
        </div>

        {/* Sync & Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => syncFoldersMutation.mutate()}
            disabled={syncFoldersMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-bg-surface)] border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold)] hover:text-black transition-all shadow-sm disabled:opacity-50"
            title="Quét và nạp các truyện từ thư mục /data/novels vào Database"
          >
            <RefreshCw size={13} className={syncFoldersMutation.isPending ? 'animate-spin' : ''} />
            <span>Đồng Bộ /data/novels</span>
          </button>

          <button
            onClick={() => exportFoldersMutation.mutate()}
            disabled={exportFoldersMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-medium)] text-[var(--color-text-primary)] transition-all shadow-sm disabled:opacity-50"
            title="Xuất dữ liệu trong Database ra các thư mục Markdown"
          >
            <Download size={13} />
            <span>Xuất File MD</span>
          </button>

          <button
            onClick={() => {
              setEditingNovel(null)
              setNovelForm({
                title: '',
                author: '',
                description: '',
                cover_url: '',
                status: 'ongoing',
                genres: ['Huyền Huyễn'],
                tags: [],
              })
              setIsNovelModalOpen(true)
            }}
            className="btn-gold flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
          >
            <Plus size={15} />
            Đăng Truyện Mới
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-[var(--color-border-subtle)] gap-4 sm:gap-6 mb-8 font-ui text-xs sm:text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'pb-3 font-medium transition-all relative flex-shrink-0',
            activeTab === 'overview'
              ? 'text-[var(--color-accent-gold)] font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
          )}
        >
          Tổng Quan
          {activeTab === 'overview' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('novels')}
          className={cn(
            'pb-3 font-medium transition-all relative flex-shrink-0',
            activeTab === 'novels'
              ? 'text-[var(--color-accent-gold)] font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
          )}
        >
          Quản Lý Truyện
          {activeTab === 'novels' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)]" />
          )}
        </button>

        {/* Tab Tố Cáo Vi Phạm with Pending Alert badge */}
        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            'pb-3 font-medium transition-all relative flex items-center gap-1.5 flex-shrink-0',
            activeTab === 'reports'
              ? 'text-[var(--color-accent-gold)] font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
          )}
        >
          <Flag size={14} />
          <span>Tố Cáo Vi Phạm</span>
          {stats?.pending_reports ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
              {stats.pending_reports}
            </span>
          ) : null}
          {activeTab === 'reports' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)]" />
          )}
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('blacklist')}
            className={cn(
              'pb-3 font-medium transition-all relative flex items-center gap-1.5 flex-shrink-0',
              activeTab === 'blacklist'
                ? 'text-[var(--color-accent-gold)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            <ShieldAlert size={14} />
            <span>Blacklist IP</span>
            {stats?.blocked_ips_count ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--color-bg-raised)] text-[var(--color-text-muted)]">
                {stats.blocked_ips_count}
              </span>
            ) : null}
            {activeTab === 'blacklist' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)]" />
            )}
          </button>
        )}

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              'pb-3 font-medium transition-all relative flex-shrink-0',
              activeTab === 'users'
                ? 'text-[var(--color-accent-gold)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            Người Dùng
            {activeTab === 'users' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)]" />
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('comments')}
          className={cn(
            'pb-3 font-medium transition-all relative flex-shrink-0 flex items-center gap-1.5',
            activeTab === 'comments'
              ? 'text-[var(--color-accent-gold)] font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
          )}
        >
          <MessageSquare size={14} />
          <span>Bình Luận</span>
          {commentsData?.total ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--color-bg-raised)] text-[var(--color-text-muted)]">
              {commentsData.total}
            </span>
          ) : null}
          {activeTab === 'comments' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)]" />
          )}
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)] font-ui mb-1 uppercase tracking-wider">Tổng Độc Giả</p>
                <h3 className="text-xl font-bold font-ui text-[var(--color-text-primary)]">{stats.total_users}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)] font-ui mb-1 uppercase tracking-wider">Đầu Truyện</p>
                <h3 className="text-xl font-bold font-ui text-[var(--color-text-primary)]">{stats.total_novels}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] flex items-center justify-center">
                <BookOpen size={16} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)] font-ui mb-1 uppercase tracking-wider">Tổng Chương</p>
                <h3 className="text-xl font-bold font-ui text-[var(--color-text-primary)]">{stats.total_chapters}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FileText size={16} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)] font-ui mb-1 uppercase tracking-wider">Lượt Xem</p>
                <h3 className="text-xl font-bold font-ui text-[var(--color-text-primary)]">{formatCount(stats.total_views)}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Eye size={16} />
              </div>
            </div>

            {/* Pending Reports */}
            <div
              onClick={() => setActiveTab('reports')}
              className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-red-500/50 flex items-center justify-between cursor-pointer transition-all"
            >
              <div>
                <p className="text-[10px] text-red-400 font-ui mb-1 uppercase tracking-wider">Tố Cáo Chờ Xử Lý</p>
                <h3 className="text-xl font-bold font-ui text-red-400">{stats.pending_reports || 0}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center">
                <Flag size={16} />
              </div>
            </div>

            {/* Blocked IPs */}
            <div
              onClick={() => setActiveTab('blacklist')}
              className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-amber)]/50 flex items-center justify-between cursor-pointer transition-all"
            >
              <div>
                <p className="text-[10px] text-[var(--color-accent-amber)] font-ui mb-1 uppercase tracking-wider">IP Đã Chặn</p>
                <h3 className="text-xl font-bold font-ui text-[var(--color-accent-amber)]">{stats.blocked_ips_count || 0}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-amber)]/15 text-[var(--color-accent-amber)] flex items-center justify-center">
                <ShieldAlert size={16} />
              </div>
            </div>
          </div>

          {/* Quick list of novels */}
          <div className="p-6 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <h2 className="text-base font-heading font-medium mb-4 text-[var(--color-text-primary)]">
              Truyện Mới Cập Nhật
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-ui">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                    <th className="pb-3">TÊN TRUYỆN</th>
                    <th className="pb-3">TÁC GIẢ</th>
                    <th className="pb-3">NGƯỜI ĐĂNG</th>
                    <th className="pb-3">SỐ CHƯƠNG</th>
                    <th className="pb-3">LƯỢT XEM</th>
                    <th className="pb-3 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {novelsData?.items.slice(0, 5).map((n) => (
                    <tr key={n.id} className="hover:bg-[var(--color-bg-raised)]/40 transition-colors">
                      <td className="py-3 font-medium text-[var(--color-text-primary)]">
                        <Link to={`/novels/${n.slug}`} className="hover:text-[var(--color-accent-gold)]">
                          {n.title}
                        </Link>
                      </td>
                      <td className="py-3 text-[var(--color-text-secondary)]">{n.author}</td>
                      <td className="py-3 text-[var(--color-text-muted)]">{n.uploader_name || 'Hệ Thống'}</td>
                      <td className="py-3 text-[var(--color-text-secondary)]">{n.total_chapters}</td>
                      <td className="py-3 text-[var(--color-text-muted)]">{formatCount(n.views)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => openNewChapterModal(n)}
                          className="px-2 py-1 rounded bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] text-xs font-medium"
                        >
                          + Thêm Chương
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Novel Management */}
      {activeTab === 'novels' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={novelQuery}
                onChange={(e) => setNovelQuery(e.target.value)}
                placeholder="Tìm truyện theo tên, tác giả..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] font-ui"
              />
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] overflow-x-auto">
            <table className="w-full text-left text-xs font-ui">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">BÌA</th>
                  <th className="pb-3">TỰA TRUYỆN</th>
                  <th className="pb-3">TÁC GIẢ</th>
                  <th className="pb-3">NGƯỜI ĐĂNG</th>
                  <th className="pb-3">THỂ LOẠI / NHÃN</th>
                  <th className="pb-3">CHƯƠNG</th>
                  <th className="pb-3">TRẠNG THÁI</th>
                  <th className="pb-3 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {novelsData?.items.map((n) => (
                  <tr key={n.id} className="hover:bg-[var(--color-bg-raised)]/40 transition-colors">
                    <td className="py-3 text-[var(--color-text-muted)]">#{n.id}</td>
                    <td className="py-3">
                      <div className="w-8 h-11 rounded overflow-hidden bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] flex-shrink-0">
                        {n.cover_url ? (
                          <img src={n.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-[var(--color-accent-gold)]">N</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 font-medium text-[var(--color-text-primary)] max-w-xs truncate">
                      <Link to={`/novels/${n.slug}`} className="hover:text-[var(--color-accent-gold)] transition-colors">
                        {n.title}
                      </Link>
                    </td>
                    <td className="py-3 text-[var(--color-text-secondary)]">{n.author}</td>
                    <td className="py-3 text-[var(--color-text-muted)]">{n.uploader_name || 'Hệ Thống'}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {n.genres.map((g) => (
                          <span key={g} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-bg-deep)] text-[var(--color-accent-gold)]">
                            {g}
                          </span>
                        ))}
                        {n.tags && n.tags.slice(0, 2).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-accent-amber)]/10 text-[var(--color-accent-amber)]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-[var(--color-text-secondary)]">{n.total_chapters}</td>
                    <td className="py-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold',
                          n.status === 'completed'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400',
                        )}
                      >
                        {n.status === 'completed' ? 'Hoàn Thành' : 'Đang Ra'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openNewChapterModal(n)}
                          className="px-2.5 py-1 rounded bg-[var(--color-accent-gold)] text-black hover:bg-[var(--color-accent-gold)]/90 transition-all text-xs font-semibold"
                          title="Thêm chương mới"
                        >
                          + Đăng Chương
                        </button>
                        <button
                          onClick={() => {
                            setEditingNovel(n)
                            setNovelForm({
                              title: n.title,
                              author: n.author,
                              slug: n.slug,
                              description: n.description,
                              cover_url: n.cover_url || '',
                              status: n.status,
                              genres: n.genres,
                              tags: n.tags || [],
                            })
                            setIsNovelModalOpen(true)
                          }}
                          className="p-1.5 rounded hover:bg-[var(--color-bg-deep)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          title="Chỉnh sửa truyện"
                        >
                          <Edit3 size={14} />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xoá truyện "${n.title}"? Mọi chương sẽ bị xóa hoàn toàn.`)) {
                                deleteNovelMutation.mutate(n.id)
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300"
                            title="Xóa truyện"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Reports & Moderation (TỐ CÁO VI PHẠM) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <Flag size={18} className="text-red-400" />
                Danh Sách Tố Cáo Vi Phạm Bản Quyền & Nội Dung
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Admin phân xử các báo cáo: xóa truyện vi phạm, khóa tài khoản người đăng, hoặc đưa IP vào danh sách đen.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2">
              {(['all', 'pending', 'resolved', 'dismissed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setReportStatusFilter(st)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs transition-all font-ui capitalize',
                    reportStatusFilter === st
                      ? 'bg-[var(--color-accent-gold)] text-black font-semibold'
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]',
                  )}
                >
                  {st === 'all'
                    ? 'Tất Cả'
                    : st === 'pending'
                    ? 'Chờ Xử Lý'
                    : st === 'resolved'
                    ? 'Đã Xử Lý'
                    : 'Đã Bác Bỏ'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] overflow-x-auto">
            <table className="w-full text-left text-xs font-ui">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">TRUYỆN BỊ TỐ CÁO</th>
                  <th className="pb-3">NGƯỜI ĐĂNG & IP</th>
                  <th className="pb-3">NGƯỜI TỐ CÁO</th>
                  <th className="pb-3">LÝ DO VI PHẠM</th>
                  <th className="pb-3">TRẠNG THÁI</th>
                  <th className="pb-3">THỜI GIAN</th>
                  <th className="pb-3 text-right">PHÂN XỬ ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {reportsData?.items.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--color-bg-raised)]/40 transition-colors">
                    <td className="py-3 text-[var(--color-text-muted)]">#{r.id}</td>
                    <td className="py-3 font-medium text-[var(--color-text-primary)]">
                      <div>
                        {r.novel_slug ? (
                          <Link to={`/novels/${r.novel_slug}`} className="hover:text-[var(--color-accent-gold)] font-semibold">
                            {r.novel_title}
                          </Link>
                        ) : (
                          <span className="text-[var(--color-text-muted)] line-through">{r.novel_title}</span>
                        )}
                      </div>
                    </td>

                    {/* Uploader & IP */}
                    <td className="py-3">
                      <div>
                        <p className="text-[var(--color-text-primary)]">{r.uploader_name || 'Không rõ'}</p>
                        <p className="text-[10px] font-mono text-[var(--color-accent-amber)]">
                          IP: {r.uploader_ip || 'N/A'}
                        </p>
                      </div>
                    </td>

                    {/* Reporter */}
                    <td className="py-3">
                      <p className="text-[var(--color-text-secondary)]">{r.reporter_name}</p>
                      <p className="text-[10px] font-mono text-[var(--color-text-muted)]">{r.reporter_ip}</p>
                    </td>

                    {/* Reason & Details */}
                    <td className="py-3 max-w-xs">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 mb-1">
                        {r.reason}
                      </span>
                      <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2" title={r.details}>
                        {r.details}
                      </p>
                      {r.admin_notes && (
                        <p className="text-[10px] text-[var(--color-accent-gold)] mt-0.5 italic">
                          Admin note: {r.admin_notes}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold',
                          r.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : r.status === 'resolved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-zinc-500/15 text-zinc-400',
                        )}
                      >
                        {r.status === 'pending'
                          ? 'Đang Chờ'
                          : r.status === 'resolved'
                          ? 'Đã Xử Lý'
                          : 'Đã Bác Bỏ'}
                      </span>
                    </td>

                    <td className="py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                      {timeAgo(r.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 text-right whitespace-nowrap">
                      {r.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openActionModal(r, 'dismiss')}
                            className="px-2 py-1 rounded bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-white text-xs"
                            title="Bác bỏ báo cáo vô căn cứ"
                          >
                            Bác Bỏ
                          </button>
                          <button
                            onClick={() => openActionModal(r, 'delete_novel')}
                            className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-medium"
                            title="Xóa truyện vi phạm bản quyền"
                          >
                            Xóa Truyện
                          </button>
                          <button
                            onClick={() => openActionModal(r, 'ban_user')}
                            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-medium"
                            title="Khóa tài khoản uploader và xóa truyện"
                          >
                            Khóa User
                          </button>
                          <button
                            onClick={() => openActionModal(r, 'block_ip')}
                            className="px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-xs font-bold"
                            title="Đưa IP vào Blacklist, khóa tài khoản và xóa truyện"
                          >
                            Chặn IP
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {r.admin_action || 'Đã hoàn tất'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {reportsData?.items.length === 0 && (
              <div className="text-center py-12 text-[var(--color-text-muted)]">
                Không có báo cáo vi phạm nào trong mục này.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: IP Blacklist Management */}
      {activeTab === 'blacklist' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <ShieldAlert size={18} className="text-[var(--color-accent-amber)]" />
                Danh Sách Đen Địa Chỉ IP (Blacklist)
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Mọi kết nối mạng từ các IP trong danh sách này đều bị Middleware chặn lập tức ở mã lỗi HTTP 403.
              </p>
            </div>
          </div>

          {/* Manual Add IP Form */}
          <div className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <h3 className="text-xs font-semibold text-[var(--color-accent-gold)] uppercase tracking-wider mb-3">
              + Thêm IP Chặn Thủ Công
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (manualIP.trim() && manualReason.trim()) {
                  blockIPMutation.mutate({ ip_address: manualIP.trim(), reason: manualReason.trim() })
                }
              }}
              className="flex flex-col sm:flex-row gap-3 items-center"
            >
              <input
                type="text"
                required
                placeholder="Địa chỉ IP (VD: 192.168.0.50 hoặc 113.161.x.x)"
                value={manualIP}
                onChange={(e) => setManualIP(e.target.value)}
                className="w-full sm:w-60 px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] font-mono"
              />
              <input
                type="text"
                required
                placeholder="Lý do chặn (VD: Spam, Tấn công crawler rác, Vi phạm bản quyền nhiều lần)"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)]"
              />
              <button
                type="submit"
                disabled={blockIPMutation.isPending}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all whitespace-nowrap"
              >
                Chặn IP Ngay
              </button>
            </form>
          </div>

          {/* Blocked IP Table */}
          <div className="p-6 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] overflow-x-auto">
            <table className="w-full text-left text-xs font-ui">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">ĐỊA CHỈ IP</th>
                  <th className="pb-3">LÝ DO KHÓA</th>
                  <th className="pb-3">NGƯỜI THỰC HIỆN</th>
                  <th className="pb-3">THỜI GIAN</th>
                  <th className="pb-3 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {blockedIPs.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-bg-raised)]/40 transition-colors">
                    <td className="py-3 text-[var(--color-text-muted)]">#{item.id}</td>
                    <td className="py-3 font-mono font-bold text-red-400">{item.ip_address}</td>
                    <td className="py-3 text-[var(--color-text-secondary)]">{item.reason}</td>
                    <td className="py-3 text-[var(--color-text-muted)]">{item.blocked_by_name || 'Admin'}</td>
                    <td className="py-3 text-[var(--color-text-muted)]">{timeAgo(item.created_at)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn mở khóa cho IP ${item.ip_address}?`)) {
                            unblockIPMutation.mutate(item.id)
                          }
                        }}
                        className="px-3 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-all"
                      >
                        Mở Khóa IP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {blockedIPs.length === 0 && (
              <div className="text-center py-12 text-[var(--color-text-muted)]">
                Hiện không có địa chỉ IP nào bị đưa vào danh sách đen.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Users */}
      {activeTab === 'users' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Tìm người dùng theo username, email..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] font-ui"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['', 'admin', 'editor', 'vip', 'reader'].map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs transition-all font-ui',
                    userRoleFilter === r
                      ? 'bg-[var(--color-accent-gold)] text-black font-semibold'
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]',
                  )}
                >
                  {r ? r.toUpperCase() : 'TẤT CẢ'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] overflow-x-auto">
            <table className="w-full text-left text-xs font-ui">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">TÊN NGƯỜI DÙNG</th>
                  <th className="pb-3">EMAIL</th>
                  <th className="pb-3">VAI TRÒ (PHÂN QUYỀN)</th>
                  <th className="pb-3">TRẠNG THÁI</th>
                  <th className="pb-3">THỜI GIAN</th>
                  <th className="pb-3 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {usersData?.items.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--color-bg-raised)]/40 transition-colors">
                    <td className="py-3 text-[var(--color-text-muted)]">#{u.id}</td>
                    <td className="py-3 font-medium text-[var(--color-text-primary)]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] flex items-center justify-center font-bold text-[10px]">
                          {u.display_name[0]}
                        </div>
                        <span>{u.display_name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">(@{u.username})</span>
                      </div>
                    </td>
                    <td className="py-3 text-[var(--color-text-secondary)]">{u.email}</td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => {
                          updateUserMutation.mutate({ userId: u.id, body: { role: e.target.value } })
                        }}
                        className="px-2 py-1 rounded bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-accent-gold)] font-semibold text-xs cursor-pointer focus:outline-none"
                      >
                        <option value="reader">Reader (Độc giả)</option>
                        <option value="vip">VIP Reader</option>
                        <option value="editor">Editor (Biên tập)</option>
                        <option value="admin">Admin (Quản trị)</option>
                      </select>
                    </td>
                    <td className="py-3">
                      {u.is_banned ? (
                        <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                          <XCircle size={13} /> Đã bị cấm ({u.ban_reason || 'Vi phạm'})
                        </span>
                      ) : u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 size={13} /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-400 font-medium">
                          <XCircle size={13} /> Vô hiệu hóa
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--color-text-muted)]">
                      {u.joined_at ? timeAgo(u.joined_at) : 'Mới'}
                    </td>
                    <td className="py-3 text-right">
                      {u.role !== 'admin' && (
                        <div className="flex items-center justify-end gap-2">
                          {u.is_banned ? (
                            <button
                              onClick={() => unbanUserMutation.mutate(u.id)}
                              className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-medium"
                            >
                              Mở Khóa
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = prompt(`Nhập lý do cấm người dùng ${u.username}:`, 'Vi phạm quy định')
                                if (reason !== null) {
                                  banUserMutation.mutate({ userId: u.id, reason })
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium"
                            >
                              Khóa TK
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Comments Moderation */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={commentQuery}
                onChange={(e) => {
                  setCommentQuery(e.target.value)
                  setCommentPage(1)
                }}
                placeholder="Tìm kiếm nội dung bình luận..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] font-ui"
              />
            </div>
            <div className="text-xs text-[var(--color-text-muted)] font-ui">
              Tổng cộng: <span className="font-semibold text-[var(--color-text-primary)]">{commentsData?.total || 0}</span> bình luận
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] overflow-x-auto">
            {isLoadingComments ? (
              <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                Đang tải danh sách bình luận...
              </div>
            ) : !commentsData?.items || commentsData.items.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                Không tìm thấy bình luận nào
              </div>
            ) : (
              <table className="w-full text-left text-xs font-ui">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                    <th className="pb-3 w-16">ID</th>
                    <th className="pb-3 w-44">NGƯỜI DÙNG</th>
                    <th className="pb-3">NỘI DUNG</th>
                    <th className="pb-3 w-56">TRUYỆN & CHƯƠNG</th>
                    <th className="pb-3 w-28">VỊ TRÍ</th>
                    <th className="pb-3 w-28">THỜI GIAN</th>
                    <th className="pb-3 w-20 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {commentsData.items.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--color-bg-raised)]/40 transition-colors">
                      <td className="py-3 text-[var(--color-text-muted)]">#{c.id}</td>
                      <td className="py-3 font-medium text-[var(--color-text-primary)]">
                        {c.user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] flex items-center justify-center font-bold text-[10px]">
                              {c.user.display_name?.[0] || 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span>{c.user.display_name}</span>
                              <span className="text-[10px] text-[var(--color-text-muted)]">@{c.user.username}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">Vô danh</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="max-w-md">
                          {c.is_spoiler && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 mr-1.5">
                              SPOILER
                            </span>
                          )}
                          <span className="text-[var(--color-text-primary)] whitespace-pre-wrap line-clamp-3">
                            {c.content}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-[var(--color-text-secondary)]">
                        {c.novel_title ? (
                          <div>
                            <span className="font-medium text-[var(--color-text-primary)]">{c.novel_title}</span>
                            {c.chapter_number && (
                              <div className="text-[10px] text-[var(--color-text-muted)]">
                                Chương {c.chapter_number}: {c.chapter_title || ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">Chương #{c.chapter_id}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {c.paragraph_index !== null && c.paragraph_index !== undefined ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
                            Đoạn #{c.paragraph_index + 1}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-deep)]">
                            Chân chương
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-[var(--color-text-muted)]">
                        {timeAgo(c.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Xóa bình luận #${c.id} của "${c.user?.display_name || 'người dùng'}"?`)) {
                              deleteCommentMutation.mutate(c.id)
                            }
                          }}
                          className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
                          title="Xóa bình luận vi phạm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {commentsData && commentsData.total > 20 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-border-subtle)] text-xs">
                <button
                  disabled={commentPage <= 1}
                  onClick={() => setCommentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded bg-[var(--color-bg-deep)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 transition-all cursor-pointer"
                >
                  Trang trước
                </button>
                <span className="text-[var(--color-text-muted)]">
                  Trang {commentPage} / {Math.ceil(commentsData.total / 20)}
                </span>
                <button
                  disabled={commentPage >= Math.ceil(commentsData.total / 20)}
                  onClick={() => setCommentPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded bg-[var(--color-bg-deep)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 transition-all cursor-pointer"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Phân Xử Báo Cáo Vi Phạm */}
      <AnimatePresence>
        {isActionModalOpen && selectedReportForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-ui">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-bg-surface)] border border-[var(--color-border-medium)] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
                <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-400" />
                  XÁC NHẬN PHÂN XỬ VI PHẠM
                </h2>
                <button onClick={() => setIsActionModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p>
                  <strong className="text-[var(--color-text-muted)]">Truyện:</strong>{' '}
                  <span className="text-[var(--color-text-primary)] font-semibold">{selectedReportForAction.novel_title}</span>
                </p>
                <p>
                  <strong className="text-[var(--color-text-muted)]">Người đăng truyện:</strong>{' '}
                  <span className="text-[var(--color-text-primary)]">{selectedReportForAction.uploader_name || 'Hệ thống'}</span>
                </p>
                <p>
                  <strong className="text-[var(--color-text-muted)]">IP của người đăng:</strong>{' '}
                  <span className="font-mono text-red-400">{selectedReportForAction.uploader_ip || 'Không rõ'}</span>
                </p>
                <p>
                  <strong className="text-[var(--color-text-muted)]">Hành động sẽ thực hiện:</strong>{' '}
                  <span className="font-bold text-[var(--color-accent-gold)]">
                    {actionType === 'dismiss'
                      ? '✕ Bác bỏ báo cáo (Không xử phạt)'
                      : actionType === 'delete_novel'
                      ? '🗑️ Xóa vĩnh viễn truyện vi phạm bản quyền'
                      : actionType === 'ban_user'
                      ? '🚫 Khóa tài khoản người đăng và xóa truyện'
                      : '🛑 Đưa IP vào Blacklist, khóa tài khoản và xóa truyện'}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                  Ghi chú của Admin / Căn cứ phân xử
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú quyết định xử phạt..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={reportActionMutation.isPending}
                  onClick={() => {
                    reportActionMutation.mutate({
                      reportId: selectedReportForAction.id,
                      action: actionType,
                      notes: actionNotes,
                    })
                  }}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50"
                >
                  {reportActionMutation.isPending ? 'Đang Xử Lý...' : 'Thực Hiện Phân Xử'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Đăng / Sửa Truyện */}
      <AnimatePresence>
        {isNovelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-bg-surface)] border border-[var(--color-border-medium)] rounded-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-heading font-medium text-[var(--color-text-primary)]">
                  {editingNovel ? 'Chỉnh Sửa Tiểu Thuyết' : 'Đăng Tiểu Thuyết Mới'}
                </h2>
                <button onClick={() => setIsNovelModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleNovelSubmit} className="space-y-4 font-ui text-xs">
                <div>
                  <label className="block mb-1 text-[var(--color-text-secondary)]">TỰA ĐỀ TRUYỆN *</label>
                  <input
                    type="text"
                    required
                    value={novelForm.title}
                    onChange={(e) => setNovelForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="VD: Tận Thế Du Hành Gia"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-[var(--color-text-secondary)]">TÁC GIẢ *</label>
                    <input
                      type="text"
                      required
                      value={novelForm.author}
                      onChange={(e) => setNovelForm((p) => ({ ...p, author: e.target.value }))}
                      placeholder="VD: Triệu Thiên Vũ"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[var(--color-text-secondary)]">TRẠNG THÁI</label>
                    <select
                      value={novelForm.status}
                      onChange={(e) => setNovelForm((p) => ({ ...p, status: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                    >
                      <option value="ongoing">Đang Ra (Ongoing)</option>
                      <option value="completed">Đã Hoàn Thành</option>
                      <option value="hiatus">Tạm Ngưng (Hiatus)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-[var(--color-text-secondary)]">THỂ LOẠI (Phân tách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={novelForm.genres?.join(', ')}
                    onChange={(e) => setNovelForm((p) => ({ ...p, genres: e.target.value.split(',').map((s) => s.trim()) }))}
                    placeholder="VD: Huyền Huyễn, Hệ Thống, Tiên Hiệp"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[var(--color-text-secondary)]">NHÃN DÁN / TAGS (Phân tách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={novelForm.tags?.join(', ')}
                    onChange={(e) => setNovelForm((p) => ({ ...p, tags: e.target.value.split(',').map((s) => s.trim()) }))}
                    placeholder="VD: Trọng Sinh, Vô Địch Lưu, Hắc Ám"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[var(--color-text-secondary)]">URL ẢNH BÌA</label>
                  <input
                    type="url"
                    value={novelForm.cover_url || ''}
                    onChange={(e) => setNovelForm((p) => ({ ...p, cover_url: e.target.value }))}
                    placeholder="https://... hoặc /uploads/covers/..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[var(--color-text-secondary)]">TÓM TẮT GIỚI THIỆU</label>
                  <textarea
                    rows={4}
                    value={novelForm.description}
                    onChange={(e) => setNovelForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Nội dung sơ lược cốt truyện..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsNovelModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-deep)]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-gold py-2 px-5 text-xs font-semibold"
                  >
                    {editingNovel ? 'Lưu Thay Đổi' : 'Đăng Truyện'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Đăng Chương Mới */}
      <AnimatePresence>
        {isChapterModalOpen && selectedNovelForChapter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-bg-surface)] border border-[var(--color-border-medium)] rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-heading font-medium text-[var(--color-text-primary)]">
                    Đăng Chương Mới
                  </h2>
                  <p className="text-xs text-[var(--color-accent-gold)] font-ui">
                    Tiểu thuyết: {selectedNovelForChapter.title}
                  </p>
                </div>
                <button onClick={() => setIsChapterModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-white">
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  createChapterMutation.mutate({
                    novelId: selectedNovelForChapter.id,
                    data: chapterForm,
                  })
                }}
                className="space-y-4 font-ui text-xs"
              >
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block mb-1 text-[var(--color-text-secondary)]">SỐ CHƯƠNG *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={chapterForm.number}
                      onChange={(e) => setChapterForm((p) => ({ ...p, number: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block mb-1 text-[var(--color-text-secondary)]">TIÊU ĐỀ CHƯƠNG *</label>
                    <input
                      type="text"
                      required
                      value={chapterForm.title}
                      onChange={(e) => setChapterForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="VD: Ngày Tận Thế Thứ Ba Trăm"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[var(--color-text-secondary)]">NỘI DUNG CHƯƠNG *</label>
                    <span className="text-[10px] text-[var(--color-accent-gold)]">
                      {chapterForm.content.split(/\s+/).filter(Boolean).length} từ
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    required
                    value={chapterForm.content}
                    onChange={(e) => setChapterForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="Nội dung chương truyện..."
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm font-serif"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_premium"
                    checked={chapterForm.is_premium}
                    onChange={(e) => setChapterForm((p) => ({ ...p, is_premium: e.target.checked }))}
                    className="w-4 h-4 rounded text-[var(--color-accent-gold)] bg-[var(--color-bg-deep)] border-[var(--color-border-subtle)] cursor-pointer"
                  />
                  <label htmlFor="is_premium" className="text-[var(--color-text-primary)] cursor-pointer">
                    Chương VIP (Chỉ thành viên VIP mới đọc được)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsChapterModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-deep)]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createChapterMutation.isPending}
                    className="btn-gold py-2 px-5 text-xs font-semibold disabled:opacity-50"
                  >
                    {createChapterMutation.isPending ? 'Đang Đăng...' : 'Xuất Bản Chương'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
