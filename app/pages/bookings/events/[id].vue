<script setup lang="ts">
definePageMeta({
  layout: 'bookings',
})

const route = useRoute()
const eventId = computed(() => route.params.id as string)

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
  details: string
  capacity: number
  ageLimit: string
}

// 샘플 공연 데이터 (실제로는 API에서 가져올 데이터)
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
    details: `
      서브컬처 페스티벌 2026은 한국 최대 규모의 서브컬처 음악 페스티벌입니다.
      다양한 장르의 아티스트들이 한 자리에 모여 특별한 무대를 선사합니다.
      
      - 3개 스테이지 동시 운영
      - 20팀 이상의 아티스트 출연
      - 푸드트럭 및 굿즈 부스 운영
      - 야외 공연장 특별 무대
    `,
    capacity: 5000,
    ageLimit: '만 12세 이상',
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
    details: `
      한국 인디 록 씬을 대표하는 밴드들이 모인 특별한 콘서트입니다.
      라이브의 생생함을 느낄 수 있는 소규모 공연장에서 진행됩니다.
      
      - 라이브 밴드 공연
      - 앵콜 무대
      - 아티스트 미팅 타임
    `,
    capacity: 300,
    ageLimit: '만 19세 이상',
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
    details: `
      국내외 유명 DJ들이 선사하는 일렉트로닉 뮤직 나이트입니다.
      최신 음악과 비주얼이 어우러진 특별한 경험을 제공합니다.
      
      - 3명의 DJ 세트
      - 레이저 & 조명 쇼
      - 바 운영
    `,
    capacity: 500,
    ageLimit: '만 19세 이상',
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
    details: `
      신인 힙합 아티스트들의 무대를 선보이는 쇼케이스입니다.
      새로운 음악과 퍼포먼스를 만날 수 있는 기회입니다.
      
      - 5팀 신인 아티스트 출연
      - 네트워킹 타임
      - 굿즈 판매
    `,
    capacity: 200,
    ageLimit: '만 19세 이상',
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
    details: `
      따뜻한 포크 음악을 감상할 수 있는 공연입니다.
      아늑한 분위기에서 음악을 즐길 수 있습니다.
      
      - 솔로 & 듀엣 공연
      - 악기 연주
      - 관객과의 소통 시간
    `,
    capacity: 400,
    ageLimit: '전체 관람가',
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
    details: `
      세계적인 재즈 뮤지션들의 무대입니다.
      프리미엄 재즈 클럽에서 즐기는 특별한 경험입니다.
      
      - 4인조 재즈 밴드
      - 드링크 서비스
      - VIP 좌석 제공
    `,
    capacity: 150,
    ageLimit: '만 19세 이상',
  },
]

const event = computed(() => {
  return events.find((e) => e.id === Number(eventId.value))
})

if (!event.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '공연을 찾을 수 없습니다.',
  })
}

useSeoMeta({
  title: `${event.value.name} - Subculture Ground`,
  description: event.value.description,
  ogTitle: `${event.value.name} - Subculture Ground`,
  ogDescription: event.value.description,
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
  <div class="event-detail-page">
    <main class="main" v-if="event">
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
            <span :class="['status-badge', getStatusClass(event.status)]">
              {{ event.status }}
            </span>
            <span class="category-badge">{{ event.category }}</span>
          </div>

          <h1 class="event-title">{{ event.name }}</h1>
          <p class="event-artist">{{ event.artist }}</p>
        </div>
      </div>

      <div class="detail-content">
        <div class="detail-main">
          <div class="detail-section">
            <h2 class="section-title">공연 정보</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">공연일시</span>
                <span class="info-value">{{ formatDate(event.date) }} {{ event.time }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">공연장</span>
                <span class="info-value">{{ event.venue }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">티켓 가격</span>
                <span class="info-value">{{ formatPrice(event.price) }}원</span>
              </div>
              <div class="info-item">
                <span class="info-label">관람 연령</span>
                <span class="info-value">{{ event.ageLimit }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">수용 인원</span>
                <span class="info-value">{{ formatPrice(event.capacity) }}명</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h2 class="section-title">공연 소개</h2>
            <p class="event-description">{{ event.description }}</p>
            <div class="event-details">
              <pre>{{ event.details }}</pre>
            </div>
          </div>
        </div>

        <div class="detail-sidebar">
          <div class="booking-card">
            <div class="booking-card__header">
              <span class="booking-price">{{ formatPrice(event.price) }}원</span>
              <span class="booking-status" :class="getStatusClass(event.status)">
                {{ event.status }}
              </span>
            </div>

            <div class="booking-card__body">
              <div class="booking-info">
                <div class="booking-info-item">
                  <span class="booking-label">공연일</span>
                  <span class="booking-value">{{ formatDate(event.date) }}</span>
                </div>
                <div class="booking-info-item">
                  <span class="booking-label">시간</span>
                  <span class="booking-value">{{ event.time }}</span>
                </div>
                <div class="booking-info-item">
                  <span class="booking-label">장소</span>
                  <span class="booking-value">{{ event.venue }}</span>
                </div>
              </div>
            </div>

            <div class="booking-card__footer">
              <button
                :class="['btn', 'btn--primary', 'btn--large', { 'btn--disabled': event.status === '예매마감' || event.status === '공연종료' }]"
                :disabled="event.status === '예매마감' || event.status === '공연종료'"
              >
                {{ event.status === '예매마감' ? '예매 마감' : event.status === '공연종료' ? '공연 종료' : '예매하기' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
</style>

