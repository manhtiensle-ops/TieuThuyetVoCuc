import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PageWrapper } from '@/components/novel/NovelCard'
import { novelsApi } from '@/api'
import { BookOpen, Eye, Star } from 'lucide-react'
import { formatCount } from '@/lib/utils'

export default function NovelPage() {
  const { slug } = useParams<{ slug: string }>()

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

  if (isLoading) return <div className="min-h-screen" style={{ background: 'var(--color-bg-deep)' }} />

  if (!novel) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-bg-deep)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
      Không tìm thấy truyện.
    </div>
  )

  return (
    <PageWrapper className="min-h-screen" style={{ background: 'var(--color-bg-deep)' }}>
      {/* Hero banner */}
      <div className="relative overflow-hidden" style={{ height: '380px' }}>
        {novel.cover_url && (
          <img src={novel.cover_url} alt="" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 20%, var(--color-bg-deep))' }} />
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-8 flex gap-8 items-end max-w-5xl mx-auto">
          {/* Cover */}
          <div className="hidden md:block flex-shrink-0 rounded shadow-2xl overflow-hidden" style={{ width: '130px', aspectRatio: '2/3' }}>
            {novel.cover_url
              ? <img src={novel.cover_url} alt={novel.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ background: 'var(--color-bg-surface)' }} />
            }
          </div>
          <div className="flex-1 pb-2">
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px', color: 'var(--color-accent-gold)', marginBottom: '8px' }}>
              {novel.genres.join(' · ')}
            </p>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, color: 'var(--color-text-primary)', lineHeight: 1.2, marginBottom: '8px' }}>
              {novel.title}
            </h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              Tác giả: <strong style={{ color: 'var(--color-text-primary)' }}>{novel.author}</strong>
            </p>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <Eye size={13} /> {formatCount(novel.views)}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <Star size={13} style={{ color: 'var(--color-accent-gold)' }} /> {novel.rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <BookOpen size={13} /> {novel.total_chapters} chương
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Read button */}
        {chapters.length > 0 && (
          <Link
            to={`/novels/${slug}/chapters/1`}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full mb-10 font-semibold transition-all hover:scale-105"
            style={{ background: 'var(--color-accent-gold)', color: '#000', fontFamily: 'var(--font-ui)', fontSize: '15px' }}
          >
            <BookOpen size={16} />
            Đọc Chương 1
          </Link>
        )}

        {/* Description */}
        <div className="mb-12">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: 'var(--color-accent-gold)', marginBottom: '12px' }}>
            GIỚI THIỆU
          </h2>
          <p className="reading-prose" style={{ maxWidth: 'none', fontSize: '16px', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
            {novel.description}
          </p>
        </div>

        {/* Chapter list */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: 'var(--color-accent-gold)', marginBottom: '16px' }}>
            DANH SÁCH CHƯƠNG ({chapters.length})
          </h2>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {chapters.map((ch) => (
              <Link
                key={ch.id}
                to={`/novels/${slug}/chapters/${ch.number}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:scale-[1.01]"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', color: 'var(--color-accent-gold)', minWidth: '32px' }}>
                  {ch.number}
                </span>
                <span className="flex-1 line-clamp-1" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  {ch.title}
                </span>
                {ch.is_premium && (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '7px', letterSpacing: '1px', color: 'var(--color-accent-gold)', background: 'rgba(201,168,76,0.1)', padding: '2px 6px', borderRadius: '4px' }}>VIP</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}