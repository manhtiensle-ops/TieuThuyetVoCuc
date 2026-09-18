import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ReaderView } from '@/components/reader/ReaderView'
import { chaptersApi, novelsApi } from '@/api'

export default function ChapterPage() {
  const { slug, number } = useParams<{ slug: string; number: string }>()
  const chapterNumber = Number(number)

  const { data: novel } = useQuery({
    queryKey: ['novel', slug],
    queryFn: () => novelsApi.get(slug!),
    enabled: !!slug,
  })

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', slug],
    queryFn: () => novelsApi.getChapters(slug!),
    enabled: !!slug,
  })

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', slug, chapterNumber],
    queryFn: () => chaptersApi.get(slug!, chapterNumber),
    enabled: !!slug && !!chapterNumber,
  })

  if (isLoading || !chapter || !novel) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-bg-deep)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--color-border-subtle)', borderTopColor: 'var(--color-accent-gold)' }} />
      </div>
    )
  }

  return <ReaderView novel={{ slug: slug!, title: novel.title }} chapter={chapter} chapters={chapters} />
}