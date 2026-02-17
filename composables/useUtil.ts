// @ts-nocheck
import axios, { AxiosError } from 'axios'
import type { AxiosInstance } from 'axios'
import { computed } from 'vue'
import { encryptObject, decryptObject } from '../utils/crypto'

let apiClientInstance: AxiosInstance | null = null

/**
 * 공용 API 클라이언트 반환 (싱글톤 패턴)
 */
export const useApi = () => {
  // 싱글톤 패턴: 이미 생성된 인스턴스가 있으면 재사용
  if (apiClientInstance) {
    return apiClientInstance
  }

  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  // Axios 인스턴스 생성
  apiClientInstance = axios.create({
    baseURL: apiBase,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  /**
   * 요청 인터셉터
   * - 토큰이 있으면 Authorization 헤더에 자동 추가
   * - FormData인 경우 Content-Type 헤더 제거 (브라우저가 자동으로 설정)
   * - 개발 환경에서 요청 로그 출력 (비밀번호 마스킹)
   */
  apiClientInstance.interceptors.request.use(
    (config) => {
      // useCookie를 사용하여 토큰 가져오기
      const token = useCookie<string | null>('access_token').value
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // FormData인 경우 Content-Type 헤더 제거 (브라우저가 자동으로 multipart/form-data 설정)
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type']
      }

      // 개발 환경에서만 디버깅 (프로덕션에서는 민감 정보 노출 방지)
      if (process.env.NODE_ENV === 'development') {
        // 비밀번호 필드가 있으면 마스킹하여 로그
        if (config.data && !(config.data instanceof FormData)) {
          try {
            const data =
              typeof config.data === 'string'
                ? JSON.parse(config.data)
                : config.data
            if (data.password) {
              const maskedData = { ...data, password: '***' }
              // eslint-disable-next-line no-console
              console.log(
                `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
                maskedData,
              )
            }
          } catch {
            // JSON 파싱 실패 시 무시
          }
        }
      }

      return config
    },
    (error) => {
      return Promise.reject(error)
    },
  )

  /**
   * 응답 인터셉터
   * - 개발 환경에서 응답 로그 출력 (토큰 마스킹)
   * - 401 에러 시 자동 로그아웃 처리 및 로그인 페이지로 이동
   */
  apiClientInstance.interceptors.response.use(
    (response) => {
      // 개발 환경에서만 디버깅 (프로덕션에서는 민감 정보 노출 방지)
      if (process.env.NODE_ENV === 'development') {
        // 토큰 정보는 마스킹하여 로그
        const maskedResponse = { ...response }
        if (
          maskedResponse.data &&
          typeof maskedResponse.data === 'object'
        ) {
          const data = maskedResponse.data as any
          if (data.accessToken) {
            maskedResponse.data = {
              ...data,
              accessToken: `${data.accessToken.substring(0, 10)}...`,
            }
          }
          // eslint-disable-next-line no-console
          console.log(
            `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
            maskedResponse.data,
          )
        }
      }
      return response
    },
    (error: AxiosError) => {
      // 401 에러 처리: 인증 실패 시 토큰 및 사용자 상태 제거, 로그인 페이지로 이동
      if (error.response?.status === 401) {
        const token = useCookie<string | null>('access_token')
        token.value = null

        // 사용자 상태도 초기화 (useState는 전역 상태)
        const user = useState('auth_user')
        user.value = null

        // 클라이언트 사이드에서만 navigateTo 실행
        if (process.client) {
          navigateTo('/auth/login')
        }
      }
      return Promise.reject(error)
    },
  )

  return apiClientInstance
}

/**
 * 암호화 키 반환 (런타임 설정에서 가져옴)
 */
export const useEncryptionKey = () => {
  const config = useRuntimeConfig()
  return computed(() => {
    return (
      (config.public.encryptionKey as string) ||
      'subculture-ground-encryption-key-2024'
    )
  })
}

/**
 * API 통신 시 암호화/복호화 처리 헬퍼
 */
export const useEncrypt = () => {
  const encryptionKey = useEncryptionKey()

  /**
   * 요청 데이터 암호화
   * @param data 암호화할 데이터 객체
   * @returns 암호화된 문자열이 담긴 객체 { encrypted: string }
   */
  const encryptRequest = <T>(data: T): { encrypted: string } => {
    const encryptedPayload = encryptObject(data, encryptionKey.value)
    return { encrypted: encryptedPayload }
  }

  /**
   * 응답 데이터 복호화
   * @param encryptedData 암호화된 문자열
   * @returns 복호화된 데이터 객체
   */
  const decryptResponse = <T>(encryptedData: string): T => {
    return decryptObject<T>(encryptedData, encryptionKey.value)
  }

  return {
    encryptRequest,
    decryptResponse,
    encryptionKey,
  }
}
