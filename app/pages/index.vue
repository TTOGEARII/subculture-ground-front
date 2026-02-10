<script setup lang="ts">
definePageMeta({
  layout: 'main',
})

useSeoMeta({
  title: 'Subculture Ground',
  description: '여러 토이 프로젝트를 소개하는 페이지입니다.',
  ogTitle: 'Subculture Ground',
  ogDescription: '여러 토이 프로젝트를 소개하는 페이지입니다.',
})
</script>

<template>
  <div class="page">
    <main class="main">
      <section class="section section--features">
        <h1 class="section__title">프로젝트입니다</h1>
        <p class="section__desc">
          이 페이지에서는 현재 진행 중인 토이 프로젝트들을 간단하게 소개합니다.
        </p>

        <div class="features-grid">
          <article class="feature-card">
            <h2 class="feature-card__title">공연 예매 토이 프로젝트</h2>
            <p class="feature-card__subtitle">Bookings / Events</p>
            <p class="feature-card__body">
              검색, 필터, 상세 정보까지 제공하는 공연 예매 리스트/상세 화면 예시입니다.
            </p>
            <div style="margin-top: 16px;">
              <NuxtLink class="btn btn--primary" to="/bookings">
                공연 예매 페이지로 이동
              </NuxtLink>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
@import '~/assets/css/index.css';
</style>
