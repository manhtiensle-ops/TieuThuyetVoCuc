import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Send, Loader2, LogIn } from 'lucide-react'
import type { Comment, ReactionType } from '@/types'
import { commentsApi } from '@/api'
import { useAuthStore } from '@/stores'
import { CommentItemCard } from './CommentItemCard'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface ChapterCommentsSectionProps {
  chapterId: number
  onCommentCountChange?: () => void
}

export function ChapterCommentsSection({
  chapterId,
  onCommentCountChange,
}: ChapterCommentsSectionProps) {
  const { isAuthenticated } = useAuthStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'chapter' | 'all'>('chapter')

  const fetchComments = useCallback(async () => {
    if (!chapterId) return
    setLoading(true)
    try {
      const res = await commentsApi.list(chapterId, {
        paragraph_index: activeTab === 'chapter' ? null : undefined,
        all_comments: activeTab === 'all',
        page: 1,
        per_page: 30,
      })
      setComments(res.items)
      setTotal(res.total)
    } catch (err) {
      console.error('Lỗi tải bình luận chân chương:', err)
    } finally {
      setLoading(false)
    }
  }, [chapterId, activeTab])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Reaction handling
  const handleReact = async (commentId: number, type: ReactionType) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thả cảm xúc!')
      return
    }

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

    setComments((prev) => updateInTree(prev))

    try {
      const res = await commentsApi.react(commentId, type)
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
      console.error('Lỗi phản hồi cảm xúc:', err)
      fetchComments()
    }
  }

  // Create new comment
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
        paragraph_index: null, // End of chapter comment
        is_spoiler: isSpoiler,
      })

      setComments((prev) => [newComment, ...prev])
      setTotal((t) => t + 1)
      setContent('')
      setIsSpoiler(false)
      toast.success('Đã gửi bình luận!')
      onCommentCountChange?.()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 429) {
        toast.error(detail || 'Bạn đang bình luận quá nhanh, vui lòng chờ ít giây!')
      } else {
        toast.error(detail || 'Không thể gửi bình luận!')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Reply to comment
  const handleReply = async (parentId: number, replyContent: string, replySpoiler: boolean) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để trả lời!')
      return
    }

    try {
      const newReply = await commentsApi.create(chapterId, {
        content: replyContent,
        paragraph_index: null,
        parent_id: parentId,
        is_spoiler: replySpoiler,
      })

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
      toast.success('Đã gửi phản hồi!')
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
    <section className="mt-12 pt-8 border-t border-[var(--color-border-subtle)]">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-[var(--color-accent-gold)]" size={20} />
          <h2
            className="text-lg font-semibold text-[var(--color-text-primary)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Thảo Luận ({total})
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-[var(--color-bg-surface)] p-1 rounded-lg border border-[var(--color-border-subtle)] self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('chapter')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'chapter'
                ? 'bg-[var(--color-accent-gold)] text-black font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Chân chương
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'all'
                ? 'bg-[var(--color-accent-gold)] text-black font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Tất cả bình luận
          </button>
        </div>
      </div>

      {/* Input box */}
      <div className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] mb-8 shadow-xs">
        {!isAuthenticated ? (
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
              <LogIn size={16} className="text-[var(--color-accent-gold)] shrink-0" />
              <span>Đăng nhập để chia sẻ cảm nghĩ về chương này với các đạo hữu!</span>
            </div>
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-lg bg-[var(--color-accent-gold)] text-black font-semibold text-xs hover:opacity-90 shrink-0"
            >
              Đăng nhập
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Để lại bình luận hoặc cảm nhận của bạn về chương này... (Ctrl + Enter để gửi)"
              rows={3}
              maxLength={1000}
              className="w-full text-xs sm:text-sm p-3 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-medium)] focus:border-[var(--color-accent-gold)] outline-hidden text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleSubmitComment()
                }
              }}
            />
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-[var(--color-text-muted)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="rounded border-[var(--color-border-medium)] text-[var(--color-accent-gold)] focus:ring-0"
                  />
                  <span>Chứa tiết lộ (Spoiler)</span>
                </label>
                <span className="text-[11px] text-[var(--color-text-muted)]">{content.length}/1000</span>
              </div>
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={!content.trim() || submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--color-accent-gold)] text-black font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Gửi bình luận</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)] gap-2">
            <Loader2 size={24} className="animate-spin text-[var(--color-accent-gold)]" />
            <span className="text-xs">Đang tải thảo luận...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Chưa có bình luận nào</p>
            <p className="text-xs">Hãy để lại dấu ấn đầu tiên của bạn ở chương này!</p>
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
    </section>
  )
}
