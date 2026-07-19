import {
  assertAllowedContent,
  assertPublishablePostFields,
  getPostImagesPublicUrlPrefix,
} from '@chen-blog/content-rules'
import { isUuid } from '@chen-blog/shared-utils'

export default defineEventHandler(async (event) => {
  requireAllowedCmsOrigin(event)
  await requireOwner(event)
  const postId = getRouterParam(event, 'postId')
  if (!postId || !isUuid(postId)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid post ID is required.' })
  }
  const serviceClient = getServiceRoleClient(event)
  const { data: post, error: postError } = await serviceClient
    .from('posts')
    .select('title,content,status,updated_at,deleted_at')
    .eq('id', postId)
    .maybeSingle()
  if (postError) throw createError({ statusCode: 502, statusMessage: postError.message })
  if (!post || post.status !== 'draft' || post.deleted_at) {
    throw createError({ statusCode: 409, statusMessage: 'Only active drafts can be published.' })
  }
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase public configuration is missing.' })
  }
  try {
    assertPublishablePostFields(post)
    await assertAllowedContent(post.content, {
      allowedImagePrefixes: [getPostImagesPublicUrlPrefix(config.public.supabaseUrl)],
    })
  } catch (error) {
    throw createError({ statusCode: 422, statusMessage: error instanceof Error ? error.message : 'Article content is invalid.' })
  }
  const { data, error } = await serviceClient
    .from('posts')
    .update({ status: 'published', deleted_at: null })
    .eq('id', postId)
    .eq('status', 'draft')
    .eq('updated_at', post.updated_at)
    .is('deleted_at', null)
    .select('id,status,published_at')
    .maybeSingle()
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  if (!data || data.status !== 'published' || !data.published_at) {
    throw createError({ statusCode: 409, statusMessage: 'The draft changed while it was being published. Please retry.' })
  }
  return { id: data.id, status: 'published' as const, publishedAt: data.published_at }
})
