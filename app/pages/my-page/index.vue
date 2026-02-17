<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'

definePageMeta({
  layout: 'bookings',
})

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
  title: '마이페이지 - Subculture Ground',
  description: 'Subculture Ground 마이페이지입니다.',
  ogTitle: '마이페이지 - Subculture Ground',
  ogDescription: 'Subculture Ground 마이페이지입니다.',
})

const handleLogout = async () => {
  if (confirm('정말 로그아웃하시겠습니까?')) {
    await logout()
  }
}

const handleWithdrawal = () => {
  if (confirm('정말 회원탈퇴를 하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    // TODO: 회원탈퇴 API 구현
    alert('회원탈퇴 기능은 준비 중입니다.')
  }
}

// 프로필 사진 초기 이니셜 가져오기
const getInitials = computed(() => {
  if (!user.value?.name) return 'U'
  return user.value.name.charAt(0).toUpperCase()
})

// 전화번호 포맷팅
const formatPhone = (phone: string | null) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
}
</script>

<template>
  <div class="mypage">
    <main class="main">
      <!-- 헤더 -->
      <div class="mypage-header">
        <NuxtLink to="/bookings/events" class="back-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </NuxtLink>
        
        <div class="profile-section">
          <div class="profile-avatar-large">
            {{ getInitials }}
          </div>
          <div class="profile-info">
            <h1 class="profile-name">{{ user?.name || '사용자' }}</h1>
            <p class="profile-phone">{{ formatPhone(user?.phone) || '전화번호 없음' }}</p>
          </div>
        </div>
      </div>

      <!-- 가장 최근 주문 -->
      <div class="recent-order-section">
        <div class="recent-order-card">
          <div class="order-header">
            <p class="order-label">가장 최근에 생성한 주문이에요.</p>
          </div>
          <div class="order-content">
            <div class="order-poster">
              <div class="poster-placeholder">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="60" height="60" rx="8" fill="rgba(124, 58, 237, 0.2)"/>
                  <path d="M30 20v20M20 30h20" stroke="rgba(124, 58, 237, 0.6)" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
            <div class="order-details">
              <span class="order-status">지난공연</span>
              <h3 class="order-title">&lt;HOMMAGE&gt;</h3>
              <p class="order-date">2026년 02월 08일 (일) 17:00</p>
              <p class="order-info">&lt;오마주&gt;에서 온 티켓 1매 | 주문번호 R1046644</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 바로가기 -->
      <div class="shortcuts-section">
        <h2 class="shortcuts-title">바로가기</h2>
        <div class="shortcuts-list">
          <NuxtLink to="/my-page/reservations" class="shortcut-item">
            <span class="shortcut-text">내 예매내역</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
          
          <button type="button" class="shortcut-item">
            <span class="shortcut-text">내 쿠폰함</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div class="shortcut-divider"></div>

          <NuxtLink to="/performance-management/select" class="shortcut-item">
            <span class="shortcut-text">공연 준비하기</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>

          <button type="button" class="shortcut-item" @click="handleLogout">
            <span class="shortcut-text">로그아웃</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button type="button" class="shortcut-item shortcut-item--danger" @click="handleWithdrawal">
            <span class="shortcut-text">회원탈퇴</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.mypage {
  min-height: 100vh;
  background: #ffffff;
}

.mypage-header {
  padding: 16px 20px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
  color: #374151;
  text-decoration: none;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  background: #f3f4f6;
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.8), rgba(139, 92, 246, 0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 24px;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
}

.profile-name {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.profile-phone {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.recent-order-section {
  padding: 20px;
  background: #f9fafb;
}

.recent-order-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.order-header {
  margin-bottom: 12px;
}

.order-label {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.order-content {
  display: flex;
  gap: 12px;
}

.order-poster {
  flex-shrink: 0;
}

.poster-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.order-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-status {
  display: inline-block;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 11px;
  color: #6b7280;
  width: fit-content;
}

.order-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.order-date {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.order-info {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

.shortcuts-section {
  padding: 20px;
  background: #ffffff;
}

.shortcuts-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s ease;
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-item:hover {
  background: #f9fafb;
}

.shortcut-text {
  flex: 1;
}

.shortcut-item svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.shortcut-item:hover svg {
  color: #6b7280;
}

.shortcut-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 8px 0;
}

.shortcut-item--danger {
  color: #ef4444;
}

.shortcut-item--danger:hover {
  background: #fef2f2;
}

.shortcut-item--danger svg {
  color: #ef4444;
}
</style>
