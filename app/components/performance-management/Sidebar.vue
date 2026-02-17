<script setup lang="ts">
interface Props {
  hasPerformances?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasPerformances: false,
})

const route = useRoute()
const currentPath = computed(() => route.path)

// 현재 공연 ID 가져오기
const performanceId = computed(() => route.query.id as string | undefined)

// 기본 경로 생성 함수
const getPathWithId = (basePath: string) => {
  if (performanceId.value) {
    return `${basePath}?id=${performanceId.value}`
  }
  return basePath
}

const dashboardItem = computed(() => ({ 
  path: getPathWithId('/performance-management'), 
  label: '대시보드', 
  icon: 'grid' 
}))

const otherMenuItems = computed(() => [
  { path: getPathWithId('/performance-management/basic-info'), label: '공연 기본 정보', icon: 'document' },
  { path: getPathWithId('/performance-management/tickets'), label: '티켓 관리', icon: 'tickets' },
  { path: getPathWithId('/performance-management/ticket-options'), label: '티켓 옵션 관리', icon: 'options' },
  { path: getPathWithId('/performance-management/reservations'), label: '예매자 관리', icon: 'users' },
  { path: getPathWithId('/performance-management/qr-checkin'), label: 'QR 체크인', icon: 'qr' },
])

// 공연이 있으면 모든 메뉴, 없으면 대시보드만 표시
const menuItems = computed(() => {
  if (props.hasPerformances) {
    return [dashboardItem.value, ...otherMenuItems.value]
  }
  return [dashboardItem.value]
})

const isActive = (path: string) => {
  // 쿼리 파라미터를 제외한 경로만 비교
  const pathWithoutQuery = path.split('?')[0]
  return currentPath.value === pathWithoutQuery
}
</script>

<template>
  <aside class="performance-sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">G</div>
        <span class="logo-text">공연공연</span>
      </div>
    </div>
    
    <nav class="sidebar-nav">
      <NuxtLink
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ 'nav-item--active': isActive(item.path) }"
      >
        <span class="nav-icon">
          <svg v-if="item.icon === 'grid'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="12" y="12" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="item.icon === 'document'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h12v12H4V4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 8h8M6 12h8" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="item.icon === 'image'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="14" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="7" cy="9" r="1.5" fill="currentColor"/>
            <path d="M13 7l-3 3-2-2-3 3h10l-2-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="item.icon === 'tickets'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="6" width="14" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 6V4a1 1 0 011-1h6a1 1 0 011 1v2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 10h6M7 12h4" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="item.icon === 'options'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 4v2M10 14v2M4 10h2M14 10h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="item.icon === 'users'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M3 16c0-2 1.5-3 4-3h2c2.5 0 4 1 4 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="13" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M17 16c0-2-1.5-3-4-3h-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="item.icon === 'qr'" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="6" height="6" stroke="currentColor" stroke-width="1.5"/>
            <rect x="11" y="3" width="6" height="6" stroke="currentColor" stroke-width="1.5"/>
            <rect x="3" y="11" width="6" height="6" stroke="currentColor" stroke-width="1.5"/>
            <rect x="13" y="11" width="4" height="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M11 13h2M11 15h2" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </span>
        <span class="nav-label">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<style scoped>
.performance-sidebar {
  position: fixed;
  top: 64px;
  left: 0;
  width: 240px;
  height: calc(100vh - 64px);
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #000000;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.sidebar-nav {
  padding: 12px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #374151;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.nav-item:hover {
  background: #f9fafb;
}

.nav-item--active {
  background: #06b6d4;
  color: #ffffff;
}

.nav-item--active:hover {
  background: #0891b2;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}
</style>
