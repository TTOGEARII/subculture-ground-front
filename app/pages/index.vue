<script setup lang="ts">
definePageMeta({
  layout: 'main',
})

useSeoMeta({
  title: 'Subculture Ground',
  description: '서브컬처 공연/행사 예매와 소식을 한 곳에서.',
  ogTitle: 'Subculture Ground',
  ogDescription: '서브컬처 공연/행사 예매와 소식을 한 곳에서.',
})

interface StatItem {
  label: string
  value: string
}

interface FeatureItem {
  number: string
  title: string
  subtitle: string
  body: string
}

const features: FeatureItem[] = [
  {
    number: '1',
    title: 'ONLY SUBGROUND',
    subtitle: '수수료 ZERO 예매',
    body: 'Subculture Ground는 수수료 없이 온라인으로 예매하고 주문을 승인할 수 있는 서비스예요!',
  },
  {
    number: '2',
    title: 'QUICK ACCESS',
    subtitle: '빠른 예매 경험',
    body: '모바일 최적화된 인터페이스로 언제 어디서나 빠르고 편리하게 예매할 수 있어요.',
  },
  {
    number: '3',
    title: 'REAL-TIME',
    subtitle: '실시간 공지',
    body: '공연/행사 소식과 업데이트를 실시간으로 받아보고 놓치지 마세요.',
  },
  {
    number: '4',
    title: 'CURATED',
    subtitle: '취향별 추천',
    body: '카테고리와 태그를 통해 나만의 취향에 맞는 공연을 쉽게 찾아보세요.',
  },
]

const year = new Date().getFullYear()
</script>

<style scoped>
@import '~/assets/css/index.css';
</style>

<template>
  <div class="page">
    <main class="main">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero__bg" aria-hidden="true" />

        <div class="hero__content">
          <p class="hero__kicker">SUBCULTURE · LIVE · EVENT</p>
          <h1 id="hero-title" class="hero__title">
            SUBCULTURE GROUND
          </h1>
          <h2 class="hero__subtitle-main">
            Subculture Ground는 모든 서브컬처를 위한<br>
            공연 플랫폼이에요.
          </h2>
          <p class="hero__subtitle">
            공연의 호스트와 관객 모두에게<br>
            더욱 편리하고 새로운 공연 라이프를 펼쳐줄거예요!
          </p>

          <div class="hero__actions">
            <a class="btn btn--primary" href="#features">기능 보러가기</a>
            <NuxtLink class="btn btn--ghost" to="/events">예매 보러가기</NuxtLink>
          </div>
        </div>
      </section>

      <section id="features" class="section section--features" aria-labelledby="features-title">
        <div class="section__head">
          <h2 id="features-title" class="section__title">SUBCULTURE GROUND SPECIAL</h2>
        </div>

        <div class="features-grid">
          <article
            v-for="item in features"
            :key="item.number"
            class="feature-card"
          >
            <div class="feature-card__number">{{ item.number }}</div>
            <h3 class="feature-card__title">{{ item.title }}</h3>
            <p class="feature-card__subtitle">{{ item.subtitle }}</p>
            <p class="feature-card__body">{{ item.body }}</p>
          </article>
        </div>
      </section>

      <section class="section section--cta" aria-labelledby="cta-title">
        <div class="cta">
          <h2 id="cta-title" class="cta__title">이 모든 서비스를</h2>
          <h2 class="cta__title cta__title--highlight">무료로 사용해보세요</h2>
          <p class="cta__desc">제휴를 통해 카드 결제도 가능해요</p>
          <NuxtLink class="btn btn--primary btn--large" to="/events">Subculture Ground 시작하기</NuxtLink>
        </div>
      </section>

      <section id="booking" class="section section--accent" aria-labelledby="booking-title">
        <div class="section__head">
          <h2 id="booking-title" class="section__title">예매</h2>
          <p class="section__desc">
            아직 예매 페이지/흐름이 없으면, 여기 섹션을 “예매 오픈 리스트”로 확장하면 좋아요.
          </p>
        </div>

        <div class="grid grid--2">
          <article class="card card--flat">
            <h3 class="card__title">예매 오픈</h3>
            <p class="card__body">오픈 예정/진행 중 이벤트를 카드로 노출하는 영역(예시).</p>
            <div class="card__footer">
              <button class="btn btn--primary" type="button" disabled>
                준비 중
              </button>
              <span class="hint">다음 단계에서 실제 데이터/라우팅 연결</span>
            </div>
          </article>

          <article class="card card--flat">
            <h3 class="card__title">공지 & 업데이트</h3>
            <p class="card__body">운영 공지/변경사항을 배너나 리스트로 구성할 수 있어요.</p>
            <div class="card__footer">
              <NuxtLink class="btn btn--ghost" to="/about">현재는 소개 페이지로</NuxtLink>
              <span class="hint">원하면 `/notice`도 바로 만들어드릴게요</span>
            </div>
          </article>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p class="footer__text">
        © {{ year }} Subculture Ground. All rights reserved.
      </p>
    </footer>
  </div>
</template>

<style scoped>
@import '~/assets/css/index.css';
</style>
