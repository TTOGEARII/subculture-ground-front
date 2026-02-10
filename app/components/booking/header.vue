<script setup lang="ts">
// Nuxt composable 명시적 import (Docker 환경에서 안정적)
import { useAuth } from '../../../composables/useAuth'

const { isAuthenticated } = useAuth()
</script>

<template>
  <header class="header">
    <NuxtLink to="/" class="brand" aria-label="Subculture Ground 홈">
      <span class="brand__dot" aria-hidden="true" />
      <span class="brand__text">Subculture Ground</span>
    </NuxtLink>

    <nav class="nav" aria-label="주요 메뉴">
      <NuxtLink class="nav__link" to="/">홈</NuxtLink>
      <NuxtLink class="nav__link" to="/bookings/events">예매</NuxtLink>
      <NuxtLink class="nav__link" to="/about">소개</NuxtLink>

      <!-- 로그인 상태에 따라 버튼 토글 -->
      <NuxtLink
        v-if="!isAuthenticated"
        class="nav__link nav__link--login"
        to="/auth/login"
      >
        로그인
      </NuxtLink>
      <NuxtLink
        v-else
        class="nav__link nav__link--login"
        to="/auth/profile"
      >
        회원정보
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
</style>
