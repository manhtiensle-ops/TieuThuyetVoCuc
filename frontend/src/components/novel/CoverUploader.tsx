import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Link as LinkIcon,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Info,
  Maximize2,
} from 'lucide-react'
import { BookCover } from './BookCover'
import { uploadApi } from '@/api'

interface CoverUploaderProps {
  value: string
  onChange: (url: string) => void
  title?: string
  author?: string
  genres?: string[]
  disabled?: boolean
}

export const CoverUploader: React.FC<CoverUploaderProps> = ({
  value,
  onChange,
  title = '',
  author = '',
  genres = [],
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload')
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; size?: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const blobRef = useRef<string | null>(null)

  // Dọn dẹp bộ nhớ Blob URL khi đổi ảnh hoặc unmount
  const cleanupBlob = useCallback(() => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
      setLocalBlobUrl(null)
    }
  }, [])

  useEffect(() => {
    return () => {
      cleanupBlob()
    }
  }, [cleanupBlob])

  // Xác định URL ảnh đang hiển thị
  // Ưu tiên: Blob URL cục bộ (ngay lập tức) -> URL đã nạp thành công -> Bìa Dynamic
  const currentDisplayUrl = localBlobUrl || (value ? (value.startsWith('/') ? value : value) : '')

  // Xử lý tệp được chọn
  const handleFileSelect = async (file: File) => {
    if (disabled) return
    setErrorMessage(null)
    setSuccessMessage(null)

    // 1. Kiểm tra định dạng
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Định dạng không hỗ trợ. Vui lòng chọn tệp JPG, PNG, WEBP hoặc GIF.')
      return
    }

    // 2. Kiểm tra dung lượng (Tối đa 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Dung lượng ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.')
      return
    }

    // 3. XEM TRƯỚC TỨC THÌ (Instant Preview trong 1ms)
    cleanupBlob()
    const blobUrl = URL.createObjectURL(file)
    blobRef.current = blobUrl
    setLocalBlobUrl(blobUrl)

    // Đọc kích thước ảnh ở client
    const img = new Image()
    img.onload = () => {
      setImageMeta({ width: img.naturalWidth, height: img.naturalHeight, size: file.size })
    }
    img.src = blobUrl

    // 4. Tiến hành tải lên Server nền
    setIsUploading(true)
    setUploadProgress(20)

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev))
      }, 150)

      const res = await uploadApi.uploadImage(file)
      clearInterval(progressTimer)
      setUploadProgress(100)

      // Cập nhật giá trị URL chuẩn từ server
      onChange(res.url)
      setSuccessMessage('Đã tải lên và nén WebP tối ưu thành công!')

      // Cập nhật metadata từ server nếu có
      if (res.width && res.height) {
        setImageMeta({ width: res.width, height: res.height, size: res.size })
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Tải ảnh lên máy chủ thất bại. Vui lòng thử lại.'
      setErrorMessage(detail)
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  // Xử lý nạp ảnh từ URL ngoài
  const handleApplyUrl = async (saveLocally = false) => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập đường dẫn URL ảnh.')
      return
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMessage('URL ảnh phải bắt đầu bằng http:// hoặc https://')
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    setIsProcessingUrl(true)

    if (saveLocally) {
      // Gọi backend để nạp và lưu trữ vĩnh viễn về server
      try {
        const res = await uploadApi.uploadFromUrl(trimmed)
        cleanupBlob()
        onChange(res.url)
        setUrlInput('')
        setSuccessMessage('Đã tải và lưu ảnh bìa an toàn về máy chủ!')
        if (res.width && res.height) {
          setImageMeta({ width: res.width, height: res.height, size: res.size })
        }
      } catch (err: any) {
        const detail = err.response?.data?.detail || 'Không thể nạp ảnh từ liên kết này.'
        setErrorMessage(detail)
      } finally {
        setIsProcessingUrl(false)
      }
    } else {
      // Kiểm tra sơ bộ liên kết ở phía Client qua Image constructor
      const testImg = new Image()
      testImg.onload = () => {
        cleanupBlob()
        onChange(trimmed)
        setImageMeta({ width: testImg.naturalWidth, height: testImg.naturalHeight })
        setSuccessMessage('Đã kiểm tra liên kết hợp lệ!')
        setIsProcessingUrl(false)
      }
      testImg.onerror = () => {
        setErrorMessage('Không thể tải ảnh từ URL này. Hãy đảm bảo đây là đường dẫn trực tiếp tới tệp ảnh (jpg, png, webp).')
        setIsProcessingUrl(false)
      }
      testImg.src = trimmed
    }
  }

  // Gỡ bỏ ảnh bìa riêng (quay về dùng Dynamic Cover)
  const handleRemoveCover = () => {
    cleanupBlob()
    onChange('')
    setImageMeta(null)
    setErrorMessage(null)
    setSuccessMessage('Đã chuyển về sử dụng bìa sách tự động.')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI: KHUNG PREVIEW BÌA SÁCH (TỶ LỆ 2:3 CHUẨN) */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center">
          <div className="relative group w-48 sm:w-52 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-[var(--color-border-medium)] bg-[var(--color-bg-secondary)] flex-shrink-0">
            {currentDisplayUrl ? (
              <img
                src={currentDisplayUrl}
                alt="Xem trước bìa sách"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={() => {
                  setErrorMessage('Ảnh bìa không hiển thị được. Hãy chọn ảnh khác.')
                }}
              />
            ) : (
              /* Khi chưa có ảnh riêng: Tự động hiển thị Live Dynamic Fallback Cover theo tên & tác giả */
              <div className="w-full h-full relative">
                <BookCover
                  title={title || 'Tên Tiểu Thuyết'}
                  author={author || 'Bút Danh Tác Giả'}
                  genres={genres}
                  showBadge={false}
                  aspectRatio="2/3"
                />
                <div className="absolute top-2 left-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] text-amber-300 flex items-center justify-center gap-1 border border-amber-500/30">
                  <Sparkles size={11} /> Bìa tự sinh thông minh
                </div>
              </div>
            )}

            {/* Trạng thái Overlay khi đang tải lên */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20"
                >
                  <Loader2 size={32} className="animate-spin text-amber-400 mb-2" />
                  <span className="text-xs font-semibold text-white mb-1">Đang tối ưu & tải ảnh...</span>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-1">
                    <motion.div
                      className="bg-amber-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-300 mt-1">{uploadProgress}%</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nút hành động nổi khi hover (đã có ảnh) */}
            {currentDisplayUrl && !isUploading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3 z-10">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-medium flex items-center justify-center gap-1.5 shadow-lg transition-colors"
                >
                  <RefreshCw size={13} /> Đổi ảnh khác
                </button>
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-lg transition-colors"
                >
                  <Trash2 size={13} /> Dùng bìa tự động
                </button>
              </div>
            )}
          </div>

          {/* Thông số kích thước ảnh */}
          {imageMeta && currentDisplayUrl && (
            <div className="mt-2.5 text-[11px] text-[var(--color-text-secondary)] flex items-center gap-2">
              <Maximize2 size={12} className="text-amber-400" />
              <span>
                {imageMeta.width} × {imageMeta.height} px
                {imageMeta.size ? ` (${(imageMeta.size / 1024).toFixed(0)} KB)` : ''}
              </span>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: BỘ ĐIỀU KHIỂN TẢI ẢNH (DUAL TABS) */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-center space-y-4">
          {/* Chuyển đổi phương thức */}
          <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
              }`}
            >
              <Upload size={14} /> Tải tệp từ máy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'url'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
              }`}
            >
              <LinkIcon size={14} /> Dán liên kết URL
            </button>
          </div>

          {/* TAB 1: KÉO & THẢ / CHỌN TỆP */}
          {activeTab === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 transition-all duration-200 text-center flex flex-col items-center justify-center gap-3 ${
                dragOver
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : 'border-[var(--color-border-medium)] hover:border-amber-500/50 bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length > 0) {
                    handleFileSelect(files[0])
                  }
                }}
                disabled={disabled || isUploading}
              />

              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-inner">
                {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {dragOver ? 'Thả ảnh vào đây ngay' : 'Kéo & thả ảnh bìa vào đây'}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  hoặc <span className="text-amber-400 font-semibold underline underline-offset-2">bấm để duyệt tệp</span> từ thiết bị
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-text-secondary)] border-t border-[var(--color-border-subtle)] pt-2 w-full max-w-sm">
                <span>Tỷ lệ chuẩn <strong>2:3</strong> (gợi ý: 600×900px)</span>
                <span>•</span>
                <span>Tối đa <strong>10MB</strong> (JPG, PNG, WEBP)</span>
              </div>
            </div>
          )}

          {/* TAB 2: DÁN ĐƯỜNG DẪN ẢNH TRỰC TIẾP */}
          {activeTab === 'url' && (
            <div className="space-y-3 p-4 rounded-xl border border-[var(--color-border-medium)] bg-[var(--color-bg-secondary)]/40">
              <label className="block text-xs font-medium text-[var(--color-text-primary)]">
                Đường dẫn liên kết hình ảnh trực tiếp:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                    <LinkIcon size={14} />
                  </span>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleApplyUrl(false)
                      }
                    }}
                    placeholder="https://example.com/anh-bia.jpg"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:border-amber-400"
                    disabled={disabled || isProcessingUrl}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyUrl(false)}
                  disabled={disabled || isProcessingUrl || !urlInput.trim()}
                  className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 border border-stone-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessingUrl ? <Loader2 size={13} className="animate-spin" /> : null}
                  Kiểm tra
                </button>
              </div>

              {/* Nút nạp và lưu về máy chủ (Server-side Cache) */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1">
                  <Info size={12} className="text-amber-400" /> Khuyên dùng: Tải và lưu về máy chủ để không lo link bị chết
                </p>
                <button
                  type="button"
                  onClick={() => handleApplyUrl(true)}
                  disabled={disabled || isProcessingUrl || !urlInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-semibold flex items-center gap-1.5 shadow disabled:opacity-50 transition-colors"
                >
                  {isProcessingUrl ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Lưu về hệ thống
                </button>
              </div>
            </div>
          )}

          {/* THÔNG BÁO TRẠNG THÁI (LỖI / THÀNH CÔNG) */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
              >
                <AlertCircle size={15} className="flex-shrink-0 text-rose-400" />
                <span className="flex-1">{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-200 text-sm font-bold ml-1"
                >
                  ×
                </button>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
              >
                <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-400" />
                <span className="flex-1">{successMessage}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="text-emerald-400 hover:text-emerald-200 text-sm font-bold ml-1"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
