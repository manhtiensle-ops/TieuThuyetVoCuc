import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PageWrapper } from '@/components/novel/NovelCard'
import { usersApi } from '@/api'
import { BookOpen, MessageSquare, Calendar } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { NovelCard } from '@/components/novel/NovelCard'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()

  const { data: user } = useQuery({
    queryKey: ['user', username],
    queryFn: () => usersApi.getProfile(username!),
    enabled: !!username,
  })

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', username],
    queryFn: () => usersApi.getFavorites(username!),
    enabled: !!username,
  })

  if (!user) return <div className="min-h-screen" style={{ background: 'var(--color-bg-deep)' }} />

  return (
    <PageWrapper className="min-h-screen" style={{ background: 'var(--color-bg-deep)' }}>
      {/* Profile hero */}
      <div className="relative py-24 px-6 overflow-hidden">
        {/* Particle bg placeholder */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)' }} />

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center md:items-start relative">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex-shrink-0"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden"
              style={{ border: '2px solid var(--color-accent-gold)', boxShadow: '0 0 30px rgba(201,168,76,0.2)' }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-bg-surface)' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', color: 'var(--color-accent-gold)' }}>
                      {user.display_name[0]}
                    </span>
                  </div>
              }
            </div>
          </motion.div>

          {/* Info */}
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '3px', color: 'var(--color-accent-gold)', marginBottom: '8px' }}>
              {user.role.toUpperCase()}
            </p>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 400, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              {user.display_name}
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              {user.bio || 'Chưa có tiểu sử.'}
            </p>

            {/* Stats */}
            <div className="flex gap-6 flex-wrap">
              {[
                { icon: BookOpen, label: 'Truyện đọc', value: user.novels_read },
                { icon: MessageSquare, label: 'Bình luận', value: user.comments_count },
                { icon: Calendar, label: 'Tham gia', value: timeAgo(user.joined_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={14} style={{ color: 'var(--color-accent-gold)' }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</p>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--color-text-muted)' }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section className="px-6 py-12 max-w-4xl mx-auto">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: 'var(--color-accent-gold)', marginBottom: '20px' }}>
            TRUYỆN YÊU THÍCH
          </h2>
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
            {favorites.map((novel) => <NovelCard key={novel.id} {...novel} />)}
          </div>
        </section>
      )}
    </PageWrapper>
  )
}