<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useNotionAgent, type ChatMessage } from '../../../composables/useNotionAgent'

definePageMeta({ layout: 'main' })

useSeoMeta({
  title: '노션 AI 에이전트 - Subculture Ground',
  description: '노션 워크스페이스를 관리하고 합주실 예약 일정을 캘린더에 등록하는 AI 에이전트.',
})

const { status, fetchStatus, sendMessage } = useNotionAgent()

// 선택 가능한 대표 모델 (백엔드 ALLOWED_MODELS와 일치)
const MODELS = [
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (최신)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (안정)' },
]
const CHAT_STORAGE_KEY = 'notion-agent:chat'
const MODEL_STORAGE_KEY = 'notion-agent:model'
const TEXTAREA_MAX_HEIGHT = 200 // px — 이보다 커지면 내부 스크롤

const ready = ref(false) // 자격증명 확인 완료 + 둘 다 설정됨
const checking = ref(true)
const messages = ref<ChatMessage[]>([])
const selectedModel = ref(MODELS[0].id)
const input = ref('')
const sending = ref(false)
const errorText = ref('')
const listEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const abortController = ref<AbortController | null>(null)

// 대화기록 · 모델 선택을 localStorage에 보존 (브라우저 재방문 시 복원)
const persistChat = () => {
  if (import.meta.client) {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.value))
  }
}
watch(selectedModel, (m) => {
  if (import.meta.client) localStorage.setItem(MODEL_STORAGE_KEY, m)
})

const clearChat = () => {
  messages.value = []
  errorText.value = ''
  if (import.meta.client) localStorage.removeItem(CHAT_STORAGE_KEY)
}

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
  search_youtube: '유튜브 검색',
  search_sheet_music: '악보 검색',
}

// 어시스턴트 답변의 마크다운을 안전하게 렌더한다. 의존성 없이 직접 파싱하되,
// 모든 텍스트를 이스케이프하고 고정된 안전 태그(<p>/<ul>/<li>/<h4>/<strong>/<a>)만 생성하므로
// LLM 출력을 v-html로 넣어도 XSS가 없다(href도 http(s)만 허용).
const YT_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/g
const INLINE_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,!?])/g

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const renderLink = (href: string, text: string): string =>
  /^https?:\/\//.test(href)
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="msg-link">${escapeHtml(text)}</a>`
    : escapeHtml(text)

/** 인라인: **굵게**, [텍스트](링크), 맨링크 → 안전 HTML */
const renderInline = (s: string): string => {
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(s))) {
    out += escapeHtml(s.slice(last, m.index))
    if (m[1] !== undefined) out += `<strong>${escapeHtml(m[1])}</strong>`
    else if (m[2] !== undefined) out += renderLink(m[3], m[2])
    else out += renderLink(m[4], m[4])
    last = m.index + m[0].length
  }
  out += escapeHtml(s.slice(last))
  return out
}

/** 블록: 제목(#~####), 불릿(-,*,1.), 문단 → 안전 HTML */
const renderMarkdown = (content: string): string => {
  let html = ''
  let para: string[] = []
  let list: string[] = []
  const flushPara = () => {
    if (para.length) html += `<p>${renderInline(para.join('\n'))}</p>`
    para = []
  }
  const flushList = () => {
    if (list.length) html += `<ul>${list.map((x) => `<li>${renderInline(x)}</li>`).join('')}</ul>`
    list = []
  }
  for (const raw of content.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line) ?? /^\s*\d+\.\s+(.*)$/.exec(line)
    if (heading) {
      flushPara()
      flushList()
      html += `<h4 class="md-h">${renderInline(heading[2])}</h4>`
    } else if (bullet) {
      flushPara()
      list.push(bullet[1])
    } else if (!line.trim()) {
      flushPara()
      flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return html
}

const youtubeIds = (content: string): string[] => {
  const ids: string[] = []
  let m: RegExpExecArray | null
  YT_RE.lastIndex = 0
  while ((m = YT_RE.exec(content))) if (!ids.includes(m[1])) ids.push(m[1])
  return ids
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
  // 저장된 대화기록·모델 복원
  try {
    const savedChat = localStorage.getItem(CHAT_STORAGE_KEY)
    if (savedChat) messages.value = JSON.parse(savedChat) as ChatMessage[]
    const savedModel = localStorage.getItem(MODEL_STORAGE_KEY)
    if (savedModel && MODELS.some((m) => m.id === savedModel)) selectedModel.value = savedModel
  } catch {
    // 파싱 실패 시 무시하고 빈 대화로 시작
  }
  try {
    // LLM(Gemini) 키만 있으면 대화 시작 가능. 노션·유튜브는 도구 사용 시 안내한다.
    const s = await fetchStatus()
    ready.value = s.hasGeminiKey
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

/** 입력창 높이를 내용에 맞춰 위로 늘린다 (최대 높이 넘으면 내부 스크롤). */
const autoGrow = () => {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
}

/** Enter 전송, Shift+Enter 줄바꿈. 한글 등 IME 조합 중엔 전송하지 않는다. */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    handleSend()
  }
}

const handleSend = async (text?: string) => {
  const content = (text ?? input.value).trim()
  if (!content || sending.value) return

  errorText.value = ''
  input.value = ''
  await nextTick()
  autoGrow() // 전송 후 입력창 높이 원상복구
  const history = [...messages.value]
  messages.value.push({ role: 'user', content })
  persistChat()
  sending.value = true
  abortController.value = new AbortController()
  await scrollToBottom()

  try {
    const { reply, toolCalls } = await sendMessage(
      content,
      history,
      selectedModel.value,
      abortController.value.signal,
    )
    messages.value.push({ role: 'assistant', content: reply, toolCalls })
    persistChat()
  } catch (error: unknown) {
    // 사용자가 취소한 경우: 에러로 취급하지 않고 입력만 복원한다
    const canceled =
      (error as { code?: string })?.code === 'ERR_CANCELED' ||
      (error as { name?: string })?.name === 'CanceledError'
    // 대기 중이던 사용자 메시지는 되돌리고 입력창에 복원
    messages.value.pop()
    persistChat()
    input.value = content
    await nextTick()
    autoGrow()
    if (!canceled) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '요청 처리에 실패했어요. 잠시 후 다시 시도해주세요.'
      errorText.value = Array.isArray(msg) ? msg.join(', ') : String(msg)
    }
  } finally {
    sending.value = false
    abortController.value = null
    await scrollToBottom()
  }
}

/** 검색 도중 취소 */
const cancelSend = () => {
  abortController.value?.abort()
}
</script>

<template>
  <div class="page">
    <main class="agent-main">
      <header class="agent-head">
        <div class="agent-head__left">
          <NuxtLink to="/" class="home-link" title="메인으로">←</NuxtLink>
          <h1 class="agent-title">노션 AI 에이전트</h1>
        </div>
        <div class="agent-head__actions">
          <select
            v-model="selectedModel"
            class="model-select"
            :disabled="sending"
            aria-label="모델 선택"
          >
            <option v-for="m in MODELS" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
          <button
            v-if="ready && messages.length"
            type="button"
            class="chip-btn"
            @click="clearChat"
          >
            새 대화
          </button>
          <NuxtLink to="/notion-agent/settings" class="chip-btn">설정</NuxtLink>
        </div>
      </header>

      <!-- 자격증명 확인 중 -->
      <section v-if="checking" class="agent-empty">
        <p class="agent-empty__text">연결 상태 확인 중…</p>
      </section>

      <!-- 미설정: 온보딩 (Gemini 키만 있으면 시작) -->
      <section v-else-if="!ready" class="agent-empty">
        <h2 class="agent-empty__title">시작하려면 Gemini API 키가 필요해요</h2>
        <p class="agent-empty__text">
          Gemini API 키{{ status?.hasGeminiKey ? ' ✓' : '' }}만 등록하면 대화를 시작할 수 있어요.
          노션·유튜브 기능은 각 토큰을 추가로 입력하면 켜집니다.
        </p>
        <NuxtLink to="/notion-agent/settings" class="btn btn--primary">키 등록하기</NuxtLink>
      </section>

      <!-- 채팅 -->
      <template v-else>
        <section ref="listEl" class="chat-scroll" aria-live="polite">
          <div class="chat-thread">
            <div v-if="messages.length === 0" class="chat-welcome">
              <h2 class="chat-welcome__title">무엇을 도와드릴까요?</h2>
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
              :class="['msg', m.role === 'user' ? 'msg--user' : 'msg--assistant']"
            >
              <div v-if="m.toolCalls?.length" class="msg-tools">
                <span
                  v-for="(t, j) in m.toolCalls"
                  :key="j"
                  :class="['tool-chip', { 'is-error': !t.ok }]"
                >
                  {{ TOOL_LABELS[t.tool] ?? t.tool }}
                </span>
              </div>
              <!-- 사용자: 평문 그대로 / 어시스턴트: 마크다운 렌더 -->
              <div v-if="m.role === 'user'" class="msg-body">{{ m.content }}</div>
              <!-- eslint-disable-next-line vue/no-v-html (renderMarkdown이 이스케이프+고정태그만 생성) -->
              <div v-else class="msg-body md" v-html="renderMarkdown(m.content)" />

              <div
                v-if="m.role === 'assistant' && youtubeIds(m.content).length"
                class="msg-embeds"
              >
                <div v-for="id in youtubeIds(m.content)" :key="id" class="msg-embed">
                  <iframe
                    :src="`https://www.youtube-nocookie.com/embed/${id}`"
                    title="YouTube 영상"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  />
                </div>
              </div>
            </article>

            <article v-if="sending" class="msg msg--assistant">
              <div class="msg-loading">
                <span class="dot" /><span class="dot" /><span class="dot" />
                <span class="loading-hint">처리 중이에요 · 아래 ‘중단’으로 취소할 수 있어요</span>
              </div>
            </article>
          </div>
        </section>

        <div class="composer-wrap">
          <p v-if="errorText" class="chat-error" role="alert">{{ errorText }}</p>
          <form class="composer" @submit.prevent="handleSend()">
            <textarea
              ref="inputEl"
              v-model="input"
              class="composer__input"
              rows="1"
              placeholder="메시지를 입력하세요…"
              :disabled="sending"
              @keydown="onKeydown"
              @input="autoGrow"
            />
            <button
              v-if="sending"
              type="button"
              class="composer__btn composer__btn--stop"
              title="중단"
              @click="cancelSend"
            >
              <span class="stop-square" aria-hidden="true" />
            </button>
            <button
              v-else
              type="submit"
              class="composer__btn"
              title="전송 (Enter)"
              :disabled="!input.trim()"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M12 19V5M5 12l7-7 7 7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </form>
          <p class="composer__hint">Enter 전송 · Shift+Enter 줄바꿈</p>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.agent-main {
  max-width: 768px;
  margin: 0 auto;
  padding: 0 var(--space-base);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  height: calc(100dvh - 80px);
  min-height: 0;
}

/* ── 헤더 ── */
.agent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-base);
  padding: var(--space-base) 0;
  flex-shrink: 0;
}

.agent-head__left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.home-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  color: var(--muted);
  text-decoration: none;
  font-size: 16px;
  transition: background-color 120ms ease, color 120ms ease;
}

.home-link:hover {
  background: var(--surface-soft);
  color: var(--ink);
}

.agent-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-head__actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.model-select {
  padding: 6px 10px;
  border: 1px solid var(--hairline);
  border-radius: 9999px;
  background: var(--canvas);
  color: var(--ink);
  font-size: 12px;
  cursor: pointer;
  outline: none;
  max-width: 150px;
}

.model-select:focus {
  border-color: var(--ink);
}

.chip-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid var(--hairline);
  border-radius: 9999px;
  background: var(--canvas);
  color: var(--body-text);
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.chip-btn:hover {
  border-color: var(--ink);
  background: var(--surface-soft);
}

/* ── 온보딩/빈 상태 ── */
.agent-empty {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-base);
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
}

.agent-empty__title {
  margin: 0;
  font-size: 20px;
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

/* ── 채팅 스크롤 영역 (입력창이 커지면 이 영역이 줄고, 내용은 위로 스크롤) ── */
.chat-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.chat-thread {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  padding: var(--space-lg) 0 var(--space-base);
}

/* ── 웰컴 ── */
.chat-welcome {
  margin: auto 0;
  text-align: center;
  padding: var(--space-2xl) 0;
}

.chat-welcome__title {
  margin: 0 0 var(--space-lg);
  font-size: 22px;
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
  padding: 10px 16px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--canvas);
  color: var(--body-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: border-color 120ms ease, background-color 120ms ease;
  max-width: 100%;
}

.chat-suggestion:hover {
  border-color: var(--ink);
  background: var(--surface-soft);
}

/* ── 메시지 ── */
.msg {
  display: flex;
  flex-direction: column;
}

/* 사용자: 오른쪽 정렬 + 부드러운 말풍선 */
.msg--user {
  align-items: flex-end;
}

.msg--user .msg-body {
  max-width: 85%;
  padding: 10px 16px;
  border-radius: 18px;
  border-bottom-right-radius: 6px;
  background: var(--surface-soft);
  border: 1px solid var(--hairline-soft);
  color: var(--ink);
}

/* 어시스턴트: 말풍선 없이 평문 (클로드 스타일) */
.msg--assistant .msg-body {
  color: var(--ink);
}

.msg-body {
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-link {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}

/* ── 마크다운 렌더 (어시스턴트 답변) ── */
.msg-body.md {
  white-space: normal;
}

.md :deep(p) {
  margin: 0 0 0.75em;
  white-space: pre-line;
}

.md :deep(p:last-child),
.md :deep(ul:last-child) {
  margin-bottom: 0;
}

.md :deep(.md-h) {
  margin: 1.1em 0 0.5em;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.md :deep(ul) {
  margin: 0 0 0.75em;
  padding-left: 1.3em;
}

.md :deep(li) {
  margin: 0.2em 0;
}

.md :deep(strong) {
  font-weight: 700;
}

/* ── 도구 호출 칩 ── */
.msg-tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.tool-chip {
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 56, 92, 0.08);
  color: var(--primary);
  border: 1px solid rgba(255, 56, 92, 0.22);
}

.tool-chip.is-error {
  background: var(--surface-strong);
  color: var(--muted);
  border-color: var(--hairline);
}

/* ── 유튜브 임베드 ── */
.msg-embeds {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  width: 100%;
  max-width: 480px;
}

.msg-embed {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  border: 1px solid var(--hairline-soft);
}

.msg-embed iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

/* ── 로딩 ── */
.msg-loading {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 2px 0;
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

/* ── 입력 영역 (하단 고정, textarea가 위로 늘어남) ── */
.composer-wrap {
  flex-shrink: 0;
  padding: var(--space-sm) 0 var(--space-base);
  background: var(--canvas);
}

.chat-error {
  margin: 0 0 var(--space-sm);
  font-size: 13px;
  color: var(--error);
  text-align: center;
}

.composer {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: 8px 8px 8px 16px;
  border: 1px solid var(--hairline);
  border-radius: 24px;
  background: var(--canvas);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.composer:focus-within {
  border-color: var(--ink);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
}

.composer__input {
  flex: 1;
  min-height: 24px;
  max-height: 200px;
  padding: 8px 0;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--ink);
  font-size: 15px;
  line-height: 1.5;
  font-family: inherit;
  overflow-y: auto;
}

.composer__input::placeholder {
  color: var(--muted-soft);
}

.composer__input:disabled {
  color: var(--muted);
}

.composer__btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  border: none;
  background: var(--ink);
  color: #ffffff;
  cursor: pointer;
  transition: opacity 120ms ease, background-color 120ms ease;
}

.composer__btn:hover:not(:disabled) {
  opacity: 0.85;
}

.composer__btn:disabled {
  background: var(--hairline);
  color: var(--muted-soft);
  cursor: not-allowed;
}

.composer__btn--stop {
  background: var(--ink);
}

.stop-square {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: #ffffff;
}

.composer__hint {
  margin: var(--space-xs) 0 0;
  text-align: center;
  font-size: 11px;
  color: var(--muted-soft);
}

@media (max-width: 480px) {
  .agent-main {
    padding: 0 var(--space-sm);
  }

  .agent-title {
    font-size: 15px;
  }

  .composer__hint {
    display: none;
  }
}
</style>
