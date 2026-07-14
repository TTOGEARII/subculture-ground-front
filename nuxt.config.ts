// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/content', '@vite-pwa/nuxt'],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
  // SPA(ssr:false)에서 @vite-pwa가 head에 자동 주입하지 않으므로 명시적으로 넣는다.
  app: {
    head: {
      meta: [
        { name: 'theme-color', content: '#ff385c' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: '음연화' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/pwa-192.png' },
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Subculture Ground',
      short_name: '음연화',
      description: '서브컬처 공연 예매 + 노션 AI 에이전트 · 합주실 예약',
      lang: 'ko',
      theme_color: '#ff385c',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    // SPA(ssr:false)라 모든 경로를 '/'로 폴백
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
    },
    client: { installPrompt: true },
    devOptions: { enabled: true, suppressWarnings: true, type: 'module', navigateFallback: '/' },
  },
  devServer: {
    port: 3000,
    host: '0.0.0.0',
  },
  alias: {
    '~': '.',
    '@': '.',
  },
  vite: {
    resolve: {
      alias: {
        '@': '.',
        '~': '.',
      },
    },
  },
  css: ['~/assets/css/index.css'],
  runtimeConfig: {
    public: {
      // 프론트엔드에서 사용할 백엔드 API 기본 URL
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
      // 암호화 키 (환경 변수로 설정 가능)
      encryptionKey:
        process.env.NUXT_PUBLIC_ENCRYPTION_KEY ||
        'subculture-ground-encryption-key-2024',
      // 카카오맵 JavaScript 키 (주소 검색 / 지도)
      kakaoJsKey:
        process.env.NUXT_PUBLIC_KAKAO_JS_KEY ||
        '9183a6792760b7c71d5f99de1a5ab1b9',
      // 카카오 로그인 REST 키 (authorize URL client_id) + 리다이렉트 URI
      kakaoRestKey:
        process.env.NUXT_PUBLIC_KAKAO_REST_KEY ||
        '858961be459eafee64eb3f3e5a01802e',
      kakaoRedirectUri:
        process.env.NUXT_PUBLIC_KAKAO_REDIRECT_URI ||
        'http://localhost:3000/auth/kakao/callback',
    },
  },
})
