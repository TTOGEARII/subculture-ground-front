/**
 * 접속 로그 비콘 (client 전용).
 * 페이지 진입 시 유입경로(document.referrer)와 landing URL을 백엔드로 보낸다.
 * IP·User-Agent·기기타입은 백엔드가 요청에서 읽는다. fire-and-forget — 실패해도 무시.
 */
export default defineNuxtPlugin(() => {
  const apiBase = useRuntimeConfig().public.apiBase as string
  try {
    void fetch(`${apiBase}/access-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.href,
        referrer: document.referrer || '',
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // 로깅 실패는 사용자 경험에 영향 주지 않으므로 무시
  }
})
