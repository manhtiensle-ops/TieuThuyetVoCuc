import React from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParagraphCommentBadgeProps {
  count: number
  active?: boolean
  onClick: (e: React.MouseEvent) => void
}

export function ParagraphCommentBadge({ count, active, onClick }: ParagraphCommentBadgeProps) {
  const hasComments = count > 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hasComments ? `${count} thảo luận cho đoạn này` : 'Thảo luận đoạn này'}
      title={hasComments ? `${count} thảo luận` : 'Bình luận đoạn này'}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all duration-200 select-none cursor-pointer',
        'border backdrop-blur-sm',
        hasComments
          ? 'bg-[var(--color-bg-surface)] text-[var(--color-accent-gold)] border-[var(--color-accent-gold)]/40 shadow-sm hover:scale-105 hover:bg-[var(--color-accent-gold)] hover:text-black'
          : 'opacity-0 group-hover:opacity-75 hover:!opacity-100 bg-[var(--color-bg-surface)]/80 text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)] border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)]/50',
        active && 'ring-2 ring-[var(--color-accent-gold)] scale-105 opacity-100'
      )}
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '11px',
      }}
    >
      <MessageSquare size={12} className={cn(hasComments && 'fill-current')} />
      {hasComments && <span className="font-semibold">{count}</span>}
    </button>
  )
}
