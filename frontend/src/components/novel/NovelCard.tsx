import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const HeroScene = lazy(() =>
  import('@/components/three/HeroScene').then((m) => ({ default: m.HeroScene }))
)

// Page transition variants — lật sách
const pageVariants = {
  initial: { opacity: 0, rotateY: -6, transformPerspective: 1200 },
  animate: { opacity: 1, rotateY: 0 },
  exit:    { opacity: 0, rotateY: 6 },
}
const pageTransition = { type: 'spring' as const, stiffness: 220, damping: 28 }

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}
export function PageWrapper({ children, className, style }: PageWrapperProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={cn('min-h-screen', className)}
      style={style}
    >
      {children}
    </motion.div>
  )
}

// ── Landing Hero ───────────────────────────────────────────────────────────────
export function LandingHero() {
  return (
    <section className="relative h-screen overflow-hidden flex items-center justify-center">
      {/* Three.js 3D scene */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      </ErrorBoundary>

      {/* Gradient vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, var(--color-bg-deep) 80%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--color-bg-deep))',
        }}
      />

      {/* Hero text */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm tracking-[0.25em] uppercase mb-6"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-accent-gold)',
          }}
        >
          Thư Viện Vô Cực
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="leading-tight mb-8"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            fontWeight: 300,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Nơi Mỗi Trang Sách
          <br />
          <em style={{ color: 'var(--color-accent-gold)', fontStyle: 'italic' }}>
            Là Một Thế Giới
          </em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="text-lg mb-10 max-w-xl mx-auto"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.7,
          }}
        >
          Hàng ngàn bộ truyện từ khắp mọi thể loại — kiếm hiệp, huyền huyễn, ngôn tình.
          Đọc không giới hạn, mọi thiết bị.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="flex gap-4 justify-center flex-wrap"
        >
          <Link to="/novels" className="btn-gold">
            Khám Phá Truyện
          </Link>
          <Link to="/register" className="btn-ghost">
            Tạo Tài Khoản
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '3px' }}>
          CUỘN XUỐNG
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-8"
          style={{ background: 'linear-gradient(to bottom, var(--color-accent-gold), transparent)' }}
        />
      </motion.div>
    </section>
  )
}

import { BookCover } from './BookCover'

export { BookCover }

// ── Novel Card ─────────────────────────────────────────────────────────────────
interface NovelCardProps {
  id?: number
  title: string
  author: string
  cover_url: string | null
  slug: string
  status: 'ongoing' | 'completed' | 'hiatus'
  total_chapters: number
  views: number
  tags?: string[]
}

export function NovelCard({ title, author, cover_url, slug, status, total_chapters, views, tags }: NovelCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="relative group cursor-pointer flex flex-col h-full"
      style={{ perspective: '800px' }}
    >
      <Link to={`/novels/${slug}`} className="flex flex-col h-full">
        {/* Book cover — 2:3 ratio with dynamic fallback and 3D spine */}
        <BookCover
          title={title}
          author={author}
          coverUrl={cover_url}
          genres={tags}
          status={status}
          aspectRatio="2/3"
          size="md"
          showBadge={true}
          showSpine={true}
        />

        {/* Standardized Meta with Fixed Baseline Alignment */}
        <div className="mt-2.5 px-0.5 flex flex-col flex-1 justify-between">
          {/* Title: fixed 2-line height box (height: 2.7em) so every single card aligns perfectly */}
          <h3
            className="font-heading font-semibold text-[13.5px] sm:text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] transition-colors duration-200"
            title={title}
            style={{
              height: '2.7em',
              lineHeight: '1.35em',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </h3>

          <div className="mt-1">
            {/* Author & Chapter count */}
            <p
              className="truncate text-[11px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              {author} · {total_chapters} chương
            </p>

            {/* Tags row: Fixed height container (h-5) so card footers are always 100% aligned */}
            <div className="h-5 flex items-center gap-1 overflow-hidden mt-1">
              {tags && tags.length > 0 ? (
                tags.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-accent-gold)] truncate max-w-[85px]"
                  >
                    #{t}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-transparent select-none opacity-0">•</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
