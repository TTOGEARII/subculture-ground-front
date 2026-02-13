<script setup lang="ts">
import { usePerformances, getStatusText, type Performance } from '../../../../composables/usePerformances'
import { useAuth } from '../../../../composables/useAuth'

definePageMeta({
  layout: 'bookings',
})

const route = useRoute()
const router = useRouter()
const performanceId = computed(() => Number(route.params.id))

const { getPerformanceById } = usePerformances()
const { isAuthenticated } = useAuth()

const performance = ref<Performance | null>(null)
const loading = ref(true)
const error = ref<Error | null>(null)
const isModalOpen = ref(false)
const ticketCount = ref(1)
const minTickets = 1
const maxTickets = 10

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const data = await getPerformanceById(performanceId.value)
    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: '공연을 찾을 수 없습니다.',
      })
    }
    performance.value = data
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err))
    if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 404) {
      throw err
    }
  } finally {
    loading.value = false
  }
})

useSeoMeta({
  title: computed(() => performance.value ? `${performance.value.name} - Subculture Ground` : '공연 상세 - Subculture Ground'),
  description: computed(() => performance.value?.description || ''),
  ogTitle: computed(() => performance.value ? `${performance.value.name} - Subculture Ground` : '공연 상세 - Subculture Ground'),
  ogDescription: computed(() => performance.value?.description || ''),
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const weekday = weekdays[date.getDay()]
  return `${year}년 ${month}월 ${day}일 (${weekday})`
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price)
}

const getStatusClass = (status: Performance['status']) => {
  return status === 1 ? 'status--open' : 'status--closed'
}

const handleBookingClick = () => {
  if (!isAuthenticated.value) {
    // 로그인 안 되어 있으면 로그인 페이지로 이동 (현재 경로를 redirect 파라미터로 전달)
    const currentPath = route.fullPath
    router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`)
    return
  }

  // 로그인 되어 있으면 모달 열기
  isModalOpen.value = true
}

const handleModalClose = () => {
  isModalOpen.value = false
  ticketCount.value = 1
}

const decreaseTicketCount = () => {
  if (ticketCount.value > minTickets) {
    ticketCount.value--
  }
}

const increaseTicketCount = () => {
  if (ticketCount.value < maxTickets) {
    ticketCount.value++
  }
}

const totalPrice = computed(() => {
  return performance.value ? performance.value.price * ticketCount.value : 0
})

const handleBookingConfirm = () => {
  // 예매 확인 로직 (추후 구현)
  console.log('예매 확인:', {
    performanceId: performanceId.value,
    ticketCount: ticketCount.value,
    totalPrice: totalPrice.value,
  })
  
  // 모달 닫기
  isModalOpen.value = false
  ticketCount.value = 1
  
  // TODO: 실제 예매 API 호출
  // 예매 완료 후 예매 내역 페이지로 이동하거나 성공 메시지 표시
}
</script>

<template>
  <div class="event-detail-page">
    <main class="main" v-if="!loading && performance">
      <div class="detail-header">
        <NuxtLink to="/bookings/events" class="back-link">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 15l-5-5 5-5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          공연 리스트로 돌아가기
        </NuxtLink>

        <div class="event-header">
          <div class="event-header__badges">
            <span :class="['status-badge', getStatusClass(performance.status)]">
              {{ getStatusText(performance.status) }}
            </span>
            <span
              v-for="cat in performance.category"
              :key="cat"
              class="category-badge"
            >
              {{ cat }}
            </span>
          </div>

          <h1 class="event-title">{{ performance.name }}</h1>
          <p class="event-artist">{{ performance.artist }}</p>
        </div>
      </div>

      <div class="detail-content">
        <div class="detail-main">
          <div class="detail-section">
            <h2 class="section-title">공연 정보</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">공연일시</span>
                <span class="info-value">{{ formatDate(performance.date) }} {{ performance.time }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">공연장</span>
                <span class="info-value">{{ performance.venue }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">티켓 가격</span>
                <span class="info-value">{{ formatPrice(performance.price) }}원</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h2 class="section-title">공연 소개</h2>
            <p class="event-description">{{ performance.description || '공연 설명이 없습니다.' }}</p>
          </div>
        </div>

        <div class="detail-sidebar">
          <div class="booking-card">
            <div class="booking-card__header">
              <span class="booking-price">{{ formatPrice(performance.price) }}원</span>
              <span class="booking-status" :class="getStatusClass(performance.status)">
                {{ getStatusText(performance.status) }}
              </span>
            </div>

            <div class="booking-card__body">
              <div class="booking-info">
                <div class="booking-info-item">
                  <span class="booking-label">공연일</span>
                  <span class="booking-value">{{ formatDate(performance.date) }}</span>
                </div>
                <div class="booking-info-item">
                  <span class="booking-label">시간</span>
                  <span class="booking-value">{{ performance.time }}</span>
                </div>
                <div class="booking-info-item">
                  <span class="booking-label">장소</span>
                  <span class="booking-value">{{ performance.venue }}</span>
                </div>
              </div>
            </div>

            <div class="booking-card__footer">
              <button
                :class="['btn', 'btn--primary', 'btn--large', { 'btn--disabled': performance.status === 0 }]"
                :disabled="performance.status === 0"
                @click="handleBookingClick"
              >
                {{ performance.status === 0 ? '예매 마감' : '예매하기' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="loading" class="empty-state">
      <p class="empty-text">공연 정보를 불러오는 중입니다.</p>
    </div>

    <div v-if="error && !loading" class="empty-state">
      <p class="empty-text">공연 정보를 불러오지 못했습니다.</p>
      <p class="empty-hint">{{ error.message || '잠시 후 다시 시도해주세요.' }}</p>
      <NuxtLink to="/bookings/events" class="btn btn--primary">
        공연 리스트로 돌아가기
      </NuxtLink>
    </div>

    <!-- 티켓 예매 모달 -->
    <Modal
      v-if="performance"
      :is-open="isModalOpen"
      title="티켓 예매"
      size="medium"
      @close="handleModalClose"
    >
      <template #default>
        <div class="ticket-booking-content">
          <div class="performance-info">
            <h3 class="performance-name">{{ performance.name }}</h3>
            <div class="performance-details">
              <div class="detail-item">
                <span class="detail-label">공연일시</span>
                <span class="detail-value">{{ formatDate(performance.date) }} {{ performance.time }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">공연장</span>
                <span class="detail-value">{{ performance.venue }}</span>
              </div>
            </div>
          </div>

          <div class="ticket-selection">
            <div class="ticket-count-section">
              <label class="ticket-label">티켓 수량</label>
              <div class="ticket-counter">
                <button
                  class="counter-btn"
                  :disabled="ticketCount <= minTickets"
                  @click="decreaseTicketCount"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 10h10"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
                <span class="ticket-count">{{ ticketCount }}</span>
                <button
                  class="counter-btn"
                  :disabled="ticketCount >= maxTickets"
                  @click="increaseTicketCount"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 5v10M5 10h10"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div class="price-summary">
              <div class="price-row">
                <span class="price-label">티켓 가격</span>
                <span class="price-value">{{ formatPrice(performance.price) }}원</span>
              </div>
              <div class="price-row">
                <span class="price-label">수량</span>
                <span class="price-value">{{ ticketCount }}매</span>
              </div>
              <div class="price-row price-row--total">
                <span class="price-label">총 결제금액</span>
                <span class="price-value">{{ formatPrice(totalPrice) }}원</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <button class="btn btn--secondary" @click="handleModalClose">
          취소
        </button>
        <button class="btn btn--primary" @click="handleBookingConfirm">
          예매하기
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.ticket-booking-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.performance-info {
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.performance-name {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text, #ffffff);
}

.performance-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 13px;
  color: var(--muted-2, rgba(255, 255, 255, 0.5));
}

.detail-value {
  font-size: 13px;
  color: var(--text, #ffffff);
  font-weight: 500;
}

.ticket-selection {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ticket-count-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #ffffff);
}

.ticket-counter {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
}

.counter-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text, #ffffff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.counter-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.counter-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ticket-count {
  font-size: 20px;
  font-weight: 700;
  color: var(--text, #ffffff);
  min-width: 40px;
  text-align: center;
}

.price-summary {
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-row--total {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 4px;
}

.price-label {
  font-size: 14px;
  color: var(--muted, rgba(255, 255, 255, 0.6));
}

.price-row--total .price-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--text, #ffffff);
}

.price-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #ffffff);
}

.price-row--total .price-value {
  font-size: 18px;
  font-weight: 700;
  color: #4ade80;
}

.btn {
  flex: 1;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
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
</style>

