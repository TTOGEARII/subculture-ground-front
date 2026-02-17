<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'
import { usePerformances, getStatusText } from '../../../composables/usePerformances'

definePageMeta({
  layout: 'performance-management',
})

const { isAuthenticated, user, fetchProfile } = useAuth()
const { performances, loading, loadMyPerformances, getPerformanceById } = usePerformances()
const route = useRoute()

// 쿼리 파라미터에서 공연 ID 가져오기
const performanceId = computed(() => {
  const id = route.query.id as string | undefined
  return id ? Number(id) : null
})

const selectedPerformance = ref<any>(null)
const isLoadingPerformance = ref(false)

// 페이지 진입 시 공연 목록 로드
const loadData = async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/auth/login')
    return
  }

  if (!user.value) {
    await fetchProfile()
  }

  // 공연 ID가 있으면 해당 공연 정보 로드, 없으면 목록 로드
  if (performanceId.value) {
    isLoadingPerformance.value = true
    try {
      const performance = await getPerformanceById(performanceId.value)
      if (performance) {
        selectedPerformance.value = performance
      } else {
        // 공연을 찾을 수 없으면 선택 페이지로 리다이렉트
        await navigateTo('/performance-management/select')
      }
    } catch (error) {
      console.error('공연 정보 로드 실패:', error)
      await navigateTo('/performance-management/select')
    } finally {
      isLoadingPerformance.value = false
    }
  } else {
    // 공연 ID가 없으면 선택 페이지로 리다이렉트
    await navigateTo('/performance-management/select')
  }
}

onMounted(() => {
  loadData()
})

// 라우트 변경 감지하여 새로고침 (공연 등록 후 돌아왔을 때)
watch(() => route.query.id, async () => {
  if (route.path === '/performance-management') {
    await loadData()
  }
})

useSeoMeta({
  title: '공연관리 대시보드 - Subculture Ground',
  description: '공연 관리 대시보드입니다.',
})

const { deletePerformance } = usePerformances()

const handleDeletePerformance = async (performanceId?: number) => {
  if (!performanceId) return
  
  if (confirm('정말 공연을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    try {
      await deletePerformance(performanceId)
      alert('공연이 삭제되었습니다.')
      // 선택 페이지로 리다이렉트
      await navigateTo('/performance-management/select')
    } catch (error) {
      console.error('공연 삭제 실패:', error)
      alert('공연 삭제 중 오류가 발생했습니다.')
    }
  }
}

const handleRegisterPerformance = () => {
  navigateTo('/performance-management/select')
}

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
</script>

<template>
  <div class="performance-dashboard">
    <div class="content-header">
      <div class="breadcrumb">
        <NuxtLink to="/performance-management/select" class="breadcrumb-link">공연 준비하기</NuxtLink>
        <span class="separator">/</span>
        <span>대시보드</span>
      </div>
      <h1 class="page-title">{{ selectedPerformance ? selectedPerformance.name : '공연공연' }}</h1>
    </div>

    <div class="content-body">
      <div v-if="isLoadingPerformance" class="loading-state">
        <p>공연 정보를 불러오는 중...</p>
      </div>

      <div v-else-if="selectedPerformance" class="selected-performance-dashboard">
        <!-- 선택된 공연 정보 카드 -->
        <section class="performance-info-card">
          <div class="card-header">
            <div class="performance-image-large">
              <img
                v-if="selectedPerformance.image"
                :src="selectedPerformance.image"
                :alt="selectedPerformance.name"
                class="image"
              />
              <div v-else class="image-placeholder">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="60" height="60" rx="8" fill="#f3f4f6"/>
                  <path d="M30 18v24M18 30h24" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
            <div class="performance-header">
              <div class="performance-title-row">
                <h2 class="performance-title">{{ selectedPerformance.name }}</h2>
                <span class="performance-status" :class="`status--${selectedPerformance.status === 1 ? 'active' : 'closed'}`">
                  {{ getStatusText(selectedPerformance.status) }}
                </span>
              </div>
              <p class="performance-artist">{{ selectedPerformance.artist }}</p>
              <div class="performance-meta">
                <span class="meta-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1v6l4 2M8 15A7 7 0 108 1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ formatDate(selectedPerformance.date) }} {{ selectedPerformance.time }}
                </span>
                <span class="meta-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 8v5M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  {{ selectedPerformance.venue }}
                </span>
              </div>
            </div>
          </div>
          <div class="card-actions">
            <NuxtLink
              :to="`/performance-management/basic-info?id=${selectedPerformance.id}`"
              class="btn btn--primary"
            >
              공연 정보 수정
            </NuxtLink>
            <button
              type="button"
              class="btn btn--danger-outline"
              @click="handleDeletePerformance(selectedPerformance.id)"
            >
              공연 삭제
            </button>
          </div>
        </section>

        <!-- 빠른 액션 링크 -->
        <section class="quick-actions">
          <h3 class="section-title">빠른 관리</h3>
          <div class="actions-grid">
            <NuxtLink
              :to="`/performance-management/basic-info?id=${selectedPerformance.id}`"
              class="action-card"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>공연 기본 정보</span>
            </NuxtLink>
            <NuxtLink
              :to="`/performance-management/tickets?id=${selectedPerformance.id}`"
              class="action-card"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 9a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6 9V7a2 2 0 012-2h8a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>티켓 관리</span>
            </NuxtLink>
            <NuxtLink
              :to="`/performance-management/reservations?id=${selectedPerformance.id}`"
              class="action-card"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>예매자 관리</span>
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.performance-dashboard {
  max-width: 1200px;
}

.content-header {
  margin-bottom: 32px;
}

.breadcrumb {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-link {
  color: #7c3aed;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #6d28d9;
  text-decoration: underline;
}

.separator {
  color: #9ca3af;
}

.page-title {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #111827;
}

.content-body {
  max-width: 900px;
}

/* 액션 버튼 */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn--danger {
  background: #ef4444;
  color: #ffffff;
}

.btn--danger:hover {
  background: #dc2626;
}

.btn--secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn--secondary:hover {
  background: #e5e7eb;
}

.btn--primary {
  background: #06b6d4;
  color: #ffffff;
}

.btn--primary:hover {
  background: #0891b2;
}

.btn--small {
  padding: 8px 16px;
  font-size: 13px;
}

.btn--outline {
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.btn--outline:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn--danger-outline {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
}

.btn--danger-outline:hover {
  background: #fef2f2;
}

/* 공연 리스트 섹션 */
.performances-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
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

.performances-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.performance-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.performance-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: #d1d5db;
}

.performance-image {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.performance-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  flex: 1;
}

.performance-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
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
  flex-wrap: wrap;
  gap: 16px;
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

.performance-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

/* 선택된 공연 대시보드 */
.selected-performance-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.performance-info-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.card-header {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.performance-image-large {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;
}

.performance-image-large .image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.performance-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.performance-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.performance-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  flex: 1;
}

.performance-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
  color: #374151;
  margin-top: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-item svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.card-actions {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.card-actions .btn {
  padding: 0px 14px;
  font-size: 12px;
  flex: 0 0 auto;
  white-space: nowrap;
  min-width: auto;
  height: auto;
  line-height: 1.4;
}

/* 빠른 액션 */
.quick-actions {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.quick-actions .section-title {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  color: #374151;
  transition: all 0.2s;
  background: #ffffff;
}

.action-card:hover {
  border-color: #7c3aed;
  background: #f5f3ff;
  color: #7c3aed;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
}

.action-card svg {
  color: inherit;
}

.action-card span {
  font-size: 14px;
  font-weight: 500;
}

.loading-state {
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
  }

  .performance-image-large {
    width: 100%;
    height: 200px;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
