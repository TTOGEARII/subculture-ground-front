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
const activeStatus = ref<number | 'all'>('all')

const statusMeta: Record<number, { label: string; cls: string }> = {
  0: { label: '승인대기', cls: 'is-pending' },
  1: { label: '결제완료', cls: 'is-paid' },
  2: { label: '체크인 완료', cls: 'is-checked' },
  3: { label: '취소', cls: 'is-cancelled' },
}

const tabs = [
  { value: 'all' as const, label: '전체' },
  { value: 0, label: '승인대기' },
  { value: 1, label: '결제완료' },
  { value: 2, label: '체크인' },
  { value: 3, label: '취소' },
]

const filtered = computed(() =>
  activeStatus.value === 'all'
    ? reservations.value
    : reservations.value.filter((r) => r.ticketStatus === activeStatus.value),
)

const countByStatus = (status: number) =>
  reservations.value.filter((r) => r.ticketStatus === status).length

const loadReservations = async () => {
  if (!performanceId.value) return
  reservations.value = await getReservations(performanceId.value)
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

useSeoMeta({
  title: '예매자 관리 - Subculture Ground',
  description: '공연 예매자를 관리합니다.',
})

const handleChange = async (r: Reservation, status: 0 | 1 | 2 | 3, confirmMsg?: string) => {
  if (confirmMsg && !confirm(confirmMsg)) return
  try {
    await changeReservationStatus(r.idx, status)
    await loadReservations()
  } catch (err: any) {
    alert(err?.response?.data?.message || '상태 변경에 실패했습니다.')
  }
}

const typeName = (type: number) =>
  ({ 0: '계좌송금 티켓', 1: '무료티켓', 2: '유료티켓' } as Record<number, string>)[type] ?? '티켓'
const formatPrice = (price: number) =>
  price === 0 ? '무료' : new Intl.NumberFormat('ko-KR').format(price) + '원'
const formatDateTime = (v: string | null) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
</script>

<template>
  <div class="reservations-page">
    <div class="content-header">
      <nav class="breadcrumb" aria-label="위치">
        <span>{{ performance?.name || '공연' }}</span>
        <span class="separator">/</span>
        <span>예매자 관리</span>
      </nav>
      <h1 class="page-title">예매자 관리</h1>
      <p class="page-subtitle">공연을 예매한 사람들의 정보를 관리해요. 입금 확인 후 승인하고, 입장 시 체크인하세요.</p>
    </div>

    <div class="status-tabs">
      <button
        v-for="tab in tabs"
        :key="String(tab.value)"
        type="button"
        class="status-tab"
        :class="{ 'is-active': activeStatus === tab.value }"
        @click="activeStatus = tab.value"
      >
        {{ tab.label }}
        <span v-if="tab.value !== 'all'" class="tab-count">{{ countByStatus(tab.value as number) }}</span>
        <span v-else class="tab-count">{{ reservations.length }}</span>
      </button>
    </div>

    <p v-if="loading" class="table-empty">불러오는 중...</p>
    <p v-else-if="filtered.length === 0" class="table-empty">해당하는 예매 내역이 없어요.</p>

    <div v-else class="table-wrap">
      <table class="res-table">
        <thead>
          <tr>
            <th>구매자</th>
            <th>티켓</th>
            <th class="num">수량</th>
            <th class="num">금액</th>
            <th>상태</th>
            <th>예매일시</th>
            <th>체크인</th>
            <th class="actions-col">관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.idx">
            <td>
              <div class="buyer-name">{{ r.buyerName || '-' }}</div>
              <div class="buyer-sub">{{ r.buyerEmail || '' }}</div>
              <div v-if="r.buyerPhone" class="buyer-sub">{{ r.buyerPhone }}</div>
            </td>
            <td>
              <div class="ticket-name">{{ r.ticketName || '일반 티켓' }}</div>
              <div class="buyer-sub">{{ typeName(r.ticketType) }}</div>
            </td>
            <td class="num">{{ r.ticketCnt }}매</td>
            <td class="num">{{ formatPrice(r.ticketTotalPrice) }}</td>
            <td>
              <span class="status-badge" :class="statusMeta[r.ticketStatus]?.cls">
                {{ statusMeta[r.ticketStatus]?.label }}
              </span>
            </td>
            <td class="muted">{{ formatDateTime(r.createDt) }}</td>
            <td class="muted">{{ formatDateTime(r.ticketChkDt) }}</td>
            <td class="actions-col">
              <div class="row-actions">
                <button
                  v-if="r.ticketStatus === 0"
                  type="button"
                  class="act act--approve"
                  @click="handleChange(r, 1)"
                >
                  승인
                </button>
                <button
                  v-if="r.ticketStatus === 1"
                  type="button"
                  class="act act--checkin"
                  @click="handleChange(r, 2)"
                >
                  체크인
                </button>
                <button
                  v-if="r.ticketStatus !== 3 && r.ticketStatus !== 2"
                  type="button"
                  class="act act--cancel"
                  @click="handleChange(r, 3, '이 예매를 취소할까요?')"
                >
                  취소
                </button>
                <span v-if="r.ticketStatus === 2" class="act-done">완료</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.content-header {
  margin-bottom: 24px;
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
}

.status-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.status-tab.is-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--color-surface-muted);
  font-size: 11px;
  color: var(--color-text-body);
}

.table-empty {
  padding: 48px 20px;
  text-align: center;
  color: var(--color-text-faint);
  font-size: 14px;
  background: var(--color-surface-subtle);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.res-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.res-table th,
.res-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.res-table th {
  background: var(--color-surface-subtle);
  font-weight: 600;
  color: var(--color-text-body);
}

.res-table tbody tr:last-child td {
  border-bottom: none;
}

.res-table .num {
  text-align: right;
}

.buyer-name,
.ticket-name {
  font-weight: 600;
  color: var(--color-text);
}

.buyer-sub {
  font-size: 12px;
  color: var(--color-text-muted);
}

.muted {
  color: var(--color-text-muted);
}

.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.is-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.is-paid {
  background: var(--color-primary-tint);
  color: var(--color-primary);
}

.status-badge.is-checked {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.is-cancelled {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.actions-col {
  text-align: right;
}

.row-actions {
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
}

.act {
  padding: 5px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.act--approve {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.act--approve:hover {
  background: var(--color-primary);
  color: #ffffff;
}

.act--checkin {
  border-color: #059669;
  color: #059669;
}

.act--checkin:hover {
  background: #059669;
  color: #ffffff;
}

.act--cancel:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.act-done {
  font-size: 12px;
  color: #059669;
  font-weight: 600;
}
</style>
