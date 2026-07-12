<script setup lang="ts">
import { shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
const email=shallowRef(''), password=shallowRef(''), errorMessage=shallowRef(''), loading=shallowRef(false)
const router=useRouter(), route=useRoute(); const {signIn}=useAuth()
async function submit(){loading.value=true;errorMessage.value='';try{await signIn(email.value,password.value);const redirect=typeof route.query.redirect==='string'?route.query.redirect:'/';await router.push(redirect)}catch(error){errorMessage.value=error instanceof Error?error.message:'登录失败。'}finally{loading.value=false}}
</script>
<template><main class="login-page"><section class="login-panel"><p class="eyebrow">Chen Blog CMS</p><h1>欢迎回来</h1><p>使用管理员账号继续管理内容。</p><form @submit.prevent="submit"><div class="field"><label for="email">邮箱</label><input id="email" v-model="email" class="input" autocomplete="email" required type="email"></div><div class="field"><label for="password">密码</label><input id="password" v-model="password" class="input" autocomplete="current-password" required type="password"></div><p v-if="errorMessage" class="error">{{ errorMessage }}</p><button class="button button--primary" :disabled="loading" type="submit">{{ loading?'正在登录…':'登录 CMS' }}</button></form></section><div class="login-theme"><ThemeToggle /></div></main></template>
<style scoped>.login-page{display:grid;min-height:100svh;place-items:center;padding:2rem}.login-panel{width:min(100%,25rem);padding:2rem;border:1px solid var(--border);border-radius:.75rem;background:var(--bg-elevated)}.login-panel h1{margin:.35rem 0 0;font-size:2rem;letter-spacing:-.05em}.login-panel>p:last-of-type{margin:.45rem 0 1.75rem;color:var(--text-muted)}form{display:grid;gap:1rem}.error{margin:0;color:var(--danger);font-size:.85rem}.login-theme{position:fixed;right:1.25rem;top:1.25rem}</style>
