import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Sparkles, Flame, Compass, Feather, Swords, Shield, Eye } from 'lucide-react'

export interface BookCoverProps {
  title: string
  author?: string
  coverUrl?: string | null
  genres?: string[]
  status?: 'ongoing' | 'completed' | 'hiatus'
  className?: string
  aspectRatio?: string // default 2/3
  size?: 'sm' | 'md' | 'lg' | 'hero'
  showBadge?: boolean
  showSpine?: boolean
  priority?: boolean
}

const statusLabel = {
  ongoing: 'ĐANG RA',
  completed: 'HOÀN',
  hiatus: 'TẠM NGƯNG',
}

const statusBadgeClasses = {
  ongoing: 'bg-emerald-500/90 text-black border-emerald-400/40 shadow-emerald-950/40',
  completed: 'bg-amber-400/95 text-black border-amber-300/50 shadow-amber-950/40',
  hiatus: 'bg-slate-600/90 text-white border-slate-400/40 shadow-slate-950/40',
}

// ── Deterministic Visual Cover Themes ────────────────────────────────────────
interface CoverTheme {
  id: string
  bgGradient: string
  borderColor: string
  filigreeColor: string
  accentColor: string
  titleColor: string
  watermarkIcon: typeof BookOpen
  genreLabel: string
}

const COVER_THEMES: CoverTheme[] = [
  // 0: Celestial Jade / Tiên Hiệp, Huyền Huyễn
  {
    id: 'celestial-jade',
    bgGradient: 'linear-gradient(150deg, #0d2820 0%, #061510 50%, #020a07 100%)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
    filigreeColor: 'rgba(52, 211, 153, 0.65)',
    accentColor: '#34d399',
    titleColor: '#e6fffa',
    watermarkIcon: Sparkles,
    genreLabel: 'TIÊN ĐẠO · HUYỀN HUYỄN',
  },
  // 1: Cosmic Void / Khoa Huyễn, Dị Năng, Tận Thế
  {
    id: 'cosmic-void',
    bgGradient: 'linear-gradient(150deg, #0e1e38 0%, #081020 50%, #030610 100%)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    filigreeColor: 'rgba(129, 140, 248, 0.65)',
    accentColor: '#38bdf8',
    titleColor: '#f0f9ff',
    watermarkIcon: Compass,
    genreLabel: 'KHOA HUYỄN · DỊ NĂNG',
  },
  // 2: Imperial Crimson / Kiếm Hiệp, Trọng Sinh, Chiến Trận
  {
    id: 'imperial-crimson',
    bgGradient: 'linear-gradient(150deg, #380d14 0%, #1e0509 50%, #0c0204 100%)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    filigreeColor: 'rgba(217, 119, 6, 0.7)',
    accentColor: '#fbbf24',
    titleColor: '#fef3c7',
    watermarkIcon: Swords,
    genreLabel: 'KIẾM HIỆP · HUYẾT CHIẾN',
  },
  // 3: Arcane Amethyst / Ma Pháp, Huyền Bí, Hắc Ám
  {
    id: 'arcane-amethyst',
    bgGradient: 'linear-gradient(150deg, #2a0e44 0%, #150524 50%, #090212 100%)',
    borderColor: 'rgba(192, 132, 252, 0.35)',
    filigreeColor: 'rgba(232, 121, 249, 0.65)',
    accentColor: '#c084fc',
    titleColor: '#fae8ff',
    watermarkIcon: Eye,
    genreLabel: 'HUYỀN BÍ · HẮC ÁM',
  },
  // 4: Radiant Amber / Bá Đạo, Thần Thoại, Luyện Thể
  {
    id: 'radiant-amber',
    bgGradient: 'linear-gradient(150deg, #331e07 0%, #1c1003 50%, #0d0701 100%)',
    borderColor: 'rgba(201, 168, 76, 0.4)',
    filigreeColor: 'rgba(245, 158, 11, 0.75)',
    accentColor: '#C9A84C',
    titleColor: '#fffbeb',
    watermarkIcon: Flame,
    genreLabel: 'THẦN THOẠI · VÔ CỰC',
  },
  // 5: Obsidian Slate / Cổ Điển, Sử Thi, Đô Thị
  {
    id: 'obsidian-slate',
    bgGradient: 'linear-gradient(150deg, #1b2029 0%, #10131a 50%, #07080c 100%)',
    borderColor: 'rgba(203, 213, 225, 0.3)',
    filigreeColor: 'rgba(148, 163, 184, 0.6)',
    accentColor: '#cbd5e1',
    titleColor: '#f8fafc',
    watermarkIcon: BookOpen,
    genreLabel: 'THƯ VIỆN · VĂN ĐÀN',
  },
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function resolveCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  // Replace localhost:8000 with relative /uploads so Vite proxy or LAN works
  if (trimmed.startsWith('http://localhost:8000/')) {
    return trimmed.replace('http://localhost:8000', '')
  }
  return trimmed
}

export function BookCover({
  title,
  author,
  coverUrl,
  genres = [],
  status,
  className = '',
  aspectRatio = '2/3',
  size = 'md',
  showBadge = true,
  showSpine = true,
  priority = false,
}: BookCoverProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const resolvedUrl = useMemo(() => resolveCoverUrl(coverUrl), [coverUrl])

  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
  }, [resolvedUrl])

  // Select deterministic theme
  const theme = useMemo(() => {
    const genreStr = genres.join(' ').toLowerCase()
    if (genreStr.includes('khoa huyễn') || genreStr.includes('dị năng') || genreStr.includes('hệ thống')) {
      return COVER_THEMES[1]
    }
    if (genreStr.includes('kiếm hiệp') || genreStr.includes('luyện thể')) {
      return COVER_THEMES[2]
    }
    if (genreStr.includes('tiên hiệp') || genreStr.includes('huyền huyễn')) {
      return COVER_THEMES[0]
    }
    if (genreStr.includes('hắc ám') || genreStr.includes('linh dị') || genreStr.includes('ma pháp')) {
      return COVER_THEMES[3]
    }
    // Fallback hash
    const index = hashString(title + (author || '')) % COVER_THEMES.length
    return COVER_THEMES[index]
  }, [title, author, genres])

  const WatermarkIcon = theme.watermarkIcon

  const titleLength = title.length
  const titleFontSize =
    size === 'hero'
      ? 'clamp(1.4rem, 2.5vw, 2.2rem)'
      : size === 'lg'
      ? titleLength > 30
        ? '0.95rem'
        : '1.15rem'
      : titleLength > 30
      ? '0.8rem'
      : titleLength > 18
      ? '0.9rem'
      : '1.05rem'

  return (
    <div
      className={`relative overflow-hidden rounded-[3px] select-none ${className}`}
      style={{
        aspectRatio,
        boxShadow:
          '0 10px 25px -4px rgba(0, 0, 0, 0.65), 0 4px 10px -2px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* ── Dynamic Decorative Cover (Always present as fallback/backdrop) ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between p-3 sm:p-4 text-center overflow-hidden"
        style={{ background: theme.bgGradient }}
      >
        {/* Paper texture and lighting sheen */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.18) 0%, transparent 70%)',
          }}
        />

        {/* Vintage Filigree Double Border Frame */}
        <div
          className="absolute inset-2 sm:inset-2.5 rounded-[2px] pointer-events-none transition-colors duration-300"
          style={{
            border: `1px solid ${theme.borderColor}`,
          }}
        >
          {/* Inner hairline */}
          <div
            className="absolute inset-1 rounded-[1px] pointer-events-none"
            style={{
              border: `1px dashed ${theme.borderColor}`,
              opacity: 0.6,
            }}
          />

          {/* 4 Corner Ornamental Accents */}
          <span
            className="absolute -top-1.5 -left-1 text-[8px] sm:text-[9px] select-none"
            style={{ color: theme.accentColor }}
          >
            ✦
          </span>
          <span
            className="absolute -top-1.5 -right-1 text-[8px] sm:text-[9px] select-none"
            style={{ color: theme.accentColor }}
          >
            ✦
          </span>
          <span
            className="absolute -bottom-1.5 -left-1 text-[8px] sm:text-[9px] select-none"
            style={{ color: theme.accentColor }}
          >
            ✦
          </span>
          <span
            className="absolute -bottom-1.5 -right-1 text-[8px] sm:text-[9px] select-none"
            style={{ color: theme.accentColor }}
          >
            ✦
          </span>
        </div>

        {/* Center Watermark Emblem (Rich Background Depth) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <WatermarkIcon
            className="w-36 h-36 opacity-10 blur-[0.5px] transition-transform duration-700 group-hover:scale-110"
            style={{ color: theme.accentColor }}
          />
        </div>

        {/* Top Header Seal */}
        <div className="relative z-10 pt-1 flex flex-col items-center">
          <div
            className="flex items-center gap-1.5 opacity-80"
            style={{ color: theme.accentColor }}
          >
            <span className="w-3 h-px bg-current opacity-60" />
            <span
              className="text-[7px] sm:text-[8px] tracking-[2px] uppercase font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              THƯ VIỆN VÔ CỰC
            </span>
            <span className="w-3 h-px bg-current opacity-60" />
          </div>
        </div>

        {/* Center Title — High Contrast & Vietnamese Diacritic Perfection */}
        <div className="relative z-10 my-auto px-1 sm:px-2 flex flex-col items-center justify-center">
          <h4
            className="line-clamp-3 leading-snug font-bold tracking-tight text-balance"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: titleFontSize,
              color: theme.titleColor,
              textShadow:
                '0 2px 10px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h4>

          {/* Subtle separator ornament */}
          <div className="flex items-center gap-1 mt-2 opacity-70" style={{ color: theme.accentColor }}>
            <span className="w-4 h-px bg-current opacity-40" />
            <span className="text-[7px]">❖</span>
            <span className="w-4 h-px bg-current opacity-40" />
          </div>
        </div>

        {/* Bottom Author & Genre Seal */}
        <div className="relative z-10 pb-1 flex flex-col items-center gap-0.5">
          {author && (
            <p
              className="text-[10px] sm:text-[11px] font-medium tracking-wide truncate max-w-[85%]"
              style={{
                fontFamily: 'var(--font-ui)',
                color: 'rgba(255, 255, 255, 0.85)',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}
            >
              {author}
            </p>
          )}
          <span
            className="text-[7px] sm:text-[8px] tracking-[1.5px] uppercase opacity-65 font-medium"
            style={{
              fontFamily: 'var(--font-display)',
              color: theme.accentColor,
            }}
          >
            {genres[0] || theme.genreLabel}
          </span>
        </div>
      </div>

      {/* ── Real Image Layer (Rendered cleanly when valid, with zero broken-icon leak) ── */}
      {resolvedUrl && !imgError && (
        <img
          src={resolvedUrl}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* ── 3D Book Spine & Crease Shadow ── */}
      {showSpine && (
        <>
          {/* Left spine shadow */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3 sm:w-4 pointer-events-none z-10"
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 50%, transparent 100%)',
            }}
          />
          {/* Book spine highlight crease line */}
          <div
            className="absolute left-[3px] sm:left-[4px] top-0 bottom-0 w-px pointer-events-none z-10 opacity-35"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.05))',
            }}
          />
        </>
      )}

      {/* ── Status Ribbon / Badge (Separated at top-right, never overlapping title) ── */}
      {showBadge && status && (
        <div className="absolute top-2 right-2 z-20 pointer-events-none">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold tracking-wider uppercase border shadow-md backdrop-blur-md ${
              statusBadgeClasses[status] || statusBadgeClasses.ongoing
            }`}
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.8px' }}
          >
            {statusLabel[status]}
          </span>
        </div>
      )}

      {/* ── Hover Gold Aura Overlay ── */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to top, rgba(201,168,76,0.18) 0%, transparent 65%)',
        }}
      />
    </div>
  )
}
