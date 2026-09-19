import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Home,
  Search,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
  Sun,
  Moon,
  Shield,
} from 'lucide-react'
import { useAuthStore, useReaderStore } from '@/stores'
import { cn } from '@/lib/utils'

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { theme, setTheme } = useReaderStore()

  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/novels?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('sepia')
    else if (theme === 'sepia') setTheme('oled')
    else setTheme('dark')
  }

  const navLinks = [
    { name: 'Trang Chủ', path: '/', icon: Home },
    { name: 'Kho Truyện', path: '/novels', icon: BookOpen },
    ...(isAuthenticated && (user?.role === 'admin' || user?.role === 'editor')
      ? [{ name: 'Quản Trị', path: '/admin', icon: Shield }]
      : []),
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[var(--color-bg-deep)]/90 backdrop-blur-md border-b border-[var(--color-border-subtle)] shadow-lg'
          : 'bg-gradient-to-b from-[var(--color-bg-deep)]/80 to-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo - Click returns to Home */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group flex-shrink-0"
          title="Về Trang Chủ"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.2) 0%, rgba(217,119,6,0.1) 100%)',
              border: '1px solid var(--color-border-medium)',
            }}
          >
            <Sparkles size={18} style={{ color: 'var(--color-accent-gold)' }} />
          </div>
          <div className="flex flex-col">
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                letterSpacing: '2.5px',
                color: 'var(--color-accent-gold)',
                lineHeight: 1.1,
              }}
              className="font-semibold"
            >
              THƯ VIỆN VÔ CỰC
            </span>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.1,
              }}
            >
              Novel Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all',
                  isActive
                    ? 'bg-[var(--color-bg-surface)] text-[var(--color-accent-gold)] border border-[var(--color-border-subtle)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]/50',
                )}
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                <Icon size={14} />
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 text-[var(--color-text-muted)] pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên truyện, tác giả..."
            className="w-full pl-9 pr-3 py-1.5 rounded-full text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors"
            style={{ fontFamily: 'var(--font-ui)' }}
          />
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all"
            title={`Đổi giao diện (Hiện tại: ${theme.toUpperCase()})`}
            aria-label="Đổi giao diện"
          >
            {theme === 'dark' ? (
              <Moon size={16} />
            ) : theme === 'sepia' ? (
              <BookOpen size={16} />
            ) : (
              <Sun size={16} />
            )}
          </button>

          {/* User Auth Info */}
          {isAuthenticated && user ? (
            <div className="hidden sm:flex items-center gap-3">
              {(user.role === 'admin' || user.role === 'editor') && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-accent-gold)]/15 border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold)] hover:text-black transition-all"
                  title="Vào Trang Quản Trị"
                >
                  <Shield size={13} />
                  <span>Admin</span>
                </Link>
              )}
              <Link
                to={`/profile/${user.username}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--color-accent-gold)]/20 border border-[var(--color-accent-gold)] flex items-center justify-center text-[10px] font-bold text-[var(--color-accent-gold)]">
                  {user.display_name[0]}
                </div>
                <span className="text-xs text-[var(--color-text-primary)] max-w-[100px] truncate" style={{ fontFamily: 'var(--font-ui)' }}>
                  {user.display_name}
                </span>
              </Link>
              <button
                onClick={logout}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent-amber)] transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Đăng Nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
                style={{
                  background: 'var(--color-accent-gold)',
                  color: '#000',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Đăng Ký
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="md:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)] px-6 py-5 flex flex-col gap-4 overflow-hidden"
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên truyện, tác giả..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)]"
              />
            </form>

            <nav className="flex flex-col gap-2">
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)]"
              >
                <Home size={16} className="text-[var(--color-accent-gold)]" />
                Trang Chủ
              </Link>
              <Link
                to="/novels"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)]"
              >
                <BookOpen size={16} className="text-[var(--color-accent-gold)]" />
                Kho Truyện
              </Link>
              {isAuthenticated && (user?.role === 'admin' || user?.role === 'editor') && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-accent-gold)] hover:bg-[var(--color-bg-raised)]"
                >
                  <Shield size={16} />
                  Quản Trị CMS
                </Link>
              )}
            </nav>

            <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between w-full">
                  <Link to={`/profile/${user.username}`} className="flex items-center gap-2">
                    <User size={16} className="text-[var(--color-accent-gold)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{user.display_name}</span>
                  </Link>
                  <button onClick={logout} className="text-xs text-[var(--color-accent-amber)] flex items-center gap-1">
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <Link
                    to="/login"
                    className="flex-1 text-center py-2 rounded-lg text-sm border border-[var(--color-border-subtle)] text-[var(--color-text-primary)]"
                  >
                    Đăng Nhập
                  </Link>
                  <Link
                    to="/register"
                    className="flex-1 text-center py-2 rounded-lg text-sm font-semibold bg-[var(--color-accent-gold)] text-black"
                  >
                    Đăng Ký
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
