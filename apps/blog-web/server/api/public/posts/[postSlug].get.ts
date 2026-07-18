export default defineEventHandler(async (event) => {
  const postSlug = getRouterParam(event, 'postSlug')
  if (!postSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Post slug is required.' })
  }

  const page = await getPublishedPostPage(event, postSlug)
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: 'Published post was not found.' })
  }

  return page
})
