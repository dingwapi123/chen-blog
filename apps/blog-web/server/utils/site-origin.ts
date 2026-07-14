export function resolveSiteOrigin(configuredUrl: string | undefined, requestOrigin: string): string {
  for (const candidate of [configuredUrl, requestOrigin]) {
    if (!candidate) continue

    try {
      return new URL(candidate).origin
    } catch {
      // Ignore an invalid optional override and keep the request origin usable.
    }
  }

  throw new Error('A valid site origin is required.')
}
