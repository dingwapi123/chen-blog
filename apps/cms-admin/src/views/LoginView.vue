<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
const email=shallowRef(''), password=shallowRef(''), errorMessage=shallowRef(''), loading=shallowRef(false)
const router=useRouter(), route=useRoute(); const {signIn}=useAuth()
const routeMessage = computed(() => {
  if (typeof route.query.authError === 'string') return route.query.authError
  if (route.query.reason === 'session-expired') return '登录状态已失效，请重新登录。'
  return ''
})
async function submit(){loading.value=true;errorMessage.value='';try{await signIn(email.value,password.value);const requested=typeof route.query.redirect==='string'?route.query.redirect:'/';const redirect=requested.startsWith('/')&&!requested.startsWith('//')?requested:'/';await router.push(redirect)}catch(error){errorMessage.value=error instanceof Error?error.message:'登录失败。'}finally{loading.value=false}}
</script>
<template>
  <main class="login-page">
    <section class="login-panel" aria-labelledby="login-title">
      <p class="eyebrow">Chen Blog CMS</p>
      <h1 id="login-title">欢迎回来</h1>
      <p class="intro">使用管理员账号继续管理内容。</p>
      <ElForm label-position="top" @submit.prevent="submit">
        <ElFormItem label="邮箱"><ElInput v-model="email" autocomplete="email" required type="email" /></ElFormItem>
        <ElFormItem label="密码"><ElInput v-model="password" autocomplete="current-password" required show-password type="password" /></ElFormItem>
        <ElAlert v-if="errorMessage || routeMessage" :closable="false" :title="errorMessage || routeMessage" type="error" show-icon />
        <ElButton :loading="loading" native-type="submit" type="primary">登录 CMS</ElButton>
      </ElForm>
    </section>
    <div class="login-theme"><ThemeToggle /></div>
  </main>
</template>

<style scoped>
.login-page { display: grid; min-height: 100svh; place-items: center; padding: 2rem; }
.login-panel { width: min(100%, 25rem); padding: 2rem; border-radius: 0.75rem; background: var(--surface-elevated); }
.login-panel h1 { margin: 0.35rem 0 0; font-size: 2rem; letter-spacing: -0.05em; }
.intro { margin: 0.45rem 0 1.75rem; color: var(--on-surface-muted); }
.login-theme { position: fixed; right: 1.25rem; top: 1.25rem; }
</style>
