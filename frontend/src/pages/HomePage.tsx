import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LandingHero, NovelCard, PageWrapper } from '@/components/novel/NovelCard'
import { novelsApi } from '@/api'
import { BookOpen, Flame, Star } from 'lucide-react'

export default function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ['novels', 'featured'],
    queryFn: novelsApi.getFeatured,
  })
  const { data: hot } = useQuery({
    queryKey: ['novels', 'hot'],
    queryFn: novelsApi.getHot,
  })

  return (
    <PageWrapper>
      <LandingHero />

      {/* Hot Novels Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <Flame size={18} style={{ color: 'var(--color-accent-amber)' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 400, color: 'var(--color-text-primary)' }}>
            Đang Hot
          </h2>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border-subtle)' }} />
          <Link to="/novels" className="link-ink" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Xem tất cả →
          </Link>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {(hot ?? Array(8).fill(null)).map((novel, i) => (
            novel ? (
              <NovelCard key={novel.id} {...novel} />
            ) : (
              <div key={i} className="animate-pulse">
                <div className="rounded-sm" style={{ aspectRatio: '2/3', background: 'var(--color-bg-surface)' }} />
                <div className="mt-3 h-4 rounded" style={{ background: 'var(--color-bg-surface)' }} />
              </div>
            )
          ))}
        </div>
      </section>

      {/* Featured Section */}
      {featured && featured.length > 0 && (
        <section className="py-20 px-6" style={{ background: 'var(--color-bg-surface)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-10">
              <Star size={18} style={{ color: 'var(--color-accent-gold)' }} />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 400, color: 'var(--color-text-primary)' }}>
                Truyện Nổi Bật
              </h2>
            </div>
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {featured.map((novel) => <NovelCard key={novel.id} {...novel} />)}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 px-6 text-center" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '3px', color: 'var(--color-text-muted)' }}>
          © 2026 NOVEL PLATFORM · THƯ VIỆN VÔ CỰC
        </p>
      </footer>
    </PageWrapper>
  )
}