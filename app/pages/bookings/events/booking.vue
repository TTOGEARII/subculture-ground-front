<script setup lang="ts">
import { usePerformances, type Performance, type TicketInfo } from '../../../../composables/usePerformances'
import { useAuth } from '../../../../composables/useAuth'
import { useApi } from '../../../../composables/useUtil'

definePageMeta({
  layout: 'bookings',
})

const route = useRoute()
const router = useRouter()

const eventId = computed(() => Number(route.query.eventId))
const ticketIdxParam = computed(() => Number(route.query.ticketIdx) || null)
const ticketCount = computed(() => Math.max(1, Math.min(10, Number(route.query.count) || 1)))

const { getPerformanceById, getTicketsByPerformanceId } = usePerformances()
const { isAuthenticated, user, fetchProfile } = useAuth()
const apiClient = useApi()

const performance = ref<Performance | null>(null)
const selectedTicket = ref<TicketInfo | null>(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref<Error | null>(null)
const bookingError = ref('')
const bookingSuccess = ref(false)

onMounted(async () => {
  if (!eventId.value || Number.isNaN(eventId.value)) {
    await navigateTo('/bookings/events')
    return
  }
  if (!isAuthenticated.value) {
    await navigateTo(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  // 예매 확정에 user.idx가 필요하므로 프로필을 보장한다
  if (!user.value) await fetchProfile()

  loading.value = true
  error.value = null
  try {
    const [data, tickets] = await Promise.all([
      getPerformanceById(eventId.value),
      getTicketsByPerformanceId(eventId.value),
    ])
    if (!data) {
      throw createError({ statusCode: 404, statusMessage: '공연을 찾을 수 없습니다.' })
    }
    if (data.status === 0) {
      await navigateTo(`/bookings/events/${eventId.value}`)
      return
    }
    performance.value = data

    // ticketIdx 파라미터로 선택된 티켓 찾기
    if (ticketIdxParam.value) {
      selectedTicket.value = tickets.find((t) => Number(t.idx) === ticketIdxParam.value) ?? tickets[0] ?? null
    } else {
      selectedTicket.value = tickets[0] ?? null
    }
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err))
    if (err && typeof err === 'object' && 'statusCode' in err && (err as any).statusCode === 404) throw err
  } finally {
    loading.value = false
  }
})

useSeoMeta({
  title: computed(() => (performance.value ? `예매 - ${performance.value.name}` : '예매하기 - Subculture Ground')),
  description: '공연 예매 정보를 확인하고 결제를 진행하세요.',
})

const ticketPrice = computed(() => selectedTicket.value?.ticketPrice ?? performance.value?.price ?? 0)
const totalPrice = computed(() => ticketPrice.value * ticketCount.value)

// 잔여 수량 = 최대 수량 - 판매 수량. 선택~확정 사이 재고 소진/직접 진입을 화면에서 차단한다.
const remaining = computed(() =>
  selectedTicket.value ? selectedTicket.value.ticketMax - selectedTicket.value.ticketCount : 0,
)
const isSoldOut = computed(() => remaining.value <= 0)
const isInsufficient = computed(() => !isSoldOut.value && remaining.value < ticketCount.value)
const canBook = computed(() => !!selectedTicket.value && !isSoldOut.value && !isInsufficient.value)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  return `${year}년 ${month}월 ${day}일 (${weekdays[date.getDay()]})`
}

const formatPrice = (price: number) =>
  price === 0 ? '무료' : new Intl.NumberFormat('ko-KR').format(price) + '원'

const goBackToDetail = () => {
  router.push(`/bookings/events/${eventId.value}`)
}

const handleConfirmBooking = async () => {
  if (!selectedTicket.value || !user.value || !canBook.value) return

  submitting.value = true
  bookingError.value = ''
  try {
    await apiClient.post('/ticket-user', {
      ticketIdx: selectedTicket.value.idx,
      userIdx: user.value.idx,
      ticketCnt: ticketCount.value,
      ticketTotalPrice: totalPrice.value,
      ticketStatus: 0, // 0: 대기
    })
    bookingSuccess.value = true
  } catch (err: any) {
    bookingError.value =
      err?.response?.data?.message || err?.message || '예매 중 오류가 발생했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="booking-page">

    <!-- 예매 성공 -->
    <div v-if="bookingSuccess" class="success-state">
      <div class="success-icon">✓</div>
      <h2 class="success-title">예매가 완료됐습니다!</h2>
      <p class="success-desc">
        {{ performance?.name }}<br/>
        {{ ticketCount }}매 · {{ formatPrice(totalPrice) }}
      </p>
      <p class="success-notice">
        입금 확인 후 예매가 승인되면, 입장 QR이 카카오톡과 마이페이지로 제공됩니다.
      </p>

      <div class="success-actions">
        <NuxtLink to="/my-page" class="btn btn--primary">마이페이지 확인</NuxtLink>
        <NuxtLink to="/bookings/events" class="btn btn--secondary">공연 목록으로</NuxtLink>
      </div>
    </div>

    <!-- 예매 폼 -->
    <main class="main" v-else-if="!loading && performance">
      <div class="booking-header">
        <button class="back-link" @click="goBackToDetail">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          공연 상세로
        </button>
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
            <div v-if="selectedTicket" class="summary-row">
              <span class="summary-label">티켓 종류</span>
              <span class="summary-value">{{ selectedTicket.ticketName || '일반 티켓' }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">티켓 수량</span>
              <span class="summary-value">{{ ticketCount }}매</span>
            </div>
            <div v-if="selectedTicket" class="summary-row">
              <span class="summary-label">잔여 수량</span>
              <span class="summary-value" :class="{ 'summary-value--soldout': isSoldOut }">
                {{ isSoldOut ? '매진' : `${remaining}매` }}
              </span>
            </div>
            <div class="summary-row summary-row--total">
              <span class="summary-label">총 결제금액</span>
              <span class="summary-value">{{ formatPrice(totalPrice) }}</span>
            </div>
          </div>
        </section>

        <p v-if="isSoldOut" class="booking-notice booking-notice--soldout">
          이 티켓은 매진되어 예매할 수 없어요.
        </p>
        <p v-else-if="isInsufficient" class="booking-notice booking-notice--soldout">
          남은 수량({{ remaining }}매)보다 많이 선택하셨어요. 수량을 줄여 다시 시도해주세요.
        </p>

        <div v-if="bookingError" class="booking-error">{{ bookingError }}</div>

        <div class="booking-actions">
          <button type="button" class="btn btn--secondary" @click="goBackToDetail">
            이전으로
          </button>
          <button
            type="button"
            class="btn btn--primary"
            :disabled="submitting || !canBook"
            @click="handleConfirmBooking"
          >
            <span v-if="submitting">처리 중...</span>
            <span v-else-if="isSoldOut">매진</span>
            <span v-else>예매 확정</span>
          </button>
        </div>
      </div>
    </main>

    <div v-if="loading && !bookingSuccess" class="empty-state">
      <p class="empty-text">예매 정보를 불러오는 중입니다.</p>
    </div>

    <div v-if="error && !loading && !bookingSuccess" class="empty-state">
      <p class="empty-text">예매 정보를 불러오지 못했습니다.</p>
      <p class="empty-hint">{{ error.message }}</p>
      <NuxtLink to="/bookings/events" class="btn btn--primary" style="margin-top:12px">공연 리스트로 돌아가기</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.booking-page {
  min-height: 100vh;
  background: #ffffff;
  color: var(--ink);
  font-family: Circular, -apple-system, system-ui, Roboto, 'Helvetica Neue', sans-serif;
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
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 16px;
  transition: color 120ms ease;
}

.back-link:hover {
  color: var(--ink);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
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
  color: var(--ink);
}

.performance-summary {
  padding: 24px;
  background: var(--surface-soft);
  border: 1px solid var(--hairline-soft);
  border-radius: 14px;
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
  color: var(--muted);
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}

.summary-row--total {
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid var(--hairline);
}

.summary-row--total .summary-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.summary-row--total .summary-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
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
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.btn--secondary {
  background: #ffffff;
  color: var(--ink);
  border: 1px solid var(--hairline);
}

.btn--secondary:hover {
  background: var(--surface-soft);
}

.btn--primary {
  background: var(--primary);
  color: #ffffff;
  border: 1px solid var(--primary);
}

.btn--primary:hover {
  background: var(--primary-active);
  border-color: var(--primary-active);
}

.btn--primary:disabled {
  background: var(--hairline);
  border-color: var(--hairline);
  color: #ffffff;
  cursor: not-allowed;
}

.summary-value--soldout {
  color: var(--error);
  font-weight: 700;
}

.booking-notice {
  margin: 0 0 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
}

.booking-notice--soldout {
  background: rgba(193, 53, 21, 0.08);
  border: 1px solid rgba(193, 53, 21, 0.3);
  color: var(--error);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 16px;
  transition: color 120ms ease;
}

.back-link:hover {
  color: var(--ink);
}

.booking-error {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(193, 53, 21, 0.08);
  border: 1px solid rgba(193, 53, 21, 0.3);
  color: var(--error);
  font-size: 14px;
  margin-bottom: 16px;
}

/* 예매 성공 */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
  text-align: center;
  gap: 12px;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--primary);
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.success-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--ink);
}

.success-desc {
  margin: 0;
  font-size: 16px;
  color: var(--ink);
  line-height: 1.6;
}

.success-notice {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  padding: 12px 20px;
  background: var(--surface-soft);
  border-radius: 8px;
}

.success-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
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
  color: var(--ink);
}

.empty-hint {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}
</style>
