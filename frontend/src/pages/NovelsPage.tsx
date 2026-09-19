import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageWrapper, NovelCard } from '@/components/novel/NovelCard'
import { novelsApi } from '@/api'
import { Search, Home, Tag, BookOpen, X, Sparkles, Filter } from 'lucide-react'

export default function NovelsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [page, setPage] = useState(1)
  const qParam = searchParams.get('q') || ''
  const genreParam = searchParams.get('genre') || ''
  const tagParam = searchParams.get('tag') || ''

  const [searchQuery, setSearchQuery] = useState(qParam)

  // Sync state if URL changes
  useEffect(() => {
    setSearchQuery(qParam)
  }, [qParam])

  // Fetch taxonomy (genres and user tags)
  const { data: taxonomy } = useQuery({
    queryKey: ['taxonomy'],
    queryFn: () => novelsApi.getTaxonomy(),
  })

  // Fetch novels based on filters
  const { data, isLoading } = useQuery({
    queryKey: ['novels', page, genreParam, tagParam, qParam],
    queryFn: () =>
      novelsApi.list({
        page,
        per_page: 24,
        genre: genreParam || undefined,
        tag: tagParam || undefined,
        q: qParam || undefined,
      }),
  })

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
    setPage(1)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParam('q', searchQuery.trim())
  }

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams())
    setSearchQuery('')
    setPage(1)
  }

  const hasActiveFilters = Boolean(genreParam || tagParam || qParam)

  return (
    <PageWrapper className="min-h-screen px-4 sm:px-6 py-24 max-w-7xl mx-auto font-ui">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="flex items-center gap-1 hover:text-[var(--color-accent-gold)] transition-colors">
          <Home size={13} className="text-[var(--color-accent-gold)]" />
          <span>Trang Chủ</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)] font-medium">Kho Truyện</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-display tracking-[0.2em] text-[var(--color-accent-gold)] uppercase font-semibold">
            THƯ VIỆN ĐA THỂ LOẠI
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-light text-[var(--color-text-primary)] mt-1">
            Kho Tàng Tiểu Thuyết
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Khám phá hàng ngàn tác phẩm chọn lọc, phân loại thông minh theo thể loại và nhãn dán cộng đồng.
          </p>
        </div>

        <Link
          to="/create-novel"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[var(--color-accent-gold)] text-black hover:opacity-90 transition-all self-start md:self-auto shadow-md"
        >
          <Sparkles size={14} />
          <span>+ Đăng Truyện Mới</span>
        </Link>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-4 mb-8">
        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="text"
            placeholder="Tìm theo tên truyện, tên tác giả hoặc nội dung tóm tắt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-24 py-3 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent-gold)] transition-all shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-[var(--color-accent-gold)] text-black font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            Tìm Kiếm
          </button>
        </form>

        {/* Genres Filter Bar */}
        <div className="p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
              <BookOpen size={14} className="text-[var(--color-accent-gold)]" />
              THỂ LOẠI CHÍNH
            </span>
            {genreParam && (
              <button
                onClick={() => updateParam('genre', '')}
                className="text-[11px] text-[var(--color-accent-gold)] hover:underline flex items-center gap-1"
              >
                <X size={12} /> Bỏ chọn thể loại
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateParam('genre', '')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !genreParam
                  ? 'bg-[var(--color-accent-gold)] text-black font-bold shadow-sm'
                  : 'bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Tất Cả
            </button>
            {taxonomy?.genres.map((g) => {
              const isSelected = genreParam === g.name
              return (
                <button
                  key={g.name}
                  onClick={() => updateParam('genre', isSelected ? '' : g.name)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[var(--color-accent-gold)] text-black font-bold shadow-sm'
                      : 'bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span>{g.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-black/20 text-black' : 'bg-[var(--color-bg-raised)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {g.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* User Custom Tags Cloud */}
          {taxonomy?.tags && taxonomy.tags.length > 0 && (
            <div className="pt-3 border-t border-[var(--color-border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <Tag size={14} className="text-[var(--color-accent-amber)]" />
                  NHÃN DÁN ĐỘC GIẢ (TAGS)
                </span>
                {tagParam && (
                  <button
                    onClick={() => updateParam('tag', '')}
                    className="text-[11px] text-[var(--color-accent-amber)] hover:underline flex items-center gap-1"
                  >
                    <X size={12} /> Bỏ chọn nhãn
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {taxonomy.tags.map((t) => {
                  const isSelected = tagParam === t.name
                  return (
                    <button
                      key={t.name}
                      onClick={() => updateParam('tag', isSelected ? '' : t.name)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                        isSelected
                          ? 'bg-[var(--color-accent-amber)] text-black font-bold shadow-sm'
                          : 'bg-[var(--color-bg-deep)]/70 border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)] hover:border-[var(--color-accent-gold)]/40'
                      }`}
                    >
                      <span>#{t.name}</span>
                      <span
                        className={`text-[9px] px-1 rounded-sm ${
                          isSelected ? 'bg-black/20 text-black' : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-text-secondary)] py-1">
            <span className="flex items-center gap-1 font-medium">
              <Filter size={13} className="text-[var(--color-accent-gold)]" />
              Đang lọc:
            </span>
            {qParam && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
                Từ khóa: "{qParam}"
                <button onClick={() => updateParam('q', '')} className="hover:text-red-400">
                  <X size={11} />
                </button>
              </span>
            )}
            {genreParam && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-accent-gold)]/15 border border-[var(--color-accent-gold)]/40 text-[var(--color-accent-gold)] font-medium">
                Thể loại: {genreParam}
                <button onClick={() => updateParam('genre', '')} className="hover:text-red-400">
                  <X size={11} />
                </button>
              </span>
            )}
            {tagParam && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-accent-amber)]/15 border border-[var(--color-accent-amber)]/40 text-[var(--color-accent-amber)] font-medium">
                Nhãn: #{tagParam}
                <button onClick={() => updateParam('tag', '')} className="hover:text-red-400">
                  <X size={11} />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-red-400 hover:underline ml-2 font-medium"
            >
              [Xóa Tất Cả Lọc]
            </button>
          </div>
        )}
      </div>

      {/* Novel Count */}
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-4 px-1">
        <span>
          Tìm thấy <strong className="text-[var(--color-text-primary)]">{data?.total || 0}</strong> tác phẩm
        </span>
        {data && data.total_pages > 1 && (
          <span>
            Trang {data.page} / {data.total_pages}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isLoading
          ? Array(12)
              .fill(null)
              .map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div
                    className="rounded-sm"
                    style={{ aspectRatio: '2/3', background: 'var(--color-bg-surface)' }}
                  />
                  <div className="h-4 bg-[var(--color-bg-surface)] rounded mt-2" />
                  <div className="h-3 bg-[var(--color-bg-surface)] rounded mt-1 w-2/3" />
                </div>
              ))
          : data?.items.map((novel) => (
              <NovelCard
                key={novel.id}
                id={novel.id}
                title={novel.title}
                author={novel.author}
                cover_url={novel.cover_url}
                slug={novel.slug}
                status={novel.status}
                total_chapters={novel.total_chapters}
                views={novel.views}
                tags={novel.tags}
              />
            ))}
      </div>

      {/* Empty State */}
      {!isLoading && data?.items.length === 0 && (
        <div className="text-center py-20 bg-[var(--color-bg-surface)]/50 rounded-2xl border border-[var(--color-border-subtle)] p-8">
          <BookOpen size={48} className="mx-auto text-[var(--color-text-muted)] opacity-40 mb-3" />
          <h3 className="text-base font-display font-medium text-[var(--color-text-primary)]">
            Không tìm thấy truyện phù hợp
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4">
            Thử thay đổi từ khóa tìm kiếm, thể loại hoặc xóa các nhãn dán đang chọn.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[var(--color-accent-gold)] text-black"
            >
              Xóa Bộ Lọc & Xem Tất Cả
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] disabled:opacity-40"
          >
            Trang Trước
          </button>
          <span className="text-xs text-[var(--color-text-muted)] px-3">
            Trang {data.page} / {data.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page === data.total_pages}
            className="px-4 py-2 rounded-lg text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] disabled:opacity-40"
          >
            Trang Sau
          </button>
        </div>
      )}
    </PageWrapper>
  )
}
