<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'

definePageMeta({
  layout: false,
})

useSeoMeta({
  title: '회원가입 - Subculture Ground',
  description: 'Subculture Ground에 회원가입하세요.',
  ogTitle: '회원가입 - Subculture Ground',
  ogDescription: 'Subculture Ground에 회원가입하세요.',
})

const auth = useAuth()

const email = ref('')
const password = ref('')
const name = ref('')
const phone = ref('')
const phoneDisplay = ref('')
const birthDate = ref('')

const isLoading = ref(false)
const errorMessage = ref('')

const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  const limited = numbers.slice(0, 11)
  if (limited.length <= 3) return limited
  else if (limited.length <= 7) return `${limited.slice(0, 3)}-${limited.slice(3)}`
  else return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`
}

const handlePhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const formatted = formatPhoneNumber(target.value)
  phoneDisplay.value = formatted
  phone.value = formatted.replace(/\D/g, '')
}

const getPhoneForSubmit = (): string | undefined => {
  const cleaned = phone.value.replace(/\D/g, '')
  return cleaned || undefined
}

const isEmailValid = computed(() => {
  if (!email.value) return true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const isPasswordValid = computed(() => {
  if (!password.value) return true
  return password.value.length >= 6
})

const canSubmit = computed(() => {
  return (
    !!email.value &&
    !!password.value &&
    !!name.value &&
    isEmailValid.value &&
    isPasswordValid.value
  )
})

const handleSubmit = async () => {
  if (!canSubmit.value) return

  errorMessage.value = ''
  isLoading.value = true

  try {
    await auth.register({
      email: email.value,
      password: password.value,
      name: name.value,
      phone: getPhoneForSubmit(),
      birthDate: birthDate.value || undefined,
    })
    await navigateTo('/')
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !error.response) {
      errorMessage.value = '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.'
      return
    }
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      '회원가입 중 오류가 발생했습니다.'
    errorMessage.value = Array.isArray(message) ? message[0] : message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="signup-page">
    <header class="header">
      <NuxtLink to="/" class="brand" aria-label="Subculture Ground 홈">
        <span class="brand__dot" aria-hidden="true" />
        <span class="brand__text">Subculture Ground</span>
      </NuxtLink>

      <nav class="nav" aria-label="주요 메뉴">
        <NuxtLink class="nav__link" to="/">홈</NuxtLink>
        <NuxtLink class="nav__link" to="/bookings/events">공연</NuxtLink>
        <NuxtLink class="nav__link" to="/about">소개</NuxtLink>
      </nav>
    </header>

    <main class="main-center">
      <div class="signup-container">
        <div class="signup-card">
          <div class="signup-header">
            <h1 class="signup-title">회원가입</h1>
            <p class="signup-subtitle">Subculture Ground에 새로운 계정을 만들어 보세요</p>
          </div>

          <form @submit.prevent="handleSubmit" class="signup-form">
            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <div class="form-group">
              <label for="name" class="form-label">이름</label>
              <input id="name" v-model="name" type="text" class="form-input" placeholder="이름을 입력하세요" autocomplete="name" />
            </div>

            <div class="form-group">
              <label for="email" class="form-label">이메일</label>
              <input
                id="email"
                v-model="email"
                type="email"
                class="form-input"
                :class="{ 'form-input--error': email && !isEmailValid }"
                placeholder="이메일을 입력하세요"
                autocomplete="email"
              />
              <p v-if="email && !isEmailValid" class="form-error">올바른 이메일 형식이 아닙니다.</p>
            </div>

            <div class="form-group">
              <label for="password" class="form-label">비밀번호</label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="form-input"
                :class="{ 'form-input--error': password && !isPasswordValid }"
                placeholder="비밀번호를 입력하세요"
                autocomplete="new-password"
              />
              <p v-if="password && !isPasswordValid" class="form-error">비밀번호는 6자 이상이어야 합니다.</p>
            </div>

            <div class="form-group">
              <label for="phone" class="form-label">전화번호 (선택)</label>
              <input
                id="phone"
                :value="phoneDisplay"
                @input="handlePhoneInput"
                type="tel"
                class="form-input"
                placeholder="010-0000-0000"
                autocomplete="tel"
                maxlength="13"
              />
            </div>

            <div class="form-group">
              <label for="birthDate" class="form-label">생년월일 (선택)</label>
              <input id="birthDate" v-model="birthDate" type="date" class="form-input" autocomplete="bday" />
            </div>

            <button type="submit" class="btn-submit" :disabled="!canSubmit || isLoading">
              <span v-if="isLoading">회원가입 중...</span>
              <span v-else>회원가입</span>
            </button>
          </form>

          <div class="signup-footer">
            <p class="login-text">
              이미 계정이 있으신가요?
              <NuxtLink to="/auth/login" class="login-link">로그인</NuxtLink>
            </p>
          </div>
        </div>
      </div>
    </main>

    <footer class="page-footer">
      <p class="footer__text">
        © {{ new Date().getFullYear() }} Subculture Ground. All rights reserved.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.signup-page {
  min-height: 100vh;
  background: #ffffff;
  color: var(--ink);
  display: flex;
  flex-direction: column;
  font-family: Circular, -apple-system, system-ui, Roboto, 'Helvetica Neue', sans-serif;
}

/* 헤더는 전역 .header/.brand/.nav (index.css) 를 그대로 사용 — 중복 정의 제거 */

.main-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.signup-container {
  width: 100%;
  max-width: 480px;
}

.signup-card {
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: #ffffff;
  padding: 40px;
  box-shadow: rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0;
}

.signup-header {
  text-align: center;
  margin-bottom: 32px;
}

.signup-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
}

.signup-subtitle {
  margin: 0;
  font-size: 16px;
  color: var(--muted);
}

.signup-form {
  margin-bottom: 24px;
}

.error-message {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(193, 53, 21, 0.08);
  border: 1px solid rgba(193, 53, 21, 0.3);
  color: var(--error);
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
}

.form-input {
  width: 100%;
  height: 56px;
  padding: 14px 12px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: #ffffff;
  color: var(--ink);
  font-size: 16px;
  transition: border-color 120ms ease;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--ink);
  border-width: 2px;
}

.form-input::placeholder {
  color: var(--muted-soft);
}

.form-input--error {
  border-color: var(--error);
}

.form-error {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--error);
}

.btn-submit {
  width: 100%;
  height: 48px;
  padding: 0 24px;
  border-radius: 8px;
  border: none;
  background: var(--primary);
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.btn-submit:hover:not(:disabled) {
  background: var(--primary-active);
}

.btn-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.signup-footer {
  text-align: center;
}

.login-text {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.login-link {
  margin-left: 4px;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.login-link:hover {
  text-decoration: underline;
}

.page-footer {
  border-top: 1px solid var(--hairline);
  padding: 18px 24px;
  color: var(--muted);
  background: #ffffff;
}

.footer__text {
  margin: 0;
  font-size: 13px;
}

@media (max-width: 720px) {
  .signup-card {
    padding: 32px 24px;
  }

  .signup-title {
    font-size: 24px;
  }
}

@media (max-width: 420px) {
  .signup-card {
    padding: 24px 16px;
  }

  .main-center {
    padding: 24px 16px;
  }
}
</style>
