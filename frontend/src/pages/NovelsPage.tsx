import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageWrapper, NovelCard } from '@/components/novel/NovelCard'
import { novelsApi } from '@/api'
import { Search, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

const GENRES = ['Kiếm Hiệp', 'Huyền Huyễn', 'Ngôn Tình', 'Tiên Hiệp', 'Đô Thị', 'Hệ Thống', 'Khoa Huyễn']

export default function NovelsPage() {
  const [page, setPage] = useState(1)
  const [genre, setGenre] = useState('')
  const [q, setQ] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['novels', page, genre, q],
    queryFn: () => novelsApi.list({ page, genre, q }),
  })

  return (
    <PageWrapper className="min-h-screen px-6 py-24 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
        <Link to="/" className="flex items-center gap-1 hover:text-[var(--color-accent-gold)] transition-colors">
          <Home size={13} className="text-[var(--color-accent-gold)]" />
          <span>Trang Chủ</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)] font-medium">Kho Truyện</span>
      </div>

      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', fontWeight: 300, color: 'var(--color-text-primary)', marginBottom: '2rem' }}>
        Kho Truyện
      </h1>

      {/* Search & Filter */}
      <div className="flex gap-4 flex-wrap mb-8">
        <div className="relative flex-1 min-w-60">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm kiếm truyện..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => { setGenre(genre === g ? '' : g); setPage(1) }}
              className="px-3 py-2 rounded-full text-xs transition-all"
              style={{
                background: genre === g ? 'var(--color-accent-gold)' : 'var(--color-bg-surface)',
                color: genre === g ? '#000' : 'var(--color-text-secondary)',
                border: '1px solid ' + (genre === g ? 'transparent' : 'var(--color-border-subtle)'),
                fontFamily: 'var(--font-ui)',
                fontWeight: genre === g ? 600 : 400,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {isLoading
          ? Array(12).fill(null).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="rounded-sm" style={{ aspectRatio: '2/3', background: 'var(--color-bg-surface)' }} />
              </div>
            ))
          : data?.items.map((novel) => <NovelCard key={novel.id} {...novel} />)
        }
      </div>
    </PageWrapper>
  )
}