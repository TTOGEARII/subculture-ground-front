import { useRuntimeConfig } from '#imports'

// 카카오맵 검색 결과(장소) 타입 — keywordSearch 응답 기준 필요한 필드만 정의
export interface KakaoPlace {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  category_name: string
  phone: string
  x: string // 경도(lng)
  y: string // 위도(lat)
}

declare global {
  interface Window {
    kakao: any
  }
}

// SDK는 페이지 전환과 무관하게 한 번만 로드하도록 모듈 스코프에 캐싱
let loadPromise: Promise<any> | null = null

export function useKakaoMap() {
  /**
   * 카카오맵 JavaScript SDK(services 라이브러리 포함)를 동적으로 로드한다.
   * autoload=false 로 불러온 뒤 kakao.maps.load() 로 준비 완료 시점을 보장한다.
   */
  const loadSdk = (): Promise<any> => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('카카오맵은 브라우저에서만 사용할 수 있습니다.'))
    }
    if (window.kakao?.maps?.services) {
      return Promise.resolve(window.kakao)
    }
    if (loadPromise) return loadPromise

    const config = useRuntimeConfig()
    const appkey = config.public.kakaoJsKey as string

    loadPromise = new Promise((resolve, reject) => {
      const onReady = () => window.kakao.maps.load(() => resolve(window.kakao))

      const existing = document.getElementById('kakao-maps-sdk') as HTMLScriptElement | null
      if (existing) {
        if (window.kakao?.maps) onReady()
        else existing.addEventListener('load', onReady)
        return
      }

      const script = document.createElement('script')
      script.id = 'kakao-maps-sdk'
      script.async = true
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=services`
      script.onload = onReady
      script.onerror = () => {
        loadPromise = null
        reject(new Error('카카오 지도 SDK 로드에 실패했습니다. (앱 키 / 도메인 등록 확인)'))
      }
      document.head.appendChild(script)
    })

    return loadPromise
  }

  /**
   * 키워드로 장소를 검색한다. (공연장 이름 검색)
   */
  const searchPlaces = (keyword: string): Promise<KakaoPlace[]> => {
    return loadSdk().then(
      (kakao) =>
        new Promise<KakaoPlace[]>((resolve, reject) => {
          const ps = new kakao.maps.services.Places()
          ps.keywordSearch(keyword, (data: KakaoPlace[], status: string) => {
            if (status === kakao.maps.services.Status.OK) resolve(data)
            else if (status === kakao.maps.services.Status.ZERO_RESULT) resolve([])
            else reject(new Error('장소 검색에 실패했습니다.'))
          })
        }),
    )
  }

  return { loadSdk, searchPlaces }
}
