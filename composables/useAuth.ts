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
    try {
      // 요청 데이터 암호화 및 전송
      const encryptedPayload = encryptRequest(payload)
      const response = await apiClient.post<{ encrypted: string }>(
        '/auth/register',
        encryptedPayload,
      )

      // 응답 데이터 복호화
      const decryptedData = decryptResponse<AuthResponse>(response.data.encrypted)
      setAuthState(decryptedData)
    } catch (error: any) {
      console.error('회원가입 API 에러:', error)
      // 네트워크 에러인 경우
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !error.response) {
        throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.')
      }
      // 다른 에러는 그대로 throw
      throw error
    }
  }

  /**
   * 카카오 로그인 시작 — 카카오 인가 페이지로 리다이렉트
   */
  const startKakaoLogin = () => {
    const config = useRuntimeConfig()
    const restKey = config.public.kakaoRestKey as string
    const redirectUri = config.public.kakaoRedirectUri as string
    // 동의항목: 닉네임·프로필사진·카카오톡 메시지 발송 (+이메일이 설정돼 있으면 같이)
    const scope = 'profile_nickname,profile_image,talk_message'
    const url =
      `https://kauth.kakao.com/oauth/authorize?client_id=${restKey}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code` +
      `&scope=${encodeURIComponent(scope)}`
    window.location.href = url
  }

  /**
   * 카카오 콜백 처리 — 인가코드(code)를 백엔드로 보내 로그인
   * @param code 카카오 인가 코드
   * @param redirectUri authorize 때와 동일한 리다이렉트 URI
   */
  const kakaoLogin = async (code: string, redirectUri: string) => {
    const response = await apiClient.post<{ encrypted: string }>(
      '/auth/kakao',
      encryptRequest({ code, redirectUri }),
    )
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
    startKakaoLogin,
    kakaoLogin,
    fetchProfile,
    logout,
  }
}
