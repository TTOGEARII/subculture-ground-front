<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'

definePageMeta({
  layout: false,
})

useSeoMeta({
  title: '로그인 - Subculture Ground',
  description: 'Subculture Ground에 로그인하세요.',
  ogTitle: '로그인 - Subculture Ground',
  ogDescription: 'Subculture Ground에 로그인하세요.',
})

const auth = useAuth()
const route = useRoute()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const redirectPath = computed(() => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect) {
    return redirect
  }
  return '/'
})

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
  return email.value && password.value && isEmailValid.value && isPasswordValid.value
})

const handleSubmit = async () => {
  if (!canSubmit.value) return

  errorMessage.value = ''
  isLoading.value = true

  try {
    await auth.login({
      email: email.value,
      password: password.value,
    })
    await navigateTo(redirectPath.value)
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      '이메일 또는 비밀번호가 올바르지 않습니다.'
    errorMessage.value = Array.isArray(message) ? message[0] : message
  } finally {
    isLoading.value = false
  }
}

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && canSubmit.value) {
    handleSubmit()
  }
}
</script>

<template>
  <div class="login-page">
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
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <h1 class="login-title">로그인</h1>
            <p class="login-subtitle">Subculture Ground에 오신 것을 환영합니다</p>
          </div>

          <form @submit.prevent="handleSubmit" class="login-form">
            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
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
                @keypress="handleKeyPress"
              />
              <p v-if="email && !isEmailValid" class="form-error">
                올바른 이메일 형식이 아닙니다.
              </p>
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
                autocomplete="current-password"
                @keypress="handleKeyPress"
              />
              <p v-if="password && !isPasswordValid" class="form-error">
                비밀번호는 6자 이상이어야 합니다.
              </p>
            </div>

            <div class="form-options">
              <label class="checkbox-label">
                <input v-model="rememberMe" type="checkbox" class="checkbox-input" />
                <span class="checkbox-text">로그인 상태 유지</span>
              </label>
              <NuxtLink to="/auth/forgot-password" class="forgot-link">
                비밀번호 찾기
              </NuxtLink>
            </div>

            <button
              type="submit"
              class="btn-submit"
              :disabled="!canSubmit || isLoading"
            >
              <span v-if="isLoading">로그인 중...</span>
              <span v-else>로그인</span>
            </button>
          </form>

          <div class="login-divider">
            <span>또는</span>
          </div>

          <div class="social-login">
            <button type="button" class="btn-social btn-google">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
                <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
              </svg>
              Google로 로그인
            </button>

            <button type="button" class="btn-social btn-kakao" @click="auth.startKakaoLogin()">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0C4.477 0 0 3.582 0 8c0 2.914 1.618 5.465 4 6.909L3 20l5.355-2.78C9.17 17.52 9.58 17.5 10 17.5c5.523 0 10-3.582 10-8S15.523 0 10 0z" fill="#3C1E1E"/>
              </svg>
              Kakao로 로그인
            </button>
          </div>

          <div class="login-footer">
            <p class="signup-text">
              계정이 없으신가요?
              <NuxtLink to="/auth/signup" class="signup-link">회원가입</NuxtLink>
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
.login-page {
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

.login-container {
  width: 100%;
  max-width: 440px;
}

.login-card {
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: #ffffff;
  padding: 40px;
  box-shadow: rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
}

.login-subtitle {
  margin: 0;
  font-size: 16px;
  color: var(--muted);
}

.login-form {
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

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  cursor: pointer;
  accent-color: var(--ink);
}

.checkbox-text {
  font-size: 14px;
  color: var(--muted);
}

.forgot-link {
  font-size: 14px;
  color: var(--muted);
  text-decoration: underline;
  transition: color 120ms ease;
}

.forgot-link:hover {
  color: var(--ink);
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

.login-divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--hairline-soft);
}

.login-divider span {
  padding: 0 16px;
  font-size: 14px;
  color: var(--muted);
}

.social-login {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.btn-social {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.btn-google {
  background: #ffffff;
  color: var(--ink);
}

.btn-google:hover {
  background: var(--surface-soft);
}

.btn-kakao {
  background: #FEE500;
  color: #3C1E1E;
  border-color: #FEE500;
}

.btn-kakao:hover {
  background: #FDD835;
}

.login-footer {
  text-align: center;
}

.signup-text {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.signup-link {
  margin-left: 4px;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.signup-link:hover {
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
  .login-card {
    padding: 32px 24px;
  }

  .login-title {
    font-size: 24px;
  }
}

@media (max-width: 420px) {
  .login-card {
    padding: 24px 16px;
  }

  .main-center {
    padding: 24px 16px;
  }
}
</style>
