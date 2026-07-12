export function applyAdminCors(event: Parameters<typeof getRequestHeader>[0]): boolean {
  const config = useRuntimeConfig(event)
  const origin = getRequestHeader(event, 'origin')
  setResponseHeader(event, 'Vary', 'Origin')
  if (origin !== config.cmsOrigin) return false
  setResponseHeader(event, 'Access-Control-Allow-Origin', config.cmsOrigin)
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'POST, OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Authorization, Content-Type')
  setResponseHeader(event, 'Access-Control-Max-Age', 600)
  return true
}

export function requireAllowedCmsOrigin(event: Parameters<typeof getRequestHeader>[0]) {
  if (!applyAdminCors(event)) {
    throw createError({ statusCode: 403, statusMessage: 'Origin is not allowed.' })
  }
}
