import { isUuid } from '@chen-blog/shared-utils'

export default defineEventHandler(async (event) => {
  const postId = getRouterParam(event, 'postId')
  if (!postId || !isUuid(postId)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid post ID is required.' })
  }

  const page = await getPublishedPostPage(event, postId)
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: 'Published post was not found.' })
  }

  return page
})
