<script setup lang="ts">
import { shallowRef } from 'vue'
import AdminShell from '@/components/AdminShell.vue'
import { useAuth } from '@/composables/useAuth'
const password=shallowRef(''),confirmPassword=shallowRef(''),message=shallowRef(''),saving=shallowRef(false);const {user,updatePassword}=useAuth()
async function submit(){if(password.value.length<8){message.value='密码至少需要 8 个字符。';return}if(password.value!==confirmPassword.value){message.value='两次输入的密码不一致。';return}saving.value=true;message.value='';try{await updatePassword(password.value);password.value='';confirmPassword.value='';message.value='密码已更新。'}catch(error){message.value=error instanceof Error?error.message:'更新失败。'}finally{saving.value=false}}
</script>
<template><AdminShell><p class="eyebrow">account</p><h1 class="page-title">账户</h1><section class="account"><p><span>当前管理员</span>{{user?.email}}</p><form @submit.prevent="submit"><h2>修改密码</h2><div class="field"><label for="password">新密码</label><input id="password" v-model="password" autocomplete="new-password" class="input" minlength="8" required type="password"></div><div class="field"><label for="confirm">确认新密码</label><input id="confirm" v-model="confirmPassword" autocomplete="new-password" class="input" minlength="8" required type="password"></div><p v-if="message" class="hint" role="status">{{message}}</p><button class="button button--primary" :disabled="saving" type="submit">{{saving?'正在保存…':'更新密码'}}</button></form></section></AdminShell></template>
<style scoped>.account{display:grid;gap:2rem;max-width:28rem;margin-top:1.5rem}.account>p{display:grid;gap:.25rem;padding:1rem;border-radius:.55rem;background:var(--surface-low)}.account>p span{color:var(--on-surface-muted);font-size:.8rem}form{display:grid;gap:1rem}form h2{margin:0;font-size:1.1rem}</style>
