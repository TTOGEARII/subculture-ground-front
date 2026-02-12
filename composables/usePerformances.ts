import { useApi } from './useUtil'

export interface Performance {
  id: number
  name: string
  artist: string
  venue: string
  date: string
  time: string
  category: string
  status: 0 | 1 // 0: 예매마감, 1: 예매중
  price: number
  image?: string
  description: string
}

/**
 * API(sb_performances) 응답 데이터 구조
 * 백엔드 엔티티 프로퍼티명과 매핑됨
 */
interface ApiPerformanceRow {
  idx: number
  performanceName: string
  performanceArtist: string
  performanceVenue: string
  performanceDate: string | Date
  performanceTime: string
  performanceCategory: string
  performanceStatus: 0 | 1 // 0: 예매마감, 1: 예매중
  performancePrice: number
  performanceImage?: string | null
  performanceDescription?: string | null
}

/**
 * 상태 코드를 문자열로 변환
 * @param status 0 또는 1
 * @returns '예매마감' 또는 '예매중'
 */
export function getStatusText(status: 0 | 1): '예매마감' | '예매중' {
  return status === 0 ? '예매마감' : '예매중'
}

/**
 * API 응답 데이터를 프론트엔드 Performance 형태로 변환
 * @param row 백엔드 API 응답 데이터 (performanceName, performanceArtist 등 프로퍼티명)
 * @returns 프론트엔드 Performance 객체
 */
function mapApiPerformanceToPerformance(row: ApiPerformanceRow): Performance {
  const dateStr =
    typeof row.performanceDate === 'string'
      ? row.performanceDate
      : row.performanceDate instanceof Date
        ? row.performanceDate.toISOString().slice(0, 10)
        : ''
  return {
    id: row.idx,
    name: row.performanceName,
    artist: row.performanceArtist,
    venue: row.performanceVenue,
    date: dateStr,
    time: row.performanceTime,
    category: row.performanceCategory,
    status: row.performanceStatus,
    price: row.performancePrice,
    image: row.performanceImage ?? undefined,
    description: row.performanceDescription ?? '',
  }
}

/**
 * 공연(Performance) 관련 Composable
 * 공연 목록 조회 및 관리 기능 제공
 */
export const usePerformances = () => {
  const apiClient = useApi()

  const performancesData = ref<Performance[]>([])
  const loading = ref(true)
  const fetchError = ref<Error | null>(null)

  /**
   * 공연 목록 로드
   * API에서 공연 데이터를 가져와 변환하여 저장
   */
  async function loadPerformances() {
    loading.value = true
    fetchError.value = null
    try {
      const { data } = await apiClient.get<ApiPerformanceRow[]>('/events')
      performancesData.value = data.map(mapApiPerformanceToPerformance)
    } catch (err) {
      fetchError.value = err instanceof Error ? err : new Error(String(err))
      performancesData.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 공연 목록 새로고침
   * loadPerformances()를 호출하여 데이터 재조회
   */
  function refreshPerformances() {
    loadPerformances()
  }

  /**
   * 공연 목록 (computed)
   * performancesData가 null일 경우 빈 배열 반환
   */
  const performances = computed<Performance[]>(() => performancesData.value ?? [])

  return {
    performances,
    performancesData,
    loading,
    fetchError,
    loadPerformances,
    refreshPerformances,
  }
}
