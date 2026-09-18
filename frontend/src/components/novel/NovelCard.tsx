import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'

const HeroScene = lazy(() =>
  import('@/components/three/HeroScene').then((m) => ({ default: m.HeroScene }))
)

// Page transition variants — lật sách
const pageVariants = {
  initial: { opacity: 0, rotateY: -6, transformPerspective: 1200 },
  animate: { opacity: 1, rotateY: 0 },
  exit:    { opacity: 0, rotateY: 6 },
}
const pageTransition = { type: 'spring', stiffness: 220, damping: 28 }

interface PageWrapperProps { children: React.ReactNode; className?: string }
export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={cn('min-h-screen', className)}
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
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>

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

// ── Novel Card ─────────────────────────────────────────────────────────────────
interface NovelCardProps {
  title: string
  author: string
  cover_url: string | null
  slug: string
  status: 'ongoing' | 'completed' | 'hiatus'
  total_chapters: number
  views: number
}

const statusLabel = { ongoing: 'Đang Ra', completed: 'Hoàn', hiatus: 'Tạm Ngưng' }
const statusColor  = { ongoing: '#34d399', completed: '#C9A84C', hiatus: '#94a3b8' }

export function NovelCard({ title, author, cover_url, slug, status, total_chapters, views }: NovelCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative group cursor-pointer"
      style={{ perspective: '800px' }}
    >
      <Link to={`/novels/${slug}`} className="block">
        {/* Book cover — 2:3 ratio */}
        <div
          className="relative overflow-hidden rounded-sm"
          style={{ aspectRatio: '2/3', boxShadow: '4px 8px 24px rgba(0,0,0,0.5), -2px 0 8px rgba(0,0,0,0.3)' }}
        >
          {cover_url ? (
            <img
              src={cover_url}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-end p-4"
              style={{
                background: 'linear-gradient(160deg, #1A2C4A 0%, #0D0F1A 50%, #2C1A4A 100%)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.1rem',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.3,
                }}
              >
                {title}
              </span>
            </div>
          )}

          {/* Spine shadow */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3 pointer-events-none"
            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)' }}
          />

          {/* Status ribbon */}
          <div
            className="absolute top-2 right-0 px-2 py-0.5 text-xs font-semibold"
            style={{
              background: statusColor[status],
              color: '#000',
              fontFamily: 'var(--font-display)',
              fontSize: '8px',
              letterSpacing: '1px',
              borderRadius: '2px 0 0 2px',
            }}
          >
            {statusLabel[status]}
          </div>

          {/* Gold overlay on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(201,168,76,0.15), transparent 60%)' }}
          />
        </div>

        {/* Meta */}
        <div className="mt-3 px-0.5">
          <h3
            className="line-clamp-2 mb-1"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1rem',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {author} · {total_chapters} chương
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
