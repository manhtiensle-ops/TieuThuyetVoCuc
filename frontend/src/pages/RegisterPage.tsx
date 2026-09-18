import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: async () => {
      const user = await authApi.me()
      setUser(user)
      toast.success('Tạo tài khoản thành công!')
      navigate('/')
    },
    onError: () => toast.error('Email hoặc username đã tồn tại.'),
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg-deep)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '3px', color: 'var(--color-accent-gold)', marginBottom: '12px' }}>THƯ VIỆN VÔ CỰC</p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 400, color: 'var(--color-text-primary)' }}>Đăng Ký</h1>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="flex flex-col gap-4">
          {[
            { key: 'username', label: 'TÊN NGƯỜI DÙNG', type: 'text', placeholder: 'ten_nguoi_dung' },
            { key: 'email', label: 'EMAIL', type: 'email', placeholder: 'ten@email.com' },
            { key: 'password', label: 'MẬT KHẨU', type: 'password', placeholder: '••••••••' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px', display: 'block' }}>{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                required
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-full font-semibold mt-2 transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'var(--color-accent-gold)', color: '#000', fontFamily: 'var(--font-ui)', fontSize: '15px' }}
          >
            {isPending ? 'Đang tạo...' : 'Tạo Tài Khoản'}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" className="link-ink" style={{ color: 'var(--color-accent-gold)' }}>Đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  )
}