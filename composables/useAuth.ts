// @ts-nocheck
import { computed } from 'vue'
import { useApi, useEncrypt } from './useUtil'

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

/**
 * 인증 관련 Composable
 * 로그인, 회원가입, 프로필 조회, 로그아웃 기능 제공
 */
export const useAuth = () => {
  const token = useCookie<string | null>('access_token', {
    maxAge: 60 * 60 * 24 * 7, // 7일
    secure: process.env.NODE_ENV === 'production', // 프로덕션에서만 HTTPS 사용
    sameSite: 'strict', // CSRF 공격 방지
    httpOnly: false, // 클라이언트에서 접근 가능 (Nuxt useCookie는 클라이언트 전용)
  })

  const user = useState<AuthUser | null>('auth_user', () => null)
  const isAuthenticated = computed(() => !!token.value)

  // 공용 유틸리티에서 가져오기
  const apiClient = useApi()
  const { encryptRequest, decryptResponse } = useEncrypt()

  /**
   * 인증 상태 설정 (토큰 및 사용자 정보 저장)
   */
  const setAuthState = (data: AuthResponse) => {
    token.value = data.accessToken
    user.value = data.user
  }

  /**
   * 인증 상태 초기화 (토큰 및 사용자 정보 제거)
   */
  const clearAuthState = () => {
    token.value = null
    user.value = null
  }

  /**
   * 로그인
   * @param payload 이메일, 비밀번호
   */
  const login = async (payload: LoginPayload) => {
    // 요청 데이터 암호화 및 전송
    const response = await apiClient.post<{ encrypted: string }>(
      '/auth/login',
      encryptRequest(payload),
    )

    // 응답 데이터 복호화
    const decryptedData = decryptResponse<AuthResponse>(response.data.encrypted)
    setAuthState(decryptedData)
  }

  /**
   * 회원가입
   * @param payload 이메일, 비밀번호, 이름 등 회원가입 정보
   */
  const register = async (payload: RegisterPayload) => {
    // 요청 데이터 암호화 및 전송
    const response = await apiClient.post<{ encrypted: string }>(
      '/auth/register',
      encryptRequest(payload),
    )

    // 응답 데이터 복호화
    const decryptedData = decryptResponse<AuthResponse>(response.data.encrypted)
    setAuthState(decryptedData)
  }

  /**
   * 프로필 조회
   * @returns 사용자 프로필 정보 또는 null (토큰이 없을 경우)
   */
  const fetchProfile = async () => {
    if (!token.value) return null

    const response = await apiClient.get<{ encrypted: string }>('/auth/profile')

    // 응답 데이터 복호화
    const decryptedData = decryptResponse<AuthUser>(response.data.encrypted)

    user.value = decryptedData
    return decryptedData
  }

  /**
   * 로그아웃
   * 인증 상태 초기화 후 로그인 페이지로 이동
   */
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
