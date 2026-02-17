<script setup lang="ts">
// 회원정보 페이지
// Nuxt composable auto-import 사용 (런타임에서는 자동 import됨)
// TypeScript 인식을 위해 명시적 import 추가
import { useAuth } from '../../../composables/useAuth'

const { user, isAuthenticated, fetchProfile, logout } = useAuth()

onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/auth/login')
    return
  }

  if (!user.value) {
    await fetchProfile()
  }
})

useSeoMeta({
  title: '회원정보 - Subculture Ground',
  description: 'Subculture Ground 회원정보 페이지입니다.',
  ogTitle: '회원정보 - Subculture Ground',
  ogDescription: 'Subculture Ground 회원정보 페이지입니다.',
})

const handleLogout = async () => {
  await logout()
}
</script>

<template>
  <div class="page profile-page">
    <main class="main" aria-labelledby="profile-title">
      <section class="profile-card" v-if="user">
        <h1 id="profile-title" class="profile-title">회원정보</h1>

        <div class="profile-row">
          <span class="profile-label">이름</span>
          <span class="profile-value">{{ user.name }}</span>
        </div>

        <div class="profile-row">
          <span class="profile-label">이메일</span>
          <span class="profile-value">{{ user.email }}</span>
        </div>

        <div class="profile-row">
          <span class="profile-label">전화번호</span>
          <span class="profile-value">
            {{ user.phone || '등록된 전화번호가 없습니다.' }}
          </span>
        </div>

        <div class="profile-row">
          <span class="profile-label">생년월일</span>
          <span class="profile-value">
            {{ user.birthDate || '등록된 생년월일이 없습니다.' }}
          </span>
        </div>

        <div class="profile-actions">
          <button type="button" class="btn btn--primary" @click="handleLogout">
            로그아웃
          </button>
        </div>
      </section>

      <section v-else class="profile-card">
        <h1 class="profile-title">회원정보 불러오는 중...</h1>
      </section>
    </main>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
}

.profile-card {
  max-width: 480px;
  margin: 48px auto 0;
  padding: 24px 20px 28px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.8);
  color: #e5e7eb;
}

.profile-title {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 800;
}

.profile-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.3);
  font-size: 14px;
}

.profile-row:last-of-type {
  border-bottom: none;
}

.profile-label {
  color: #9ca3af;
  min-width: 80px;
}

.profile-value {
  text-align: right;
  color: #e5e7eb;
}

.profile-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: #e5e7eb;
  transition: background-color 120ms ease, border-color 120ms ease,
    transform 120ms ease;
}

.btn--primary {
  border-color: rgba(124, 58, 237, 0.7);
  background: linear-gradient(
    135deg,
    rgba(124, 58, 237, 0.95),
    rgba(34, 197, 94, 0.8)
  );
}

.btn--primary:hover {
  transform: translateY(-1px);
}
</style>
