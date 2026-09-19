import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  BookOpen,
  FileText,
  Eye,
  Plus,
  Trash2,
  Edit3,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Home,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi, novelsApi } from '@/api'
import { useAuthStore } from '@/stores'
import { formatCount, timeAgo, cn } from '@/lib/utils'
import type { Novel, User, NovelCreateInput, ChapterCreateInput } from '@/types'

export default function AdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'novels' | 'users'>('overview')

  // Search / Filters
  const [novelQuery, setNovelQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')

  // Modals state
  const [isNovelModalOpen, setIsNovelModalOpen] = useState(false)
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null)
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false)
  const [selectedNovelForChapter, setSelectedNovelForChapter] = useState<Novel | null>(null)

  // Forms state
  const [novelForm, setNovelForm] = useState<NovelCreateInput>({
    title: '',
    author: '',
    description: '',
    cover_url: '',
    status: 'ongoing',
    genres: ['Huyền Huyễn'],
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
    enabled: activeTab === 'users' && user?.role === 'admin',
  })

  // Mutations
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
    mutationFn: ({ userId, body }: { userId: number; body: { role?: string; is_active?: boolean } }) =>
      adminApi.updateUser(userId, body),
    onSuccess: () => {
      toast.success('Cập nhật người dùng thành công!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: () => toast.error('Cập nhật quyền thất bại!'),
  })

  const syncFoldersMutation = useMutation({
    mutationFn: adminApi.syncFolders,
    onSuccess: (data) => {
      toast.success(`Đồng bộ thành công ${data.novels_synced} tiểu thuyết và ${data.chapters_synced} chương từ /data/novels!`)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['novels'] })
    },
    onError: () => toast.error('Đồng bộ thất bại. Kiểm tra lại thư mục /data/novels!'),
  })

  const exportFoldersMutation = useMutation({
    mutationFn: adminApi.exportFolders,
    onSuccess: (data) => {
      toast.success(`Đã xuất ${data.novels_exported} tiểu thuyết và ${data.chapters_exported} chương ra thư mục /data/novels!`)
    },
    onError: () => toast.error('Xuất file thất bại!'),
  })

  // Permission Guard
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'editor')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--color-bg-deep)] text-center">
        <Shield size={48} className="text-[var(--color-accent-amber)] mb-4" />
        <h1 className="text-2xl font-bold mb-2 font-heading">Khu Vực Quản Trị Giới Hạn</h1>
        <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
          Bạn cần đăng nhập bằng tài khoản Quản trị viên (Admin) hoặc Biên tập viên (Editor) để truy cập.
        </p>
        <Link to="/login" className="btn-gold">
          Đăng Nhập Ngay
        </Link>
      </div>
    )
  }

  // Handlers
  const openNewChapterModal = (novel: Novel) => {
    setSelectedNovelForChapter(novel)
    setChapterForm({
      number: novel.total_chapters + 1,
      title: `Chương ${novel.total_chapters + 1}: `,
      content: '',
      is_premium: false,
    })
    setIsChapterModalOpen(true)
  }

  const handleNovelSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingNovel) {
      updateNovelMutation.mutate({ id: editingNovel.id, data: novelForm })
    } else {
      createNovelMutation.mutate(novelForm)
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-6 font-ui">
        <Link to="/" className="flex items-center gap-1 hover:text-[var(--color-accent-gold)] transition-colors">
          <Home size={13} className="text-[var(--color-accent-gold)]" />
          <span>Trang Chủ</span>
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text-secondary)] font-medium">Bảng Điều Khiển Quản Trị</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-[var(--color-accent-gold)]" />
            <h1 className="text-3xl font-heading font-medium text-[var(--color-text-primary)]">
              Hệ Thống Quản Trị CMS
            </h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-ui">
            Đăng truyện, biên tập chương và phân quyền thành viên
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => syncFoldersMutation.mutate()}
            disabled={syncFoldersMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] text-[var(--color-text-primary)] transition-all disabled:opacity-50"
            title="Quét và đồng bộ các file truyện từ thư mục data/novels/ vào Database"
          >
            <RefreshCw size={13} className={cn(syncFoldersMutation.isPending && "animate-spin text-[var(--color-accent-gold)]")} />
            <span>{syncFoldersMutation.isPending ? 'Đang đồng bộ...' : 'Đồng Bộ /data/novels'}</span>
          </button>

          <button
            onClick={() => exportFoldersMutation.mutate()}
            disabled={exportFoldersMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all disabled:opacity-50"
            title="Xuất toàn bộ tiểu thuyết & chương hiện có ra thư mục data/novels/"
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

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border-subtle)] gap-4 mb-8 font-ui text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'pb-3 font-medium transition-all relative',
            activeTab === 'overview'
              ? 'text-[var(--color-accent-gold)]'
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
            'pb-3 font-medium transition-all relative',
            activeTab === 'novels'
              ? 'text-[var(--color-accent-gold)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
          )}
        >
          Quản Lý Truyện & Chương
          {activeTab === 'novels' && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)]" />
          )}
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              'pb-3 font-medium transition-all relative',
              activeTab === 'users'
                ? 'text-[var(--color-accent-gold)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            Quản Lý Người Dùng
            {activeTab === 'users' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)]" />
            )}
          </button>
        )}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] font-ui mb-1 uppercase tracking-wider">Tổng Độc Giả</p>
                <h3 className="text-2xl font-bold font-ui text-[var(--color-text-primary)]">{stats.total_users}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users size={20} />
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] font-ui mb-1 uppercase tracking-wider">Đầu Truyện</p>
                <h3 className="text-2xl font-bold font-ui text-[var(--color-text-primary)]">{stats.total_novels}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] flex items-center justify-center">
                <BookOpen size={20} />
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] font-ui mb-1 uppercase tracking-wider">Tổng Chương</p>
                <h3 className="text-2xl font-bold font-ui text-[var(--color-text-primary)]">{stats.total_chapters}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] font-ui mb-1 uppercase tracking-wider">Lượt Xem</p>
                <h3 className="text-2xl font-bold font-ui text-[var(--color-text-primary)]">{formatCount(stats.total_views)}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Eye size={20} />
              </div>
            </div>
          </div>

          {/* Quick list */}
          <div className="p-6 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <h2 className="text-lg font-heading font-medium mb-4 text-[var(--color-text-primary)]">
              Truyện Mới Cập Nhật
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-ui">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                    <th className="pb-3">TÊN TRUYỆN</th>
                    <th className="pb-3">TÁC GIẢ</th>
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
                      <td className="py-3 text-[var(--color-text-secondary)]">{n.total_chapters} chương</td>
                      <td className="py-3 text-[var(--color-text-secondary)]">{formatCount(n.views)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => openNewChapterModal(n)}
                          className="px-2.5 py-1 rounded bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold)] hover:text-black transition-all text-xs font-semibold mr-2"
                        >
                          + Chương
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

      {/* Tab 2: Novels & Chapters */}
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
                  <th className="pb-3">TỰA ĐỀ</th>
                  <th className="pb-3">TÁC GIẢ</th>
                  <th className="pb-3">THỂ LOẠI</th>
                  <th className="pb-3">CHƯƠNG</th>
                  <th className="pb-3">TRẠNG THÁI</th>
                  <th className="pb-3 text-right">HÀNH ĐỘNG</th>
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
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {n.genres.map((g) => (
                          <span key={g} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-bg-deep)] text-[var(--color-text-muted)]">
                            {g}
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

      {/* Tab 3: Users */}
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
            <div className="flex gap-2">
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
                      <button
                        onClick={() => {
                          updateUserMutation.mutate({ userId: u.id, body: { is_active: !u.is_active } })
                        }}
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 size={13} /> Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                            <XCircle size={13} /> Bị khóa
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 text-[var(--color-text-muted)]">
                      {u.joined_at ? timeAgo(u.joined_at) : 'Mới'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          const nextStatus = !u.is_active
                          if (confirm(`Bạn muốn ${nextStatus ? 'mở khóa' : 'khóa'} tài khoản ${u.username}?`)) {
                            updateUserMutation.mutate({ userId: u.id, body: { is_active: nextStatus } })
                          }
                        }}
                        className={cn(
                          'px-2 py-1 rounded text-xs transition-colors',
                          u.is_active ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10',
                        )}
                      >
                        {u.is_active ? 'Khóa TK' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <label className="block mb-1 text-[var(--color-text-secondary)]">URL ẢNH BÌA</label>
                  <input
                    type="url"
                    value={novelForm.cover_url || ''}
                    onChange={(e) => setNovelForm((p) => ({ ...p, cover_url: e.target.value }))}
                    placeholder="https://..."
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
                    <label className="text-[var(--color-text-secondary)]">NỘI DUNG CHƯƠNG (Hỗ trợ thẻ HTML & ngắt dòng) *</label>
                    <span className="text-[10px] text-[var(--color-accent-gold)]">
                      {chapterForm.content.split(/\s+/).filter(Boolean).length} từ
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    required
                    value={chapterForm.content}
                    onChange={(e) => setChapterForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="<p>Đoạn văn thứ nhất...</p><p>Đoạn văn thứ hai...</p>"
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm font-mono"
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
