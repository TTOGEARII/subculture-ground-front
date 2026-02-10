<script setup lang="ts">
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
    <header class="header">
      <NuxtLink to="/" class="brand" aria-label="Subculture Ground 홈">
        <span class="brand__dot" aria-hidden="true" />
        <span class="brand__text">Subculture Ground</span>
      </NuxtLink>

      <nav class="nav" aria-label="주요 메뉴">
        <NuxtLink class="nav__link" to="/">홈</NuxtLink>
        <NuxtLink class="nav__link" to="/booking">예매</NuxtLink>
        <NuxtLink class="nav__link" to="/events">공연</NuxtLink>
        <NuxtLink class="nav__link" to="/about">소개</NuxtLink>
      </nav>
    </header>

    <main class="main" v-if="event">
      <div class="detail-header">
        <NuxtLink to="/events" class="back-link">
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

    <footer class="footer">
      <p class="footer__text">
        © {{ new Date().getFullYear() }} Subculture Ground. All rights reserved.
      </p>
    </footer>
  </div>
</template>

<style scoped>
@import '~/assets/css/index.css';

.event-detail-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.detail-header {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px 30px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 24px;
  transition: color 200ms ease;
}

.back-link:hover {
  color: var(--text);
}

.event-header {
  margin-top: 20px;
}

.event-header__badges {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
}

.status-badge.status--open {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-badge.status--closed {
  background: rgba(255, 255, 255, 0.1);
  color: var(--muted);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-badge.status--live {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-badge.status--ended {
  background: rgba(255, 255, 255, 0.05);
  color: var(--muted-2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.category-badge {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  background: rgba(124, 58, 237, 0.15);
  color: rgba(124, 58, 237, 0.9);
  border: 1px solid rgba(124, 58, 237, 0.25);
}

.event-title {
  margin: 0 0 8px;
  font-size: 48px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.event-artist {
  margin: 0;
  font-size: 24px;
  color: var(--muted);
  font-weight: 600;
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 40px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px 60px;
}

.detail-section {
  margin-bottom: 40px;
}

.section-title {
  margin: 0 0 20px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.info-grid {
  display: grid;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.info-label {
  font-size: 14px;
  color: var(--muted-2);
  font-weight: 600;
}

.info-value {
  font-size: 16px;
  color: var(--text);
  font-weight: 600;
}

.event-description {
  margin: 0 0 20px;
  font-size: 18px;
  line-height: 1.7;
  color: var(--muted);
}

.event-details {
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.event-details pre {
  margin: 0;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.8;
  color: var(--muted);
  white-space: pre-wrap;
}

.booking-card {
  position: sticky;
  top: 100px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
  padding: 24px;
}

.booking-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.booking-price {
  font-size: 32px;
  font-weight: 900;
  background: linear-gradient(135deg, rgba(124, 58, 237, 1), rgba(34, 197, 94, 1));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.booking-status {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

.booking-status.status--open {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.booking-status.status--closed,
.booking-status.status--ended {
  background: rgba(255, 255, 255, 0.1);
  color: var(--muted);
}

.booking-status.status--live {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.booking-card__body {
  margin-bottom: 24px;
}

.booking-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.booking-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.booking-label {
  font-size: 14px;
  color: var(--muted);
}

.booking-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.booking-card__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 980px) {
  .detail-content {
    grid-template-columns: 1fr;
  }

  .booking-card {
    position: static;
  }

  .event-title {
    font-size: 36px;
  }
}
</style>
