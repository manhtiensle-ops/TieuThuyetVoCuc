import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PageWrapper } from '@/components/novel/NovelCard'
import { novelsApi } from '@/api'
import { useAuthStore } from '@/stores'
import {
  BookOpen,
  Eye,
  Star,
  Home,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Search,
  Sparkles,
  Flag,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  User as UserIcon,
  Tag,
  Loader2,
  Compass,
  ArrowRight,
} from 'lucide-react'
import { formatCount, normalizeNFC } from '@/lib/utils'

export default function NovelPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [chapterSearch, setChapterSearch] = useState('')

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportReason, setReportReason] = useState('Vi phạm bản quyền')
  const [reportDetails, setReportDetails] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportFeedback, setReportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Add Chapter Modal State
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false)
  const [chNumber, setChNumber] = useState<number>(1)
  const [chTitle, setChTitle] = useState('')
  const [chContent, setChContent] = useState('')
  const [chIsPremium, setChIsPremium] = useState(false)
  const [isSubmittingChapter, setIsSubmittingChapter] = useState(false)
  const [chapterError, setChapterError] = useState('')

  const { data: novel, isLoading } = useQuery({
    queryKey: ['novel', slug],
    queryFn: () => novelsApi.get(slug!),
    enabled: !!slug,
  })

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', slug],
    queryFn: () => novelsApi.getChapters(slug!),
    enabled: !!slug,
  })

  // Can manage novel check
  const canManageNovel = Boolean(
    user && (user.id === novel?.uploader_id || user.role === 'admin' || user.role === 'editor')
  )

  // Filter & sort chapters
  const sortedChapters = useMemo(() => {
    let list = [...chapters]
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase().trim()
      list = list.filter(
        (c) => c.title.toLowerCase().includes(q) || String(c.number).includes(q)
      )
    }
    list.sort((a, b) => (sortOrder === 'asc' ? a.number - b.number : b.number - a.number))
    return list
  }, [chapters, sortOrder, chapterSearch])

  // Pagination & Quick Jump State (10 chapters per page)
  const pageSize = 10
  const [currentPage, setCurrentPage] = useState(1)
  const [jumpChapterInput, setJumpChapterInput] = useState('')
  const [jumpMessage, setJumpMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [highlightedChapterNumber, setHighlightedChapterNumber] = useState<number | null>(null)

  // Reset pagination when search or sort order changes
  useEffect(() => {
    setCurrentPage(1)
    setJumpMessage(null)
  }, [chapterSearch, sortOrder])

  const totalFilteredChapters = sortedChapters.length
  const totalPages = Math.max(1, Math.ceil(totalFilteredChapters / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  const paginatedChapters = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return sortedChapters.slice(start, start + pageSize)
  }, [sortedChapters, safeCurrentPage, pageSize])

  const chapterBatches = useMemo(() => {
    const batches: { page: number; label: string; startCh: number; endCh: number }[] = []
    for (let p = 1; p <= totalPages; p++) {
      const startIdx = (p - 1) * pageSize
      const endIdx = Math.min(p * pageSize, totalFilteredChapters)
      if (startIdx < totalFilteredChapters) {
        const startCh = sortedChapters[startIdx]?.number
        const endCh = sortedChapters[endIdx - 1]?.number
        const label =
          startCh === endCh
            ? `Chương ${startCh}`
            : `Chương ${Math.min(startCh, endCh)} - ${Math.max(startCh, endCh)}`
        batches.push({ page: p, label, startCh, endCh })
      }
    }
    return batches
  }, [totalPages, totalFilteredChapters, sortedChapters, pageSize])

  const handleJumpToChapter = (e?: React.FormEvent, directRead = false) => {
    if (e) e.preventDefault()
    setJumpMessage(null)
    const targetNum = parseInt(jumpChapterInput.trim(), 10)
    if (isNaN(targetNum) || targetNum <= 0) {
      setJumpMessage({ type: 'error', text: 'Vui lòng nhập số chương hợp lệ' })
      return
    }

    const foundChapter = chapters.find((c) => c.number === targetNum)
    if (!foundChapter) {
      setJumpMessage({ type: 'error', text: `Truyện chưa có chương #${targetNum}` })
      return
    }

    if (directRead) {
      window.location.href = `/novels/${slug}/chapters/${targetNum}`
      return
    }

    if (chapterSearch.trim()) {
      const isInFiltered = sortedChapters.some((c) => c.number === targetNum)
      if (!isInFiltered) {
        setChapterSearch('')
      }
    }

    const targetIndex = sortedChapters.findIndex((c) => c.number === targetNum)
    const targetPage = targetIndex >= 0 ? Math.floor(targetIndex / pageSize) + 1 : 1
    setCurrentPage(targetPage)
    setHighlightedChapterNumber(targetNum)
    setJumpMessage({
      type: 'success',
      text: `Đã chuyển đến trang ${targetPage} (chứa Chương #${targetNum})`,
    })

    setTimeout(() => {
      const el = document.getElementById(`chapter-card-${targetNum}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 150)
  }

  const latestChapter = useMemo(() => {
    if (!chapters.length) return null
    return [...chapters].sort((a, b) => b.number - a.number)[0]
  }, [chapters])

  // Open add chapter modal with next chapter number
  const handleOpenAddChapter = () => {
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1
    setChNumber(nextNum)
    setChTitle(`Chương ${nextNum}: `)
    setChContent('')
    setChIsPremium(false)
    setChapterError('')
    setIsAddChapterOpen(true)
  }

  const handleAddChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chTitle.trim() || !chContent.trim()) {
      setChapterError('Vui lòng nhập đầy đủ tiêu đề và nội dung chương')
      return
    }

    setIsSubmittingChapter(true)
    setChapterError('')
    try {
      await novelsApi.addChapter(slug!, {
        number: chNumber,
        title: chTitle.trim(),
        content: chContent.trim(),
        is_premium: chIsPremium,
      })
      queryClient.invalidateQueries({ queryKey: ['chapters', slug] })
      queryClient.invalidateQueries({ queryKey: ['novel', slug] })
      setIsAddChapterOpen(false)
    } catch (err: any) {
      setChapterError(err.response?.data?.detail || 'Không thể thêm chương mới')
    } finally {
      setIsSubmittingChapter(false)
    }
  }

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportDetails.trim()) {
      setReportFeedback({ type: 'error', message: 'Vui lòng mô tả chi tiết vi phạm hoặc dẫn chứng' })
      return
    }

    setIsSubmittingReport(true)
    setReportFeedback(null)
    try {
      const res = await novelsApi.report(slug!, {
        reason: reportReason,
        details: reportDetails.trim(),
      })
      setReportFeedback({ type: 'success', message: res.message || 'Báo cáo vi phạm đã được ghi nhận!' })
      setTimeout(() => {
        setIsReportModalOpen(false)
        setReportDetails('')
        setReportFeedback(null)
      }, 2000)
    } catch (err: any) {
      setReportFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Gửi báo cáo thất bại, vui lòng thử lại sau',
      })
    } finally {
      setIsSubmittingReport(false)
    }
  }

  if (isLoading) return <div className="min-h-screen" style={{ background: 'var(--color-bg-deep)' }} />

  if (!novel)
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--color-bg-deep)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}
      >
        Không tìm thấy truyện.
      </div>
    )

  return (
    <PageWrapper className="min-h-screen pb-36 font-ui" style={{ background: 'var(--color-bg-deep)' }}>
      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 pt-20 pb-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <Link to="/" className="flex items-center gap-1 hover:text-[var(--color-accent-gold)] transition-colors">
          <Home size={13} className="text-[var(--color-accent-gold)]" />
          <span>Trang Chủ</span>
        </Link>
        <ChevronRight size={12} />
        <Link to="/novels" className="hover:text-[var(--color-accent-gold)] transition-colors">
          Kho Truyện
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text-secondary)] truncate max-w-xs">{normalizeNFC(novel.title)}</span>
      </div>

      {/* Hero Section */}
      <div className="border-b border-[var(--color-border-subtle)] pb-12 pt-6">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Book Cover */}
          <div
            className="w-48 sm:w-56 flex-shrink-0 rounded-lg overflow-hidden border border-[var(--color-border-medium)] shadow-2xl relative"
            style={{ aspectRatio: '2/3' }}
          >
            {novel.cover_url ? (
              <img
                src={novel.cover_url.startsWith('/') ? `http://localhost:8000${novel.cover_url}` : novel.cover_url}
                alt={novel.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                style={{ background: 'linear-gradient(145deg, var(--color-bg-surface) 0%, var(--color-bg-deep) 100%)' }}
              >
                <Sparkles size={24} className="text-[var(--color-accent-gold)] mb-2" />
                <span className="text-xs font-heading font-medium text-[var(--color-text-primary)]">
                  {novel.title}
                </span>
              </div>
            )}
          </div>

          {/* Book Meta Details */}
          <div className="flex-1 text-center md:text-left">
            {/* Genres & Tags Pills */}
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mb-3">
              {novel.genres.map((g) => (
                <Link
                  key={g}
                  to={`/novels?genre=${encodeURIComponent(g)}`}
                  className="px-2.5 py-0.5 rounded-full text-[11px] bg-[var(--color-bg-surface)] text-[var(--color-accent-gold)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] transition-colors"
                >
                  {g}
                </Link>
              ))}

              {novel.tags &&
                novel.tags.map((t) => (
                  <Link
                    key={t}
                    to={`/novels?tag=${encodeURIComponent(t)}`}
                    className="px-2.5 py-0.5 rounded-full text-[11px] bg-[var(--color-accent-amber)]/10 text-[var(--color-accent-amber)] border border-[var(--color-accent-amber)]/30 hover:bg-[var(--color-accent-amber)]/20 transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
            </div>

            <h1
              className="font-heading font-semibold text-[var(--color-text-primary)] mb-2"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', lineHeight: 1.25 }}
            >
              {normalizeNFC(novel.title)}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-[var(--color-text-secondary)] mb-4">
              <p>
                Tác giả: <strong className="text-[var(--color-text-primary)]">{normalizeNFC(novel.author)}</strong>
              </p>
              {novel.uploader_name && (
                <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                  <UserIcon size={12} />
                  Người đăng: <strong className="text-[var(--color-text-secondary)]">{novel.uploader_name}</strong>
                </span>
              )}
            </div>

            <div className="flex gap-4 justify-center md:justify-start items-center text-xs text-[var(--color-text-muted)] mb-6 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Eye size={14} /> {formatCount(novel.views)} lượt đọc
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={14} className="text-[var(--color-accent-gold)] fill-[var(--color-accent-gold)]" />
                <strong className="text-[var(--color-text-primary)]">{novel.rating.toFixed(1)}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} /> {novel.total_chapters} chương
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                {novel.status === 'completed' ? 'Đã hoàn thành' : 'Đang ra'}
              </span>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-3 justify-center md:justify-start flex-wrap items-center">
              {chapters.length > 0 && (
                <Link
                  to={`/novels/${slug}/chapters/1`}
                  className="btn-gold flex items-center gap-2 py-2.5 px-6 text-sm"
                >
                  <BookOpen size={16} />
                  Đọc Chương 1
                </Link>
              )}

              {latestChapter && (
                <Link
                  to={`/novels/${slug}/chapters/${latestChapter.number}`}
                  className="btn-ghost flex items-center gap-2 py-2.5 px-5 text-sm"
                >
                  <span>Chương Mới Nhất ({latestChapter.number})</span>
                  <ChevronRight size={14} />
                </Link>
              )}

              {/* Add chapter button for uploader / admin */}
              {canManageNovel && (
                <button
                  onClick={handleOpenAddChapter}
                  className="flex items-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-semibold bg-[var(--color-bg-surface)] border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold)] hover:text-black transition-all"
                >
                  <Plus size={14} />
                  Thêm Chương Mới
                </button>
              )}

              {/* Report Violation Button */}
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1.5 py-2.5 px-4 rounded-full text-xs font-medium text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                title="Tố cáo truyện vi phạm bản quyền hoặc nội dung xấu"
              >
                <Flag size={13} />
                <span>Báo Cáo Vi Phạm</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 pt-6">
        {/* Description */}
        <div className="mb-10 p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
          <h2 className="text-[11px] font-display font-semibold tracking-[2px] text-[var(--color-accent-gold)] mb-3">
            TÓM TẮT CỐT TRUYỆN
          </h2>
          <p className="reading-prose text-sm sm:text-base leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-line">
            {normalizeNFC(novel.description)}
          </p>

          {/* Tags list if any */}
          {novel.tags && novel.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                <Tag size={12} /> Nhãn liên quan:
              </span>
              {novel.tags.map((t) => (
                <Link
                  key={t}
                  to={`/novels?tag=${encodeURIComponent(t)}`}
                  className="text-xs text-[var(--color-accent-gold)] hover:underline"
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Chapter List Header & Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-display font-semibold tracking-[2px] text-[var(--color-accent-gold)]">
                MỤC LỤC CHƯƠNG ({chapters.length})
              </h2>
              <span className="text-[11px] text-[var(--color-text-muted)] font-ui">
                • 10 chap / lần
              </span>
            </div>

            {/* Sort order & Search */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Tìm số hoặc tên chương..."
                  className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-gold)] font-ui w-48 sm:w-56 transition-all"
                />
              </div>

              <button
                onClick={() => setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] text-[var(--color-text-primary)] font-ui transition-all"
                title="Đảo chiều sắp xếp danh sách chương"
              >
                <ArrowUpDown size={12} className="text-[var(--color-accent-gold)]" />
                <span>{sortOrder === 'asc' ? 'Cũ nhất trước' : 'Mới nhất trước'}</span>
              </button>
            </div>
          </div>

          {/* Quick Select & Jump Chapter Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            {/* Range Selector Dropdown */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-[var(--color-text-muted)] font-ui whitespace-nowrap flex items-center gap-1.5">
                <Compass size={14} className="text-[var(--color-accent-gold)]" /> Chọn tập:
              </span>
              <select
                value={safeCurrentPage}
                onChange={(e) => {
                  setCurrentPage(Number(e.target.value))
                  setHighlightedChapterNumber(null)
                  setJumpMessage(null)
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] font-ui focus:outline-none focus:border-[var(--color-accent-gold)] cursor-pointer"
              >
                {chapterBatches.map((b) => (
                  <option key={b.page} value={b.page}>
                    Trang {b.page} ({b.label})
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Chapter Number Input & Quick Jump */}
            <form
              onSubmit={(e) => handleJumpToChapter(e, false)}
              className="flex items-center gap-2 flex-wrap sm:flex-nowrap"
            >
              <div className="relative flex-1 sm:w-44">
                <input
                  type="number"
                  min="1"
                  max={chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) : 9999}
                  value={jumpChapterInput}
                  onChange={(e) => setJumpChapterInput(e.target.value)}
                  placeholder={`Nhập số chap (1-${chapters.length})...`}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-gold)] font-ui"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl text-xs font-medium font-ui bg-[var(--color-bg-raised)] hover:bg-[var(--color-accent-gold)] hover:text-black border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] text-[var(--color-text-primary)] transition-all whitespace-nowrap"
              >
                Đến chap
              </button>
              {jumpChapterInput.trim() && (
                <button
                  type="button"
                  onClick={(e) => handleJumpToChapter(e, true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold font-ui bg-[var(--color-accent-gold)] text-black hover:bg-[var(--color-accent-gold)]/90 transition-all flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Đọc ngay #{jumpChapterInput.trim()}</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </form>
          </div>

          {/* Jump feedback notice if any */}
          {jumpMessage && (
            <div
              className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 ${
                jumpMessage.type === 'error'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {jumpMessage.type === 'error' ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
              <span>{jumpMessage.text}</span>
            </div>
          )}

          {/* Horizontal Quick Batch Pills (Scrollable) */}
          {chapterBatches.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
              {chapterBatches.map((b) => {
                const isActive = b.page === safeCurrentPage
                return (
                  <button
                    key={b.page}
                    onClick={() => {
                      setCurrentPage(b.page)
                      setHighlightedChapterNumber(null)
                      setJumpMessage(null)
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[var(--color-accent-gold)] text-black font-semibold shadow-sm'
                        : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)] hover:bg-[var(--color-bg-raised)] border border-[var(--color-border-subtle)]'
                    }`}
                  >
                    {b.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Chapter Grid (Only 10 chapters rendered at once) */}
        {paginatedChapters.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
              {paginatedChapters.map((ch) => {
                const isHighlighted = highlightedChapterNumber === ch.number
                return (
                  <Link
                    key={ch.id}
                    id={`chapter-card-${ch.number}`}
                    to={`/novels/${slug}/chapters/${ch.number}`}
                    className={`group flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-bg-surface)] border transition-all duration-200 ${
                      isHighlighted
                        ? 'border-[var(--color-accent-gold)] ring-2 ring-[var(--color-accent-gold)]/50 bg-[var(--color-bg-raised)] shadow-lg'
                        : 'border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] hover:bg-[var(--color-bg-raised)]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className="flex-shrink-0 px-2 py-1.5 rounded text-[11px] font-bold text-[var(--color-accent-gold)] bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] group-hover:border-[var(--color-accent-gold)]/40 transition-colors"
                        style={{ fontFamily: 'var(--font-display)', minWidth: '40px', textAlign: 'center' }}
                      >
                        #{ch.number}
                      </span>
                      <span className="text-xs font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] transition-colors line-clamp-2 leading-relaxed break-words">
                        {normalizeNFC(ch.title)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {ch.is_premium && (
                        <span className="text-[8px] font-display font-semibold tracking-wider text-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 border border-[var(--color-accent-gold)]/30 px-1.5 py-0.5 rounded">
                          VIP
                        </span>
                      )}
                      <ChevronRight
                        size={14}
                        className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)] group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Bottom Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
              <span className="text-xs text-[var(--color-text-muted)] font-ui order-2 sm:order-1">
                Hiển thị <span className="text-[var(--color-text-primary)] font-semibold">{(safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, totalFilteredChapters)}</span> trong tổng số <span className="text-[var(--color-text-primary)] font-semibold">{totalFilteredChapters}</span> chương
              </span>

              <div className="flex items-center gap-1.5 order-1 sm:order-2 flex-wrap justify-center">
                <button
                  onClick={() => {
                    setCurrentPage(1)
                    setHighlightedChapterNumber(null)
                  }}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg text-xs font-ui bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Trang đầu"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1))
                    setHighlightedChapterNumber(null)
                  }}
                  disabled={safeCurrentPage === 1}
                  aria-label="Trang trước"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-ui bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft size={14} />
                  <span>Trước</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true
                      return p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1]
                      const showEllipsis = prev && p - prev > 1
                      return (
                        <div key={p} className="flex items-center gap-1">
                          {showEllipsis && <span className="text-xs text-[var(--color-text-muted)] px-1">…</span>}
                          <button
                            onClick={() => {
                              setCurrentPage(p)
                              setHighlightedChapterNumber(null)
                            }}
                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-medium font-ui transition-all ${
                              p === safeCurrentPage
                                ? 'bg-[var(--color-accent-gold)] text-black font-bold shadow'
                                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)] border border-[var(--color-border-subtle)]'
                            }`}
                          >
                            {p}
                          </button>
                        </div>
                      )
                    })}
                </div>

                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                    setHighlightedChapterNumber(null)
                  }}
                  disabled={safeCurrentPage === totalPages}
                  aria-label="Trang sau"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-ui bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <span>Sau</span>
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => {
                    setCurrentPage(totalPages)
                    setHighlightedChapterNumber(null)
                  }}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg text-xs font-ui bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Trang cuối"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <p className="text-xs text-[var(--color-text-muted)]">
              Không tìm thấy chương nào khớp với từ khóa "{chapterSearch}".
            </p>
          </div>
        )}
      </div>

      {/* Modal: Tố Cáo Vi Phạm */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-medium)] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <AlertTriangle size={18} />
                  <span>TỐ CÁO VI PHẠM TÁC PHẨM</span>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  <X size={18} />
                </button>
              </div>

              {reportFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    reportFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {reportFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{reportFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                    Truyện bị tố cáo
                  </label>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{novel.title}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Lý do vi phạm <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)]"
                  >
                    <option value="Vi phạm bản quyền">Vi phạm bản quyền / Sao chép trái phép</option>
                    <option value="Nội dung phản cảm / đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Bạo lực / kích động">Bạo lực / Kích động thù hằn</option>
                    <option value="Spam / Dịch máy rác">Spam / Dịch máy rác không đọc được</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Chi tiết vi phạm & Dẫn chứng <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Mô tả cụ thể tác phẩm gốc bị vi phạm bản quyền (link nguồn, tên tác giả gốc) hoặc chi tiết nội dung sai phạm..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 rounded-full text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingReport ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
                    <span>Gửi Báo Cáo</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Thêm Chương Mới */}
      <AnimatePresence>
        {isAddChapterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-medium)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
                <div className="flex items-center gap-2 text-[var(--color-accent-gold)] font-semibold text-sm">
                  <Plus size={18} />
                  <span>THÊM CHƯƠNG MỚI</span>
                </div>
                <button
                  onClick={() => setIsAddChapterOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  <X size={18} />
                </button>
              </div>

              {chapterError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {chapterError}
                </div>
              )}

              <form onSubmit={handleAddChapterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                      Số Chương
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={chNumber}
                      onChange={(e) => setChNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                      Tiêu Đề Chương
                    </label>
                    <input
                      type="text"
                      required
                      value={chTitle}
                      onChange={(e) => setChTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                    Nội Dung Chương
                  </label>
                  <textarea
                    rows={12}
                    required
                    placeholder="Dán hoặc nhập nội dung chương tại đây..."
                    value={chContent}
                    onChange={(e) => setChContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] font-serif leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chIsPremium}
                      onChange={(e) => setChIsPremium(e.target.checked)}
                      className="accent-[var(--color-accent-gold)]"
                    />
                    Đặt làm chương VIP (khóa bằng linh thạch)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddChapterOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingChapter}
                    className="px-6 py-2 rounded-full text-xs font-semibold bg-[var(--color-accent-gold)] text-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingChapter ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>Lưu & Xuất Bản Chương</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
