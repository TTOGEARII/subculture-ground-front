<script setup lang="ts">
import { usePerformances, type Performance, getStatusText } from '../../../../composables/usePerformances'

definePageMeta({
  layout: 'bookings',
})

useSeoMeta({
  title: '공연 리스트 - Subculture Ground',
  description: '다양한 공연을 검색하고 예매하세요.',
  ogTitle: '공연 리스트 - Subculture Ground',
  ogDescription: '다양한 공연을 검색하고 예매하세요.',
})

const { performances, loading, fetchError, refreshPerformances, loadPerformances } = usePerformances()

onMounted(() => {
  loadPerformances()
})

const searchQuery = ref('')
const selectedCategory = ref<string>('전체')
const selectedStatus = ref<string>('전체')

const categories = ['전체', '페스티벌', '록', '일렉트로닉', '힙합', '포크', '재즈']
const statuses = ['전체', '예매중', '예매마감']

const filteredPerformances = computed(() => {
  let result = performances.value

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((p) => {
      const cats = parseCategoryArray(p.category)
      return (
        p.name.toLowerCase().includes(query) ||
        p.artist.toLowerCase().includes(query) ||
        p.venue.toLowerCase().includes(query) ||
        cats.some((c) => c.toLowerCase().includes(query))
      )
    })
  }

  if (selectedCategory.value !== '전체') {
    result = result.filter((p) => parseCategoryArray(p.category).includes(selectedCategory.value))
  }

  if (selectedStatus.value !== '전체') {
    const statusValue = selectedStatus.value === '예매중' ? 1 : 0
    result = result.filter((p) => p.status === statusValue)
  }

  return result
})

function parseCategoryArray(category: any): string[] {
  if (Array.isArray(category)) return category
  if (typeof category === 'string') {
    try { const p = JSON.parse(category); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  return `${year}.${month}.${day} (${weekdays[date.getDay()]})`
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
</script>

<template>
  <div class="events-page">
    <main class="main">
      <div class="events-header">
        <h1 class="events-title">공연 리스트</h1>
        <p class="events-subtitle">다양한 공연을 검색하고 예매하세요</p>
      </div>

      <!-- 검색 & 필터 -->
      <div class="search-section">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="공연명, 아티스트, 장소로 검색..."
            aria-label="공연 검색"
          />
          <svg class="search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="filters">
          <div class="filter-group">
            <label class="filter-label">카테고리</label>
            <div class="category-filters">
              <button
                v-for="cat in categories"
                :key="cat"
                :class="['category-btn', { 'category-btn--active': selectedCategory === cat }]"
                @click="selectedCategory = cat"
              >{{ cat }}</button>
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">상태</label>
            <div class="status-filters">
              <button
                v-for="st in statuses"
                :key="st"
                :class="['status-btn', { 'status-btn--active': selectedStatus === st }]"
                @click="selectedStatus = st"
              >{{ st }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 로딩 -->
      <div v-if="loading" class="empty-state">
        <p class="empty-text">공연 목록을 불러오는 중입니다.</p>
      </div>

      <!-- 에러 -->
      <div v-else-if="fetchError" class="empty-state">
        <p class="empty-text">공연 목록을 불러오지 못했습니다.</p>
        <p class="empty-hint">{{ fetchError?.message ?? '잠시 후 다시 시도해주세요.' }}</p>
        <button type="button" class="btn btn--primary" style="margin-top:12px" @click="() => refreshPerformances()">
          다시 불러오기
        </button>
      </div>

      <!-- 결과 없음 -->
      <div v-else-if="filteredPerformances.length === 0" class="empty-state">
        <p class="empty-text">검색 결과가 없습니다.</p>
        <p class="empty-hint">다른 검색어나 필터를 시도해보세요.</p>
      </div>

      <!-- 공연 카드 그리드 -->
      <div v-else class="events-grid">
        <NuxtLink
          v-for="performance in filteredPerformances"
          :key="performance.id"
          :to="`/bookings/events/${performance.id}`"
          class="event-card-link"
        >
          <article class="event-card">
            <!-- 썸네일 이미지 -->
            <div class="event-card__image">
              <img
                v-if="getImageSrc(performance.image)"
                :src="getImageSrc(performance.image)!"
                :alt="performance.name"
                class="event-card__img"
              />
              <div v-else class="event-card__img-placeholder">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="6" fill="#f2f2f2"/>
                  <path d="M10 28l8-8 4 4 6-8 6 12" stroke="#dddddd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="14" cy="16" r="3" stroke="#dddddd" stroke-width="2"/>
                </svg>
              </div>

              <!-- 상태 배지 -->
              <span :class="['event-card__status', getStatusClass(performance.status)]">
                {{ getStatusText(performance.status) }}
              </span>
            </div>

            <!-- 카드 본문 -->
            <div class="event-card__body">
              <p class="event-card__date">{{ formatDate(performance.date) }} {{ performance.time }}</p>
              <h3 class="event-card__title">{{ performance.name }}</h3>
              <p class="event-card__artist">{{ performance.artist }}</p>

              <div class="event-card__meta">
                <span class="event-card__venue">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 1.5c-2.5 0-4.5 1.8-4.5 4 0 3 4.5 7.5 4.5 7.5s4.5-4.5 4.5-7.5c0-2.2-2-4-4.5-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  {{ performance.venue }}
                </span>
                <span class="event-card__price">{{ formatPrice(performance.price) }}</span>
              </div>

              <!-- 카테고리 태그 -->
              <div v-if="parseCategoryArray(performance.category).length" class="event-card__tags">
                <span
                  v-for="cat in parseCategoryArray(performance.category)"
                  :key="cat"
                  class="category-badge"
                >{{ cat }}</span>
              </div>
            </div>
          </article>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<style scoped>
.events-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.event-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.event-card {
  border-radius: 14px;
  border: 1px solid #ebebeb;
  background: #ffffff;
  overflow: hidden;
  box-shadow: rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.08) 0 4px 8px 0;
  transition: box-shadow 200ms ease, transform 200ms ease;
}

.event-card:hover {
  box-shadow: rgba(0,0,0,0.04) 0 0 0 1px, rgba(0,0,0,0.08) 0 4px 12px 0, rgba(0,0,0,0.15) 0 8px 20px 0;
  transform: translateY(-2px);
}

/* 이미지 영역 */
.event-card__image {
  position: relative;
  aspect-ratio: 3 / 2;
  background: #f7f7f7;
  overflow: hidden;
}

.event-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.event-card__img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f7f7;
}

.event-card__status {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

.status--open {
  background: rgba(255, 56, 92, 0.9);
  color: #ffffff;
}

.status--closed {
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
}

/* 카드 본문 */
.event-card__body {
  padding: 14px 16px 16px;
}

.event-card__date {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 500;
  color: #ff385c;
}

.event-card__title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #222222;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-card__artist {
  margin: 0 0 10px;
  font-size: 13px;
  color: #6a6a6a;
}

.event-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.event-card__venue {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6a6a6a;
}

.event-card__price {
  font-size: 13px;
  font-weight: 600;
  color: #222222;
}

.event-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

@media (max-width: 960px) {
  .events-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .events-grid {
    grid-template-columns: 1fr;
  }
}
</style>
