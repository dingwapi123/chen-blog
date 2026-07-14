function getSupabaseImageDomains(): string[] {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return []

  try {
    return [new URL(supabaseUrl).hostname]
  } catch {
    return []
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/image', '@nuxt/ui', '@comark/nuxt', '@nuxtjs/sitemap'],
  image: {
    domains: getSupabaseImageDomains(),
    quality: 82,
  },
  ui: {
    // The editorial system deliberately uses local/system font stacks.
    fonts: false,
  },
  colorMode: {
    preference: 'system',
    fallback: 'light',
    storage: 'cookie',
    storageKey: 'chen-blog-theme',
    dataValue: 'theme',
  },
  sitemap: {
    autoI18n: false,
    sources: ['/api/__sitemap__/urls'],
  },
  app: {
    head: {
      title: 'Chen Blog',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#f7f5f0', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#171b1e', media: '(prefers-color-scheme: dark)' },
        {
          name: 'description',
          content: '陈信至的个人技术博客。',
        },
      ],
      link: [
        { rel: 'alternate', type: 'application/rss+xml', title: 'Chen Blog RSS', href: '/rss.xml' },
      ],
    },
  },
  runtimeConfig: {
    supabaseServiceRoleKey: '',
    cmsOrigin: 'http://localhost:5173',
    public: {
      siteUrl: '',
      supabaseUrl: '',
      supabasePublishableKey: '',
    },
  },
  routeRules: {
    '/': { isr: 600 },
    '/posts': { isr: 600 },
    '/posts/**': { isr: 600 },
    '/archive': { isr: 600 },
    '/about': { isr: 600 },
    '/categories/**': { isr: 600 },
    '/tags/**': { isr: 600 },
    '/rss.xml': { isr: 600 },
    '/sitemap.xml': { isr: 600 },
    '/robots.txt': { isr: 600 },
    '/api/**': { cache: false },
  },
})
