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
</style>
