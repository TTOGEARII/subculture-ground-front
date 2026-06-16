<script setup lang="ts">
definePageMeta({
  layout: 'main',
})

useSeoMeta({
  title: 'Subculture Ground — 토이 프로젝트 모음',
  description: '여러 토이 프로젝트를 소개하는 허브 페이지입니다.',
  ogTitle: 'Subculture Ground — 토이 프로젝트 모음',
  ogDescription: '여러 토이 프로젝트를 소개하는 허브 페이지입니다.',
})

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
    name: '신규 프로젝트',
    tag: 'Coming soon',
    desc: '다음 토이 프로젝트가 이 자리에 들어갑니다.',
    to: '',
    ready: false,
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
</style>
