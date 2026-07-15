import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

export function useNotFoundResponse(
  isNotFound: MaybeRefOrGetter<boolean>,
  statusMessage = 'Page Not Found',
): void {
  const event = useRequestEvent()

  if (event && toValue(isNotFound)) {
    setResponseStatus(event, 404, statusMessage)
  }
}
