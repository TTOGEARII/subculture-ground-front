<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'
import { usePerformances } from '../../composables/usePerformances'

const { isAuthenticated, user, fetchProfile } = useAuth()
const { performances, loadMyPerformances } = usePerformances()

// 공연 목록이 있는지 확인
const hasPerformances = computed(() => performances.value.length > 0)

// 레이아웃 마운트 시 공연 목록 로드
const loadData = async () => {
  if (isAuthenticated.value) {
    if (!user.value) {
      await fetchProfile()
    }
    await loadMyPerformances()
  }
}

onMounted(() => {
  loadData()
})

// 라우트 변경 감지하여 새로고침
const route = useRoute()
watch(() => route.path, async () => {
  if (isAuthenticated.value) {
    await loadMyPerformances()
  }
})
</script>

<template>
  <div class="performance-management-layout">
    <PerformanceManagementHeader />
    <PerformanceManagementSidebar :has-performances="hasPerformances" />
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.performance-management-layout {
  min-height: 100vh;
  background: #f5f5f5;
}

.main-content {
  margin-left: 240px;
  margin-top: 64px;
  padding: 32px 40px;
  background: #ffffff;
  min-height: calc(100vh - 64px);
}

/* 태블릿: 사이드바 폭 축소 */
@media (max-width: 1024px) {
  .main-content {
    padding: 28px 24px;
  }
}

/* 모바일: 사이드바가 헤더 아래 가로 네비로 전환되므로 좌측 마진 제거 + 상단 오프셋 확보 */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    margin-top: 116px;
    padding: 20px 16px;
    min-height: calc(100vh - 116px);
  }
}
</style>
