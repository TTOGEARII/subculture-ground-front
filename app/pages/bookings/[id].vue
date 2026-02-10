<script setup lang="ts">
definePageMeta({
  layout: 'bookings',
})

useSeoMeta({
  title: '공연 예매 - Subculture Ground',
  description: '공연 예매 토이 프로젝트의 상세 라우트 예시 페이지입니다.',
  ogTitle: '공연 예매 - Subculture Ground',
  ogDescription: '공연 예매 토이 프로젝트의 상세 라우트 예시 페이지입니다.',
})
</script>

<template>
  <div class="event-detail-page">
    <main class="main">
      <section class="section section--features">
        <div class="section__head">
          <h1 class="section__title">공연 예매 상세 (예시)</h1>
          <p class="section__desc">
            이 라우트는 `/bookings/events/[id]` 실제 상세 페이지와 구분되는 예시용 페이지입니다.
          </p>
        </div>

        <p class="section__desc">
          실제 공연 상세 화면은
          <NuxtLink to="/bookings/events/1" class="nav__link">`/bookings/events/[id]` 경로</NuxtLink>
          를 사용해 진입할 수 있습니다.
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
</style>
