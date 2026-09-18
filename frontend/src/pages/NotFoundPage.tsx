import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--color-bg-deep)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '4px', color: 'var(--color-accent-gold)', marginBottom: '16px' }}>
          LỖI 404
        </p>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(4rem, 10vw, 8rem)', fontWeight: 300, color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '24px' }}>
          Trang Chưa Viết
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
          Trang này chưa tồn tại — như chương truyện bị xé mất.
        </p>
        <Link to="/"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all hover:scale-105"
          style={{ background: 'var(--color-accent-gold)', color: '#000', fontFamily: 'var(--font-ui)' }}>
          Về Trang Chủ
        </Link>
      </motion.div>
    </div>
  )
}