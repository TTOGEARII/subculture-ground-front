<script setup lang="ts">
// Nuxt composable 명시적 import (Docker 환경에서 안정적)
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
const birthDate = ref('')

const isLoading = ref(false)
const errorMessage = ref('')

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
      phone: phone.value || undefined,
      birthDate: birthDate.value || undefined,
    })

    await navigateTo('/')
  } catch (error: any) {
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

    <main class="main">
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
              <input
                id="name"
                v-model="name"
                type="text"
                class="form-input"
                placeholder="이름을 입력하세요"
                autocomplete="name"
              />
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
                autocomplete="new-password"
              />
              <p v-if="password && !isPasswordValid" class="form-error">
                비밀번호는 6자 이상이어야 합니다.
              </p>
            </div>

            <div class="form-group">
              <label for="phone" class="form-label">전화번호 (선택)</label>
              <input
                id="phone"
                v-model="phone"
                type="tel"
                class="form-input"
                placeholder="010-0000-0000"
                autocomplete="tel"
              />
            </div>

            <div class="form-group">
              <label for="birthDate" class="form-label">생년월일 (선택)</label>
              <input
                id="birthDate"
                v-model="birthDate"
                type="date"
                class="form-input"
                autocomplete="bday"
              />
            </div>

            <button
              type="submit"
              class="btn btn--primary btn--large btn--full"
              :disabled="!canSubmit || isLoading"
            >
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

    <footer class="footer">
      <p class="footer__text">
        © {{ new Date().getFullYear() }} Subculture Ground. All rights reserved.
      </p>
    </footer>
  </div>
</template>

<style scoped>

.signup-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
}

.main {
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.signup-header {
  text-align: center;
  margin-bottom: 32px;
}

.signup-title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, rgba(124, 58, 237, 1), rgba(34, 197, 94, 1));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
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
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 16px;
  transition: border-color 200ms ease, background-color 200ms ease;
}

.form-input:focus {
  outline: none;
  border-color: rgba(124, 58, 237, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.form-input::placeholder {
  color: var(--muted-2);
}

.form-input--error {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.05);
}

.form-error {
  margin: 6px 0 0;
  font-size: 12px;
  color: #ef4444;
}

.btn--full {
  width: 100%;
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
  color: rgba(124, 58, 237, 0.9);
  text-decoration: none;
  font-weight: 600;
  transition: color 200ms ease;
}

.login-link:hover {
  color: rgba(124, 58, 237, 1);
}

@media (max-width: 720px) {
  .signup-card {
    padding: 32px 24px;
  }

  .signup-title {
    font-size: 28px;
  }
}
</style>

