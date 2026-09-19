import { Link } from 'react-router-dom'
import { ArrowUp, Sparkles, Heart } from 'lucide-react'

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const genres = ['Kiếm Hiệp', 'Huyền Huyễn', 'Tiên Hiệp', 'Ngôn Tình', 'Hệ Thống', 'Đô Thị']

  return (
    <footer
      className="mt-auto border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-deep)] text-[var(--color-text-secondary)]"
    >
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(201,168,76,0.15)',
                  border: '1px solid var(--color-border-medium)',
                }}
              >
                <Sparkles size={16} style={{ color: 'var(--color-accent-gold)' }} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  letterSpacing: '2.5px',
                  color: 'var(--color-accent-gold)',
                }}
                className="font-semibold"
              >
                THƯ VIỆN VÔ CỰC
              </span>
            </Link>
            <p
              className="text-sm max-w-sm"
              style={{ fontFamily: 'var(--font-body)', lineHeight: 1.7 }}
            >
              Nền tảng đọc tiểu thuyết trực tuyến cao cấp, tối ưu hóa trải nghiệm thị giác và typography tiếng Việt chuẩn mực.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '10px',
                letterSpacing: '2px',
                color: 'var(--color-accent-gold)',
                marginBottom: '14px',
              }}
            >
              ĐIỀU HƯỚNG
            </p>
            <ul className="flex flex-col gap-2 text-xs" style={{ fontFamily: 'var(--font-ui)' }}>
              <li>
                <Link to="/" className="hover:text-[var(--color-accent-gold)] transition-colors">
                  Trang Chủ
                </Link>
              </li>
              <li>
                <Link to="/novels" className="hover:text-[var(--color-accent-gold)] transition-colors">
                  Kho Truyện
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[var(--color-accent-gold)] transition-colors">
                  Đăng Nhập
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[var(--color-accent-gold)] transition-colors">
                  Đăng Ký
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Thể loại phổ biến */}
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '10px',
                letterSpacing: '2px',
                color: 'var(--color-accent-gold)',
                marginBottom: '14px',
              }}
            >
              THỂ LOẠI
            </p>
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <Link
                  key={g}
                  to={`/novels?genre=${encodeURIComponent(g)}`}
                  className="px-2.5 py-1 rounded text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)] transition-all"
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  {g}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="flex items-center gap-1.5 text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-ui)' }}>
            © 2026 Novel Platform. Thiết kế với <Heart size={12} className="text-red-500 fill-red-500 inline" /> cho độc giả Việt Nam.
          </p>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] text-[var(--color-text-primary)] transition-all"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span>Lên đầu trang</span>
            <ArrowUp size={12} />
          </button>
        </div>
      </div>
    </footer>
  )
}
