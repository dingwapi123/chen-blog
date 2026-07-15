<script setup lang="ts">
import { Check, KeyRound, LockKeyhole, Mail, ShieldCheck } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import AdminShell from '@/components/AdminShell.vue'
import AdminPage from '@/components/common/AdminPage.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAuth } from '@/composables/useAuth'

const password = shallowRef('')
const confirmPassword = shallowRef('')
const feedback = shallowRef<{ type: 'error' | 'success'; message: string } | null>(null)
const saving = shallowRef(false)
const { user, updatePassword } = useAuth()

const passwordChecks = computed(() => [
  { label: '至少 8 个字符', complete: password.value.length >= 8 },
  { label: '两次输入一致', complete: Boolean(password.value) && password.value === confirmPassword.value },
])
const canSubmit = computed(() => passwordChecks.value.every(item => item.complete) && !saving.value)

function formatDate(value: string | undefined) {
  if (!value) return '暂无记录'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function submit() {
  feedback.value = null
  if (password.value.length < 8) {
    feedback.value = { type: 'error', message: '密码至少需要 8 个字符。' }
    return
  }
  if (password.value !== confirmPassword.value) {
    feedback.value = { type: 'error', message: '两次输入的密码不一致。' }
    return
  }

  saving.value = true
  try {
    await updatePassword(password.value)
    password.value = ''
    confirmPassword.value = ''
    feedback.value = { type: 'success', message: '密码已更新，请在下一次登录时使用新密码。' }
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: error instanceof Error ? error.message : '密码更新失败。',
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminShell>
    <AdminPage>
      <PageHeader
        description="查看唯一管理员身份和当前会话，并在需要时更新登录密码。"
        eyebrow="IDENTITY & SECURITY"
        title="账户与安全"
      >
        <template #actions>
          <StatusBadge label="Owner" status="success" />
        </template>
      </PageHeader>

      <div class="account-grid">
        <section class="account-panel identity-panel" aria-labelledby="identity-title">
          <header>
            <span class="panel-icon"><ShieldCheck :size="19" aria-hidden="true" /></span>
            <div>
              <p class="panel-kicker">IDENTITY</p>
              <h2 id="identity-title">管理员身份</h2>
            </div>
          </header>

          <div class="identity-mark" aria-hidden="true">
            {{ user?.email?.slice(0, 1).toUpperCase() || 'C' }}
          </div>
          <div class="identity-primary">
            <strong>{{ user?.email || '管理员邮箱不可用' }}</strong>
            <span>Chen Blog 的唯一内容管理员</span>
          </div>

          <dl>
            <div>
              <dt><Mail :size="15" aria-hidden="true" />登录邮箱</dt>
              <dd>{{ user?.email || '—' }}</dd>
            </div>
            <div>
              <dt><LockKeyhole :size="15" aria-hidden="true" />账户角色</dt>
              <dd>owner</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{{ formatDate(user?.created_at) }}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{{ formatDate(user?.last_sign_in_at) }}</dd>
            </div>
          </dl>

          <div class="identity-note">
            <ShieldCheck :size="17" aria-hidden="true" />
            <span>角色由受控数据库记录维护，浏览器不能创建用户或修改 owner 权限。</span>
          </div>
        </section>

        <section class="account-panel password-panel" aria-labelledby="password-title">
          <header>
            <span class="panel-icon"><KeyRound :size="19" aria-hidden="true" /></span>
            <div>
              <p class="panel-kicker">PASSWORD</p>
              <h2 id="password-title">修改登录密码</h2>
            </div>
          </header>

          <p class="password-intro">更新只作用于当前 owner 账户。请使用未在其他站点重复使用的密码。</p>

          <form @submit.prevent="submit">
            <ElFormItem label="新密码">
              <ElInput
                v-model="password"
                autocomplete="new-password"
                maxlength="128"
                minlength="8"
                placeholder="输入至少 8 个字符"
                show-password
                type="password"
              />
            </ElFormItem>
            <ElFormItem label="确认新密码">
              <ElInput
                v-model="confirmPassword"
                autocomplete="new-password"
                maxlength="128"
                minlength="8"
                placeholder="再次输入新密码"
                show-password
                type="password"
              />
            </ElFormItem>

            <ul class="password-checks" aria-label="密码要求">
              <li v-for="item in passwordChecks" :key="item.label" :class="{ complete: item.complete }">
                <Check :size="14" aria-hidden="true" />
                {{ item.label }}
              </li>
            </ul>

            <p
              v-if="feedback"
              class="account-feedback"
              :class="`account-feedback--${feedback.type}`"
              :role="feedback.type === 'error' ? 'alert' : 'status'"
            >
              {{ feedback.message }}
            </p>

            <ElButton :disabled="!canSubmit" :loading="saving" native-type="submit" type="primary">
              更新密码
            </ElButton>
          </form>

          <div class="session-note">
            <strong>会话说明</strong>
            <span>密码修改成功后当前会话仍可继续使用；共享设备上完成工作后，请从左侧账户菜单退出。</span>
          </div>
        </section>
      </div>
    </AdminPage>
  </AdminShell>
</template>

<style scoped>
.account-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(22rem, 1.1fr);
  gap: 1.25rem;
  padding-top: 1.25rem;
  align-items: start;
}

.account-panel {
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.account-panel > header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  background: var(--surface-container);
}

.panel-icon {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: var(--radius-small);
  background: var(--surface-high);
  color: var(--accent);
}

.panel-kicker {
  margin: 0;
  color: var(--on-surface-faint);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.account-panel h2 {
  margin: 0.05rem 0 0;
  font-size: 0.95rem;
  letter-spacing: -0.02em;
}

.identity-panel {
  display: grid;
  justify-items: center;
}

.identity-panel > header,
.identity-panel dl,
.identity-note {
  width: 100%;
}

.identity-mark {
  display: grid;
  width: 5rem;
  height: 5rem;
  place-items: center;
  margin-top: 1.6rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-container));
  color: var(--on-accent);
  font-size: 1.8rem;
  font-weight: 800;
}

.identity-primary {
  display: grid;
  justify-items: center;
  gap: 0.2rem;
  padding: 0.8rem 1rem 1.3rem;
  text-align: center;
}

.identity-primary strong {
  font-size: 0.9rem;
}

.identity-primary span {
  color: var(--on-surface-muted);
  font-size: 0.75rem;
}

.identity-panel dl {
  display: grid;
  gap: 0.2rem;
  margin: 0;
  padding: 0 1rem 1rem;
}

.identity-panel dl > div {
  display: flex;
  min-height: 3.1rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.65rem;
  border-radius: var(--radius-small);
}

.identity-panel dl > div:hover {
  background: var(--surface-low);
}

.identity-panel dt {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--on-surface-muted);
  font-size: 0.75rem;
}

.identity-panel dd {
  overflow: hidden;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.identity-note {
  display: flex;
  gap: 0.55rem;
  padding: 0.85rem 1rem;
  background: var(--accent-soft);
  color: var(--accent);
}

.identity-note span {
  color: var(--on-surface-muted);
  font-size: 0.72rem;
  line-height: 1.55;
}

.password-intro {
  margin: 0;
  padding: 1.1rem 1.1rem 0;
  color: var(--on-surface-muted);
  font-size: 0.8rem;
}

.password-panel form {
  display: grid;
  gap: 0.2rem;
  padding: 1.1rem;
}

.password-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 1rem;
  margin: 0.2rem 0 0.8rem;
  padding: 0;
  list-style: none;
}

.password-checks li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--on-surface-faint);
  font-size: 0.72rem;
}

.password-checks li.complete {
  color: var(--success);
}

.account-feedback {
  margin: 0 0 0.8rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius-small);
  font-size: 0.76rem;
}

.account-feedback--success {
  background: var(--success-soft);
  color: var(--success);
}

.account-feedback--error {
  background: var(--danger-soft);
  color: var(--danger);
}

.password-panel form :deep(.el-button) {
  justify-self: start;
}

.session-note {
  display: grid;
  gap: 0.2rem;
  padding: 0.9rem 1.1rem;
  background: var(--surface-container);
}

.session-note strong {
  font-size: 0.75rem;
}

.session-note span {
  color: var(--on-surface-muted);
  font-size: 0.72rem;
  line-height: 1.55;
}

@media (max-width: 820px) {
  .account-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .identity-panel dl > div {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.2rem;
  }

  .identity-panel dd {
    max-width: 100%;
    text-align: left;
  }
}
</style>
