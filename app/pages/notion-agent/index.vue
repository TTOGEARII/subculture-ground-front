<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useNotionAgent, type ChatMessage } from '../../../composables/useNotionAgent'

definePageMeta({ layout: 'main' })

useSeoMeta({
  title: '노션 AI 에이전트 - Subculture Ground',
  description: '노션 워크스페이스를 관리하고 합주실 예약 일정을 캘린더에 등록하는 AI 에이전트.',
})

const { status, fetchStatus, sendMessage } = useNotionAgent()

const ready = ref(false) // 자격증명 확인 완료 + 둘 다 설정됨
const checking = ref(true)
const messages = ref<ChatMessage[]>([])
const input = ref('')
const sending = ref(false)
const errorText = ref('')
const listEl = ref<HTMLElement | null>(null)

const TOOL_LABELS: Record<string, string> = {
  notion_search: '노션 검색',
  notion_get_database: 'DB 스키마 조회',
  notion_query_database: 'DB 조회',
  notion_create_page: '페이지 생성',
  notion_update_page: '페이지 수정',
  notion_get_page: '페이지 조회',
  search_studios: '합주실 검색',
  get_available_slots: '빈 시간 조회',
  get_reservation_url: '예약 링크',
}

const suggestions = [
  '이번 주 토요일에 홍대 쪽 합주실 빈 시간 알려줘',
  '내 노션에 어떤 데이터베이스가 있는지 보여줘',
  '7월 20일 19시 그라운드 합정 A룸 예약했어. 캘린더에 등록해줘',
]

onMounted(async () => {
  const token = useCookie<string | null>('access_token')
  if (!token.value) {
    await navigateTo('/auth/login')
    return
  }
  try {
    const s = await fetchStatus()
    ready.value = s.hasNotionToken && s.hasAnthropicKey
  } catch {
    ready.value = false
  } finally {
    checking.value = false
  }
})

const scrollToBottom = async () => {
  await nextTick()
  listEl.value?.scrollTo({ top: listEl.value.scrollHeight, behavior: 'smooth' })
}

const handleSend = async (text?: string) => {
  const content = (text ?? input.value).trim()
  if (!content || sending.value) return

  errorText.value = ''
  input.value = ''
  const history = [...messages.value]
  messages.value.push({ role: 'user', content })
  sending.value = true
  await scrollToBottom()

  try {
    const { reply, toolCalls } = await sendMessage(content, history)
    messages.value.push({ role: 'assistant', content: reply, toolCalls })
  } catch (error: unknown) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      '요청 처리에 실패했어요. 잠시 후 다시 시도해주세요.'
    errorText.value = Array.isArray(msg) ? msg.join(', ') : String(msg)
    // 실패한 사용자 메시지는 입력창에 복원
    messages.value.pop()
    input.value = content
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}
</script>

<template>
  <div class="page">
    <main class="agent-main">
      <header class="agent-head">
        <div>
          <h1 class="agent-title">노션 AI 에이전트</h1>
          <p class="agent-subtitle">
            노션 관리 + 합주실 빈 시간 조회 · 예약 일정을 캘린더 DB에 등록
          </p>
        </div>
        <NuxtLink to="/notion-agent/settings" class="btn btn--ghost">설정</NuxtLink>
      </header>

      <!-- 자격증명 확인 중 -->
      <section v-if="checking" class="agent-empty">
        <p class="agent-empty__text">연결 상태 확인 중…</p>
      </section>

      <!-- 미설정: 온보딩 -->
      <section v-else-if="!ready" class="agent-empty">
        <h2 class="agent-empty__title">시작하려면 연결이 필요해요</h2>
        <p class="agent-empty__text">
          노션 Integration 토큰{{ status?.hasNotionToken ? ' ✓' : '' }}과 Anthropic API 키{{
            status?.hasAnthropicKey ? ' ✓' : ''
          }}를 등록하면 에이전트가 노션을 관리할 수 있습니다.
        </p>
        <NuxtLink to="/notion-agent/settings" class="btn btn--primary">토큰 등록하기</NuxtLink>
      </section>

      <!-- 채팅 -->
      <template v-else>
        <section ref="listEl" class="chat-list" aria-live="polite">
          <div v-if="messages.length === 0" class="chat-welcome">
            <p class="chat-welcome__title">무엇을 도와드릴까요?</p>
            <div class="chat-suggestions">
              <button
                v-for="s in suggestions"
                :key="s"
                type="button"
                class="chat-suggestion"
                @click="handleSend(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <article
            v-for="(m, i) in messages"
            :key="i"
            :class="['chat-msg', m.role === 'user' ? 'chat-msg--user' : 'chat-msg--assistant']"
          >
            <div v-if="m.toolCalls?.length" class="chat-tools">
              <span
                v-for="(t, j) in m.toolCalls"
                :key="j"
                :class="['chat-tool-chip', { 'is-error': !t.ok }]"
              >
                {{ TOOL_LABELS[t.tool] ?? t.tool }}
              </span>
            </div>
            <div class="chat-bubble">{{ m.content }}</div>
          </article>

          <article v-if="sending" class="chat-msg chat-msg--assistant">
            <div class="chat-bubble chat-bubble--loading">
              <span class="dot" /><span class="dot" /><span class="dot" />
              <span class="loading-hint">도구를 사용해 처리 중이에요 (최대 수십 초)</span>
            </div>
          </article>
        </section>

        <p v-if="errorText" class="chat-error" role="alert">{{ errorText }}</p>

        <form class="chat-input-bar" @submit.prevent="handleSend()">
          <input
            v-model="input"
            type="text"
            class="chat-input"
            placeholder="예: 이번 주말 합주실 빈 시간 찾아서 캘린더에 등록해줘"
            :disabled="sending"
          />
          <button type="submit" class="btn btn--primary chat-send" :disabled="sending || !input.trim()">
            전송
          </button>
        </form>
      </template>
    </main>
  </div>
</template>

<style scoped>
.agent-main {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px);
}

.agent-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-base);
  margin-bottom: var(--space-lg);
}

.agent-title {
  margin: 0 0 var(--space-xs);
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
}

.agent-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

/* ── 온보딩/빈 상태 ── */
.agent-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-base);
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
  border: 1px dashed var(--hairline);
  border-radius: 14px;
  background: var(--surface-soft);
}

.agent-empty__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
}

.agent-empty__text {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
  max-width: 420px;
}

/* ── 채팅 목록 ── */
.chat-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-sm) 0 var(--space-base);
}

.chat-welcome {
  margin: auto 0;
  text-align: center;
}

.chat-welcome__title {
  margin: 0 0 var(--space-base);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}

.chat-suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: center;
}

.chat-suggestion {
  padding: var(--space-sm) var(--space-base);
  border: 1px solid var(--hairline);
  border-radius: 9999px;
  background: var(--canvas);
  color: var(--body-text);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.chat-suggestion:hover {
  border-color: var(--ink);
  background: var(--surface-soft);
}

.chat-msg {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.chat-msg--user {
  align-self: flex-end;
  align-items: flex-end;
}

.chat-msg--assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.chat-bubble {
  padding: var(--space-md) var(--space-base);
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-msg--user .chat-bubble {
  background: var(--ink);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.chat-msg--assistant .chat-bubble {
  background: var(--surface-soft);
  color: var(--ink);
  border: 1px solid var(--hairline-soft);
  border-bottom-left-radius: 4px;
}

/* ── 도구 호출 칩 ── */
.chat-tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.chat-tool-chip {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 56, 92, 0.08);
  color: var(--primary);
  border: 1px solid rgba(255, 56, 92, 0.22);
}

.chat-tool-chip.is-error {
  background: var(--surface-strong);
  color: var(--muted);
  border-color: var(--hairline);
}

/* ── 로딩 ── */
.chat-bubble--loading {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--muted-soft);
  animation: bounce 1.2s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.15s;
}

.dot:nth-child(3) {
  animation-delay: 0.3s;
}

.loading-hint {
  margin-left: var(--space-sm);
  font-size: 12px;
  color: var(--muted-soft);
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* ── 입력 바 ── */
.chat-error {
  margin: 0 0 var(--space-sm);
  font-size: 13px;
  color: var(--error);
}

.chat-input-bar {
  display: flex;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--hairline-soft);
  position: sticky;
  bottom: 0;
  background: var(--canvas);
  padding-bottom: var(--space-base);
}

.chat-input {
  flex: 1;
  padding: var(--space-md) var(--space-base);
  border: 1px solid var(--hairline);
  border-radius: 9999px;
  font-size: 14px;
  color: var(--ink);
  outline: none;
  transition: border-color 120ms ease;
}

.chat-input:focus {
  border-color: var(--ink);
}

.chat-send {
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .agent-main {
    padding: var(--space-base);
  }

  .chat-msg {
    max-width: 95%;
  }
}
</style>
