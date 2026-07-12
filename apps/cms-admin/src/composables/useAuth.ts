import { computed, readonly, shallowRef } from 'vue'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

const user = shallowRef<User | null>(null)
const owner = shallowRef(false)
const initialized = shallowRef(false)
const initializing = shallowRef<Promise<void> | null>(null)

export function useAuth() {
  const isOwner = computed(() => owner.value)
  async function resolveOwner(nextUser: User | null) { user.value = nextUser; if (!nextUser) { owner.value = false; return }; const { data, error } = await getSupabase().from('profiles').select('role').eq('id', nextUser.id).maybeSingle(); if (error) throw error; owner.value = data?.role === 'owner' }
  async function initialize() { if (initialized.value) return; if (initializing.value) return initializing.value; initializing.value = (async () => { const { data, error } = await getSupabase().auth.getSession(); if (error) throw error; await resolveOwner(data.session?.user ?? null); getSupabase().auth.onAuthStateChange((_event, session) => { void resolveOwner(session?.user ?? null) }); initialized.value = true })(); return initializing.value }
  async function signIn(email: string, password: string) { const { data, error } = await getSupabase().auth.signInWithPassword({ email, password }); if (error) throw error; await resolveOwner(data.user); if (!owner.value) { await getSupabase().auth.signOut(); throw new Error('当前账号没有管理员权限。') } }
  async function signOut() { await getSupabase().auth.signOut(); user.value = null; owner.value = false }
  async function updatePassword(password: string) { const { error } = await getSupabase().auth.updateUser({ password }); if (error) throw error }
  return { user: readonly(user), isOwner, initialize, signIn, signOut, updatePassword }
}
