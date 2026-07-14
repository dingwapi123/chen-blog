import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSupabaseMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  getSupabase: getSupabaseMock,
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.resetModules()
    getSupabaseMock.mockReset()
  })

  it('allows initialization to retry after a transient session error', async () => {
    const getSession = vi.fn()
      .mockResolvedValueOnce({ data: { session: null }, error: new Error('network unavailable') })
      .mockResolvedValueOnce({ data: { session: null }, error: null })
    const onAuthStateChange = vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }))
    getSupabaseMock.mockReturnValue({
      auth: { getSession, onAuthStateChange },
    })

    const { useAuth } = await import('@/composables/useAuth')
    const auth = useAuth()

    await expect(auth.initialize()).rejects.toThrow('network unavailable')
    await expect(auth.initialize()).resolves.toBeUndefined()
    expect(getSession).toHaveBeenCalledTimes(2)
    expect(onAuthStateChange).toHaveBeenCalledOnce()
  })

  it('ignores a stale owner lookup after the user signs out', async () => {
    let authChange: ((event: string, session: { user: { id: string } } | null) => void) | undefined
    let resolveProfile: ((value: { data: { role: string }, error: null }) => void) | undefined
    const profile = new Promise<{ data: { role: string }, error: null }>((resolve) => {
      resolveProfile = resolve
    })
    const maybeSingle = vi.fn(() => profile)
    const onAuthStateChange = vi.fn((handler) => {
      authChange = handler
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    getSupabaseMock.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange,
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    })

    const { useAuth } = await import('@/composables/useAuth')
    const auth = useAuth()
    await auth.initialize()

    authChange?.('SIGNED_IN', { user: { id: 'owner-id' } })
    await Promise.resolve()
    authChange?.('SIGNED_OUT', null)
    await Promise.resolve()
    resolveProfile?.({ data: { role: 'owner' }, error: null })
    await Promise.resolve()

    expect(auth.user.value).toBeNull()
    expect(auth.isOwner.value).toBe(false)
  })
})
