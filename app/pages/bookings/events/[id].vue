<script setup lang="ts">
import { usePerformances, getStatusText, type Performance, type TicketInfo } from '../../../../composables/usePerformances'
import { useAuth } from '../../../../composables/useAuth'
import { useKakaoMap } from '../../../../composables/useKakaoMap'

definePageMeta({ layout: 'bookings' })

const route = useRoute()
const router = useRouter()
const performanceId = computed(() => Number(route.params.id))

const { getPerformanceById, getTicketsByPerformanceId } = usePerformances()
const { isAuthenticated } = useAuth()
const { loadSdk } = useKakaoMap()

// 공연장 위치 지도
const mapContainer = ref<HTMLElement | null>(null)
const hasLocation = computed(
  () =>
    performance.value?.lat != null &&
    performance.value?.lng != null &&
    !Number.isNaN(performance.value.lat) &&
    !Number.isNaN(performance.value.lng),
)

const renderVenueMap = async () => {
  if (!hasLocation.value || !mapContainer.value || !performance.value) return
  try {
    const kakao = await loadSdk()
    const position = new kakao.maps.LatLng(performance.value.lat, performance.value.lng)
    const map = new kakao.maps.Map(mapContainer.value, { center: position, level: 3 })
    const marker = new kakao.maps.Marker({ position })
    marker.setMap(map)
  } catch (err) {
    console.error('공연장 지도 렌더링 실패:', err)
  }
}

const performance = ref<Performance | null>(null)
const tickets = ref<TicketInfo[]>([])
const loading = ref(true)
const error = ref<Error | null>(null)

const activeTab = ref<'detail' | 'tickets'>('detail')
const isModalOpen = ref(false)
const selectedTicket = ref<TicketInfo | null>(null)
const ticketCount = ref(1)

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const [data, ticketData] = await Promise.all([
      getPerformanceById(performanceId.value),
      getTicketsByPerformanceId(performanceId.value),
    ])
    if (!data) {
      throw createError({ statusCode: 404, statusMessage: '공연을 찾을 수 없습니다.' })
    }
    performance.value = data
    tickets.value = ticketData
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err))
    if (err && typeof err === 'object' && 'statusCode' in err && (err as any).statusCode === 404) throw err
  } finally {
    loading.value = false
  }

  // 콘텐츠(지도 div)는 loading 해제 후 렌더되므로 이 시점에 지도를 그린다
  if (hasLocation.value) {
    await nextTick()
    await renderVenueMap()
  }
})

useSeoMeta({
  title: computed(() => performance.value ? `${performance.value.name} - Subculture Ground` : '공연 상세'),
  description: computed(() => performance.value?.description || ''),
})

// 탭 전환으로 지도 DOM이 사라졌다가 다시 생기면 재렌더링
watch(activeTab, async (tab) => {
  if (tab === 'detail' && hasLocation.value) {
    await nextTick()
    await renderVenueMap()
  }
})

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

const getStatusClass = (status: Performance['status']) =>
  status === 1 ? 'status--open' : 'status--closed'

const getImageSrc = (image?: string) => {
  if (!image) return null
  if (image.startsWith('http')) return image
  const config = useRuntimeConfig()
  return `${config.public.apiBase}${image}`
}

const getRemainingCount = (ticket: TicketInfo) => ticket.ticketMax - ticket.ticketCount

const getTicketTypeName = (type: number) => {
  const types: Record<number, string> = { 0: '두둥티켓', 1: '무료티켓', 2: '후원티켓' }
  return types[type] ?? '일반티켓'
}

const openBookingModal = (ticket: TicketInfo) => {
  if (!isAuthenticated.value) {
    router.push(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  selectedTicket.value = ticket
  ticketCount.value = ticket.ticketMin || 1
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedTicket.value = null
  ticketCount.value = 1
}

const minCount = computed(() => selectedTicket.value?.ticketMin || 1)
const maxCount = computed(() => {
  if (!selectedTicket.value) return 1
  return Math.min(selectedTicket.value.ticketMax - selectedTicket.value.ticketCount, 10)
})

const totalPrice = computed(() =>
  selectedTicket.value ? selectedTicket.value.ticketPrice * ticketCount.value : 0
)

const confirmBooking = () => {
  if (!selectedTicket.value) return
  closeModal()
  navigateTo({
    path: '/bookings/events/booking',
    query: {
      eventId: String(performanceId.value),
      ticketIdx: String(selectedTicket.value.idx),
      count: String(ticketCount.value),
    },
  })
}
</script>

<template>
  <div class="event-detail-page">
    <main class="main" v-if="!loading && performance">

      <!-- 뒤로가기 -->
      <NuxtLink to="/bookings/events" class="back-link">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        공연 리스트로 돌아가기
      </NuxtLink>

      <div class="detail-layout">
        <!-- 왼쪽: 메인 콘텐츠 -->
        <div class="detail-main">

          <!-- 공연 헤더 -->
          <div class="perf-header">
            <!-- 포스터 이미지 -->
            <div class="perf-poster">
              <img
                v-if="getImageSrc(performance.image)"
                :src="getImageSrc(performance.image)!"
                :alt="performance.name"
                class="perf-poster__img"
              />
              <div v-else class="perf-poster__placeholder">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                  <rect width="60" height="60" rx="8" fill="#f2f2f2"/>
                  <path d="M15 42l12-12 6 6 9-12 9 18" stroke="#dddddd" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="21" cy="24" r="4" stroke="#dddddd" stroke-width="2.5"/>
                </svg>
              </div>
            </div>

            <div class="perf-title-block">
              <div class="perf-badges">
                <span :class="['status-badge', getStatusClass(performance.status)]">
                  {{ getStatusText(performance.status) }}
                </span>
                <span
                  v-for="cat in (Array.isArray(performance.category) ? performance.category : [])"
                  :key="cat"
                  class="category-badge"
                >{{ cat }}</span>
              </div>
              <h1 class="perf-title">{{ performance.name }}</h1>
              <p class="perf-artist">{{ performance.artist }}</p>
            </div>
          </div>

          <!-- 탭 -->
          <div class="tabs">
            <button
              :class="['tab-btn', { 'tab-btn--active': activeTab === 'detail' }]"
              @click="activeTab = 'detail'"
            >공연상세</button>
            <button
              :class="['tab-btn', { 'tab-btn--active': activeTab === 'tickets' }]"
              @click="activeTab = 'tickets'"
            >판매정보</button>
          </div>

          <!-- 공연상세 탭 -->
          <div v-if="activeTab === 'detail'" class="tab-content">

            <!-- 공연 기본 정보 -->
            <div class="info-block">
              <div class="info-row">
                <span class="info-key">날짜</span>
                <span class="info-val">{{ formatDate(performance.date) }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">시간</span>
                <span class="info-val">{{ performance.time }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">장소</span>
                <span class="info-val">{{ performance.venue }}</span>
              </div>
              <div v-if="performance.address" class="info-row">
                <span class="info-key">주소</span>
                <span class="info-val">{{ performance.address }}</span>
              </div>
            </div>

            <!-- 공연장 위치 지도 -->
            <div v-if="hasLocation" class="map-block">
              <h2 class="block-title">오시는 길</h2>
              <div ref="mapContainer" class="venue-map"></div>
            </div>

            <!-- 공연 소개 -->
            <div v-if="performance.description" class="desc-block">
              <h2 class="block-title">공연 소개</h2>
              <p class="desc-text">{{ performance.description }}</p>
            </div>

            <!-- 주최자 정보 -->
            <div class="host-block">
              <h2 class="block-title">주최자 정보</h2>
              <div class="host-card">
                <div class="host-avatar">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="14" fill="#f2f2f2"/>
                    <path d="M14 14a4 4 0 100-8 4 4 0 000 8z" stroke="#929292" stroke-width="1.5"/>
                    <path d="M22 24v-2a6 6 0 00-6-6H12a6 6 0 00-6 6v2" stroke="#929292" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <div class="host-info">
                  <p class="host-name">공연 주최자</p>
                  <p class="host-notice">본 공연은 Subculture Ground 서비스를 통해 예매가 진행됩니다.</p>
                </div>
              </div>
            </div>

            <!-- 안내 -->
            <div class="notice-block">
              <p class="notice-text">
                예매하신 티켓의 취소/환불에 관한 사항은 Subculture Ground 이용약관을 참고해 주세요.
              </p>
            </div>
          </div>

          <!-- 판매정보 탭 -->
          <div v-if="activeTab === 'tickets'" class="tab-content">
            <div v-if="tickets.length === 0" class="empty-state" style="margin: 0; border-radius: 8px;">
              <p class="empty-text">등록된 티켓 정보가 없습니다.</p>
            </div>

            <div v-else class="ticket-list">
              <div
                v-for="ticket in tickets"
                :key="ticket.idx"
                class="ticket-item"
                :class="{ 'ticket-item--soldout': getRemainingCount(ticket) <= 0 }"
              >
                <div class="ticket-item__info">
                  <div class="ticket-item__top">
                    <span class="ticket-name">{{ ticket.ticketName || '일반 티켓' }}</span>
                    <span class="ticket-type-badge">{{ getTicketTypeName(ticket.ticketType) }}</span>
                  </div>
                  <div class="ticket-item__meta">
                    <span class="ticket-price">{{ formatPrice(ticket.ticketPrice) }}</span>
                    <span class="ticket-limit">· 인당 {{ ticket.ticketMax }}매 제한</span>
                  </div>
                  <div class="ticket-remaining">
                    <span v-if="getRemainingCount(ticket) > 0" class="remaining--available">
                      {{ getRemainingCount(ticket) }}매 남음
                    </span>
                    <span v-else class="remaining--soldout">매진</span>
                  </div>
                </div>

                <button
                  class="ticket-item__btn"
                  :disabled="getRemainingCount(ticket) <= 0 || performance.status === 0"
                  @click="openBookingModal(ticket)"
                >
                  {{ getRemainingCount(ticket) <= 0 || performance.status === 0 ? '매진' : '선택' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 오른쪽: 예매 카드 (sticky) -->
        <div class="detail-sidebar">
          <div class="booking-card">
            <div class="booking-card__header">
              <span class="booking-price">
                {{ tickets.length > 0 ? formatPrice(Math.min(...tickets.map(t => t.ticketPrice))) : formatPrice(performance.price) }}
                <span class="booking-price-label">부터</span>
              </span>
              <span :class="['booking-status status-badge', getStatusClass(performance.status)]">
                {{ getStatusText(performance.status) }}
              </span>
            </div>

            <div class="booking-info">
              <div class="booking-info-item">
                <span class="booking-label">날짜</span>
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
              <div v-if="tickets.length > 0" class="booking-info-item">
                <span class="booking-label">티켓 종류</span>
                <span class="booking-value">{{ tickets.length }}종</span>
              </div>
            </div>

            <button
              class="booking-btn"
              :class="{ 'booking-btn--disabled': performance.status === 0 }"
              :disabled="performance.status === 0"
              @click="activeTab = 'tickets'"
            >
              {{ performance.status === 0 ? '예매 마감' : '티켓 선택하기' }}
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- 로딩 -->
    <div v-if="loading" class="empty-state" style="margin: 40px 20px;">
      <p class="empty-text">공연 정보를 불러오는 중입니다.</p>
    </div>

    <!-- 에러 -->
    <div v-if="error && !loading" class="empty-state" style="margin: 40px 20px;">
      <p class="empty-text">공연 정보를 불러오지 못했습니다.</p>
      <p class="empty-hint">{{ error.message }}</p>
      <NuxtLink to="/bookings/events" class="btn btn--primary" style="margin-top:12px">공연 리스트로</NuxtLink>
    </div>

    <!-- 티켓 예매 모달 -->
    <Modal
      v-if="performance && selectedTicket"
      :is-open="isModalOpen"
      title="티켓 예매"
      size="medium"
      @close="closeModal"
    >
      <template #default>
        <div class="modal-content">
          <div class="modal-perf-info">
            <h3 class="modal-perf-name">{{ performance.name }}</h3>
            <div class="modal-perf-rows">
              <div class="modal-row">
                <span class="modal-label">선택 티켓</span>
                <span class="modal-val">{{ selectedTicket.ticketName || '일반 티켓' }}</span>
              </div>
              <div class="modal-row">
                <span class="modal-label">공연일시</span>
                <span class="modal-val">{{ formatDate(performance.date) }} {{ performance.time }}</span>
              </div>
              <div class="modal-row">
                <span class="modal-label">장소</span>
                <span class="modal-val">{{ performance.venue }}</span>
              </div>
            </div>
          </div>

          <div class="modal-ticket-section">
            <label class="modal-section-label">티켓 수량</label>
            <div class="ticket-counter">
              <button class="counter-btn" :disabled="ticketCount <= minCount" @click="ticketCount--">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
              <span class="ticket-count">{{ ticketCount }}</span>
              <button class="counter-btn" :disabled="ticketCount >= maxCount" @click="ticketCount++">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 5v10M5 10h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <div class="price-summary">
              <div class="price-row">
                <span class="price-label">티켓 가격</span>
                <span class="price-value">{{ formatPrice(selectedTicket.ticketPrice) }}</span>
              </div>
              <div class="price-row">
                <span class="price-label">수량</span>
                <span class="price-value">{{ ticketCount }}매</span>
              </div>
              <div class="price-row price-row--total">
                <span class="price-label">총 결제금액</span>
                <span class="price-value price-value--total">{{ formatPrice(totalPrice) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <button class="modal-btn modal-btn--secondary" @click="closeModal">취소</button>
        <button class="modal-btn modal-btn--primary" @click="confirmBooking">예매하기</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
/* 레이아웃 */
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

/* 공연 헤더 */
.perf-header {
  margin-bottom: 24px;
}

.perf-poster {
  width: 100%;
  aspect-ratio: 16 / 7;
  border-radius: 14px;
  overflow: hidden;
  background: #f7f7f7;
  margin-bottom: 20px;
}

.perf-poster__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.perf-poster__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.perf-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.perf-title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  color: #222222;
  line-height: 1.3;
}

.perf-artist {
  margin: 0;
  color: #6a6a6a;
  font-size: 15px;
}

/* 탭 */
.tabs {
  display: flex;
  border-bottom: 1px solid #ebebeb;
  margin-bottom: 24px;
  gap: 0;
}

.tab-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  color: #6a6a6a;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 120ms ease, border-color 120ms ease;
}

.tab-btn--active {
  color: #222222;
  font-weight: 600;
  border-bottom-color: #222222;
}

.tab-content {
  min-height: 200px;
}

/* 정보 블록 */
.info-block {
  border: 1px solid #ebebeb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  padding: 14px 20px;
  border-bottom: 1px solid #ebebeb;
}

.info-row:last-child {
  border-bottom: none;
}

.info-key {
  width: 80px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: #6a6a6a;
}

.info-val {
  font-size: 14px;
  color: #222222;
}

/* 공연 소개 */
.block-title {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 600;
  color: #222222;
}

.map-block {
  margin-bottom: 24px;
}

.venue-map {
  width: 100%;
  height: 320px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.desc-block {
  margin-bottom: 24px;
}

.desc-text {
  margin: 0;
  font-size: 15px;
  color: #3f3f3f;
  line-height: 1.7;
  white-space: pre-wrap;
}

/* 호스트 카드 */
.host-block {
  margin-bottom: 24px;
}

.host-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  border: 1px solid #ebebeb;
  border-radius: 12px;
}

.host-avatar {
  flex-shrink: 0;
}

.host-name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #222222;
}

.host-notice {
  margin: 0;
  font-size: 13px;
  color: #6a6a6a;
  line-height: 1.5;
}

/* 안내 */
.notice-block {
  padding: 14px 16px;
  background: #f7f7f7;
  border-radius: 8px;
}

.notice-text {
  margin: 0;
  font-size: 13px;
  color: #6a6a6a;
  line-height: 1.6;
}

/* 티켓 목록 */
.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid #ebebeb;
  border-radius: 12px;
  transition: border-color 120ms ease;
}

.ticket-item:hover:not(.ticket-item--soldout) {
  border-color: #dddddd;
}

.ticket-item--soldout {
  opacity: 0.55;
}

.ticket-item__info {
  flex: 1;
}

.ticket-item__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.ticket-name {
  font-size: 15px;
  font-weight: 600;
  color: #222222;
}

.ticket-type-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: #f7f7f7;
  color: #6a6a6a;
}

.ticket-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.ticket-price {
  font-size: 16px;
  font-weight: 700;
  color: #222222;
}

.ticket-limit {
  font-size: 13px;
  color: #929292;
}

.ticket-remaining {
  font-size: 13px;
}

.remaining--available {
  color: #ff385c;
  font-weight: 500;
}

.remaining--soldout {
  color: #929292;
}

.ticket-item__btn {
  flex-shrink: 0;
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid #222222;
  background: #ffffff;
  color: #222222;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.ticket-item__btn:hover:not(:disabled) {
  background: #222222;
  color: #ffffff;
}

.ticket-item__btn:disabled {
  border-color: #dddddd;
  color: #929292;
  cursor: not-allowed;
}

/* 예매 카드 (사이드바) */
.detail-sidebar {
  position: sticky;
  top: 96px;
}

.booking-card {
  border: 1px solid #dddddd;
  border-radius: 14px;
  padding: 24px;
  background: #ffffff;
  box-shadow: rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0;
}

.booking-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebebeb;
}

.booking-price {
  font-size: 20px;
  font-weight: 700;
  color: #222222;
}

.booking-price-label {
  font-size: 14px;
  font-weight: 400;
  color: #6a6a6a;
  margin-left: 2px;
}

.booking-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.booking-info-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.booking-label {
  font-size: 13px;
  color: #6a6a6a;
  flex-shrink: 0;
}

.booking-value {
  font-size: 13px;
  color: #222222;
  font-weight: 500;
  text-align: right;
}

.booking-btn {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  border: none;
  background: #ff385c;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.booking-btn:hover:not(:disabled) {
  background: #e00b41;
}

.booking-btn--disabled {
  background: #dddddd;
  cursor: not-allowed;
}

/* 모달 내용 */
.modal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.modal-perf-info {
  padding-bottom: 20px;
  border-bottom: 1px solid #ebebeb;
}

.modal-perf-name {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 600;
  color: #222222;
}

.modal-perf-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-label {
  font-size: 13px;
  color: #6a6a6a;
}

.modal-val {
  font-size: 13px;
  color: #222222;
  font-weight: 500;
}

.modal-section-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #222222;
  margin-bottom: 12px;
}

.ticket-counter {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
  margin-bottom: 20px;
}

.counter-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #dddddd;
  background: #ffffff;
  color: #222222;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 120ms ease;
}

.counter-btn:hover:not(:disabled) {
  background: #f7f7f7;
  border-color: #222222;
}

.counter-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ticket-count {
  font-size: 20px;
  font-weight: 700;
  color: #222222;
  min-width: 40px;
  text-align: center;
}

.price-summary {
  padding: 16px;
  background: #f7f7f7;
  border-radius: 8px;
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
  border-top: 1px solid #dddddd;
}

.price-label {
  font-size: 14px;
  color: #6a6a6a;
}

.price-row--total .price-label {
  font-weight: 700;
  color: #222222;
}

.price-value {
  font-size: 14px;
  font-weight: 600;
  color: #222222;
}

.price-value--total {
  font-size: 18px;
  color: #ff385c;
}

.modal-btn {
  flex: 1;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.modal-btn--secondary {
  background: #ffffff;
  color: #222222;
  border: 1px solid #dddddd;
}

.modal-btn--secondary:hover {
  background: #f7f7f7;
}

.modal-btn--primary {
  background: #ff385c;
  color: #ffffff;
  border: none;
}

.modal-btn--primary:hover {
  background: #e00b41;
}

/* 반응형 */
@media (max-width: 860px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-sidebar {
    position: static;
    order: -1;
  }
}
</style>
