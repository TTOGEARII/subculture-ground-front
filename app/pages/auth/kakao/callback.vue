<script setup lang="ts">
import { useAuth } from '../../../../composables/useAuth'

const route = useRoute()
const config = useRuntimeConfig()
const { kakaoLogin } = useAuth()

const error = ref('')

useSeoMeta({ title: '카카오 로그인 - Subculture Ground' })

onMounted(async () => {
  const code = route.query.code as string | undefined
  const kakaoError = route.query.error as string | undefined

  if (kakaoError || !code) {
    error.value = '카카오 인증이 취소되었거나 코드가 없습니다.'
    return
  }

  try {
    await kakaoLogin(code, config.public.kakaoRedirectUri as string)
    // 로그인 성공 → 홈으로
    await navigateTo('/')
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || '카카오 로그인 처리 중 오류가 발생했습니다.'
  }
})
</script>

<template>
  <div class="kakao-callback">
    <div v-if="!error" class="cb-loading">
      <div class="spinner" aria-hidden="true" />
      <p>카카오 로그인 처리 중...</p>
    </div>
    <div v-else class="cb-error">
      <p class="cb-error__msg">{{ error }}</p>
      <NuxtLink to="/auth/login" class="cb-error__link">로그인으로 돌아가기</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.kakao-callback {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.cb-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #6a6a6a;
  font-size: 15px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #ebebeb;
  border-top-color: #ff385c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.cb-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

.cb-error__msg {
  margin: 0;
  font-size: 15px;
  color: #c13515;
}

.cb-error__link {
  font-size: 14px;
  font-weight: 600;
  color: #ff385c;
  text-decoration: none;
}

.cb-error__link:hover {
  text-decoration: underline;
}
</style>
