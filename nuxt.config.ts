// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
  devServer: {
    port: 3000,
    host: '0.0.0.0',
  },
  nitro: {
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
    },
  },
})
