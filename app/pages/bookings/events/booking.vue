<script setup lang="ts">
import { usePerformances, type Performance } from '../../../../composables/usePerformances'
import { useAuth } from '../../../../composables/useAuth'

definePageMeta({
  layout: 'bookings',
})

const route = useRoute()
const router = useRouter()

const eventId = computed(() => Number(route.query.eventId))
const ticketCount = computed(() => Math.max(1, Math.min(10, Number(route.query.count) || 1)))

const { getPerformanceById } = usePerformances()
const { isAuthenticated } = useAuth()

const performance = ref<Performance | null>(null)
const loading = ref(true)
const error = ref<Error | null>(null)

onMounted(async () => {
  if (!eventId.value || Number.isNaN(eventId.value)) {
    await navigateTo('/bookings/events')
    return
  }
  if (!isAuthenticated.value) {
    await navigateTo(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }

  loading.value = true
  error.value = null
  try {
    const data = await getPerformanceById(eventId.value)
    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: '공연을 찾을 수 없습니다.',
      })
    }
    if (data.status === 0) {
      await navigateTo(`/bookings/events/${eventId.value}`)
      return
    }
    performance.value = data
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err))
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
      throw err
    }
  } finally {
    loading.value = false
  }
})

useSeoMeta({
  title: computed(() => (performance.value ? `예매 - ${performance.value.name}` : '예매하기 - Subculture Ground')),
  description: '공연 예매 정보를 확인하고 결제를 진행하세요.',
})

const totalPrice = computed(() => (performance.value ? performance.value.price * ticketCount.value : 0))

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const weekday = weekdays[date.getDay()]
  return `${year}년 ${month}월 ${day}일 (${weekday})`
}

const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price)

const goBackToDetail = () => {
  router.push(`/bookings/events/${eventId.value}`)
}

const handleConfirmBooking = () => {
  // TODO: 실제 결제/예매 API 연동
  // 예매 확정 후 예매 완료 페이지로 이동
  console.log('예매 확정:', { eventId: eventId.value, count: ticketCount.value, total: totalPrice.value })
}
</script>

<template>
  <div class="booking-page">
    <main class="main" v-if="!loading && performance">
      <div class="booking-header">
        <NuxtLink to="/bookings/events" class="back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          공연 리스트
        </NuxtLink>
        <h1 class="page-title">예매하기</h1>
      </div>

      <div class="booking-content">
        <section class="booking-section">
          <h2 class="section-title">예매 정보</h2>
          <div class="performance-summary">
            <div class="summary-row">
              <span class="summary-label">공연명</span>
              <span class="summary-value">{{ performance.name }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">아티스트</span>
              <span class="summary-value">{{ performance.artist }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">공연일시</span>
              <span class="summary-value">{{ formatDate(performance.date) }} {{ performance.time }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">공연장</span>
              <span class="summary-value">{{ performance.venue }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">티켓 수량</span>
              <span class="summary-value">{{ ticketCount }}매</span>
            </div>
            <div class="summary-row summary-row--total">
              <span class="summary-label">총 결제금액</span>
              <span class="summary-value">{{ formatPrice(totalPrice) }}원</span>
            </div>
          </div>
        </section>

        <div class="booking-actions">
          <button type="button" class="btn btn--secondary" @click="goBackToDetail">
            이전으로
          </button>
          <button type="button" class="btn btn--primary" @click="handleConfirmBooking">
            예매 확정
          </button>
        </div>
      </div>
    </main>

    <div v-if="loading" class="empty-state">
      <p class="empty-text">예매 정보를 불러오는 중입니다.</p>
    </div>

    <div v-if="error && !loading" class="empty-state">
      <p class="empty-text">예매 정보를 불러오지 못했습니다.</p>
      <p class="empty-hint">{{ error.message }}</p>
      <NuxtLink to="/bookings/events" class="btn btn--primary">공연 리스트로 돌아가기</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.booking-page {
  --bg: #070a13;
  --text: rgba(255, 255, 255, 0.92);
  --muted: rgba(255, 255, 255, 0.66);

  min-height: 100vh;
  background: radial-gradient(1200px 800px at 20% 0%, rgba(124, 58, 237, 0.28), transparent 55%),
    radial-gradient(900px 600px at 80% 10%, rgba(34, 197, 94, 0.18), transparent 50%),
    var(--bg);
  color: var(--text);
}

.booking-page .main {
  max-width: 560px;
  margin: 0 auto;
  padding: 26px 20px 56px;
}

.booking-header {
  margin-bottom: 32px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted, rgba(255, 255, 255, 0.6));
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 16px;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: var(--text, #ffffff);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text, #ffffff);
}

.booking-content {
  max-width: 560px;
}

.booking-section {
  margin-bottom: 32px;
}

.section-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text, #ffffff);
}

.performance-summary {
  padding: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 14px;
  color: var(--muted, rgba(255, 255, 255, 0.6));
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text, #ffffff);
}

.summary-row--total {
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.summary-row--total .summary-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--text, #ffffff);
}

.summary-row--total .summary-value {
  font-size: 18px;
  font-weight: 700;
  color: #4ade80;
}

.booking-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.booking-actions .btn {
  flex: 1;
  min-width: 120px;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn--secondary {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text, #ffffff);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn--secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn--primary {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.8), rgba(139, 92, 246, 0.8));
  color: #ffffff;
  border: 1px solid rgba(124, 58, 237, 0.5);
}

.btn--primary:hover {
  background: linear-gradient(135deg, rgba(124, 58, 237, 1), rgba(139, 92, 246, 1));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 12px;
  text-align: center;
}

.empty-text {
  margin: 0;
  font-size: 16px;
  color: var(--text, #ffffff);
}

.empty-hint {
  margin: 0;
  font-size: 14px;
  color: var(--muted, rgba(255, 255, 255, 0.6));
}
</style>
