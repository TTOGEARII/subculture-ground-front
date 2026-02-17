<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'
import { usePerformances, getStatusText } from '../../../composables/usePerformances'

definePageMeta({
  layout: 'bookings',
})

const { isAuthenticated, user, fetchProfile } = useAuth()
const { performances, loading, loadMyPerformances } = usePerformances()

onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/auth/login')
    return
  }

  if (!user.value) {
    await fetchProfile()
  }

  // 내 공연 목록 로드
  await loadMyPerformances()
})

useSeoMeta({
  title: '공연 선택 - Subculture Ground',
  description: '관리할 공연을 선택하거나 새 공연을 등록하세요.',
})

// 날짜 포맷팅
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[date.getDay()]
  return `${year}년 ${month}월 ${day}일 (${weekday})`
}

const handleSelectPerformance = (performanceId: number) => {
  navigateTo(`/performance-management?id=${performanceId}`)
}

const handleNewPerformance = () => {
  navigateTo('/performance-management/create')
}
</script>

<template>
  <div class="performance-select-page">
    <div class="content-header">
      <NuxtLink to="/my-page" class="back-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </NuxtLink>
      <h1 class="page-title">공연 준비하기</h1>
      <p class="page-subtitle">관리할 공연을 선택하거나 새 공연을 등록하세요.</p>
    </div>

    <div class="content-body">
      <!-- 새 공연 등록 버튼 -->
      <div class="new-performance-section">
        <button type="button" class="btn btn--new-performance" @click="handleNewPerformance">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          새 공연 등록하기
        </button>
      </div>

      <!-- 내 공연 리스트 -->
      <section class="performances-section">
        <div class="section-header">
          <h2 class="section-title">내가 등록한 공연</h2>
          <button type="button" class="btn btn--refresh" @click="loadMyPerformances">
            새로고침
          </button>
        </div>

        <div v-if="loading" class="loading-state">
          <p>공연 목록을 불러오는 중...</p>
        </div>

        <div v-else-if="performances.length === 0" class="empty-state">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" stroke="#e5e7eb" stroke-width="2"/>
            <path d="M32 20v24M20 32h24" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>등록한 공연이 없습니다.</p>
          <p class="empty-hint">새로운 공연을 등록해보세요.</p>
        </div>

        <div v-else class="performances-grid">
          <div
            v-for="performance in performances"
            :key="performance.id"
            class="performance-card"
            @click="handleSelectPerformance(performance.id)"
          >
            <div class="performance-image">
              <img
                v-if="performance.image"
                :src="performance.image"
                :alt="performance.name"
                class="image"
              />
              <div v-else class="image-placeholder">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="4" fill="#f3f4f6"/>
                  <path d="M20 12v16M12 20h16" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
            <div class="performance-info">
              <div class="performance-header-info">
                <h3 class="performance-name">{{ performance.name }}</h3>
                <span class="performance-status" :class="`status--${performance.status === 1 ? 'active' : 'closed'}`">
                  {{ getStatusText(performance.status) }}
                </span>
              </div>
              <p class="performance-artist">{{ performance.artist }}</p>
              <div class="performance-details">
                <span class="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1v6l4 2M8 15A7 7 0 108 1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ formatDate(performance.date) }} {{ performance.time }}
                </span>
                <span class="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 8v5M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  {{ performance.venue }}
                </span>
              </div>
              <div v-if="performance.category && performance.category.length > 0" class="performance-categories">
                <span
                  v-for="cat in performance.category"
                  :key="cat"
                  class="category-tag"
                >
                  {{ cat }}
                </span>
              </div>
            </div>
            <div class="performance-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.performance-select-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 32px;
}

.content-header {
  max-width: 1200px;
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #374151;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.content-body {
  max-width: 1200px;
  margin: 0 auto;
}

.new-performance-section {
  margin-bottom: 32px;
}

.btn--new-performance {
  width: 100%;
  padding: 20px;
  background: #7c3aed;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s;
}

.btn--new-performance:hover {
  background: #6d28d9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.performances-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.btn--refresh {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn--refresh:hover {
  background: #e5e7eb;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
}

.empty-state svg {
  margin: 0 auto 16px;
}

.empty-state p {
  margin: 8px 0;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: #9ca3af;
}

.performances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.performance-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #ffffff;
}

.performance-card:hover {
  border-color: #7c3aed;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
  transform: translateY(-2px);
}

.performance-image {
  width: 100%;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  margin-bottom: 12px;
}

.performance-image .image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.performance-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.performance-header-info {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.performance-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  flex: 1;
  line-height: 1.3;
}

.performance-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.status--active {
  background: #d1fae5;
  color: #065f46;
}

.status--closed {
  background: #fee2e2;
  color: #991b1b;
}

.performance-artist {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.performance-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-item svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.performance-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.category-tag {
  padding: 4px 10px;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 12px;
  color: #374151;
}

.performance-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .performance-select-page {
    padding: 16px;
  }

  .performances-grid {
    grid-template-columns: 1fr;
  }
}
</style>
