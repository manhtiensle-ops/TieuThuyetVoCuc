import { useState, useEffect, useRef } from 'react'
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
  Check,
  Palette,
  ChevronDown,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore, useReaderStore } from '@/stores'
import { cn } from '@/lib/utils'
import type { Theme } from '@/types'

const THEMES: Array<{
  id: Theme
  name: string
  desc: string
  icon: LucideIcon
  previewBg: string
  previewBorder: string
  previewText: string
}> = [
  {
    id: 'dark',
    name: 'Giao diện Tối',
    desc: 'Academia Arcana huyền bí',
    icon: Moon,
    previewBg: '#0D0F1A',
    previewBorder: '#C9A84C',
    previewText: '#E8E0D0',
  },
  {
    id: 'light',
    name: 'Giao diện Sáng',
    desc: 'Trang giấy trắng, thanh lịch',
    icon: Sun,
    previewBg: '#F8FAFC',
    previewBorder: '#94A3B8',
    previewText: '#0F172A',
  },
  {
    id: 'sepia',
    name: 'Giấy Vàng (Sepia)',
    desc: 'Cổ điển, dịu mắt chống mỏi',
    icon: BookOpen,
    previewBg: '#FAF4E6',
    previewBorder: '#8B4513',
    previewText: '#2D1C12',
  },
  {
    id: 'oled',
    name: 'Đen Tuyền (OLED)',
    desc: 'Tắt pixel đen, tiết kiệm pin',
    icon: Sparkles,
    previewBg: '#000000',
    previewBorder: '#C9A84C',
    previewText: '#D8CCA8',
  },
]

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { theme, setTheme } = useReaderStore()

  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const themeMenuRef = useRef<HTMLDivElement>(null)

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setThemeDropdownOpen(false)
  }, [location.pathname])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/novels?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  const currentThemeInfo = THEMES.find((t) => t.id === theme) || THEMES[0]
  const CurrentThemeIcon = currentThemeInfo.icon

  const navLinks = [
    { name: 'Trang Chủ', path: '/', icon: Home },
    { name: 'Kho Truyện', path: '/novels', icon: BookOpen },
    ...(isAuthenticated ? [{ name: 'Đăng Truyện', path: '/create-novel', icon: Plus }] : []),
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
          {/* Theme Selector Popover */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setThemeDropdownOpen((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] text-[var(--color-text-primary)] transition-all"
              title={`Đang dùng: ${currentThemeInfo.name}`}
              aria-label="Chọn giao diện"
            >
              <div
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center border shadow-inner flex-shrink-0"
                style={{
                  backgroundColor: currentThemeInfo.previewBg,
                  borderColor: currentThemeInfo.previewBorder,
                }}
              >
                <CurrentThemeIcon size={9} style={{ color: currentThemeInfo.previewBorder }} />
              </div>
              <span className="hidden sm:inline font-medium text-[11px] font-ui">
                {currentThemeInfo.name.split(' ')[0]}
              </span>
              <ChevronDown size={11} className="text-[var(--color-text-muted)]" />
            </button>

            {/* Theme Dropdown Menu */}
            <AnimatePresence>
              {themeDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-medium)] shadow-2xl z-50 font-ui"
                >
                  <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] flex items-center gap-1.5 text-[var(--color-accent-gold)]">
                    <Palette size={13} />
                    <span className="text-[10px] font-display font-semibold tracking-wider">
                      CHỦ ĐỀ GIAO DIỆN
                    </span>
                  </div>

                  <div className="p-1 space-y-1 mt-1">
                    {THEMES.map((item) => {
                      const Icon = item.icon
                      const isSelected = theme === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setTheme(item.id)
                            setThemeDropdownOpen(false)
                          }}
                          className={cn(
                            'w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all',
                            isSelected
                              ? 'bg-[var(--color-bg-raised)] ring-1 ring-[var(--color-accent-gold)]'
                              : 'hover:bg-[var(--color-bg-raised)]/60',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center border shadow-inner flex-shrink-0"
                              style={{
                                backgroundColor: item.previewBg,
                                borderColor: item.previewBorder,
                              }}
                            >
                              <Icon size={14} style={{ color: item.previewBorder }} />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[var(--color-text-primary)] leading-snug">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">
                                {item.desc}
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <Check size={14} className="text-[var(--color-accent-gold)] flex-shrink-0 ml-2" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Auth Info */}
          {isAuthenticated && user ? (
            <div className="hidden sm:flex items-center gap-2">
              {(user.role === 'admin' || user.role === 'editor') && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-accent-gold)]/15 border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold)] hover:text-black transition-all"
                  title="Vào Trang Quản Trị"
                >
                  <Shield size={12} />
                  <span>Admin</span>
                </Link>
              )}
              <Link
                to={`/profile/${user.username}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-[var(--color-accent-gold)]/20 border border-[var(--color-accent-gold)] flex items-center justify-center text-[10px] font-bold text-[var(--color-accent-gold)]">
                  {user.display_name[0]}
                </div>
                <span className="text-xs text-[var(--color-text-primary)] max-w-[100px] truncate" style={{ fontFamily: 'var(--font-ui)' }}>
                  {user.display_name}
                </span>
              </Link>
              <button
                onClick={logout}
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent-amber)] transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-full text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Đăng Nhập
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
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
            className="md:hidden bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)] px-6 py-5 flex flex-col gap-4 overflow-hidden font-ui"
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

            <nav className="flex flex-col gap-1.5">
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
              {isAuthenticated && (
                <Link
                  to="/create-novel"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-accent-gold)] hover:bg-[var(--color-bg-raised)]"
                >
                  <Plus size={16} />
                  + Đăng Truyện Mới
                </Link>
              )}
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

            {/* Mobile Theme Selector */}
            <div className="pt-3 border-t border-[var(--color-border-subtle)]">
              <p className="text-[10px] font-display text-[var(--color-accent-gold)] mb-2 font-semibold tracking-wider">
                CHỌN GIAO DIỆN
              </p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((item) => {
                  const Icon = item.icon
                  const isSelected = theme === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setTheme(item.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all',
                        isSelected
                          ? 'border-[var(--color-accent-gold)] bg-[var(--color-bg-raised)] text-[var(--color-accent-gold)]'
                          : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-deep)] text-[var(--color-text-secondary)]',
                      )}
                    >
                      <Icon size={14} />
                      <span className="truncate">{item.name.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

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
