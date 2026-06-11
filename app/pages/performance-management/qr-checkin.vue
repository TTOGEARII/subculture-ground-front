<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'
import { usePerformances, type Performance, type Reservation } from '../../../composables/usePerformances'

definePageMeta({
  layout: 'performance-management',
})

const route = useRoute()
const { isAuthenticated, user, fetchProfile } = useAuth()
const { getPerformanceById, getReservations, changeReservationStatus } = usePerformances()

const performanceId = computed(() => {
  const id = route.query.id as string | undefined
  return id ? Number(id) : null
})

const performance = ref<Performance | null>(null)
const reservations = ref<Reservation[]>([])
const loading = ref(true)

const scanning = ref(false)
const cameraError = ref('')
const manualCode = ref('')
const lastResult = ref<{ ok: boolean; message: string } | null>(null)
const checkedLog = ref<{ name: string; ticket: string; time: string }[]>([])

let html5Qr: any = null
let busy = false // 중복 스캔 방지

// "SBG-RES-12", "12" 등에서 예매 번호(idx)를 추출
const parseReservationIdx = (text: string): number | null => {
  const m = text.match(/(\d+)\s*$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isNaN(n) ? null : n
}

const loadReservations = async () => {
  if (!performanceId.value) return
  reservations.value = await getReservations(performanceId.value)
}

const doCheckIn = async (idx: number) => {
  if (busy) return
  busy = true
  try {
    const target = reservations.value.find((r) => r.idx === idx)
    if (!target) {
      lastResult.value = { ok: false, message: `예매 #${idx} 를 이 공연에서 찾을 수 없어요.` }
      return
    }
    if (target.ticketStatus === 2) {
      lastResult.value = { ok: false, message: `이미 체크인된 예매예요. (${target.buyerName || '구매자'})` }
      return
    }
    if (target.ticketStatus === 3) {
      lastResult.value = { ok: false, message: '취소된 예매는 체크인할 수 없어요.' }
      return
    }
    await changeReservationStatus(idx, 2)
    await loadReservations()
    lastResult.value = {
      ok: true,
      message: `체크인 완료! ${target.buyerName || '구매자'} · ${target.ticketName || '티켓'} ${target.ticketCnt}매`,
    }
    checkedLog.value.unshift({
      name: target.buyerName || '구매자',
      ticket: `${target.ticketName || '티켓'} ${target.ticketCnt}매`,
      time: new Date().toLocaleTimeString('ko-KR'),
    })
  } catch (err: any) {
    lastResult.value = { ok: false, message: err?.response?.data?.message || '체크인에 실패했어요.' }
  } finally {
    setTimeout(() => (busy = false), 1200) // 연속 동일 스캔 디바운스
  }
}

const handleManual = async () => {
  const idx = parseReservationIdx(manualCode.value.trim())
  if (idx == null) {
    lastResult.value = { ok: false, message: '예매 번호를 정확히 입력해주세요.' }
    return
  }
  await doCheckIn(idx)
  manualCode.value = ''
}

const startScanner = async () => {
  cameraError.value = ''
  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    html5Qr = new Html5Qrcode('qr-reader')
    await html5Qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText: string) => {
        const idx = parseReservationIdx(decodedText)
        if (idx != null) doCheckIn(idx)
      },
      () => {}, // 스캔 실패(프레임)는 무시
    )
    scanning.value = true
  } catch (err: any) {
    cameraError.value =
      '카메라를 시작할 수 없어요. 권한을 허용했는지 확인하거나, 아래 수동 입력을 사용하세요.'
    scanning.value = false
  }
}

const stopScanner = async () => {
  if (html5Qr) {
    try {
      await html5Qr.stop()
      await html5Qr.clear()
    } catch {
      /* noop */
    }
    html5Qr = null
  }
  scanning.value = false
}

onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/auth/login')
    return
  }
  if (!user.value) await fetchProfile()
  if (!performanceId.value) {
    await navigateTo('/performance-management/select')
    return
  }
  loading.value = true
  try {
    const data = await getPerformanceById(performanceId.value)
    if (!data) {
      await navigateTo('/performance-management/select')
      return
    }
    performance.value = data
    await loadReservations()
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  stopScanner()
})

useSeoMeta({
  title: 'QR 체크인 - Subculture Ground',
  description: 'QR 코드로 입장을 체크인합니다.',
})

const checkedCount = computed(() => reservations.value.filter((r) => r.ticketStatus === 2).length)
const totalCount = computed(() => reservations.value.filter((r) => r.ticketStatus !== 3).length)
</script>

<template>
  <div class="qr-page">
    <div class="content-header">
      <nav class="breadcrumb" aria-label="위치">
        <span>{{ performance?.name || '공연' }}</span>
        <span class="separator">/</span>
        <span>QR 체크인</span>
      </nav>
      <h1 class="page-title">QR 체크인</h1>
      <p class="page-subtitle">
        관객의 예매 QR을 카메라로 스캔하면 입장 체크인돼요. 카메라가 없으면 예매 번호를 직접 입력하세요.
      </p>
    </div>

    <div class="checkin-summary">
      체크인 <strong>{{ checkedCount }}</strong> / {{ totalCount }}명
    </div>

    <div class="checkin-grid">
      <!-- 스캐너 -->
      <section class="scanner-card">
        <div id="qr-reader" class="qr-reader" :class="{ 'is-idle': !scanning }">
          <div v-if="!scanning" class="qr-idle">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            <p>카메라로 QR을 스캔하세요</p>
          </div>
        </div>

        <p v-if="cameraError" class="camera-error">{{ cameraError }}</p>

        <div class="scanner-actions">
          <button v-if="!scanning" type="button" class="btn-scan" @click="startScanner">카메라 시작</button>
          <button v-else type="button" class="btn-scan btn-scan--stop" @click="stopScanner">카메라 중지</button>
        </div>

        <!-- 수동 입력 폴백 -->
        <div class="manual-box">
          <label class="manual-label">예매 번호로 체크인</label>
          <div class="manual-row">
            <input
              v-model="manualCode"
              type="text"
              class="manual-input"
              placeholder="예: 12 또는 SBG-RES-12"
              @keyup.enter="handleManual"
            />
            <button type="button" class="btn-manual" @click="handleManual">체크인</button>
          </div>
        </div>

        <p v-if="lastResult" class="scan-result" :class="lastResult.ok ? 'is-ok' : 'is-err'">
          {{ lastResult.message }}
        </p>
      </section>

      <!-- 체크인 로그 -->
      <section class="log-card">
        <h2 class="log-title">방금 체크인</h2>
        <p v-if="checkedLog.length === 0" class="log-empty">아직 체크인한 관객이 없어요.</p>
        <ul v-else class="log-list">
          <li v-for="(c, i) in checkedLog" :key="i" class="log-item">
            <div>
              <div class="log-name">{{ c.name }}</div>
              <div class="log-ticket">{{ c.ticket }}</div>
            </div>
            <span class="log-time">{{ c.time }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.content-header {
  margin-bottom: 20px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-primary);
  margin-bottom: 16px;
}

.separator {
  color: var(--color-text-faint);
}

.page-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.checkin-summary {
  margin-bottom: 20px;
  font-size: 15px;
  color: var(--color-text-body);
}

.checkin-summary strong {
  color: var(--color-primary);
  font-size: 18px;
}

.checkin-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.scanner-card,
.log-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  background: var(--color-surface);
}

.qr-reader {
  width: 100%;
  min-height: 280px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #111827;
}

.qr-reader.is-idle {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-subtle);
  border: 1px dashed var(--color-border-strong);
}

.qr-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--color-text-faint);
}

.qr-idle p {
  margin: 0;
  font-size: 13px;
}

.camera-error {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--color-danger-strong);
}

.scanner-actions {
  margin-top: 14px;
}

.btn-scan {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-scan--stop {
  background: var(--color-text-body);
}

.manual-box {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border);
}

.manual-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-body);
}

.manual-row {
  display: flex;
  gap: 8px;
}

.manual-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  font-size: 14px;
}

.btn-manual {
  flex-shrink: 0;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.scan-result {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
}

.scan-result.is-ok {
  background: #d1fae5;
  color: #065f46;
}

.scan-result.is-err {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.log-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.log-empty {
  font-size: 13px;
  color: var(--color-text-faint);
}

.log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
}

.log-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.log-ticket {
  font-size: 12px;
  color: var(--color-text-muted);
}

.log-time {
  font-size: 12px;
  color: var(--color-text-faint);
}

@media (max-width: 900px) {
  .checkin-grid {
    grid-template-columns: 1fr;
  }
}
</style>
