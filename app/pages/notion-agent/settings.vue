<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useNotionAgent } from '../../../composables/useNotionAgent'

definePageMeta({ layout: 'main' })

useSeoMeta({
  title: '노션 에이전트 설정 - Subculture Ground',
  description: '노션 Integration 토큰과 Anthropic API 키를 등록합니다.',
})

const { status, fetchStatus, saveCredentials, deleteCredentials } = useNotionAgent()

const notionToken = ref('')
const anthropicKey = ref('')
const saving = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

onMounted(async () => {
  const token = useCookie<string | null>('access_token')
  if (!token.value) {
    await navigateTo('/auth/login')
    return
  }
  await fetchStatus().catch(() => undefined)
})

const handleSave = async () => {
  if (!notionToken.value && !anthropicKey.value) {
    message.value = { type: 'error', text: '저장할 값을 입력해주세요.' }
    return
  }
  saving.value = true
  message.value = null
  try {
    const dto: { notionToken?: string; anthropicKey?: string } = {}
    if (notionToken.value) dto.notionToken = notionToken.value.trim()
    if (anthropicKey.value) dto.anthropicKey = anthropicKey.value.trim()
    await saveCredentials(dto)
    notionToken.value = ''
    anthropicKey.value = ''
    await fetchStatus()
    message.value = { type: 'success', text: '저장했어요. 이제 에이전트와 대화할 수 있습니다.' }
  } catch {
    message.value = { type: 'error', text: '저장에 실패했어요. 잠시 후 다시 시도해주세요.' }
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('저장된 토큰과 API 키를 모두 삭제할까요?')) return
  try {
    await deleteCredentials()
    message.value = { type: 'success', text: '삭제했어요.' }
  } catch {
    message.value = { type: 'error', text: '삭제에 실패했어요.' }
  }
}
</script>

<template>
  <div class="page">
    <main class="settings-main">
      <header class="settings-head">
        <NuxtLink to="/notion-agent" class="back-link">← 에이전트로 돌아가기</NuxtLink>
        <h1 class="settings-title">노션 에이전트 설정</h1>
        <p class="settings-desc">
          노션 Integration 토큰과 Anthropic API 키를 등록하면 에이전트가 동작합니다.
          두 값 모두 서버에 암호화되어 저장돼요.
        </p>
      </header>

      <section class="status-card" aria-live="polite">
        <h2 class="status-title">연결 상태</h2>
        <ul class="status-list">
          <li class="status-item">
            <span :class="['status-dot', status?.hasNotionToken ? 'is-on' : 'is-off']" />
            노션 토큰:
            <strong v-if="status?.hasNotionToken">
              연결됨<template v-if="status?.notionWorkspace"> — {{ status.notionWorkspace }}</template>
            </strong>
            <strong v-else>미설정</strong>
          </li>
          <li class="status-item">
            <span :class="['status-dot', status?.hasAnthropicKey ? 'is-on' : 'is-off']" />
            Anthropic API 키: <strong>{{ status?.hasAnthropicKey ? '연결됨' : '미설정' }}</strong>
          </li>
        </ul>
      </section>

      <form class="settings-form" @submit.prevent="handleSave">
        <div class="form-field">
          <label class="form-label" for="notion-token">노션 Integration 토큰</label>
          <input
            id="notion-token"
            v-model="notionToken"
            type="password"
            class="form-input"
            placeholder="ntn_ 또는 secret_ 으로 시작"
            autocomplete="off"
          />
          <p class="form-hint">
            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener">
              notion.so/my-integrations</a
            >에서 Integration을 만들고, 사용할 페이지/DB에 연결(Connections)해야 검색됩니다.
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" for="anthropic-key">Anthropic API 키</label>
          <input
            id="anthropic-key"
            v-model="anthropicKey"
            type="password"
            class="form-input"
            placeholder="sk-ant-"
            autocomplete="off"
          />
          <p class="form-hint">
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">
              console.anthropic.com</a
            >에서 발급한 키. 에이전트의 두뇌(Claude) 호출에 사용됩니다.
          </p>
        </div>

        <p v-if="message" :class="['form-message', `is-${message.type}`]">{{ message.text }}</p>

        <div class="form-actions">
          <button type="submit" class="btn btn--primary" :disabled="saving">
            {{ saving ? '저장 중…' : '저장' }}
          </button>
          <button
            v-if="status?.hasNotionToken || status?.hasAnthropicKey"
            type="button"
            class="btn btn--ghost"
            @click="handleDelete"
          >
            전체 삭제
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<style scoped>
.settings-main {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-lg) var(--space-lg) var(--space-section);
}

.settings-head {
  margin-bottom: var(--space-lg);
}

.settings-title {
  margin: var(--space-sm) 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
}

.settings-desc {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
}

.status-card {
  padding: var(--space-base);
  border: 1px solid var(--hairline-soft);
  border-radius: 14px;
  background: var(--surface-soft);
  margin-bottom: var(--space-lg);
}

.status-title {
  margin: 0 0 var(--space-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.status-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 13px;
  color: var(--body-text);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.status-dot.is-on {
  background: #16a34a;
}

.status-dot.is-off {
  background: var(--hairline);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.form-input {
  padding: var(--space-md) var(--space-base);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-size: 14px;
  color: var(--ink);
  outline: none;
  transition: border-color 120ms ease;
}

.form-input:focus {
  border-color: var(--ink);
}

.form-hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted-soft);
  line-height: 1.5;
}

.form-hint a {
  color: var(--primary);
  text-decoration: none;
}

.form-message {
  margin: 0;
  font-size: 13px;
}

.form-message.is-success {
  color: #16a34a;
}

.form-message.is-error {
  color: var(--error);
}

.form-actions {
  display: flex;
  gap: var(--space-md);
}
</style>
