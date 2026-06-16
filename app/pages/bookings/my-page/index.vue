<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'
import { usePerformances, getStatusText, type MyReservation } from '../../../composables/usePerformances'

definePageMeta({
  layout: 'bookings',
})

const { user, isAuthenticated, fetchProfile, logout } = useAuth()
const {
  performances,
  loadMyPerformances,
  loading: loadingPerformances,
  getMyReservations,
} = usePerformances()

// 내 예매 내역
const myReservations = ref<MyReservation[]>([])
const loadingReservations = ref(true)
const qrMap = ref<Record<number, string>>({}) // 예매 idx → QR data URL

const resStatusMeta: Record<number, { label: string; cls: string }> = {
  0: { label: '승인대기', cls: 'is-pending' },
  1: { label: '예매완료', cls: 'is-paid' },
  2: { label: '입장완료', cls: 'is-checked' },
  3: { label: '취소', cls: 'is-cancelled' },
}

onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/auth/login')
    return
  }

  if (!user.value) {
    await fetchProfile()
  }

  // 내가 등록한 공연 + 내 예매 내역 로드
  await loadMyPerformances()
  try {
    myReservations.value = await getMyReservations()
    // 승인/입장완료 예매는 입장 QR 생성
    const QRCode = await import('qrcode')
    for (const r of myReservations.value) {
      if (r.ticketStatus === 1 || r.ticketStatus === 2) {
        qrMap.value[r.idx] = await QRCode.toDataURL(`SBG-RES-${r.idx}`, { width: 400, margin: 1 })
      }
    }
  } catch {
    /* 예매 내역 로드 실패는 무시 */
  } finally {
    loadingReservations.value = false
  }
})

const formatPrice = (price: number) =>
  price === 0 ? '무료' : new Intl.NumberFormat('ko-KR').format(price) + '원'

const config = useRuntimeConfig()

// 이미지 URL 변환 (상대경로 → 절대경로)
const getImageSrc = (image?: string) => {
  if (!image) return null
  if (image.startsWith('http')) return image
  return `${config.public.apiBase}${image}`
}

// 공연 날짜 포맷팅 (2026.09.20 (일))
const formatEventDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${year}.${month}.${day} (${weekday})`
}

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
const formatPhone = (phone: string | null | undefined) => {
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

      <!-- 내가 등록한 공연 -->
      <div class="my-events-section">
        <div class="my-events-head">
          <h2 class="section-title">내가 등록한 공연</h2>
          <NuxtLink to="/bookings/performance-management/create" class="my-events-add">
            + 새 공연 등록
          </NuxtLink>
        </div>

        <div v-if="loadingPerformances" class="my-events-empty">
          공연 목록을 불러오는 중...
        </div>

        <div v-else-if="performances.length === 0" class="my-events-empty">
          아직 등록한 공연이 없어요.
          <NuxtLink to="/bookings/performance-management/create" class="my-events-empty-link">
            첫 공연을 등록해보세요 →
          </NuxtLink>
        </div>

        <div v-else class="my-events-list">
          <NuxtLink
            v-for="event in performances.slice(0, 3)"
            :key="event.id"
            :to="`/bookings/performance-management?id=${event.id}`"
            class="my-event-card"
          >
            <div class="my-event-poster">
              <img
                v-if="getImageSrc(event.image)"
                :src="getImageSrc(event.image) || undefined"
                :alt="event.name"
              />
              <div v-else class="my-event-poster--empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>

            <div class="my-event-info">
              <span
                class="my-event-status"
                :class="event.status === 1 ? 'is-open' : 'is-closed'"
              >
                {{ getStatusText(event.status) }}
              </span>
              <h3 class="my-event-name">{{ event.name }}</h3>
              <p class="my-event-meta">{{ formatEventDate(event.date) }} {{ event.time }}</p>
              <p class="my-event-venue">{{ event.venue }}</p>
            </div>

            <svg class="my-event-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
        </div>

        <NuxtLink
          v-if="performances.length > 3"
          to="/bookings/performance-management/select"
          class="section-more"
        >
          전체 {{ performances.length }}건 보기 →
        </NuxtLink>
      </div>

      <!-- 내 예매 내역 -->
      <div class="my-res-section">
        <div class="my-res-head">
          <h2 class="section-title">내 예매 내역</h2>
          <NuxtLink
            v-if="myReservations.length > 0"
            to="/bookings/my-page/reservations"
            class="my-res-more"
          >
            전체 보기
          </NuxtLink>
        </div>

        <p v-if="loadingReservations" class="my-res-empty">불러오는 중...</p>
        <p v-else-if="myReservations.length === 0" class="my-res-empty">
          아직 예매한 공연이 없어요.
          <NuxtLink to="/bookings/events" class="my-res-empty-link">공연 보러가기 →</NuxtLink>
        </p>

        <ul v-else class="my-res-list">
          <li v-for="r in myReservations.slice(0, 3)" :key="r.idx" class="my-res-card">
            <div class="my-res-info">
              <span class="my-res-status" :class="resStatusMeta[r.ticketStatus]?.cls">
                {{ resStatusMeta[r.ticketStatus]?.label }}
              </span>
              <h3 class="my-res-name">{{ r.eventName }}</h3>
              <p class="my-res-meta">{{ formatEventDate(r.eventDate) }} {{ r.eventTime }}</p>
              <p class="my-res-sub">
                {{ r.ticketName || '티켓' }} · {{ r.ticketCnt }}매 · {{ formatPrice(r.ticketTotalPrice) }}
              </p>
            </div>
            <div v-if="qrMap[r.idx]" class="my-res-qr">
              <QrImage :src="qrMap[r.idx]!" :size="72" label="입장 QR" />
            </div>
          </li>
        </ul>
      </div>

      <!-- 바로가기 -->
      <div class="shortcuts-section">
        <h2 class="shortcuts-title">바로가기</h2>
        <div class="shortcuts-list">
          <NuxtLink to="/bookings/my-page/reservations" class="shortcut-item">
            <span class="shortcut-text">내 예매내역</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
          
          <div class="shortcut-divider"></div>

          <NuxtLink to="/bookings/performance-management/select" class="shortcut-item">
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

/* 데스크톱(웹앱)에서 모바일 퍼스트 리스트가 과하게 늘어나지 않도록 중앙 컬럼으로 제한.
   전역 .main(max-width:1100)을 이 페이지에 한해 좁힌다. 모바일은 그대로 풀폭. */
.mypage .main {
  max-width: 720px;
}

.mypage-header {
  padding: 16px 20px 24px;
  background: #ffffff;
  border-bottom: 1px solid var(--color-border);
}

.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
  color: var(--color-text-body);
  text-decoration: none;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  background: var(--color-surface-muted);
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
  background: var(--primary);
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
  color: var(--color-text);
}

.profile-phone {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

/* 내가 등록한 공연 */
.my-events-section {
  padding: 20px;
  background: #ffffff;
}

.my-events-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.my-events-add {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
}

.my-events-add:hover {
  text-decoration: underline;
}

.my-events-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  background: var(--color-surface-subtle);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  color: var(--color-text-faint);
  font-size: 14px;
}

.my-events-empty-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
  font-size: 13px;
}

.my-events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.my-event-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: #ffffff;
  text-decoration: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.my-event-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.my-event-poster {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface-muted);
}

.my-event-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.my-event-poster--empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c4c4c4;
}

.my-event-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.my-event-status {
  display: inline-block;
  width: fit-content;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.my-event-status.is-open {
  background: #fde8ec;
  color: var(--primary);
}

.my-event-status.is-closed {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.my-event-name {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-event-meta {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.my-event-venue {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-event-arrow {
  flex-shrink: 0;
  color: #c4c4c4;
}

.section-more {
  display: block;
  margin-top: 12px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-decoration: none;
}

.section-more:hover {
  color: var(--color-text);
}

.my-res-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.my-res-more {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
}

.my-res-more:hover {
  text-decoration: underline;
}

/* 내 예매 내역 */
.my-res-section {
  padding: 20px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}

.my-res-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 20px;
  background: var(--color-surface-subtle);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  color: var(--color-text-faint);
  font-size: 14px;
}

.my-res-empty-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
  font-size: 13px;
}

.my-res-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.my-res-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: #ffffff;
}

.my-res-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.my-res-status {
  display: inline-block;
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 2px;
}

.my-res-status.is-pending {
  background: #fef3c7;
  color: #92400e;
}

.my-res-status.is-paid {
  background: #fde8ec;
  color: var(--primary);
}

.my-res-status.is-checked {
  background: #d1fae5;
  color: #065f46;
}

.my-res-status.is-cancelled {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.my-res-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-res-meta {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.my-res-sub {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-faint);
}

.my-res-qr {
  flex-shrink: 0;
}

.shortcuts-section {
  padding: 20px;
  background: #ffffff;
}

.shortcuts-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
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
  color: var(--color-text);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s ease;
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-item:hover {
  background: var(--color-surface-subtle);
}

.shortcut-text {
  flex: 1;
}

.shortcut-item svg {
  color: var(--color-text-faint);
  flex-shrink: 0;
}

.shortcut-item:hover svg {
  color: var(--color-text-muted);
}

.shortcut-divider {
  height: 1px;
  background: var(--color-border);
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
