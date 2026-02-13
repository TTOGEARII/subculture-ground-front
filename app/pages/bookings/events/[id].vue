<script setup lang="ts">
import { usePerformances, getStatusText, type Performance } from '../../../../composables/usePerformances'

definePageMeta({
  layout: 'bookings',
})

const route = useRoute()
const performanceId = computed(() => Number(route.params.id))

const { getPerformanceById } = usePerformances()

const performance = ref<Performance | null>(null)
const loading = ref(true)
const error = ref<Error | null>(null)

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
  </div>
</template>

<style scoped>
</style>

