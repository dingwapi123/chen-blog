import { computed, readonly, shallowRef } from 'vue'
import type { Subscription, User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

const user = shallowRef<User | null>(null)
const owner = shallowRef(false)
const initialized = shallowRef(false)
const initializing = shallowRef<Promise<void> | null>(null)
const authError = shallowRef('')
let authSubscription: Subscription | undefined
let ownerResolutionVersion = 0

async function resolveOwner(nextUser: User | null) {
  const resolutionVersion = ++ownerResolutionVersion
  const userChanged = user.value?.id !== nextUser?.id
  user.value = nextUser
  authError.value = ''

  if (!nextUser) {
    owner.value = false
    return
  }
  if (userChanged) owner.value = false

  const { data, error } = await getSupabase()
    .from('profiles')
    .select('role')
    .eq('id', nextUser.id)
    .maybeSingle()
  if (resolutionVersion !== ownerResolutionVersion || user.value?.id !== nextUser.id) return
  if (error) throw error
  owner.value = data?.role === 'owner'
}

function subscribeToAuthChanges() {
  if (authSubscription) return
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    queueMicrotask(() => {
      void resolveOwner(session?.user ?? null).catch((error: unknown) => {
        owner.value = false
        authError.value = error instanceof Error ? error.message : '登录状态校验失败。'
      })
    })
  })
  authSubscription = data.subscription
}

export function useAuth() {
  const isOwner = computed(() => owner.value)

  async function initialize() {
    if (initialized.value) return
    if (initializing.value) return initializing.value

    const attempt = (async () => {
      const { data, error } = await getSupabase().auth.getSession()
      if (error) throw error
      await resolveOwner(data.session?.user ?? null)
      subscribeToAuthChanges()
      initialized.value = true
    })()
    initializing.value = attempt

    try {
      await attempt
    } catch (error) {
      authError.value = error instanceof Error ? error.message : '登录状态初始化失败。'
      throw error
    } finally {
      if (initializing.value === attempt) initializing.value = null
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
    await resolveOwner(data.user)
    if (!owner.value) {
      await getSupabase().auth.signOut()
      throw new Error('当前账号没有管理员权限。')
    }
  }

  async function signOut() {
    const { error } = await getSupabase().auth.signOut()
    if (error) throw error
    await resolveOwner(null)
  }

  async function updatePassword(password: string) {
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) throw error
  }

  return {
    user: readonly(user),
    isOwner,
    authError: readonly(authError),
    initialize,
    signIn,
    signOut,
    updatePassword,
  }
}
