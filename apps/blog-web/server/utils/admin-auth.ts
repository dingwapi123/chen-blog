import type { Database } from '@chen-blog/database-types'
import { createClient } from '@supabase/supabase-js'

export async function requireOwner(event: Parameters<typeof getRequestHeader>[0]) {
  const authorization = getRequestHeader(event, 'authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing access token.' })
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl || !config.supabasePublishableKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase public configuration is missing.' })
  }
  const client = createClient<Database>(config.public.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: userError } = await client.auth.getUser(token)
  if (userError || !userData.user) throw createError({ statusCode: 401, statusMessage: 'Invalid access token.' })
  const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (profileError || profile?.role !== 'owner') throw createError({ statusCode: 403, statusMessage: 'Owner access is required.' })
  return userData.user
}

export function getServiceRoleClient(event: Parameters<typeof getRequestHeader>[0]) {
  const config = useRuntimeConfig(event)
  if (!config.supabaseServiceRoleKey || !config.public.supabaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Server publishing configuration is missing.' })
  }
  return createClient<Database>(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
