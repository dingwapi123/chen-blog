import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@chen-blog/database-types'

let client: SupabaseClient<Database> | null = null

export function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) throw new Error('缺少 VITE_SUPABASE_URL。')
  return url
}

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client
  const url = getSupabaseUrl()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('缺少 VITE_SUPABASE_PUBLISHABLE_KEY。')
  client = createClient<Database>(url, key)
  return client
}
