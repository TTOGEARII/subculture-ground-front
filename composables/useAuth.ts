// @ts-nocheck
import axios, { AxiosError } from 'axios'
import { computed } from 'vue'

interface AuthUser {
  idx: number
  email: string
  name: string
  phone: string | null
  birthDate: string | null | Date
  status: number
  emailVerifiedAt: string | null | Date
}

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  email: string
  password: string
  name: string
  phone?: string
  birthDate?: string
}

interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export const useAuth = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  const token = useCookie<string | null>('access_token', {
    maxAge: 60 * 60 * 24 * 7, // 7일
    secure: process.env.NODE_ENV === 'production', // 프로덕션에서만 HTTPS 사용
    sameSite: 'strict', // CSRF 공격 방지
    httpOnly: false, // 클라이언트에서 접근 가능 (Nuxt useCookie는 클라이언트 전용)
  })

  const user = useState<AuthUser | null>('auth_user', () => null)
  const isAuthenticated = computed(() => !!token.value)

  // Axios 인스턴스 생성
  const apiClient = axios.create({
    baseURL: apiBase,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // 요청 인터셉터: 토큰이 있으면 자동으로 헤더에 추가
  apiClient.interceptors.request.use(
    (config) => {
      if (token.value) {
        config.headers.Authorization = `Bearer ${token.value}`
      }
      
      // 개발 환경에서만 디버깅 (프로덕션에서는 민감 정보 노출 방지)
      if (process.env.NODE_ENV === 'development') {
        // 비밀번호 필드가 있으면 마스킹하여 로그
        if (config.data) {
          try {
            const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
            if (data.password) {
              const maskedData = { ...data, password: '***' }
              // eslint-disable-next-line no-console
              console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, maskedData)
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

  // 응답 인터셉터: 401 에러 시 자동 로그아웃
  apiClient.interceptors.response.use(
    (response) => {
      // 개발 환경에서만 디버깅 (프로덕션에서는 민감 정보 노출 방지)
      if (process.env.NODE_ENV === 'development') {
        // 토큰 정보는 마스킹하여 로그
        const maskedResponse = { ...response }
        if (maskedResponse.data && typeof maskedResponse.data === 'object') {
          const data = maskedResponse.data as any
          if (data.accessToken) {
            maskedResponse.data = {
              ...data,
              accessToken: `${data.accessToken.substring(0, 10)}...`,
            }
          }
          // eslint-disable-next-line no-console
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, maskedResponse.data)
        }
      }
      return response
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        clearAuthState()
        navigateTo('/auth/login')
      }
      return Promise.reject(error)
    },
  )

  const setAuthState = (data: AuthResponse) => {
    token.value = data.accessToken
    user.value = data.user
  }

  const clearAuthState = () => {
    token.value = null
    user.value = null
  }

  const login = async (payload: LoginPayload) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload)
    setAuthState(response.data)
  }

  const register = async (payload: RegisterPayload) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload)
    setAuthState(response.data)
  }

  const fetchProfile = async () => {
    if (!token.value) return null

    const response = await apiClient.get<AuthUser>('/auth/profile')
    user.value = response.data
    return response.data
  }

  const logout = async () => {
    clearAuthState()
    await navigateTo('/auth/login')
  }

  return {
    user,
    isAuthenticated,
    token,
    login,
    register,
    fetchProfile,
    logout,
  }
}
