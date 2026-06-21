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
            공연을 찾고, 티켓을 골라 예매하고, QR로 입장하기까지. 실제 동작하는 예매 흐름을 담았습니다.
          </p>
        </div>

        <div class="features-grid">
          <article class="feature-card">
            <span class="feature-card__number">01</span>
            <h3 class="feature-card__title">SEARCH &amp; FILTER</h3>
            <p class="feature-card__subtitle">공연 검색 · 필터</p>
            <p class="feature-card__body">
              공연명 · 아티스트 · 장소로 검색하고, 카테고리와 예매 상태(예매중/마감)로
              원하는 공연을 추려 봅니다. 카드에서 일정 · 장소 · 최저가를 한눈에 확인할 수 있습니다.
            </p>
          </article>

          <article class="feature-card">
            <span class="feature-card__number">02</span>
            <h3 class="feature-card__title">VENUE MAP</h3>
            <p class="feature-card__subtitle">카카오맵 오시는 길</p>
            <p class="feature-card__body">
              공연 상세를 정보 · 판매정보 탭으로 나눠 보여주고, 카카오맵으로 공연장 위치를
              표시합니다. 등록 시 주소 검색으로 저장된 좌표가 그대로 지도에 반영됩니다.
            </p>
          </article>

          <article class="feature-card">
            <span class="feature-card__number">03</span>
            <h3 class="feature-card__title">BOOK TICKETS</h3>
            <p class="feature-card__subtitle">티켓 선택 · 예매</p>
            <p class="feature-card__body">
              티켓 종류별 가격과 잔여 수량을 확인하고, 구매 제한(최소/최대) 안에서 수량을
              정해 예매합니다. 여러 티켓 타입을 추가해도 레이아웃이 유지됩니다.
            </p>
          </article>

          <article class="feature-card">
            <span class="feature-card__number">04</span>
            <h3 class="feature-card__title">QR ENTRANCE</h3>
            <p class="feature-card__subtitle">QR 입장권 · 예매내역</p>
            <p class="feature-card__body">
              예매하면 마이페이지에 상태별(예매완료/입장완료/취소)로 정리되고, 입장용
              QR코드가 자동 발급됩니다. 주최자는 현장에서 QR을 스캔해 입장 처리합니다.
            </p>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
</style>

