import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Settings, List, Sun, Moon, BookOpen, Home, Sparkles, MessageSquare } from 'lucide-react'
import { useReaderStore, useUIStore } from '@/stores'
import { cn, normalizeNFC } from '@/lib/utils'
import type { Chapter, ChapterMeta, CommentsSummary } from '@/types'
import { commentsApi } from '@/api'
import { parseContentParagraphs } from '@/lib/paragraphParser'
import { ParagraphCommentBadge } from './ParagraphCommentBadge'
import { CommentDrawer } from './CommentDrawer'
import { ChapterCommentsSection } from './ChapterCommentsSection'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { useChapterPrefetch } from '@/hooks/useChapterPrefetch'
import { useOfflineSync } from '@/hooks/useOfflineSync'

gsap.registerPlugin(ScrollTrigger)

// ── Reading Progress Ink Bar ───────────────────────────────
function ReadingProgressBar() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!barRef.current) return
    const ctx = gsap.context(() => {
      gsap.to(barRef.current, {
        scaleX: 1,
        transformOrigin: 'left center',
        ease: 'none',
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.3,
        },
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <div
      className="fixed top-0 left-0 right-0 h-0.5 z-50 origin-left"
      style={{ background: 'var(--color-bg-raised)' }}
    >
      <div
        ref={barRef}
        className="h-full origin-left"
        style={{
          background: 'linear-gradient(to right, var(--color-accent-gold), var(--color-accent-amber))',
          transform: 'scaleX(0)',
        }}
      />
    </div>
  )
}

// ── Font Size Map ──────────────────────────────────────────
const fontSizeMap = { sm: '17px', md: '19px', lg: '21px', xl: '23px' }
const lineHeightMap = { compact: 1.65, normal: 1.85, loose: 2.1 }

// ── Reader Controls (collapse on scroll down) ──────────────
function ReaderControls({
  novel,
  chapter,
  chapters,
  onTocOpen,
  onCommentsOpen,
  totalComments = 0,
}: {
  novel: { slug: string; title: string }
  chapter: Chapter
  chapters: ChapterMeta[]
  onTocOpen: () => void
  onCommentsOpen?: () => void
  totalComments?: number
}) {
  const {
    theme,
    fontSize,
    lineHeight,
    fontFamily,
    setTheme,
    setFontSize,
    setLineHeight,
    setFontFamily,
  } = useReaderStore()
  const { readerControlsVisible } = useUIStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const prevChapter = chapters.find((c) => c.number === chapter.number - 1)
  const nextChapter = chapters.find((c) => c.number === chapter.number + 1)

  const themes = [
    { key: 'dark' as const, icon: Moon, label: 'Tối' },
    { key: 'light' as const, icon: Sun, label: 'Sáng' },
    { key: 'sepia' as const, icon: BookOpen, label: 'Sepia' },
    { key: 'oled' as const, icon: Sparkles, label: 'OLED' },
  ]

  return (
    <>
      {/* Top bar */}
      <motion.header
        animate={{ y: readerControlsVisible ? 0 : -80 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between backdrop-blur-md bg-[var(--color-bg-deep)]/90 border-b border-[var(--color-border-subtle)]"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Nút Về Trang Chủ */}
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all hover:bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-transparent hover:border-[var(--color-border-subtle)]"
            title="Trở về Trang Chủ"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <Home size={15} className="text-[var(--color-accent-gold)]" />
            <span className="hidden sm:inline font-medium">Trang Chủ</span>
          </Link>

          <span className="text-[var(--color-border-subtle)]">/</span>

          {/* Link về tiểu thuyết */}
          <Link
            to={`/novels/${novel.slug}`}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)] transition-colors max-w-[150px] sm:max-w-[240px] truncate"
            style={{ fontFamily: 'var(--font-ui)' }}
            title={`Về trang giới thiệu: ${novel.title}`}
          >
            <span className="truncate">{novel.title}</span>
          </Link>
        </div>

        {/* Tiêu đề chương trung tâm */}
        <span
          className="hidden md:block truncate max-w-sm px-4 text-center font-medium"
          style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}
        >
          Chương {chapter.number}: {normalizeNFC(chapter.title)}
        </span>

        <div className="flex items-center gap-1 sm:gap-2">
          {onCommentsOpen && (
            <button
              onClick={onCommentsOpen}
              className="relative p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all cursor-pointer"
              aria-label="Thảo luận chương"
              title="Bình luận chương"
            >
              <MessageSquare size={18} />
              {totalComments > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--color-accent-gold)] text-black leading-tight">
                  {totalComments > 99 ? '99+' : totalComments}
                </span>
              )}
            </button>
          )}
          <button onClick={onTocOpen} className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all" aria-label="Mục lục" title="Mục lục chương">
            <List size={18} />
          </button>
          <button onClick={() => setSettingsOpen((p) => !p)} className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all" aria-label="Cài đặt đọc" title="Tùy chỉnh giao diện">
            <Settings size={18} />
          </button>
        </div>
      </motion.header>

      {/* Settings panel */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-16 right-6 z-50 p-5 rounded-xl"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-medium)',
              width: '240px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '2px', color: 'var(--color-accent-gold)', marginBottom: '16px' }}>
              TUỲ CHỈNH ĐỌC
            </p>

            {/* Theme */}
            <div className="mb-4">
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--color-text-muted)' }}>Chủ đề</label>
              <div className="flex gap-2 mt-2">
                {themes.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-all',
                      theme === key ? 'ring-1' : 'opacity-50 hover:opacity-75',
                    )}
                    style={{
                      background: theme === key ? 'var(--color-bg-raised)' : 'transparent',
                      outline: theme === key ? '1px solid var(--color-accent-gold)' : 'none',
                      fontFamily: 'var(--font-ui)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family (Vietnamese Optimized) */}
            <div className="mb-4">
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--color-text-muted)' }}>Kiểu chữ</label>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setFontFamily('serif')}
                  className="flex-1 py-1.5 rounded text-xs transition-all"
                  style={{
                    background: fontFamily === 'serif' ? 'var(--color-accent-gold)' : 'var(--color-bg-raised)',
                    color: fontFamily === 'serif' ? '#000' : 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                  }}
                >
                  Literata
                </button>
                <button
                  onClick={() => setFontFamily('sans')}
                  className="flex-1 py-1.5 rounded text-xs transition-all"
                  style={{
                    background: fontFamily === 'sans' ? 'var(--color-accent-gold)' : 'var(--color-bg-raised)',
                    color: fontFamily === 'sans' ? '#000' : 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-body-sans)',
                    fontWeight: 600,
                  }}
                >
                  Vietnam Pro
                </button>
              </div>
            </div>

            {/* Font size */}
            <div className="mb-4">
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--color-text-muted)' }}>Cỡ chữ</label>
              <div className="flex gap-1 mt-2">
                {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s)}
                    className="flex-1 py-1.5 rounded text-xs transition-all"
                    style={{
                      background: fontSize === s ? 'var(--color-accent-gold)' : 'var(--color-bg-raised)',
                      color: fontSize === s ? '#000' : 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Line height */}
            <div>
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--color-text-muted)' }}>Giãn dòng</label>
              <div className="flex gap-1 mt-2">
                {(['compact', 'normal', 'loose'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLineHeight(l)}
                    className="flex-1 py-1.5 rounded text-xs transition-all"
                    style={{
                      background: lineHeight === l ? 'var(--color-accent-gold)' : 'var(--color-bg-raised)',
                      color: lineHeight === l ? '#000' : 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {l === 'compact' ? 'Sít' : l === 'normal' ? 'Vừa' : 'Thoáng'}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <motion.nav
        animate={{ y: readerControlsVisible ? 0 : 80 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-3 sm:gap-4 py-3 sm:py-4 px-4 sm:px-6 backdrop-blur-sm bg-[var(--color-bg-deep)]/80 border-t border-[var(--color-border-subtle)]"
      >
        <Link
          to="/"
          className="p-2 rounded-full transition-all hover:bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)]"
          title="Trở về Trang Chủ"
        >
          <Home size={18} />
        </Link>
        {prevChapter ? (
          <Link
            to={`/novels/${novel.slug}/chapters/${prevChapter.number}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all hover:scale-105"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ChevronLeft size={14} />
            Chương trước
          </Link>
        ) : (
          <div />
        )}

        <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '2px', color: 'var(--color-text-muted)' }}>
          {chapter.number} / {chapters.length}
        </span>

        {nextChapter ? (
          <Link
            to={`/novels/${novel.slug}/chapters/${nextChapter.number}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all hover:scale-105"
            style={{
              background: 'var(--color-accent-gold)',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: '#000',
              fontWeight: 600,
            }}
          >
            Chương sau
            <ChevronRight size={14} />
          </Link>
        ) : (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--color-accent-gold)' }}>
            ✦ Hết chương
          </div>
        )}
      </motion.nav>
    </>
  )
}

// ── Reader View Main ───────────────────────────────────────
interface ReaderViewProps {
  novel: { slug: string; title: string }
  chapter: Chapter
  chapters: ChapterMeta[]
}

export function ReaderView({ novel, chapter, chapters }: ReaderViewProps) {
  const { theme, fontSize, lineHeight, fontFamily } = useReaderStore()
  const { setReaderControlsVisible } = useUIStore()
  const [tocOpen, setTocOpen] = useState(false)
  const [tocSearch, setTocSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState<number | null>(null)
  const [selectedParagraphText, setSelectedParagraphText] = useState<string | undefined>(undefined)
  const [commentsSummary, setCommentsSummary] = useState<CommentsSummary | null>(null)
  const contentRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)

  // ── Scroll progress + prefetch + offline sync ────────────
  const { scrollPct, containerRef } = useScrollProgress()

  useChapterPrefetch({
    novelSlug: novel.slug,
    currentChapterNum: chapter.number,
    totalChapters: chapters.length,
    scrollPct,
  })

  const { saveProgress } = useOfflineSync()
  // Debounce đã xử lý trong useScrollProgress — gọi saveProgress mỗi khi scrollPct update
  useEffect(() => {
    if (scrollPct === 0) return
    saveProgress({
      novel_slug: novel.slug,
      chapter_number: chapter.number,
      scroll_pct: scrollPct,
    })
  }, [scrollPct, novel.slug, chapter.number, saveProgress])

  // Parse paragraphs from chapter content
  const paragraphs = useMemo(() => {
    return parseContentParagraphs(chapter.content)
  }, [chapter.content])

  // Filter TOC chapters in reader drawer
  const filteredTocChapters = useMemo(() => {
    if (!tocSearch.trim()) return chapters
    const q = tocSearch.trim().toLowerCase()
    return chapters.filter(
      (c) => c.title.toLowerCase().includes(q) || String(c.number).includes(q)
    )
  }, [chapters, tocSearch])

  // Fetch comments summary
  const fetchSummary = useCallback(async () => {
    if (!chapter.id) return
    try {
      const summary = await commentsApi.getSummary(chapter.id)
      setCommentsSummary(summary)
    } catch (err) {
      console.error('Lỗi tải tóm tắt bình luận:', err)
    }
  }, [chapter.id])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Hide controls on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY
      const delta = current - lastScrollY.current
      if (Math.abs(delta) > 8) {
        setReaderControlsVisible(delta < 0 || current < 80)
      }
      lastScrollY.current = current
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [setReaderControlsVisible])

  // Chapter title entrance
  useEffect(() => {
    if (!contentRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.chapter-title', {
        opacity: 0, y: 40, duration: 0.9,
        ease: 'expo.out', delay: 0.2,
      })
      gsap.from('.chapter-meta', {
        opacity: 0, y: 20, duration: 0.7,
        ease: 'expo.out', delay: 0.4,
      })
      gsap.from('.reading-prose', {
        opacity: 0, y: 30, duration: 0.8,
        ease: 'expo.out', delay: 0.6,
      })
    }, contentRef)
    return () => ctx.revert()
  }, [chapter.id])

  // Keyboard navigation
  const navigate = useCallback((dir: -1 | 1) => {
    const target = chapters.find((c) => c.number === chapter.number + dir)
    if (target) window.location.href = `/novels/${novel.slug}/chapters/${target.number}`
  }, [chapter, chapters, novel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea') return
      if (drawerOpen) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, drawerOpen])

  return (
    <div
      style={{ background: 'var(--color-bg-deep)', minHeight: '100vh' }}
      className="relative"
    >
      <ReadingProgressBar />

      <ReaderControls
        novel={novel}
        chapter={chapter}
        chapters={chapters}
        onTocOpen={() => setTocOpen(true)}
        onCommentsOpen={() => {
          setSelectedParagraphIndex(null)
          setSelectedParagraphText(undefined)
          setDrawerOpen(true)
        }}
        totalComments={commentsSummary?.total_comments || 0}
      />

      {/* Main content */}
      <main
        ref={(el) => {
          // Dual-ref: contentRef cho GSAP, containerRef cho scroll tracking
          ;(contentRef as React.MutableRefObject<HTMLElement | null>).current = el
          ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el as HTMLDivElement | null
        }}
        className="px-4 pb-32"
        style={{ paddingTop: '100px', overflowY: 'auto', height: '100vh' }}
      >
        {/* Chapter heading */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p
            className="chapter-meta mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              letterSpacing: '3px',
              color: 'var(--color-accent-gold)',
            }}
          >
            CHƯƠNG {chapter.number}
          </p>
          <h1
            className="chapter-title"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              lineHeight: 1.35,
              padding: '0.15em 0',
              letterSpacing: '-0.01em',
            }}
          >
            {normalizeNFC(chapter.title)}
          </h1>
          {/* Divider ornament */}
          <div className="flex items-center gap-3 justify-center mt-8 mb-0">
            <div className="h-px flex-1" style={{ background: 'var(--color-border-subtle)' }} />
            <span style={{ color: 'var(--color-accent-gold)', fontSize: '18px' }}>✦</span>
            <div className="h-px flex-1" style={{ background: 'var(--color-border-subtle)' }} />
          </div>
        </div>

        {/* Reading content */}
        <article
          className="reading-prose"
          data-font={fontFamily}
          style={{
            fontSize: fontSizeMap[fontSize],
            lineHeight: lineHeightMap[lineHeight],
          }}
        >
          {paragraphs.map((para) => (
            <div
              key={para.index}
              className="paragraph-wrapper group relative flex items-start justify-between gap-3 rounded-lg p-1 -mx-1 transition-colors duration-150"
              style={{
                backgroundColor:
                  selectedParagraphIndex === para.index && drawerOpen
                    ? 'var(--color-bg-raised)'
                    : 'transparent',
              }}
            >
              <div
                className="flex-1 reading-paragraph"
                dangerouslySetInnerHTML={{ __html: para.html }}
              />
              <div className="shrink-0 pt-1 select-none">
                <ParagraphCommentBadge
                  count={commentsSummary?.paragraph_counts?.[String(para.index)] || 0}
                  active={selectedParagraphIndex === para.index && drawerOpen}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedParagraphIndex(para.index)
                    setSelectedParagraphText(para.text)
                    setDrawerOpen(true)
                  }}
                />
              </div>
            </div>
          ))}
        </article>

        {/* Chapter end ornament */}
        <div className="max-w-2xl mx-auto flex flex-col items-center mt-16 mb-8 gap-3">
          <div className="flex items-center gap-3 w-full">
            <div className="h-px flex-1" style={{ background: 'var(--color-border-subtle)' }} />
            <span style={{ color: 'var(--color-accent-gold)', fontSize: '14px', fontFamily: 'var(--font-display)', letterSpacing: '3px' }}>
              ✦ HẾT CHƯƠNG {chapter.number} ✦
            </span>
            <div className="h-px flex-1" style={{ background: 'var(--color-border-subtle)' }} />
          </div>
        </div>

        {/* Chapter Comments Section */}
        <div className="max-w-2xl mx-auto">
          <ChapterCommentsSection
            chapterId={chapter.id}
            onCommentCountChange={fetchSummary}
          />
        </div>
      </main>

      {/* TOC Drawer */}
      <AnimatePresence>
        {tocOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTocOpen(false)}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 overflow-y-auto"
              style={{
                width: 'min(380px, 85vw)',
                background: 'var(--color-bg-surface)',
                borderLeft: '1px solid var(--color-border-medium)',
              }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p
                    style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: 'var(--color-accent-gold)' }}
                  >
                    MỤC LỤC ({chapters.length})
                  </p>
                  <button
                    onClick={() => setTocOpen(false)}
                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    value={tocSearch}
                    onChange={(e) => setTocSearch(e.target.value)}
                    placeholder="Tìm số hoặc tên chương..."
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-gold)] font-ui"
                  />
                </div>

                <ul className="space-y-1">
                  {filteredTocChapters.map((ch) => (
                    <li key={ch.id}>
                      <Link
                        to={`/novels/${novel.slug}/chapters/${ch.number}`}
                        onClick={() => setTocOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                        style={{
                          background: ch.number === chapter.number ? 'var(--color-bg-raised)' : 'transparent',
                          borderLeft: ch.number === chapter.number ? '2px solid var(--color-accent-gold)' : '2px solid transparent',
                          color: ch.number === chapter.number ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          fontFamily: 'var(--font-ui)',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', color: 'var(--color-accent-gold)', minWidth: '28px' }}>
                          #{ch.number}
                        </span>
                        <span className="line-clamp-2 leading-snug">{ch.title}</span>
                        {ch.is_premium && (
                          <span className="ml-auto text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--color-accent-gold)', fontFamily: 'var(--font-display)', fontSize: '8px', letterSpacing: '1px' }}>
                            VIP
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                  {filteredTocChapters.length === 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">
                      Không tìm thấy chương nào
                    </p>
                  )}
                </ul>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Inline Comments Drawer */}
      <CommentDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chapterId={chapter.id}
        paragraphIndex={selectedParagraphIndex}
        paragraphText={selectedParagraphText}
        onCommentCountChange={fetchSummary}
      />
    </div>
  )
}
