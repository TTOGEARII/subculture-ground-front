<script setup lang="ts">
definePageMeta({
  layout: 'bookings',
})

useSeoMeta({
  title: '공연 리스트 - Subculture Ground',
  description: '다양한 공연을 검색하고 예매하세요.',
  ogTitle: '공연 리스트 - Subculture Ground',
  ogDescription: '다양한 공연을 검색하고 예매하세요.',
})

interface Event {
  id: number
  name: string
  artist: string
  venue: string
  date: string
  time: string
  category: string
  status: '예매중' | '예매마감' | '공연중' | '공연종료'
  price: number
  image?: string
  description: string
}

// 샘플 공연 데이터
const events: Event[] = [
  {
    id: 1,
    name: '서브컬처 페스티벌 2026',
    artist: '다양한 아티스트',
    venue: '올림픽공원 올림픽홀',
    date: '2026-02-15',
    time: '19:00',
    category: '페스티벌',
    status: '예매중',
    price: 80000,
    description: '서브컬처 음악의 모든 것을 만날 수 있는 대규모 페스티벌입니다.',
  },
  {
    id: 2,
    name: '인디 록 콘서트',
    artist: 'The Indie Band',
    venue: '홍대 클럽',
    date: '2026-02-20',
    time: '20:00',
    category: '록',
    status: '예매중',
    price: 50000,
    description: '한국 인디 록의 대표 밴드들의 무대입니다.',
  },
  {
    id: 3,
    name: '일렉트로닉 뮤직 나이트',
    artist: 'DJ Electron',
    venue: '강남 클럽',
    date: '2026-02-18',
    time: '22:00',
    category: '일렉트로닉',
    status: '공연중',
    price: 60000,
    description: '최신 일렉트로닉 음악을 즐길 수 있는 나이트입니다.',
  },
  {
    id: 4,
    name: '힙합 쇼케이스',
    artist: 'Hip Hop Crew',
    venue: '이태원 라이브홀',
    date: '2026-02-25',
    time: '19:30',
    category: '힙합',
    status: '예매중',
    price: 45000,
    description: '신인 힙합 아티스트들의 무대입니다.',
  },
  {
    id: 5,
    name: '포크 음악회',
    artist: 'Folk Singers',
    venue: '세종문화회관',
    date: '2026-02-22',
    time: '18:00',
    category: '포크',
    status: '예매마감',
    price: 70000,
    description: '아늑한 분위기의 포크 음악 공연입니다.',
  },
  {
    id: 6,
    name: '재즈 라이브',
    artist: 'Jazz Quartet',
    venue: '블루노트 서울',
    date: '2026-02-19',
    time: '21:00',
    category: '재즈',
    status: '예매중',
    price: 90000,
    description: '프리미엄 재즈 라이브 공연입니다.',
  },
]

const searchQuery = ref('')
const selectedCategory = ref<string>('전체')
const selectedStatus = ref<string>('전체')

const categories = ['전체', '페스티벌', '록', '일렉트로닉', '힙합', '포크', '재즈']
const statuses = ['전체', '예매중', '예매마감', '공연중', '공연종료']

const filteredEvents = computed(() => {
  let result = events

  // 검색어 필터링
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (event) =>
        event.name.toLowerCase().includes(query) ||
        event.artist.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query),
    )
  }

  // 카테고리 필터링
  if (selectedCategory.value !== '전체') {
    result = result.filter((event) => event.category === selectedCategory.value)
  }

  // 상태 필터링
  if (selectedStatus.value !== '전체') {
    result = result.filter((event) => event.status === selectedStatus.value)
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

const getStatusClass = (status: Event['status']) => {
  switch (status) {
    case '예매중':
      return 'status--open'
    case '예매마감':
      return 'status--closed'
    case '공연중':
      return 'status--live'
    case '공연종료':
      return 'status--ended'
    default:
      return ''
  }
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

      <div v-if="filteredEvents.length === 0" class="empty-state">
        <p class="empty-text">검색 결과가 없습니다.</p>
        <p class="empty-hint">다른 검색어나 필터를 시도해보세요.</p>
      </div>

      <div v-else class="events-grid">
        <article
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-card"
        >
          <div class="event-card__header">
            <span :class="['status-badge', getStatusClass(event.status)]">
              {{ event.status }}
            </span>
            <span class="category-badge">{{ event.category }}</span>
          </div>

          <div class="event-card__body">
            <h3 class="event-card__title">{{ event.name }}</h3>
            <p class="event-card__artist">{{ event.artist }}</p>
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
                <span>{{ formatDate(event.date) }} {{ event.time }}</span>
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
                <span>{{ event.venue }}</span>
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
                <span>{{ formatPrice(event.price) }}원</span>
              </div>
            </div>
          </div>

          <div class="event-card__footer">
            <NuxtLink
              :to="`/bookings/events/${event.id}`"
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
</style>

