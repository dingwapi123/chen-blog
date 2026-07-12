export default defineEventHandler((event) => {
  if (!applyAdminCors(event)) {
    setResponseStatus(event, 403)
    return
  }
  setResponseStatus(event, 204)
})
