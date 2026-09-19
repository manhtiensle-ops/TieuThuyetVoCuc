import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Settings, List, Sun, Moon, BookOpen } from 'lucide-react'
import { useReaderStore, useUIStore } from '@/stores'
import { cn, normalizeNFC } from '@/lib/utils'
import type { Chapter, ChapterMeta } from '@/types'

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
}: {
  novel: { slug: string; title: string }
  chapter: Chapter
  chapters: ChapterMeta[]
  onTocOpen: () => void
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
    { key: 'sepia' as const, icon: BookOpen, label: 'Sepia' },
    { key: 'oled' as const, icon: Sun, label: 'OLED' },
  ]

  return (
    <>
      {/* Top bar */}
      <motion.header
        animate={{ y: readerControlsVisible ? 0 : -80 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed top-0.5 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(to bottom, var(--color-bg-deep), transparent)',
        }}
      >
        <Link
          to={`/novels/${novel.slug}`}
          className="flex items-center gap-2 link-ink"
          style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '1.5px', color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft size={14} />
          {novel.title}
        </Link>

        <span
          style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', color: 'var(--color-text-primary)' }}
        >
          Chương {chapter.number}: {chapter.title}
        </span>

        <div className="flex items-center gap-3">
          <button onClick={onTocOpen} className="reader-icon-btn" aria-label="Mục lục">
            <List size={18} />
          </button>
          <button onClick={() => setSettingsOpen((p) => !p)} className="reader-icon-btn" aria-label="Cài đặt đọc">
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
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-4 py-4 px-6"
        style={{ background: 'linear-gradient(to top, var(--color-bg-deep), transparent)' }}
      >
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
  const contentRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)

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
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

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
      />

      {/* Main content */}
      <main
        ref={contentRef}
        className="px-4 pb-32"
        style={{ paddingTop: '100px' }}
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
          dangerouslySetInnerHTML={{ __html: normalizeNFC(chapter.content) }}
        />

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
                <p
                  style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px', color: 'var(--color-accent-gold)', marginBottom: '16px' }}
                >
                  MỤC LỤC
                </p>
                <ul className="space-y-1">
                  {chapters.map((ch) => (
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
                          {ch.number}
                        </span>
                        <span className="line-clamp-1">{ch.title}</span>
                        {ch.is_premium && (
                          <span className="ml-auto text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--color-accent-gold)', fontFamily: 'var(--font-display)', fontSize: '8px', letterSpacing: '1px' }}>
                            VIP
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
