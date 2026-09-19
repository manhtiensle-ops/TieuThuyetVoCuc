import { useState } from 'react'
import type { Comment, ReactionType } from '@/types'
import { useAuthStore } from '@/stores'
import { Heart, Laugh, Flame, Zap, Reply, Trash2, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface CommentItemCardProps {
  comment: Comment
  onReact: (commentId: number, type: ReactionType) => void
  onReply: (parentId: number, content: string, isSpoiler: boolean) => Promise<void>
  onDelete: (commentId: number) => Promise<void>
  isSubReply?: boolean
}

const REACTION_CONFIG: { type: ReactionType; label: string; icon: any; activeClass: string }[] = [
  { type: 'like', label: 'Thích', icon: Heart, activeClass: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
  { type: 'laugh', label: 'Haha', icon: Laugh, activeClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { type: 'fire', label: 'Chiến', icon: Flame, activeClass: 'text-orange-500 bg-orange-500/10 border-orange-500/30' },
  { type: 'shock', label: 'Sốc', icon: Zap, activeClass: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
]

export function CommentItemCard({
  comment,
  onReact,
  onReply,
  onDelete,
  isSubReply = false,
}: CommentItemCardProps) {
  const { user } = useAuthStore()
  const [showSpoiler, setShowSpoiler] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySpoiler, setReplySpoiler] = useState(false)
  const [submittingReply, setSubmittingReply] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isOwner = user?.id === comment.user_id
  const isAdmin = user?.role === 'admin'
  const canDelete = isOwner || isAdmin

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi })
    } catch {
      return 'vừa xong'
    }
  })()

  const handleSendReply = async () => {
    if (!replyText.trim() || submittingReply) return
    setSubmittingReply(true)
    try {
      await onReply(comment.id, replyText.trim(), replySpoiler)
      setReplyText('')
      setReplySpoiler(false)
      setIsReplying(false)
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return
    setDeleting(true)
    try {
      await onDelete(comment.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className={cn(
        'group transition-all duration-200 rounded-lg p-3',
        isSubReply
          ? 'bg-[var(--color-bg-surface)]/60 border-l-2 border-[var(--color-accent-gold)]/40 ml-4 my-1.5'
          : 'bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] my-2 shadow-xs'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {comment.user.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={comment.user.display_name}
              className="w-7 h-7 rounded-full object-cover border border-[var(--color-border-medium)] shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] flex items-center justify-center font-bold text-xs shrink-0">
              {comment.user.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-xs text-[var(--color-text-primary)] truncate max-w-[140px]">
              {comment.user.display_name || comment.user.username}
            </span>
            {comment.user.role === 'admin' && (
              <span className="px-1 py-0.2 rounded bg-red-500/15 text-red-500 text-[9px] font-mono tracking-wider font-bold">
                ADMIN
              </span>
            )}
            {comment.user.role === 'vip' && (
              <span className="px-1 py-0.2 rounded bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] text-[9px] font-mono tracking-wider font-bold">
                VIP
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-[var(--color-text-muted)]">{timeAgo}</span>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-[var(--color-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
              title="Xóa bình luận"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content / Spoiler */}
      <div className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
        {comment.is_spoiler && !showSpoiler ? (
          <div className="p-2 rounded bg-[var(--color-bg-base)] border border-dashed border-amber-500/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-500 text-xs">
              <ShieldAlert size={14} />
              <span>Bình luận chứa tiết lộ nội dung (Spoiler)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSpoiler(true)}
              className="text-xs text-[var(--color-accent-gold)] underline hover:opacity-80"
            >
              Bấm để xem
            </button>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{comment.content}</p>
        )}
      </div>

      {/* Actions Row: Reactions & Reply Toggle */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border-subtle)] text-xs">
        <div className="flex items-center gap-1 flex-wrap">
          {REACTION_CONFIG.map(({ type, label, icon: Icon, activeClass }) => {
            const count = comment.reactions_count?.[type] || 0
            const isActive = comment.my_reaction === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => onReact(comment.id, type)}
                title={label}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all text-xs cursor-pointer',
                  isActive
                    ? activeClass
                    : 'bg-transparent text-[var(--color-text-muted)] border-transparent hover:border-[var(--color-border-subtle)] hover:text-[var(--color-text-secondary)]'
                )}
              >
                <Icon size={12} className={cn(isActive && 'fill-current')} />
                {count > 0 && <span className="font-mono text-[11px]">{count}</span>}
              </button>
            )
          })}
        </div>

        {!isSubReply && (
          <button
            type="button"
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)] transition-colors px-1.5 py-0.5 rounded text-xs"
          >
            <Reply size={12} />
            <span>{isReplying ? 'Đóng' : 'Trả lời'}</span>
          </button>
        )}
      </div>

      {/* Inline Reply Input Form */}
      {isReplying && (
        <div className="mt-3 pt-2 border-t border-[var(--color-border-subtle)]">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Trả lời ${comment.user.display_name}...`}
            rows={2}
            className="w-full text-xs p-2 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-medium)] focus:border-[var(--color-accent-gold)] outline-hidden text-[var(--color-text-primary)] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSendReply()
              }
            }}
          />
          <div className="flex items-center justify-between mt-1 text-xs">
            <label className="flex items-center gap-1.5 text-[var(--color-text-muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={replySpoiler}
                onChange={(e) => setReplySpoiler(e.target.checked)}
                className="rounded border-[var(--color-border-medium)] text-[var(--color-accent-gold)] focus:ring-0"
              />
              <span className="text-[11px]">Spoiler</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsReplying(false)}
                className="px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyText.trim() || submittingReply}
                className="px-3 py-1 rounded bg-[var(--color-accent-gold)] text-black font-semibold text-xs hover:opacity-90 disabled:opacity-50"
              >
                {submittingReply ? 'Đang gửi...' : 'Gửi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nested Replies List */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 pt-1">
          {comment.replies.map((reply) => (
            <CommentItemCard
              key={reply.id}
              comment={reply}
              onReact={onReact}
              onReply={onReply}
              onDelete={onDelete}
              isSubReply={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
