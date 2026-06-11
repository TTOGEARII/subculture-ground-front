<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'
import { usePerformances, type Performance, type TicketInfo } from '../../../composables/usePerformances'

definePageMeta({
  layout: 'performance-management',
})

const route = useRoute()
const { isAuthenticated, user, fetchProfile } = useAuth()
const {
  getPerformanceById,
  getTicketsByPerformanceId,
  createTicketInfo,
  deleteTicketInfo,
} = usePerformances()

const performanceId = computed(() => {
  const id = route.query.id as string | undefined
  return id ? Number(id) : null
})

const performance = ref<Performance | null>(null)
const tickets = ref<TicketInfo[]>([])
const loading = ref(true)

// 티켓 종류: 0=계좌송금 티켓(유료), 1=무료티켓, 2=유료티켓(제휴 호스트 전용)
const ticketTypes = [
  { value: 0, label: '계좌송금 티켓', desc: '계좌송금으로 티켓값을 받아요' },
  { value: 1, label: '무료티켓', desc: '무료로 발급하는 티켓이에요' },
  { value: 2, label: '유료티켓', desc: '제휴 호스트 전용', disabled: true },
]

const showCreateModal = ref(false)
const submitting = ref(false)
const formError = ref('')
const form = ref({
  ticketType: 1, // 기본: 무료티켓
  ticketName: '',
  ticketPrice: 0,
  ticketMax: 100,
  ticketMin: 1,
})

const isFree = computed(() => form.value.ticketType === 1)

const loadTickets = async () => {
  if (!performanceId.value) return
  tickets.value = await getTicketsByPerformanceId(performanceId.value)
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
    await loadTickets()
  } finally {
    loading.value = false
  }
})

useSeoMeta({
  title: '티켓 관리 - Subculture Ground',
  description: '공연 티켓을 생성하고 관리합니다.',
})

const openCreateModal = () => {
  form.value = { ticketType: 1, ticketName: '', ticketPrice: 0, ticketMax: 100, ticketMin: 1 }
  formError.value = ''
  showCreateModal.value = true
}

const selectType = (value: number) => {
  form.value.ticketType = value
  if (value === 1) form.value.ticketPrice = 0 // 무료티켓은 가격 0
}

const handleCreate = async () => {
  const name = form.value.ticketName.trim()
  if (!name) return (formError.value = '티켓 이름을 입력해주세요.')
  if (name.length > 12) return (formError.value = '티켓 이름은 최대 12글자입니다.')
  if (form.value.ticketMax < 1) return (formError.value = '발행 매수는 1 이상이어야 합니다.')
  if (!isFree.value && form.value.ticketPrice <= 0) {
    return (formError.value = '유료 티켓은 가격을 입력해주세요.')
  }
  if (form.value.ticketMin < 1 || form.value.ticketMin > form.value.ticketMax) {
    return (formError.value = '1인당 최소 매수가 올바르지 않습니다.')
  }

  submitting.value = true
  formError.value = ''
  try {
    await createTicketInfo({
      pmIdx: performanceId.value!,
      ticketName: name,
      ticketType: form.value.ticketType,
      ticketPrice: isFree.value ? 0 : form.value.ticketPrice,
      ticketMax: form.value.ticketMax,
      ticketMin: form.value.ticketMin,
    })
    showCreateModal.value = false
    await loadTickets()
  } catch (err: any) {
    formError.value = err?.response?.data?.message || err?.message || '티켓 생성에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (ticket: TicketInfo) => {
  if (ticket.ticketCount > 0) {
    alert('이미 예매한 사람이 있어 삭제할 수 없어요.')
    return
  }
  if (!confirm(`'${ticket.ticketName}' 티켓을 삭제할까요?`)) return
  try {
    await deleteTicketInfo(ticket.idx)
    await loadTickets()
  } catch (err: any) {
    alert(err?.response?.data?.message || '티켓 삭제에 실패했습니다.')
  }
}

const typeName = (type: number) => ticketTypes.find((t) => t.value === type)?.label ?? '티켓'
const formatPrice = (price: number) =>
  price === 0 ? '무료' : new Intl.NumberFormat('ko-KR').format(price) + '원'
const remaining = (t: TicketInfo) => t.ticketMax - t.ticketCount
</script>

<template>
  <div class="tickets-page">
    <div class="content-header">
      <nav class="breadcrumb" aria-label="위치">
        <span>{{ performance?.name || '공연' }}</span>
        <span class="separator">/</span>
        <span>티켓 관리</span>
      </nav>
      <h1 class="page-title">티켓 관리</h1>
      <p class="page-subtitle">
        관객들을 위한 티켓을 만들어주세요. 최소 한 개의 티켓이 필요해요.<br />
        예매한 사람이 있는 티켓은 삭제할 수 없어요.
      </p>
    </div>

    <button type="button" class="btn-create" @click="openCreateModal">
      + 새 티켓 만들기
    </button>

    <section class="ticket-list-section">
      <h2 class="section-label">티켓 목록</h2>

      <p v-if="loading" class="list-empty">불러오는 중...</p>

      <p v-else-if="tickets.length === 0" class="list-empty">
        아직 등록된 티켓이 없어요. 위 버튼으로 첫 티켓을 만들어보세요.
      </p>

      <ul v-else class="ticket-list">
        <li v-for="ticket in tickets" :key="ticket.idx" class="ticket-row">
          <div class="ticket-info">
            <span class="ticket-name">{{ ticket.ticketName }}</span>
            <span class="ticket-meta">
              {{ formatPrice(ticket.ticketPrice) }} · {{ typeName(ticket.ticketType) }}
              <template v-if="ticket.ticketMin > 1"> · 1인당 최소 {{ ticket.ticketMin }}매</template>
            </span>
          </div>
          <div class="ticket-actions">
            <span class="ticket-stock" :class="{ 'is-soldout': remaining(ticket) <= 0 }">
              재고 {{ remaining(ticket) }}/{{ ticket.ticketMax }}
            </span>
            <button
              type="button"
              class="btn-delete"
              :disabled="ticket.ticketCount > 0"
              :title="ticket.ticketCount > 0 ? '예매된 티켓은 삭제할 수 없어요' : '삭제'"
              @click="handleDelete(ticket)"
            >
              삭제
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 새 티켓 만들기 모달 -->
    <Modal
      :is-open="showCreateModal"
      title="새 티켓 만들기"
      size="medium"
      @close="showCreateModal = false"
    >
      <div class="form ticket-form">
        <!-- 티켓 종류 -->
        <div class="form-group">
          <label class="form-label">티켓 종류 <span class="required">*</span></label>
          <p class="form-hint form-hint--normal">생성할 티켓의 종류를 선택해주세요.</p>
          <div class="type-options">
            <button
              v-for="t in ticketTypes"
              :key="t.value"
              type="button"
              class="type-option"
              :class="{ 'is-active': form.ticketType === t.value }"
              :disabled="t.disabled"
              @click="selectType(t.value)"
            >
              <span class="type-option__label">{{ t.label }}</span>
              <span class="type-option__desc">{{ t.desc }}</span>
            </button>
          </div>
        </div>

        <!-- 티켓 이름 -->
        <div class="form-group">
          <label for="ticketName" class="form-label">티켓 이름 <span class="required">*</span></label>
          <p class="form-hint form-hint--normal">티켓의 성격을 잘 드러내는 이름을 써주세요. (ex. 일반 티켓)</p>
          <input
            id="ticketName"
            v-model="form.ticketName"
            type="text"
            class="form-input"
            placeholder="최대 12글자까지 쓸 수 있어요"
            maxlength="12"
          />
        </div>

        <!-- 티켓 가격 (무료티켓이면 비활성) -->
        <div class="form-group">
          <label for="ticketPrice" class="form-label">티켓 가격 <span v-if="!isFree" class="required">*</span></label>
          <div class="input-suffix">
            <input
              id="ticketPrice"
              v-model.number="form.ticketPrice"
              type="number"
              class="form-input"
              min="0"
              :disabled="isFree"
              :placeholder="isFree ? '무료' : '0'"
            />
            <span class="suffix">원</span>
          </div>
        </div>

        <!-- 발행매수 -->
        <div class="form-group">
          <label for="ticketMax" class="form-label">발행 매수 <span class="required">*</span></label>
          <p class="form-hint form-hint--normal">판매할 총 수량(재고)이에요.</p>
          <div class="input-suffix">
            <input
              id="ticketMax"
              v-model.number="form.ticketMax"
              type="number"
              class="form-input"
              min="1"
            />
            <span class="suffix">장</span>
          </div>
        </div>

        <!-- 1인당 최소 구매 매수 -->
        <div class="form-group">
          <label for="ticketMin" class="form-label">1인당 최소 구매 매수</label>
          <div class="input-suffix">
            <input
              id="ticketMin"
              v-model.number="form.ticketMin"
              type="number"
              class="form-input"
              min="1"
            />
            <span class="suffix">매</span>
          </div>
        </div>

        <p v-if="formError" class="form-error">{{ formError }}</p>
      </div>

      <template #footer>
        <button type="button" class="btn btn--secondary" @click="showCreateModal = false">취소</button>
        <button type="button" class="btn btn--primary" :disabled="submitting" @click="handleCreate">
          {{ submitting ? '저장 중...' : '저장하기' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.content-header {
  margin-bottom: 28px;
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

.btn-create {
  padding: 12px 20px;
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-primary-tint);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 28px;
}

.btn-create:hover {
  background: #ede9fe;
}

.ticket-list-section {
  border-top: 1px solid var(--color-border);
  padding-top: 20px;
}

.section-label {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.list-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-faint);
  font-size: 14px;
  background: var(--color-surface-subtle);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.ticket-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.ticket-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ticket-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.ticket-meta {
  font-size: 13px;
  color: var(--color-text-muted);
}

.ticket-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.ticket-stock {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-body);
}

.ticket-stock.is-soldout {
  color: var(--color-danger);
}

.btn-delete {
  padding: 6px 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-body);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover:not(:disabled) {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.btn-delete:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 모달 폼 */
.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.type-options {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.type-option.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}

.type-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.type-option__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.type-option__desc {
  font-size: 11px;
  color: var(--color-text-muted);
}

.input-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-suffix .form-input {
  padding-right: 40px;
}

.input-suffix .suffix {
  position: absolute;
  right: 14px;
  font-size: 14px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.form-error {
  margin: 0;
  font-size: 13px;
  color: var(--color-danger-strong);
}
</style>
