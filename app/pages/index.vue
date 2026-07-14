<script setup lang="ts">
import { onMounted, ref } from 'vue'

definePageMeta({
  layout: 'main',
})

useSeoMeta({
  title: 'Subculture Ground — 토이 프로젝트 모음',
  description: '여러 토이 프로젝트를 소개하는 허브 페이지입니다.',
  ogTitle: 'Subculture Ground — 토이 프로젝트 모음',
  ogDescription: '여러 토이 프로젝트를 소개하는 허브 페이지입니다.',
})

// ── PWA 앱 설치 ──
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const canInstall = ref(false)
const installed = ref(false)
const isIOS = ref(false)

onMounted(() => {
  // 이미 앱(standalone)으로 실행 중인지
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  installed.value = standalone

  isIOS.value =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !standalone

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    canInstall.value = true
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    canInstall.value = false
    deferredPrompt.value = null
  })
})

const installApp = async () => {
  if (!deferredPrompt.value) return
  await deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    canInstall.value = false
  }
  deferredPrompt.value = null
}

// 허브에 노출할 프로젝트들. 새 프로젝트는 여기에 항목만 추가하면 된다.
// (각 프로젝트는 자기 네임스페이스 `/those` 하위에서 자기완결적으로 동작)
const projects = [
  {
    name: '공연 예매',
    tag: 'Bookings',
    desc: '서브컬처 공연을 검색·예매하고, 호스트가 공연/티켓/예매자를 관리하는 풀스택 토이 프로젝트.',
    to: '/bookings',
    ready: true,
  },
  {
    name: '노션 AI 에이전트',
    tag: 'Notion Agent',
    desc: '노션 워크스페이스를 대화로 관리하고, 서울 합주실 빈 시간을 실시간 조회해 예약 일정을 캘린더 DB에 등록하는 AI 에이전트.',
    to: '/notion-agent',
    ready: true,
  },
  {
    name: '신규 프로젝트',
    tag: 'Coming soon',
    desc: '다음 토이 프로젝트가 이 자리에 들어갑니다.',
    to: '',
    ready: false,
  },
]
</script>

<template>
  <div class="page">
    <main class="main">
      <section class="section section--features">
        <h1 class="section__title">토이 프로젝트 모음</h1>
        <p class="section__desc">
          진행 중인 토이 프로젝트들을 한곳에서 모아 봅니다. 각 프로젝트는 자기 경로 안에서 동작해요.
        </p>

        <div class="features-grid">
          <article
            v-for="(project, i) in projects"
            :key="i"
            class="feature-card"
            :class="{ 'feature-card--soon': !project.ready }"
          >
            <span class="feature-card__title">{{ project.tag }}</span>
            <h2 class="feature-card__subtitle">{{ project.name }}</h2>
            <p class="feature-card__body">{{ project.desc }}</p>

            <div class="feature-card__action">
              <NuxtLink
                v-if="project.ready"
                class="btn btn--primary"
                :to="project.to"
              >
                바로 가기
              </NuxtLink>
              <span v-else class="feature-card__badge">준비 중</span>
            </div>
          </article>
        </div>
      </section>

      <!-- PWA 앱 설치 -->
      <section class="install-section">
        <img src="/pwa-192.png" alt="음연화 앱 아이콘" class="install-icon" width="72" height="72" />
        <div class="install-body">
          <h2 class="install-title">앱으로 설치하기</h2>
          <p class="install-desc">
            홈 화면에 추가하면 브라우저 주소창 없이 앱처럼 바로 실행할 수 있어요.
          </p>

          <p v-if="installed" class="install-hint install-hint--done">
            이미 앱으로 설치되어 있어요 ✓
          </p>
          <button
            v-else-if="canInstall"
            type="button"
            class="btn btn--primary install-btn"
            @click="installApp"
          >
            앱 설치
          </button>
          <p v-else-if="isIOS" class="install-hint">
            iOS는 <strong>Safari 공유 버튼 → “홈 화면에 추가”</strong>로 설치할 수 있어요.
          </p>
          <p v-else class="install-hint">
            브라우저 메뉴에서 <strong>“앱 설치”</strong> 또는 <strong>“홈 화면에 추가”</strong>를 선택하세요.
            (설치 지원 브라우저에서는 잠시 후 위에 설치 버튼이 나타납니다.)
          </p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.feature-card {
  display: flex;
  flex-direction: column;
}

.feature-card__action {
  margin-top: auto;
  padding-top: 16px;
}

.feature-card--soon {
  opacity: 0.7;
}

.feature-card__badge {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  background: var(--surface-strong);
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
}

/* ── PWA 설치 섹션 ── */
.install-section {
  display: flex;
  align-items: center;
  gap: var(--space-base);
  max-width: 1000px;
  margin: var(--space-xl) auto 0;
  padding: var(--space-lg);
  border: 1px solid var(--hairline-soft);
  border-radius: 14px;
  background: var(--surface-soft);
}

.install-icon {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 16px;
  border: 1px solid var(--hairline-soft);
  background: #ffffff;
}

.install-body {
  min-width: 0;
}

.install-title {
  margin: 0 0 var(--space-xs);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}

.install-desc {
  margin: 0 0 var(--space-md);
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
}

.install-btn {
  align-self: flex-start;
}

.install-hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.install-hint strong {
  color: var(--ink);
  font-weight: 600;
}

.install-hint--done {
  color: #16a34a;
  font-weight: 600;
}

@media (max-width: 480px) {
  .install-section {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
}
</style>
