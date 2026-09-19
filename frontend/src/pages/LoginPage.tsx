import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: async () => {
      const user = await authApi.me()
      setUser(user)
      toast.success('Đăng nhập thành công!')
      navigate('/')
    },
    onError: () => toast.error('Email hoặc mật khẩu không đúng.'),
  })

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border-subtle)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-ui)',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 200ms',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg-deep)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs hover:text-[var(--color-accent-gold)] transition-colors mb-3"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '3px', color: 'var(--color-accent-gold)' }}
          >
            ← VỀ TRANG CHỦ
          </Link>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 400, color: 'var(--color-text-primary)' }}>
            Đăng Nhập
          </h1>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="flex flex-col gap-4">
          <div>
            <label style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', display: 'block' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ten@email.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', display: 'block' }}>
              MẬT KHẨU
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-full font-semibold mt-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--color-accent-gold)', color: '#000', fontFamily: 'var(--font-ui)', fontSize: '15px' }}
          >
            {isPending ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="link-ink" style={{ color: 'var(--color-accent-gold)' }}>
            Đăng ký ngay
          </Link>
        </p>
      </motion.div>
    </div>
  )
}