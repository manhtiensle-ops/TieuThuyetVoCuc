import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageWrapper } from '@/components/novel/NovelCard'
import { novelsApi } from '@/api'
import {
  BookOpen,
  Eye,
  Star,
  Home,
  ChevronRight,
  ArrowUpDown,
  Search,
  Sparkles,
} from 'lucide-react'
import { formatCount, normalizeNFC } from '@/lib/utils'

export default function NovelPage() {
  const { slug } = useParams<{ slug: string }>()

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [chapterSearch, setChapterSearch] = useState('')

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

  const latestChapter = useMemo(() => {
    if (!chapters.length) return null
    return [...chapters].sort((a, b) => b.number - a.number)[0]
  }, [chapters])

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
    <PageWrapper className="min-h-screen pb-20" style={{ background: 'var(--color-bg-deep)' }}>
      {/* Breadcrumb */}
      <div
        className="max-w-5xl mx-auto px-6 sm:px-8 pt-20 pb-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]"
        style={{ fontFamily: 'var(--font-ui)' }}
      >
        <Link to="/" className="flex items-center gap-1 hover:text-[var(--color-accent-gold)] transition-colors">
          <Home size={13} className="text-[var(--color-accent-gold)]" />
          <span>Trang Chủ</span>
        </Link>
        <ChevronRight size={12} />
        <Link to="/novels" className="hover:text-[var(--color-accent-gold)] transition-colors">
          Kho Truyện
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text-secondary)] font-medium truncate max-w-xs">
          {normalizeNFC(novel.title)}
        </span>
      </div>

      {/* Hero banner */}
      <div className="relative overflow-hidden" style={{ minHeight: '340px' }}>
        {novel.cover_url && (
          <img src={novel.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md scale-105" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 10%, var(--color-bg-deep) 90%)' }}
        />

        <div className="relative max-w-5xl mx-auto px-6 sm:px-8 pt-8 pb-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end">
          {/* Book Cover */}
          <div
            className="flex-shrink-0 rounded-sm shadow-2xl overflow-hidden border border-[var(--color-border-subtle)]"
            style={{ width: '150px', aspectRatio: '2/3' }}
          >
            {novel.cover_url ? (
              <img src={novel.cover_url} alt={novel.title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                style={{ background: 'linear-gradient(160deg, #1A2C4A 0%, #0D0F1A 50%, #2C1A4A 100%)' }}
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
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mb-3">
              {novel.genres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-0.5 rounded-full text-[11px] bg-[var(--color-bg-surface)] text-[var(--color-accent-gold)] border border-[var(--color-border-subtle)]"
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  {g}
                </span>
              ))}
            </div>

            <h1
              className="font-heading font-semibold text-[var(--color-text-primary)] mb-2"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.25 }}
            >
              {normalizeNFC(novel.title)}
            </h1>

            <p className="text-sm text-[var(--color-text-secondary)] mb-4 font-ui">
              Tác giả: <strong className="text-[var(--color-text-primary)]">{normalizeNFC(novel.author)}</strong>
            </p>

            <div className="flex gap-5 justify-center md:justify-start items-center text-xs text-[var(--color-text-muted)] font-ui mb-6">
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

            {/* Quick Actions */}
            <div className="flex gap-3 justify-center md:justify-start flex-wrap">
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8 pt-4">
        {/* Description */}
        <div className="mb-12 p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              letterSpacing: '2.5px',
              color: 'var(--color-accent-gold)',
              marginBottom: '14px',
            }}
          >
            TÓM TẮT CỐT TRUYỆN
          </h2>
          <p
            className="reading-prose"
            style={{ maxWidth: 'none', fontSize: '15px', lineHeight: 1.85, color: 'var(--color-text-secondary)' }}
          >
            {normalizeNFC(novel.description)}
          </p>
        </div>

        {/* Chapter List Header & Controls */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-2">
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  letterSpacing: '2px',
                  color: 'var(--color-accent-gold)',
                }}
                className="font-semibold"
              >
                MỤC LỤC CHƯƠNG ({chapters.length})
              </h2>
            </div>

            {/* Sort order & Search */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
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
        </div>

        {/* Chapter Grid */}
        {sortedChapters.length > 0 ? (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
            {sortedChapters.map((ch) => (
              <Link
                key={ch.id}
                to={`/novels/${slug}/chapters/${ch.number}`}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] hover:bg-[var(--color-bg-raised)]/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold text-[var(--color-accent-gold)] bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] group-hover:border-[var(--color-accent-gold)]/40 transition-colors"
                    style={{ fontFamily: 'var(--font-display)', minWidth: '38px', textAlign: 'center' }}
                  >
                    #{ch.number}
                  </span>
                  <span
                    className="truncate text-xs font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] transition-colors"
                    style={{ fontFamily: 'var(--font-ui)' }}
                  >
                    {normalizeNFC(ch.title)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {ch.is_premium && (
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '8px',
                        letterSpacing: '1px',
                        color: 'var(--color-accent-gold)',
                        background: 'rgba(201,168,76,0.15)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      VIP
                    </span>
                  )}
                  <ChevronRight size={13} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <p className="text-xs text-[var(--color-text-muted)] font-ui">
              Không tìm thấy chương nào khớp với từ khóa "{chapterSearch}".
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
