<script setup lang="ts">
// Nuxt composable 명시적 import (Docker 환경에서 안정적)
import { useAuth } from '../../../composables/useAuth'

const { isAuthenticated, user, logout } = useAuth()
const isDropdownOpen = ref(false)

// 드롭다운 외부 클릭 시 닫기
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.profile-dropdown')) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  if (process.client) {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (process.client) {
    document.removeEventListener('click', handleClickOutside)
  }
})

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const handleMyPage = () => {
  isDropdownOpen.value = false
  navigateTo('/my-page')
}

const handleLogout = async () => {
  isDropdownOpen.value = false
  await logout()
}

// 프로필 사진 초기 이니셜 가져오기
const getInitials = computed(() => {
  if (!user.value?.name) return 'U'
  return user.value.name.charAt(0).toUpperCase()
})
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
      
      <!-- 프로필 드롭다운 -->
      <div v-else class="profile-dropdown">
        <button
          type="button"
          class="profile-button"
          @click="toggleDropdown"
          aria-label="프로필 메뉴"
        >
          <div class="profile-avatar">
            {{ getInitials }}
          </div>
        </button>

        <!-- 드롭다운 메뉴 -->
        <Transition name="dropdown">
          <div v-if="isDropdownOpen" class="dropdown-menu">
            <button
              type="button"
              class="dropdown-item"
              @click="handleMyPage"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17 19v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              마이페이지
            </button>
            <button
              type="button"
              class="dropdown-item"
              @click="handleLogout"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 17h6M13 7l3 3-3 3M10 3H4a1 1 0 00-1 1v12a1 1 0 001 1h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              로그아웃
            </button>
          </div>
        </Transition>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.profile-dropdown {
  position: relative;
}

.profile-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.profile-button:hover .profile-avatar {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 8px;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #e5e7eb;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.dropdown-item svg {
  flex-shrink: 0;
  color: #9ca3af;
}

.dropdown-item:hover svg {
  color: #e5e7eb;
}

/* 드롭다운 애니메이션 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
