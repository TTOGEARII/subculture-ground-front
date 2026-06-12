<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'
import { usePerformances, type MyReservation } from '../../../composables/usePerformances'

definePageMeta({
  layout: 'bookings',
})

const { user, isAuthenticated, fetchProfile } = useAuth()
const { getMyReservations } = usePerformances()

const reservations = ref<MyReservation[]>([])
const loading = ref(true)
const qrMap = ref<Record<number, string>>({})
const activeStatus = ref<number | 'all'>('all')

const statusMeta: Record<number, { label: string; cls: string }> = {
  0: { label: '승인대기', cls: 'is-pending' },
  1: { label: '예매완료', cls: 'is-paid' },
  2: { label: '입장완료', cls: 'is-checked' },
  3: { label: '취소', cls: 'is-cancelled' },
}

const tabs = [
  { value: 'all' as const, label: '전체' },
  { value: 0, label: '승인대기' },
  { value: 1, label: '예매완료' },
  { value: 2, label: '입장완료' },
  { value: 3, label: '취소' },
]

const filtered = computed(() =>
  activeStatus.value === 'all'
    ? reservations.value
    : reservations.value.filter((r) => r.ticketStatus === activeStatus.value),
)

const countByStatus = (status: number) =>
  reservations.value.filter((r) => r.ticketStatus === status).length

onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/auth/login')
    return
  }
  if (!user.value) await fetchProfile()

  loading.value = true
  try {
    reservations.value = await getMyReservations()
    const QRCode = await import('qrcode')
    for (const r of reservations.value) {
      if (r.ticketStatus === 1 || r.ticketStatus === 2) {
        qrMap.value[r.idx] = await QRCode.toDataURL(`SBG-RES-${r.idx}`, { width: 400, margin: 1 })
      }
    }
  } finally {
    loading.value = false
  }
})

useSeoMeta({
  title: '내 예매 내역 - Subculture Ground',
  description: '내 예매 내역을 확인합니다.',
})

const formatPrice = (price: number) =>
  price === 0 ? '무료' : new Intl.NumberFormat('ko-KR').format(price) + '원'

const formatEventDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const w = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${y}.${m}.${d} (${w})`
}
</script>

<template>
  <div class="res-page">
    <main class="main">
      <div class="page-head">
        <NuxtLink to="/my-page" class="back-button" aria-label="마이페이지로">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </NuxtLink>
        <h1 class="page-title">내 예매 내역</h1>
      </div>

      <div class="status-tabs">
        <button
          v-for="tab in tabs"
          :key="String(tab.value)"
          type="button"
          class="status-tab"
          :class="{ 'is-active': activeStatus === tab.value }"
          @click="activeStatus = tab.value"
        >
          {{ tab.label }}
          <span class="tab-count">
            {{ tab.value === 'all' ? reservations.length : countByStatus(tab.value as number) }}
          </span>
        </button>
      </div>

      <p v-if="loading" class="res-empty">불러오는 중...</p>
      <p v-else-if="filtered.length === 0" class="res-empty">
        해당하는 예매 내역이 없어요.
        <NuxtLink to="/bookings/events" class="res-empty-link">공연 보러가기 →</NuxtLink>
      </p>

      <ul v-else class="res-list">
        <li v-for="r in filtered" :key="r.idx" class="res-card">
          <div class="res-info">
            <span class="res-status" :class="statusMeta[r.ticketStatus]?.cls">
              {{ statusMeta[r.ticketStatus]?.label }}
            </span>
            <h2 class="res-name">{{ r.eventName }}</h2>
            <p class="res-meta">{{ formatEventDate(r.eventDate) }} {{ r.eventTime }}</p>
            <p class="res-sub">
              {{ r.ticketName || '티켓' }} · {{ r.ticketCnt }}매 · {{ formatPrice(r.ticketTotalPrice) }}
            </p>
            <NuxtLink :to="`/bookings/events/${r.eventId}`" class="res-link">공연 상세 →</NuxtLink>
          </div>
          <div v-if="qrMap[r.idx]" class="res-qr">
            <QrImage :src="qrMap[r.idx]!" :size="96" label="입장 QR" />
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>

<style scoped>
.res-page {
  min-height: 100vh;
  background: #ffffff;
}

.main {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 56px;
}

.page-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #374151;
  border-radius: 8px;
  text-decoration: none;
}

.back-button:hover {
  background: #f3f4f6;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.status-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: none;
  background: none;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
}

.status-tab.is-active {
  color: #ff385c;
  border-bottom-color: #ff385c;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #f3f4f6;
  font-size: 11px;
  color: #374151;
}

.res-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 20px;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  color: #9ca3af;
  font-size: 14px;
}

.res-empty-link {
  color: #ff385c;
  font-weight: 600;
  text-decoration: none;
  font-size: 13px;
}

.res-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.res-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
}

.res-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.res-status {
  display: inline-block;
  width: fit-content;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 2px;
}

.res-status.is-pending {
  background: #fef3c7;
  color: #92400e;
}

.res-status.is-paid {
  background: #fde8ec;
  color: #ff385c;
}

.res-status.is-checked {
  background: #d1fae5;
  color: #065f46;
}

.res-status.is-cancelled {
  background: #f3f4f6;
  color: #6b7280;
}

.res-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.res-meta {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.res-sub {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}

.res-link {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-decoration: none;
}

.res-link:hover {
  color: #111827;
}

.res-qr {
  flex-shrink: 0;
}
</style>
