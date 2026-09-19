import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageWrapper } from '@/components/novel/NovelCard'
import { novelsApi, uploadApi } from '@/api'
import { useAuthStore } from '@/stores'
import {
  Upload,
  BookOpen,
  Sparkles,
  Plus,
  X,
  Image as ImageIcon,
  Tag,
  FileText,
  CheckCircle2,
  AlertCircle,
  Home,
  ChevronRight,
  Loader2,
} from 'lucide-react'

const PRESET_GENRES = [
  'Tiên Hiệp',
  'Kiếm Hiệp',
  'Huyền Huyễn',
  'Khoa Huyễn',
  'Đô Thị',
  'Hệ Thống',
  'Ngôn Tình',
  'Mạt Thế',
  'Dị Giới',
  'Linh Dị',
  'Cổ Điển',
  'Võng Du',
]

const POPULAR_TAGS = [
  'Trọng Sinh',
  'Hệ Thống',
  'Vô Địch Lưu',
  'Phàm Nhân',
  'Hắc Ám',
  'Cơ Trí',
  'Xuyên Không',
  'Mạt Thế',
  'Nhiệt Huyết',
  'Luyện Thể',
  'Học Bá',
  'Hài Hước',
  'Điềm Đạm',
  'Kiếm Tu',
]

export default function CreateNovelPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState(user?.display_name || '')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [status, setStatus] = useState<'ongoing' | 'completed'>('ongoing')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Huyền Huyễn'])
  const [tags, setTags] = useState<string[]>([])
  const [currentTagInput, setCurrentTagInput] = useState('')

  // Optional First Chapter
  const [hasFirstChapter, setHasFirstChapter] = useState(false)
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterContent, setChapterContent] = useState('')

  // State flags
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    setErrorMessage('')
    try {
      const res = await uploadApi.uploadImage(file)
      // If relative url returned, construct full path or use relative directly
      setCoverUrl(res.url)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Tải ảnh bìa thất bại')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  const addTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, '')
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean])
    }
    setCurrentTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(currentTagInput)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tên truyện')
      return
    }

    if (selectedGenres.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 thể loại')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const created = await novelsApi.create({
        title: title.trim(),
        author: author.trim() || user?.display_name || 'Khuyết Danh',
        description: description.trim(),
        cover_url: coverUrl.trim() || undefined,
        status,
        genres: selectedGenres,
        tags,
        first_chapter_title: hasFirstChapter ? chapterTitle.trim() : undefined,
        first_chapter_content: hasFirstChapter ? chapterContent.trim() : undefined,
      })

      setSuccessMessage('Đăng tải truyện thành công! Đang chuyển tiếp...')
      setTimeout(() => {
        navigate(`/novels/${created.slug}`)
      }, 1200)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Đã có lỗi xảy ra khi tạo truyện')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <PageWrapper className="min-h-screen px-6 py-28 max-w-2xl mx-auto text-center font-ui">
        <div className="p-8 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
          <BookOpen size={48} className="mx-auto text-[var(--color-accent-gold)] mb-4" />
          <h2 className="text-2xl font-display text-[var(--color-text-primary)] mb-2">
            ĐĂNG TẢI TÁC PHẨM
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Bạn cần đăng nhập tài khoản để có thể xuất bản tác phẩm và quản lý các chương truyện của mình.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-2 rounded-full text-xs font-semibold bg-[var(--color-accent-gold)] text-black hover:opacity-90"
            >
              Đăng Nhập Ngay
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 rounded-full text-xs font-medium border border-[var(--color-border-medium)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-deep)]"
            >
              Tạo Tài Khoản
            </Link>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="min-h-screen px-4 sm:px-6 py-24 max-w-4xl mx-auto font-ui">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="flex items-center gap-1 hover:text-[var(--color-accent-gold)] transition-colors">
          <Home size={13} className="text-[var(--color-accent-gold)]" />
          <span>Trang Chủ</span>
        </Link>
        <ChevronRight size={12} />
        <Link to="/novels" className="hover:text-[var(--color-accent-gold)] transition-colors">
          Kho Truyện
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text-secondary)] font-medium">Đăng Truyện Mới</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-display tracking-[0.2em] text-[var(--color-accent-gold)] uppercase font-semibold">
          KHÔNG GIAN SÁNG TÁC
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-light text-[var(--color-text-primary)] mt-1">
          Xuất Bản Tiểu Thuyết Mới
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Đăng tải truyện tùy ý, thiết lập ảnh bìa, tóm tắt và gắn nhãn nội dung để độc giả dễ dàng tìm kiếm.
        </p>
      </div>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2"
        >
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Section */}
        <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-6">
          <h2 className="text-sm font-display font-semibold text-[var(--color-accent-gold)] tracking-wider flex items-center gap-2">
            <BookOpen size={16} />
            THÔNG TIN TRUYỆN
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Tên Tiểu Thuyết <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Kiếm Ma Trọng Sinh, Thôn Phệ Tinh Không..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent-gold)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Bút Danh / Tác Giả
              </label>
              <input
                type="text"
                placeholder={user?.display_name || 'Tên tác giả...'}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent-gold)]"
              />
            </div>
          </div>

          {/* Cover image upload & preview */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Ảnh Bìa Truyện
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Preview box */}
              <div
                className="w-28 h-40 rounded-lg overflow-hidden border border-[var(--color-border-medium)] bg-[var(--color-bg-deep)] flex items-center justify-center flex-shrink-0"
              >
                {coverUrl ? (
                  <img
                    src={coverUrl.startsWith('/') ? `http://localhost:8000${coverUrl}` : coverUrl}
                    alt="Bìa truyện"
                    className="w-full h-full object-cover"
                    onError={() => setErrorMessage('Link ảnh không hợp lệ hoặc không tải được')}
                  />
                ) : (
                  <div className="text-center p-2 text-[var(--color-text-muted)]">
                    <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
                    <span className="text-[10px]">Chưa có bìa</span>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-medium bg-[var(--color-bg-raised)] border border-[var(--color-border-medium)] hover:border-[var(--color-accent-gold)] text-[var(--color-text-primary)] transition-all flex items-center gap-2">
                    {isUploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>{isUploadingImage ? 'Đang tải ảnh...' : 'Tải Ảnh Từ Máy'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Hỗ trợ JPG, PNG, WEBP (Tối đa 5MB)
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="url"
                    placeholder="Hoặc dán URL ảnh trực tiếp: https://..."
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-xs focus:outline-none focus:border-[var(--color-accent-gold)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Giới Thiệu / Tóm Tắt Nội Dung
            </label>
            <textarea
              rows={4}
              placeholder="Giới thiệu bối cảnh thế giới, nhân vật chính, xung đột mở đầu và sức hút của tác phẩm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent-gold)] leading-relaxed"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Tình Trạng
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--color-text-primary)]">
                <input
                  type="radio"
                  name="status"
                  value="ongoing"
                  checked={status === 'ongoing'}
                  onChange={() => setStatus('ongoing')}
                  className="accent-[var(--color-accent-gold)]"
                />
                Đang ra (Ongoing)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--color-text-primary)]">
                <input
                  type="radio"
                  name="status"
                  value="completed"
                  checked={status === 'completed'}
                  onChange={() => setStatus('completed')}
                  className="accent-[var(--color-accent-gold)]"
                />
                Hoàn thành (Completed)
              </label>
            </div>
          </div>
        </div>

        {/* Genres & Tags Section */}
        <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-6">
          <h2 className="text-sm font-display font-semibold text-[var(--color-accent-gold)] tracking-wider flex items-center gap-2">
            <Tag size={16} />
            THỂ LOẠI & GẮN NHÃN TÙY CHỈNH
          </h2>

          {/* Genres */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
              Thể Loại Chính (Chọn 1 hoặc nhiều)
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre)
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[var(--color-accent-gold)] text-black font-semibold shadow-md'
                        : 'bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>
          </div>

          {/* User Custom Tags */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Nhãn Dán Nội Dung (Tags) — Độc giả có thể tìm kiếm truyện theo các nhãn này
            </label>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-3">
              Gõ nhãn rồi nhấn <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-raised)] text-[10px]">Enter</kbd> hoặc dấu phẩy.
            </p>

            {/* Current tags chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[var(--color-accent-gold)]/15 border border-[var(--color-accent-gold)]/40 text-[var(--color-accent-gold)] font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder="Thêm nhãn (VD: Vô Địch Lưu)..."
                value={currentTagInput}
                onChange={(e) => setCurrentTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="px-3 py-1 rounded-full bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] min-w-40"
              />
            </div>

            {/* Popular tags suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mr-1">
                Gợi ý nhanh:
              </span>
              {POPULAR_TAGS.map((popTag) => (
                <button
                  key={popTag}
                  type="button"
                  onClick={() => addTag(popTag)}
                  disabled={tags.includes(popTag)}
                  className={`text-[11px] px-2 py-0.5 rounded transition-all ${
                    tags.includes(popTag)
                      ? 'opacity-40 cursor-not-allowed text-[var(--color-text-muted)]'
                      : 'hover:bg-[var(--color-bg-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-gold)]'
                  }`}
                >
                  +{popTag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional First Chapter Section */}
        <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold text-[var(--color-accent-gold)] tracking-wider flex items-center gap-2">
              <FileText size={16} />
              CHƯƠNG ĐẦU TIÊN (TÙY CHỌN)
            </h2>
            <button
              type="button"
              onClick={() => setHasFirstChapter(!hasFirstChapter)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                hasFirstChapter
                  ? 'bg-[var(--color-accent-gold)] text-black'
                  : 'bg-[var(--color-bg-deep)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]'
              }`}
            >
              {hasFirstChapter ? '✓ Đăng Kèm Chương 1' : '+ Thêm Chương 1 Ngay'}
            </button>
          </div>

          {hasFirstChapter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2"
            >
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Tiêu Đề Chương 1
                </label>
                <input
                  type="text"
                  placeholder="VD: Chương 1: Thiếu Niên Rời Núi"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent-gold)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Nội Dung Chương 1
                </label>
                <textarea
                  rows={8}
                  placeholder="Nhập nội dung chương 1 tại đây... Hỗ trợ các đoạn văn bản sạch, hệ thống tự động lưu trữ và chuẩn hóa."
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent-gold)] leading-relaxed font-serif"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-4">
          <Link
            to="/novels"
            className="px-6 py-3 rounded-full text-xs font-medium border border-[var(--color-border-medium)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all"
          >
            Hủy Bỏ
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 rounded-full text-xs font-bold tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #C9A84C 0%, #D97706 100%)',
              color: '#000',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                ĐANG XUẤT BẢN...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                XUẤT BẢN TIỂU THUYẾT
              </>
            )}
          </button>
        </div>
      </form>
    </PageWrapper>
  )
}
