<script setup lang="ts">
import { ArrowUpRight, BookOpen, KeyRound, ShieldCheck } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAuth } from '@/composables/useAuth'

const email = shallowRef('')
const password = shallowRef('')
const errorMessage = shallowRef('')
const loading = shallowRef(false)
const router = useRouter()
const route = useRoute()
const { signIn } = useAuth()
const blogUrl = import.meta.env.VITE_BLOG_URL || 'http://localhost:3000'

const routeMessage = computed(() => {
  if (typeof route.query.authError === 'string') return route.query.authError
  if (route.query.reason === 'session-expired') return '登录状态已失效，请重新登录。'
  return ''
})

async function submit() {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    await signIn(email.value, password.value)
    const requested = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    const redirect = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/'
    await router.push(redirect)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败。'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <header class="login-page__header">
      <a class="login-brand" :href="blogUrl" rel="noreferrer" target="_blank">
        <span class="login-brand__mark" aria-hidden="true">C</span>
        <span>
          <strong>Chen Blog</strong>
          <small>Content workspace</small>
        </span>
      </a>
      <div class="login-page__header-actions">
        <a class="login-page__blog-link" :href="blogUrl" rel="noreferrer" target="_blank">
          访问博客
          <ArrowUpRight :size="15" aria-hidden="true" />
        </a>
        <ThemeToggle />
      </div>
    </header>

    <div class="login-layout">
      <section class="login-context" aria-labelledby="login-context-title">
        <p class="login-context__label"><span /> 单管理员内容系统</p>
        <h1 id="login-context-title">专注写作，<br>稳妥发布。</h1>
        <p class="login-context__intro">
          在一个清晰的工作区里管理文章、分类、标签与媒体，发布前完成内容校验。
        </p>
        <ul class="login-context__facts">
          <li>
            <BookOpen :size="18" aria-hidden="true" />
            <span><strong>内容集中管理</strong><small>草稿、文章结构与媒体保持一致</small></span>
          </li>
          <li>
            <ShieldCheck :size="18" aria-hidden="true" />
            <span><strong>权限边界明确</strong><small>所有数据写入由 Supabase RLS 保护</small></span>
          </li>
        </ul>
      </section>

      <section class="login-panel" aria-labelledby="login-title">
        <div class="login-panel__icon" aria-hidden="true">
          <KeyRound :size="21" />
        </div>
        <p class="login-panel__eyebrow">Secure access</p>
        <h2 id="login-title">登录内容工作台</h2>
        <p class="login-panel__intro">使用预先创建的管理员账号继续。</p>

        <ElForm class="login-form" label-position="top" @submit.prevent="submit">
          <ElFormItem label="邮箱">
            <ElInput
              v-model="email"
              autocomplete="email"
              inputmode="email"
              placeholder="owner@example.com"
              required
              type="email"
            />
          </ElFormItem>
          <ElFormItem label="密码">
            <ElInput
              v-model="password"
              autocomplete="current-password"
              placeholder="输入管理员密码"
              required
              show-password
              type="password"
            />
          </ElFormItem>
          <div class="login-form__feedback">
            <ElAlert
              v-if="errorMessage || routeMessage"
              class="login-form__alert"
              :closable="false"
              :title="errorMessage || routeMessage"
              type="error"
              show-icon
            />
          </div>
          <ElButton
            class="login-form__submit"
            :disabled="!email || !password"
            :loading="loading"
            native-type="submit"
            type="primary"
          >
            {{ loading ? '正在验证…' : '进入工作台' }}
          </ElButton>
        </ElForm>

        <p class="login-panel__note">
          本站不开放注册。账号权限由管理员在 Supabase 中预先配置。
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  background:
    linear-gradient(var(--outline-ghost) 1px, transparent 1px),
    linear-gradient(90deg, var(--outline-ghost) 1px, transparent 1px),
    var(--surface);
  background-position: center;
  background-size: 4rem 4rem;
}

.login-page::before {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 28% 42%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 31rem);
  content: '';
  pointer-events: none;
}

.login-page__header {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 5rem;
  align-items: center;
  justify-content: space-between;
  padding: 1rem clamp(1rem, 4vw, 3rem);
}

.login-brand,
.login-brand > span,
.login-page__header-actions,
.login-page__blog-link {
  display: flex;
  align-items: center;
}

.login-brand {
  gap: 0.75rem;
}

.login-brand__mark {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 0.55rem;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 800;
}

.login-brand > span:not(.login-brand__mark) {
  align-items: flex-start;
  flex-direction: column;
}

.login-brand strong {
  font-size: 0.9rem;
  letter-spacing: -0.02em;
}

.login-brand small {
  color: var(--on-surface-faint);
  font-size: 0.65rem;
}

.login-page__header-actions {
  gap: 0.55rem;
}

.login-page__blog-link {
  gap: 0.3rem;
  color: var(--on-surface-muted);
  font-size: 0.76rem;
  font-weight: 700;
}

.login-page__blog-link:hover {
  color: var(--accent);
}

.login-layout {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(calc(100% - 2rem), 68rem);
  min-height: calc(100svh - 8rem);
  align-items: center;
  grid-template-columns: minmax(0, 1.2fr) minmax(21rem, 0.8fr);
  gap: clamp(2rem, 7vw, 6.5rem);
  margin: 0 auto;
  padding: 2rem 0 5rem;
}

.login-context {
  max-width: 37rem;
}

.login-context__label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 1.2rem;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-context__label span {
  width: 1.8rem;
  height: 1px;
  background: var(--accent);
}

.login-context h1 {
  margin: 0;
  font-size: clamp(3.2rem, 6.5vw, 5.6rem);
  font-weight: 680;
  letter-spacing: -0.075em;
  line-height: 0.98;
}

.login-context__intro {
  max-width: 31rem;
  margin: 1.5rem 0 0;
  color: var(--on-surface-muted);
  font-size: 0.95rem;
  line-height: 1.8;
}

.login-context__facts {
  display: grid;
  gap: 0.85rem;
  max-width: 29rem;
  margin: 2.3rem 0 0;
  padding: 1.2rem 0 0;
  border-top: 1px solid var(--outline-ghost);
  list-style: none;
}

.login-context__facts li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.8rem;
  color: var(--accent);
}

.login-context__facts li > span {
  display: grid;
}

.login-context__facts strong {
  color: var(--on-surface);
  font-size: 0.8rem;
}

.login-context__facts small {
  color: var(--on-surface-faint);
  font-size: 0.72rem;
}

.login-panel {
  padding: clamp(1.4rem, 4vw, 2.25rem);
  border: 1px solid var(--outline-ghost);
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--surface-elevated) 96%, transparent);
  box-shadow: var(--shadow-floating);
}

.login-panel__icon {
  display: grid;
  width: 2.9rem;
  height: 2.9rem;
  place-items: center;
  margin-bottom: 1.3rem;
  border-radius: 0.65rem;
  background: var(--accent-soft);
  color: var(--accent);
}

.login-panel__eyebrow {
  margin: 0;
  color: var(--accent);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-panel h2 {
  margin: 0.3rem 0 0;
  font-size: 1.65rem;
  letter-spacing: -0.045em;
}

.login-panel__intro {
  margin: 0.45rem 0 1.6rem;
  color: var(--on-surface-muted);
  font-size: 0.82rem;
}

.login-form__feedback {
  min-height: 3.5rem;
}

.login-form__alert {
  width: 100%;
  margin: 0;
}

.login-form__submit {
  width: 100%;
  min-height: 2.7rem;
  margin-top: 0.25rem;
}

.login-panel__note {
  margin: 1.2rem 0 0;
  padding-top: 1.1rem;
  border-top: 1px solid var(--outline-ghost);
  color: var(--on-surface-faint);
  font-size: 0.69rem;
  line-height: 1.6;
}

@media (max-width: 820px) {
  .login-layout {
    width: min(calc(100% - 2rem), 30rem);
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    padding-top: 1rem;
  }

  .login-context {
    text-align: center;
  }

  .login-context__label {
    justify-content: center;
  }

  .login-context h1 {
    font-size: clamp(2.8rem, 13vw, 4.3rem);
  }

  .login-context__intro {
    margin-inline: auto;
  }

  .login-context__facts {
    display: none;
  }
}

@media (max-width: 430px) {
  .login-page__header {
    padding-inline: 0.75rem;
  }

  .login-brand small,
  .login-page__blog-link {
    display: none;
  }

  .login-layout {
    width: min(calc(100% - 1.5rem), 30rem);
  }

  .login-context__intro {
    font-size: 0.84rem;
  }

  .login-panel {
    padding: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-page::before {
    display: none;
  }
}
</style>
