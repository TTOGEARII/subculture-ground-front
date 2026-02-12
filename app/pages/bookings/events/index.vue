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

  // 검색어 필터링
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((performance) => {
      const categoryArray = Array.isArray(performance.category)
        ? performance.category
        : typeof performance.category === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(performance.category)
                return Array.isArray(parsed) ? parsed : []
              } catch {
                return []
              }
            })()
          : []
      return (
        performance.name.toLowerCase().includes(query) ||
        performance.artist.toLowerCase().includes(query) ||
        performance.venue.toLowerCase().includes(query) ||
        categoryArray.some((cat) => String(cat).toLowerCase().includes(query))
      )
    })
  }

  // 카테고리 필터링 (여러 카테고리 중 하나라도 일치하면 표시)
  if (selectedCategory.value !== '전체') {
    result = result.filter((performance) => {
      const categoryArray = Array.isArray(performance.category)
        ? performance.category
        : typeof performance.category === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(performance.category)
                return Array.isArray(parsed) ? parsed : []
              } catch {
                return []
              }
            })()
          : []
      return categoryArray.includes(selectedCategory.value)
    })
  }

  // 상태 필터링
  if (selectedStatus.value !== '전체') {
    const statusValue = selectedStatus.value === '예매중' ? 1 : 0
    result = result.filter((performance) => performance.status === statusValue)
  }

  return result
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[date.getDay()]
  return `${month}/${day} (${weekday})`
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price)
}

const getStatusClass = (status: Performance['status']) => {
  return status === 1 ? 'status--open' : 'status--closed'
}
</script>

<template>
  <div class="events-page">
    <main class="main">
      <div class="events-header">
        <h1 class="events-title">공연 리스트</h1>
        <p class="events-subtitle">다양한 공연을 검색하고 예매하세요</p>
      </div>

      <div class="search-section">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="공연명, 아티스트, 장소로 검색..."
            aria-label="공연 검색"
          />
          <svg
            class="search-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <div class="filters">
          <div class="filter-group">
            <label class="filter-label">카테고리</label>
            <div class="category-filters">
              <button
                v-for="category in categories"
                :key="category"
                :class="['category-btn', { 'category-btn--active': selectedCategory === category }]"
                @click="selectedCategory = category"
              >
                {{ category }}
              </button>
            </div>
          </div>

          <div class="filter-group">
            <label class="filter-label">상태</label>
            <div class="status-filters">
              <button
                v-for="status in statuses"
                :key="status"
                :class="['status-btn', { 'status-btn--active': selectedStatus === status }]"
                @click="selectedStatus = status"
              >
                {{ status }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="empty-state">
        <p class="empty-text">공연 목록을 불러오는 중입니다.</p>
      </div>

      <div v-else-if="fetchError" class="empty-state">
        <p class="empty-text">공연 목록을 불러오지 못했습니다.</p>
        <p class="empty-hint">{{ fetchError?.message ?? '잠시 후 다시 시도해주세요.' }}</p>
        <button type="button" class="btn btn--primary" @click="() => refreshPerformances()">
          다시 불러오기
        </button>
      </div>

      <div v-else-if="filteredPerformances.length === 0" class="empty-state">
        <p class="empty-text">검색 결과가 없습니다.</p>
        <p class="empty-hint">다른 검색어나 필터를 시도해보세요.</p>
      </div>

      <div v-else class="events-grid">
        <article
          v-for="performance in filteredPerformances"
          :key="performance.id"
          class="event-card"
        >
          <div class="event-card__header">
            <span :class="['status-badge', getStatusClass(performance.status)]">
              {{ getStatusText(performance.status) }}
            </span>
            <div class="category-badges">
              <span
                v-for="cat in (Array.isArray(performance.category) ? performance.category : [])"
                :key="cat"
                class="category-badge"
              >
                {{ cat }}
              </span>
            </div>
          </div>

          <div class="event-card__body">
            <h3 class="event-card__title">{{ performance.name }}</h3>
            <p class="event-card__artist">{{ performance.artist }}</p>
            <div class="event-card__info">
              <div class="info-item">
                <svg
                  class="info-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 4v4l3 2"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ formatDate(performance.date) }} {{ performance.time }}</span>
              </div>
              <div class="info-item">
                <svg
                  class="info-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <path
                    d="M8 1.5c-2.5 0-4.5 1.8-4.5 4 0 3 4.5 7.5 4.5 7.5s4.5-4.5 4.5-7.5c0-2.2-2-4-4.5-4z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ performance.venue }}</span>
              </div>
              <div class="info-item">
                <svg
                  class="info-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 1v14M1 8h14"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
                <span>{{ formatPrice(performance.price) }}원</span>
              </div>
            </div>
          </div>

          <div class="event-card__footer">
            <NuxtLink
              :to="`/bookings/events/${performance.id}`"
              class="btn btn--primary"
            >
              상세보기
            </NuxtLink>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<style scoped>
.event-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.category-badge {
  display: inline-block;
}
</style>

