import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { site } from '~/config/site'

type PageSeoOptions = {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  image?: MaybeRefOrGetter<string | undefined>
  type?: 'article' | 'website'
  publishedTime?: MaybeRefOrGetter<string | undefined>
  modifiedTime?: MaybeRefOrGetter<string | undefined>
  noindex?: boolean
}

function safeOrigin(configuredUrl: string, requestOrigin: string): string {
  try {
    return new URL(configuredUrl || requestOrigin).origin
  } catch {
    return requestOrigin
  }
}

export function usePageSeo(options: PageSeoOptions): void {
  const route = useRoute()
  const requestUrl = useRequestURL()
  const config = useRuntimeConfig()
  const origin = safeOrigin(config.public.siteUrl, requestUrl.origin)
  const canonical = computed(() => new URL(route.path, `${origin}/`).toString())
  const fullTitle = computed(() => {
    const title = toValue(options.title)
    return title === site.title ? title : `${title} · ${site.shortName}`
  })
  const absoluteImage = computed(() => {
    const image = options.image ? toValue(options.image) : undefined
    return image ? new URL(image, `${origin}/`).toString() : undefined
  })

  useSeoMeta({
    title: fullTitle,
    description: () => toValue(options.description),
    robots: options.noindex ? 'noindex, nofollow' : 'index, follow',
    ogTitle: fullTitle,
    ogDescription: () => toValue(options.description),
    ogSiteName: site.shortName,
    ogLocale: 'zh_CN',
    ogType: options.type ?? 'website',
    ogUrl: canonical,
    ogImage: absoluteImage,
    twitterCard: () => absoluteImage.value ? 'summary_large_image' : 'summary',
    articlePublishedTime: () => options.publishedTime ? toValue(options.publishedTime) : undefined,
    articleModifiedTime: () => options.modifiedTime ? toValue(options.modifiedTime) : undefined,
  })

  if (!options.noindex) {
    useHead(() => ({
      link: [{ key: 'canonical', rel: 'canonical', href: canonical.value }],
    }))
  }
}
