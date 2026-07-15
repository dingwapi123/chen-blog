import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceRoleClient, requireOwner } from './admin-auth'

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))

function httpError(statusCode: number, statusMessage: string) {
  return Object.assign(new Error(statusMessage), { statusCode, statusMessage })
}

function createUserClient(role: string | null = 'owner') {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'owner-id' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: role ? { role } : null, error: null }),
        })),
      })),
    })),
  }
}

describe('admin authentication', () => {
  let authorization: string | undefined
  let runtimeConfig: {
    supabaseServiceRoleKey: string
    public: { supabaseUrl: string; supabasePublishableKey: string }
  }

  beforeEach(() => {
    authorization = 'Bearer owner-token'
    runtimeConfig = {
      supabaseServiceRoleKey: 'server-secret',
      public: {
        supabaseUrl: 'https://project.supabase.co',
        supabasePublishableKey: 'publishable-key',
      },
    }
    createClientMock.mockReset()
    vi.stubGlobal('getRequestHeader', vi.fn(() => authorization))
    vi.stubGlobal('useRuntimeConfig', vi.fn(() => runtimeConfig))
    vi.stubGlobal('createError', vi.fn(({ statusCode, statusMessage }) => httpError(statusCode, statusMessage)))
  })

  it('rejects a request without a bearer token before creating a client', async () => {
    authorization = undefined

    await expect(requireOwner({} as never)).rejects.toMatchObject({ statusCode: 401 })
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid access token', async () => {
    const client = createUserClient()
    client.auth.getUser.mockResolvedValue({ data: { user: null as never }, error: new Error('invalid token') })
    createClientMock.mockReturnValue(client)

    await expect(requireOwner({} as never)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects an authenticated non-owner', async () => {
    createClientMock.mockReturnValue(createUserClient(null))

    await expect(requireOwner({} as never)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns the authenticated owner after checking the profile', async () => {
    const client = createUserClient()
    createClientMock.mockReturnValue(client)

    await expect(requireOwner({} as never)).resolves.toMatchObject({ id: 'owner-id' })
    expect(client.auth.getUser).toHaveBeenCalledWith('owner-token')
    expect(createClientMock).toHaveBeenCalledWith(
      runtimeConfig.public.supabaseUrl,
      runtimeConfig.public.supabasePublishableKey,
      expect.objectContaining({ global: { headers: { Authorization: 'Bearer owner-token' } } }),
    )
  })

  it('fails closed when the private publishing key is missing', () => {
    runtimeConfig.supabaseServiceRoleKey = ''

    expect(() => getServiceRoleClient({} as never)).toThrow(expect.objectContaining({ statusCode: 500 }))
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('creates the publishing client only from private runtime configuration', () => {
    const serviceClient = { from: vi.fn() }
    createClientMock.mockReturnValue(serviceClient)

    expect(getServiceRoleClient({} as never)).toBe(serviceClient)
    expect(createClientMock).toHaveBeenCalledWith(
      runtimeConfig.public.supabaseUrl,
      runtimeConfig.supabaseServiceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
  })
})
