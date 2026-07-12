export default defineEventHandler(async (event) => {
  requireAllowedCmsOrigin(event)
  await requireOwner(event)
  const postId = getRouterParam(event, 'postId')
  if (!postId) throw createError({ statusCode: 400, statusMessage: 'Post ID is required.' })
  const { data, error } = await getServiceRoleClient(event)
    .from('posts')
    .update({ status: 'published', deleted_at: null })
    .eq('id', postId)
    .select('id,status,published_at')
    .maybeSingle()
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  if (!data || data.status !== 'published' || !data.published_at) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found.' })
  }
  return { id: data.id, status: 'published' as const, publishedAt: data.published_at }
})
