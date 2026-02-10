<script setup lang="ts">
definePageMeta({
  layout: 'bookings',
})

useSeoMeta({
  title: '공연 예매 메인 - Subculture Ground',
  description: '밴드 공연을 손쉽게 만들고 예매할 수 있는 토이 프로젝트 메인 페이지입니다.',
  ogTitle: '공연 예매 메인 - Subculture Ground',
  ogDescription: '밴드 공연을 손쉽게 만들고 예매할 수 있는 토이 프로젝트 메인 페이지입니다.',
})
</script>

<template>
  <div class="page">
    <main class="main">
      <!-- HERO -->
      <section class="hero">
        <div class="hero__bg" />

        <div class="hero__content">
          <p class="hero__kicker">BAND CONCERT PLATFORM</p>
          <h1 class="hero__title">
            Subculture<br />
            Ground Tickets
          </h1>
          <p class="hero__subtitle-main">
            밴드와 관객 모두를 위한<br />
            공연 예매 토이 프로젝트
          </p>

          <ul class="hero__actions">
            <li>
              <NuxtLink class="btn btn--primary btn--large" to="/bookings/events">
                공연 둘러보기
              </NuxtLink>
            </li>
            <li>
              <a
                class="btn btn--ghost"
                href="#features"
              >
                기능 살펴보기
              </a>
            </li>
          </ul>
        </div>

        <div class="hero__panel">
          <div class="stats">
            <div class="stats__item">
              <p class="stats__label">DEMO EVENTS</p>
              <p class="stats__value">6+</p>
              <p class="stats__desc">샘플 공연 데이터를 기반으로 리스트/상세 UI 구현</p>
            </div>
            <div class="stats__item">
              <p class="stats__label">SEARCH & FILTER</p>
              <p class="stats__value">ON</p>
              <p class="stats__desc">공연명 · 아티스트 · 장소 · 카테고리/상태 필터 제공</p>
            </div>
            <div class="stats__item">
              <p class="stats__label">LAYOUT</p>
              <p class="stats__value">bookings</p>
              <p class="stats__desc">예매 관련 페이지 전용 레이아웃으로 분리</p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        class="section section--features"
      >
        <div class="section__head">
          <h2 class="section__title">예매 기능</h2>
          <p class="section__desc">
            실제 서비스가 아닌 토이 프로젝트이지만, 공연 예매의 흐름을 느낄 수 있도록 구성했습니다.
          </p>
        </div>

        <div class="features-grid">
          <article class="feature-card">
            <span class="feature-card__number">01</span>
            <h3 class="feature-card__title">ONLY SUBCULTURE</h3>
            <p class="feature-card__subtitle">수수료 ZERO 티켓 흐름</p>
            <p class="feature-card__body">
              실제 결제는 없지만, 수수료 없이 주문을 관리하는 흐름을 연습할 수 있도록
              설계된 UI입니다.
            </p>
          </article>

          <article class="feature-card">
            <span class="feature-card__number">02</span>
            <h3 class="feature-card__title">CHEER UP</h3>
            <p class="feature-card__subtitle">응원 메세지 영역</p>
            <p class="feature-card__body">
              상세 페이지에 밴드 소개, 공연 소개 블록을 응원톡처럼 확장할 수 있도록
              구조를 잡아 두었습니다.
            </p>
          </article>

          <article class="feature-card">
            <span class="feature-card__number">03</span>
            <h3 class="feature-card__title">QUICK ENTRANCE</h3>
            <p class="feature-card__subtitle">QR 티켓을 상상한 레이아웃</p>
            <p class="feature-card__body">
              사이드 `booking-card` 컴포넌트는 추후 QR 티켓, 좌석 정보 등으로
              확장하기 쉽게 나누어져 있습니다.
            </p>
          </article>

          <article class="feature-card">
            <span class="feature-card__number">04</span>
            <h3 class="feature-card__title">VARIOUS OPTIONS</h3>
            <p class="feature-card__subtitle">다양한 티켓 옵션</p>
            <p class="feature-card__body">
              현재는 더미 데이터지만, 티켓 타입/옵션을 추가해도 UI가 깨지지 않도록
              카드·그리드 구조를 유연하게 설계했습니다.
            </p>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
</style>

