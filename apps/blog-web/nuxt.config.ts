import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: 'Chen Blog',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#F7F5F0' },
        {
          name: 'description',
          content: '陈信至的个人技术博客。',
        },
      ],
      script: [
        {
          key: 'theme-init',
          innerHTML: "(()=>{const key='chen-blog-theme';const saved=document.cookie.match(/(?:^|; )chen-blog-theme=([^;]*)/)?.[1];const theme=saved==='dark'||saved==='light'?saved:null;if(theme)document.documentElement.dataset.theme=theme})()",
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
  routeRules: {
    '/': { isr: 600 },
    '/posts': { isr: 600 },
    '/posts/**': { isr: 600 },
    '/categories/**': { isr: 600 },
    '/tags/**': { isr: 600 },
  },
})
