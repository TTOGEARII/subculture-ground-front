// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/content'],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
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
