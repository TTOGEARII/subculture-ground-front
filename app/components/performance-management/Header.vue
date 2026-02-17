<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'

const { user, fetchProfile } = useAuth()

onMounted(async () => {
  if (!user.value) {
    await fetchProfile()
  }
})

// 프로필 사진 초기 이니셜 가져오기
const getInitials = computed(() => {
  if (!user.value?.name) return 'U'
  return user.value.name.charAt(0).toUpperCase()
})
</script>

<template>
  <header class="performance-header">
    <div class="header-content">
      <!-- 왼쪽 로고 -->
      <div class="header-logo">
        <NuxtLink to="/bookings" class="logo-link">
          <span class="logo-text">TOGEARI</span>
        </NuxtLink>
      </div>

      <!-- 오른쪽 사용자 프로필 -->
      <div class="header-profile">
        <div class="profile-avatar">
          {{ getInitials }}
        </div>
        <div class="profile-info">
          <div class="profile-name">{{ user?.name || '사용자' }}</div>
          <div class="profile-role">호스트</div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.performance-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.header-logo {
  flex-shrink: 0;
}

.logo-link {
  text-decoration: none;
  color: inherit;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.header-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.8), rgba(139, 92, 246, 0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}

.profile-role {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.2;
}
</style>
