import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // ── PWA / Service Worker ─────────────────────────────────────────────────
    VitePWA({
      registerType: 'autoUpdate',   // SW tự update khi deploy version mới
      injectRegister: 'auto',       // tự inject register script vào index.html

      // Web App Manifest — hiển thị nút "Add to Home Screen" trên mobile
      manifest: {
        name: 'Novel Platform — Đọc truyện online',
        short_name: 'NovelPlatform',
        description: 'Nền tảng đọc truyện chữ online — đọc offline, đồng bộ tiến trình đọc',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      // ── Workbox cache strategies ─────────────────────────────────────────
      workbox: {
        // Precache: app shell (HTML/JS/CSS) — serve offline ngay lập tức
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        runtimeCaching: [
          // 1. API chapters — Cache First (đọc offline chương đã xem)
          //    Sau khi đọc 1 chapter, lần sau offline vẫn đọc được
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/novels\/.*\/chapters\/\d+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'chapters-cache',
              expiration: {
                maxEntries: 200,         // tối đa 200 chương offline
                maxAgeSeconds: 7 * 24 * 60 * 60,  // 7 ngày
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 2. API novels list / metadata — Network First (luôn fresh nếu có mạng)
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/novels/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'novels-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60,   // 1 giờ
              },
              networkTimeoutSeconds: 5,   // fallback sang cache nếu mạng chậm > 5s
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 3. Ảnh bìa và uploads — Stale While Revalidate
          //    Hiện cache ngay, refresh ngầm — tối ưu cho cover art
          {
            urlPattern: /^https?:\/\/.*\/uploads\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 30 * 24 * 60 * 60,  // 30 ngày
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 4. Google Fonts / CDN assets — Cache First, dài hạn
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60,  // 1 năm
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'three-vendor':  ['three', '@react-three/fiber', '@react-three/drei'],
          'motion-vendor': ['framer-motion', 'gsap'],
          'query-vendor':  ['@tanstack/react-query', 'zustand', 'axios'],
        },
      },
    },
  },
})
