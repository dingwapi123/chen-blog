// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Chen Blog',
      meta: [
        {
          name: 'description',
          content: '陈信至的个人技术博客。',
        },
      ],
    },
  },
  runtimeConfig: {
    supabaseServiceRoleKey: '',
    cmsOrigin: 'http://localhost:5173',
    public: {
      supabaseUrl: '',
      supabasePublishableKey: '',
    },
  },
})
