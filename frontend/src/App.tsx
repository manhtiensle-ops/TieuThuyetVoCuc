import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Suspense, lazy } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { MainLayout } from '@/components/layout/MainLayout'
import '@/styles/globals.css'

// Lazy pages
const HomePage     = lazy(() => import('@/pages/HomePage'))
const NovelsPage   = lazy(() => import('@/pages/NovelsPage'))
const NovelPage    = lazy(() => import('@/pages/NovelPage'))
const ChapterPage  = lazy(() => import('@/pages/ChapterPage'))
const ProfilePage  = lazy(() => import('@/pages/ProfilePage'))
const LoginPage    = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const AdminPage    = lazy(() => import('@/pages/AdminPage'))

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--color-bg-deep)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--color-border-subtle)', borderTopColor: 'var(--color-accent-gold)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px', color: 'var(--color-text-muted)' }}>
          ĐANG TẢI
        </span>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <MainLayout>
        <Suspense fallback={<Loader />}><HomePage /></Suspense>
      </MainLayout>
    ),
  },
  {
    path: '/novels',
    element: (
      <MainLayout>
        <Suspense fallback={<Loader />}><NovelsPage /></Suspense>
      </MainLayout>
    ),
  },
  {
    path: '/novels/:slug',
    element: (
      <MainLayout>
        <Suspense fallback={<Loader />}><NovelPage /></Suspense>
      </MainLayout>
    ),
  },
  {
    path: '/novels/:slug/chapters/:number',
    element: <Suspense fallback={<Loader />}><ChapterPage /></Suspense>,
  },
  {
    path: '/profile/:username',
    element: (
      <MainLayout>
        <Suspense fallback={<Loader />}><ProfilePage /></Suspense>
      </MainLayout>
    ),
  },
  {
    path: '/login',
    element: <Suspense fallback={<Loader />}><LoginPage /></Suspense>,
  },
  {
    path: '/register',
    element: <Suspense fallback={<Loader />}><RegisterPage /></Suspense>,
  },
  {
    path: '/admin',
    element: (
      <MainLayout>
        <Suspense fallback={<Loader />}><AdminPage /></Suspense>
      </MainLayout>
    ),
  },
  {
    path: '*',
    element: (
      <MainLayout>
        <Suspense fallback={<Loader />}><NotFoundPage /></Suspense>
      </MainLayout>
    ),
  },
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-medium)',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
            },
          }}
        />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
