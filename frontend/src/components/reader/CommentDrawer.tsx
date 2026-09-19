import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageSquare, Loader2, Quote, LogIn, AlertCircle } from 'lucide-react'
import type { Comment, ReactionType } from '@/types'
import { commentsApi } from '@/api'
import { useAuthStore } from '@/stores'
import { CommentItemCard } from './CommentItemCard'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface CommentDrawerProps {
  isOpen: boolean
  onClose: () => void
  chapterId: number
  paragraphIndex: number | null
  paragraphText?: string
  onCommentCountChange?: () => void
}

export function CommentDrawer({
  isOpen,
  onClose,
  chapterId,
  paragraphIndex,
  paragraphText,
  onCommentCountChange,
}: CommentDrawerProps) {
  const { isAuthenticated } = useAuthStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch comments for this paragraph / chapter
  const fetchComments = useCallback(async () => {
    if (!isOpen || !chapterId) return
    setLoading(true)
    try {
      const res = await commentsApi.list(chapterId, {
        paragraph_index: paragraphIndex,
        page: 1,
        per_page: 50,
      })
      setComments(res.items)
      setTotal(res.total)
    } catch (err) {
      console.error('Lỗi tải bình luận:', err)
    } finally {
      setLoading(false)
    }
  }, [isOpen, chapterId, paragraphIndex])

  useEffect(() => {
    if (isOpen) {
      fetchComments()
      // Lock body scroll on mobile
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen, fetchComments])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Reaction with optimistic update
  const handleReact = async (commentId: number, type: ReactionType) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thả cảm xúc!')
      return
    }

    // Recursive helper to update reaction in comment or reply
    const updateInTree = (list: Comment[]): Comment[] => {
      return list.map((c) => {
        if (c.id === commentId) {
          const currentType = c.my_reaction
          const willTurnOff = currentType === type
          const nextType = willTurnOff ? null : type

          const newCounts = { ...(c.reactions_count || {}) }
          if (currentType && newCounts[currentType]) {
            newCounts[currentType] = Math.max(0, (newCounts[currentType] || 1) - 1)
          }
          if (nextType) {
            newCounts[nextType] = (newCounts[nextType] || 0) + 1
          }

          return {
            ...c,
            my_reaction: nextType,
            reactions_count: newCounts,
          }
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateInTree(c.replies) }
        }
        return c
      })
    }

    // Optimistic update
    setComments((prev) => updateInTree(prev))

    try {
      const res = await commentsApi.react(commentId, type)
      // Sync with server result
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              my_reaction: res.reaction_type,
              reactions_count: res.reactions_count,
            }
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, my_reaction: res.reaction_type, reactions_count: res.reactions_count }
                  : r
              ),
            }
          }
          return c
        })
      )
    } catch (err) {
      console.error('Lỗi thả cảm xúc:', err)
      fetchComments() // rollback
    }
  }

  // Create new top-level comment
  const handleSubmitComment = async () => {
    if (!content.trim() || submitting) return
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để bình luận!')
      return
    }

    setSubmitting(true)
    try {
      const newComment = await commentsApi.create(chapterId, {
        content: content.trim(),
        paragraph_index: paragraphIndex,
        is_spoiler: isSpoiler,
      })

      setComments((prev) => [newComment, ...prev])
      setTotal((t) => t + 1)
      setContent('')
      setIsSpoiler(false)
      toast.success('Đã đăng bình luận thành công!')
      onCommentCountChange?.()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 429) {
        toast.error(detail || 'Bạn đang bình luận quá nhanh, vui lòng chờ ít giây!')
      } else {
        toast.error(detail || 'Không thể đăng bình luận. Vui lòng thử lại!')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Reply to a comment
  const handleReply = async (parentId: number, replyContent: string, replySpoiler: boolean) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để trả lời!')
      return
    }

    try {
      const newReply = await commentsApi.create(chapterId, {
        content: replyContent,
        paragraph_index: paragraphIndex,
        parent_id: parentId,
        is_spoiler: replySpoiler,
      })

      // Add to tree
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies_count: c.replies_count + 1,
              replies: [...(c.replies || []), newReply],
            }
          }
          return c
        })
      )
      toast.success('Đã gửi câu trả lời!')
      onCommentCountChange?.()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 429) {
        toast.error(detail || 'Bạn gửi phản hồi quá nhanh, vui lòng chờ ít giây!')
      } else {
        toast.error(detail || 'Không thể gửi câu trả lời!')
      }
      throw err
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentsApi.delete(commentId)
      // Remove from tree
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== commentId),
          }))
      )
      setTotal((t) => Math.max(0, t - 1))
      toast.success('Đã xóa bình luận')
      onCommentCountChange?.()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Không thể xóa bình luận!')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[460px] flex flex-col bg-[var(--color-bg-base)] border-l border-[var(--color-border-medium)] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-[var(--color-accent-gold)]" />
                <h3
                  className="font-semibold text-sm sm:text-base text-[var(--color-text-primary)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {paragraphIndex !== null ? `Thảo luận đoạn văn (${total})` : `Bình luận chương (${total})`}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)] transition-colors"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quoted paragraph excerpt (if paragraphIndex is set) */}
            {paragraphText && (
              <div className="px-5 py-3 bg-[var(--color-bg-raised)]/70 border-b border-[var(--color-border-subtle)] shrink-0 max-h-32 overflow-y-auto">
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)] italic">
                  <Quote size={14} className="text-[var(--color-accent-gold)] shrink-0 mt-0.5" />
                  <span className="line-clamp-3 leading-relaxed">"{paragraphText}"</span>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 divide-y divide-transparent">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)] gap-2">
                  <Loader2 size={24} className="animate-spin text-[var(--color-accent-gold)]" />
                  <span className="text-xs">Đang tải thảo luận...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--color-text-muted)] px-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center mb-3 text-[var(--color-accent-gold)] border border-[var(--color-border-subtle)]">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Chưa có bình luận nào</p>
                  <p className="text-xs max-w-xs leading-relaxed">
                    Hãy là người đầu tiên để lại cảm nghĩ và góc nhìn của bạn về tình tiết này!
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentItemCard
                    key={comment.id}
                    comment={comment}
                    onReact={handleReact}
                    onReply={handleReply}
                    onDelete={handleDeleteComment}
                  />
                ))
              )}
            </div>

            {/* Input Form at Bottom */}
            <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shrink-0">
              {!isAuthenticated ? (
                <div className="p-3 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <LogIn size={15} className="text-[var(--color-accent-gold)]" />
                    <span>Đăng nhập để tham gia thảo luận</span>
                  </div>
                  <Link
                    to="/login"
                    className="px-3 py-1.5 rounded bg-[var(--color-accent-gold)] text-black font-semibold text-xs hover:opacity-90"
                  >
                    Đăng nhập
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      paragraphIndex !== null
                        ? 'Viết bình luận cho đoạn văn này... (Ctrl + Enter)'
                        : 'Chia sẻ cảm nhận về chương này... (Ctrl + Enter)'
                    }
                    rows={3}
                    maxLength={1000}
                    className="w-full text-xs sm:text-sm p-3 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-medium)] focus:border-[var(--color-accent-gold)] outline-hidden text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        handleSubmitComment()
                      }
                    }}
                  />

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[var(--color-text-muted)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSpoiler}
                          onChange={(e) => setIsSpoiler(e.target.checked)}
                          className="rounded border-[var(--color-border-medium)] text-[var(--color-accent-gold)] focus:ring-0"
                        />
                        <span className="text-xs">Tiết lộ (Spoiler)</span>
                      </label>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {content.length}/1000
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitComment}
                      disabled={!content.trim() || submitting}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--color-accent-gold)] text-black font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                    >
                      {submitting ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      <span>Gửi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
