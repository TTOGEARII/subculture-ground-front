import { useApi, useEncrypt } from './useUtil'

export interface Performance {
  id: number
  name: string
  artist: string
  venue: string
  date: string
  time: string
  category: string[] // JSON 배열 형태 (예: ["록","jpop"])
  status: 0 | 1 // 0: 예매마감, 1: 예매중
  /** 가격(원). sb_performances에 없으면 0, 실제는 sb_ticket_info(ticket_idx)에서 조회 가능 */
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
  performanceCategory: string[] // 백엔드에서 배열로 변환되어 반환됨
  performanceStatus: 0 | 1 // 0: 예매마감, 1: 예매중
  performancePrice?: number // 제거됨. 가격은 sb_ticket_info(ticket_idx)에서 조회
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
 * 카테고리 데이터를 배열로 변환
 * 백엔드에서 이미 배열로 변환되어 오지만, 안전성을 위해 확인
 * @param category 카테고리 데이터 (배열 또는 문자열)
 * @returns 카테고리 문자열 배열
 */
function parseCategory(category: string[] | string | undefined | null): string[] {
  if (!category) return []
  
  // 이미 배열인 경우
  if (Array.isArray(category)) {
    return category.filter((cat) => typeof cat === 'string' && cat.trim() !== '')
  }
  
  // 문자열인 경우 JSON 파싱 시도
  if (typeof category === 'string') {
    try {
      const parsed = JSON.parse(category)
      if (Array.isArray(parsed)) {
        return parsed.filter((cat) => typeof cat === 'string' && cat.trim() !== '')
      }
    } catch (error) {
      // JSON 파싱 실패 시 빈 배열 반환
      console.warn('카테고리 JSON 파싱 실패:', category, error)
    }
  }

  return []
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
    category: parseCategory(row.performanceCategory), // 백엔드에서 배열로 변환되어 오지만 안전성을 위해 파싱
    status: row.performanceStatus,
    price: row.performancePrice ?? 0, // sb_performances에서 제거됨, ticket_idx로 조회 시 사용
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
  const { encryptRequest, decryptResponse } = useEncrypt()

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
   * 단일 공연 조회
   * @param id 공연 ID
   * @returns 공연 정보
   */
  async function getPerformanceById(id: number): Promise<Performance | null> {
    try {
      const { data } = await apiClient.get<ApiPerformanceRow>(`/events/${id}`)
      return mapApiPerformanceToPerformance(data)
    } catch (err) {
      console.error('공연 조회 실패:', err)
      return null
    }
  }

  /**
   * 내 공연 목록 로드 (인증된 사용자의 공연만)
   */
  async function loadMyPerformances() {
    loading.value = true
    fetchError.value = null
    try {
      const { data } = await apiClient.get<ApiPerformanceRow[]>('/events/my')
      performancesData.value = data.map(mapApiPerformanceToPerformance)
    } catch (err) {
      fetchError.value = err instanceof Error ? err : new Error(String(err))
      performancesData.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 공연 생성
   */
  async function createPerformance(performanceData: {
    performanceName: string
    performanceArtist: string
    performanceVenue: string
    performanceDate: string
    performanceTime: string
    performanceImage?: string | null
    performanceDescription?: string | null
    ticketIdx?: number
    performanceCategory?: string
  }): Promise<Performance> {
    try {
      const encryptedPayload = encryptRequest(performanceData)
      const response = await apiClient.post<{ encrypted: string }>(
        '/events',
        encryptedPayload,
      )
      
      const decryptedData = decryptResponse<ApiPerformanceRow>(response.data.encrypted)
      const newPerformance = mapApiPerformanceToPerformance(decryptedData)
      
      // 목록에 추가
      performancesData.value = [newPerformance, ...performancesData.value]
      
      return newPerformance
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      fetchError.value = error
      throw error
    }
  }

  /**
   * 공연 수정
   */
  async function updatePerformance(
    id: number,
    performanceData: Partial<{
      performanceName: string
      performanceArtist: string
      performanceVenue: string
      performanceDate: string
      performanceTime: string
      performanceImage?: string | null
      performanceDescription?: string | null
      ticketIdx?: number
      performanceCategory?: string
    }>,
  ): Promise<Performance> {
    try {
      const encryptedPayload = encryptRequest(performanceData)
      const response = await apiClient.put<{ encrypted: string }>(
        `/events/${id}`,
        encryptedPayload,
      )
      
      const decryptedData = decryptResponse<ApiPerformanceRow>(response.data.encrypted)
      const updatedPerformance = mapApiPerformanceToPerformance(decryptedData)
      
      // 목록에서 업데이트
      const index = performancesData.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        performancesData.value[index] = updatedPerformance
      }
      
      return updatedPerformance
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      fetchError.value = error
      throw error
    }
  }

  /**
   * 공연 삭제
   */
  async function deletePerformance(id: number): Promise<void> {
    try {
      await apiClient.delete(`/events/${id}`)
      
      // 목록에서 제거
      performancesData.value = performancesData.value.filter((p) => p.id !== id)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      fetchError.value = error
      throw error
    }
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
    loadMyPerformances,
    refreshPerformances,
    getPerformanceById,
    createPerformance,
    updatePerformance,
    deletePerformance,
  }
}
