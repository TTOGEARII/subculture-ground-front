<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useWaterFee, type Statement, type StatementSummary, type UnitRow } from '../../../composables/useWaterFee'

definePageMeta({ layout: 'main' })
useSeoMeta({ title: '중앙그린빌라 수도요금 - Subculture Ground' })

const { listStatements, getStatement, createStatement, saveGlobals, saveUnit } = useWaterFee()

const months = ref<StatementSummary[]>([])
const selectedMonth = ref('')
const statement = ref<Statement | null>(null)
const loading = ref(true)
const saving = ref(false)
const errorText = ref('')

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const dec1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ko-KR', { minimumFractionDigits: 1 })

// 비로그인 공개 페이지 — 링크로 바로 접속. 인증 체크 없음.
onMounted(async () => {
  try {
    months.value = await listStatements()
    if (months.value.length) await load(months.value[0].yearMonth)
  } catch (e) {
    errorText.value = '불러오기에 실패했어요.'
  } finally {
    loading.value = false
  }
})

const load = async (ym: string) => {
  statement.value = await getStatement(ym)
  selectedMonth.value = ym
}
watch(selectedMonth, (ym) => {
  if (ym && ym !== statement.value?.yearMonth) load(ym).catch(() => (errorText.value = '불러오기 실패'))
})

/** 다음 달 "YYYY-MM" */
const nextMonth = (ym?: string): string => {
  const base = ym ? new Date(`${ym}-01T00:00:00`) : new Date()
  if (ym) base.setMonth(base.getMonth() + 1)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
}

const createNext = async () => {
  const ym = nextMonth(months.value[0]?.yearMonth)
  saving.value = true
  errorText.value = ''
  try {
    statement.value = await createStatement(ym)
    months.value = await listStatements()
    selectedMonth.value = ym
  } catch (e: unknown) {
    errorText.value =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '생성 실패'
  } finally {
    saving.value = false
  }
}

/** 전역 입력값 저장 (블러 시) */
const saveG = async (field: 'totalWaterFee' | 'commonElectricity' | 'bureauTotalTons' | 'stairCleaningFee') => {
  if (!statement.value) return
  saving.value = true
  try {
    statement.value = await saveGlobals(statement.value.yearMonth, { [field]: statement.value[field] })
  } catch {
    errorText.value = '저장 실패'
  } finally {
    saving.value = false
  }
}

/** 세대 셀 저장 (블러 시) — 서버가 재계산한 결과로 갱신 */
const saveU = async (row: UnitRow, field: 'prevReading' | 'currReading' | 'households' | 'discount') => {
  if (!statement.value) return
  saving.value = true
  try {
    statement.value = await saveUnit(statement.value.yearMonth, row.unitNo, { [field]: row[field] })
  } catch {
    errorText.value = '저장 실패'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <main class="wf-main">
      <header class="wf-head">
        <div>
          <NuxtLink to="/" class="home-link">← 메인</NuxtLink>
          <h1 class="wf-title">중앙그린빌라 수도요금</h1>
        </div>
        <div class="wf-head__actions">
          <select v-if="months.length" v-model="selectedMonth" class="wf-select" aria-label="정산 월">
            <option v-for="m in months" :key="m.yearMonth" :value="m.yearMonth">{{ m.yearMonth }}</option>
          </select>
          <span v-if="saving" class="wf-saving">저장 중…</span>
          <button type="button" class="wf-btn" :disabled="saving" @click="createNext">＋ 새 달</button>
        </div>
      </header>

      <p v-if="errorText" class="wf-error" role="alert">{{ errorText }}</p>

      <section v-if="loading" class="wf-empty">불러오는 중…</section>

      <section v-else-if="!statement" class="wf-empty">
        <p>아직 등록된 명세서가 없어요.</p>
        <button type="button" class="wf-btn wf-btn--primary" @click="createNext">첫 명세서 만들기</button>
      </section>

      <template v-else>
        <!-- 상단 요약: 입력값 + 계산값 -->
        <section class="wf-summary">
          <h2 class="wf-summary__title">{{ statement.yearMonth }} 요금내역서</h2>
          <div class="wf-summary__grid">
            <label class="wf-field">
              <span>총 수도요금 (원)</span>
              <input v-model.number="statement.totalWaterFee" type="number" class="wf-input" @change="saveG('totalWaterFee')" />
            </label>
            <label class="wf-field">
              <span>공동전기 (원)</span>
              <input v-model.number="statement.commonElectricity" type="number" class="wf-input" @change="saveG('commonElectricity')" />
            </label>
            <label class="wf-field">
              <span>수도국 총사용량 (톤)</span>
              <input v-model.number="statement.bureauTotalTons" type="number" class="wf-input" @change="saveG('bureauTotalTons')" />
            </label>
            <label class="wf-field">
              <span>계단청소 (라인당, 원)</span>
              <input v-model.number="statement.stairCleaningFee" type="number" class="wf-input" @change="saveG('stairCleaningFee')" />
            </label>
            <div class="wf-field wf-field--calc">
              <span>1톤당 (원)</span><strong>{{ dec1(statement.perTon) }}</strong>
            </div>
            <div class="wf-field wf-field--calc">
              <span>검침 총사용량 (톤)</span><strong>{{ statement.meteredTons }}</strong>
            </div>
            <div class="wf-field wf-field--calc">
              <span>수도국과의 차이 (톤)</span><strong>{{ statement.bureauDiff }}</strong>
            </div>
          </div>
        </section>

        <!-- 세대별 표 -->
        <div class="wf-table-wrap">
          <table class="wf-table">
            <thead>
              <tr>
                <th>호수</th>
                <th>이전검침</th>
                <th>현재검침</th>
                <th>사용량<br />(t)</th>
                <th>수도료</th>
                <th>수고비</th>
                <th>전기/계단</th>
                <th>감면</th>
                <th>납입액</th>
                <th>가구수</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in statement.rows" :key="row.unitNo" :class="{ 'is-manager': row.isManager }">
                <th scope="row">{{ row.unitNo }}<span v-if="row.isManager" class="wf-tag">반장</span></th>
                <td><input v-model.number="row.prevReading" type="number" class="wf-cell" @change="saveU(row, 'prevReading')" /></td>
                <td><input v-model.number="row.currReading" type="number" class="wf-cell" @change="saveU(row, 'currReading')" /></td>
                <td class="wf-num">{{ row.usage }}</td>
                <td class="wf-num">{{ won(row.water) }}</td>
                <td class="wf-num">{{ won(row.labor) }}</td>
                <td class="wf-num">{{ won(row.elecStair) }}</td>
                <td><input v-model.number="row.discount" type="number" class="wf-cell" @change="saveU(row, 'discount')" /></td>
                <td class="wf-num wf-pay">{{ won(row.payment) }}</td>
                <td><input v-model.number="row.households" type="number" class="wf-cell wf-cell--sm" @change="saveU(row, 'households')" /></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">합계</th>
                <td /><td />
                <td class="wf-num">{{ statement.totals.usage }}</td>
                <td class="wf-num">{{ won(statement.totals.water) }}</td>
                <td class="wf-num">{{ won(statement.totals.labor) }}</td>
                <td class="wf-num">{{ won(statement.totals.elecStair) }}</td>
                <td class="wf-num">{{ won(statement.totals.discount) }}</td>
                <td class="wf-num wf-pay">{{ won(statement.totals.payment) }}</td>
                <td class="wf-num">{{ statement.totals.households }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="wf-hint">검침값·감면·가구수를 고치면 자동 저장되고 나머지는 자동 계산돼요.</p>
      </template>
    </main>
  </div>
</template>

<style scoped>
.wf-main {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.wf-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-base);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.home-link {
  display: inline-block;
  font-size: 13px;
  color: var(--muted);
  text-decoration: none;
}
.home-link:hover { color: var(--ink); }

.wf-title {
  margin: var(--space-xs) 0 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
}

.wf-head__actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.wf-select {
  padding: 8px 12px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: var(--canvas);
  color: var(--ink);
  font-size: 14px;
}

.wf-saving { font-size: 12px; color: var(--muted); }

.wf-btn {
  padding: 8px 14px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: var(--canvas);
  color: var(--body-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.wf-btn:hover:not(:disabled) { border-color: var(--ink); }
.wf-btn:disabled { opacity: 0.5; cursor: default; }
.wf-btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }

.wf-error { margin: 0 0 var(--space-sm); font-size: 13px; color: var(--error); }

.wf-empty {
  padding: var(--space-2xl);
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--hairline);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-base);
}

/* ── 요약 ── */
.wf-summary {
  padding: var(--space-base);
  border: 1px solid var(--hairline-soft);
  border-radius: 14px;
  background: var(--surface-soft);
  margin-bottom: var(--space-lg);
}
.wf-summary__title { margin: 0 0 var(--space-base); font-size: 16px; font-weight: 700; color: var(--ink); }
.wf-summary__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-sm);
}
.wf-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
.wf-input {
  padding: 8px 10px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-size: 14px;
  color: var(--ink);
  text-align: right;
  outline: none;
}
.wf-input:focus { border-color: var(--ink); }
.wf-field--calc {
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--canvas);
  border: 1px solid var(--hairline-soft);
  border-radius: 8px;
}
.wf-field--calc strong { font-size: 15px; color: var(--ink); }

/* ── 표 ── */
.wf-table-wrap { overflow-x: auto; }
.wf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 760px;
}
.wf-table th,
.wf-table td {
  border: 1px solid var(--hairline);
  padding: 6px 8px;
  text-align: center;
}
.wf-table thead th {
  background: var(--surface-strong);
  color: var(--ink);
  font-weight: 600;
  font-size: 12px;
}
.wf-table tbody th { font-weight: 600; color: var(--ink); background: var(--surface-soft); white-space: nowrap; }
.wf-num { text-align: right; font-variant-numeric: tabular-nums; }
.wf-pay { font-weight: 700; color: var(--ink); }
.wf-cell {
  width: 100%;
  max-width: 90px;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 13px;
  text-align: right;
  color: var(--ink);
  background: var(--canvas);
  outline: none;
}
.wf-cell:hover { border-color: var(--hairline); }
.wf-cell:focus { border-color: var(--ink); background: var(--surface-soft); }
.wf-cell--sm { max-width: 56px; }
.wf-table tr.is-manager { background: rgba(255, 56, 92, 0.04); }
.wf-tag {
  margin-left: 4px;
  font-size: 10px;
  color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: 6px;
  padding: 0 4px;
}
.wf-table tfoot th,
.wf-table tfoot td {
  background: var(--surface-strong);
  font-weight: 700;
  color: var(--ink);
}
.wf-hint { margin: var(--space-sm) 0 0; font-size: 12px; color: var(--muted-soft); }

@media (max-width: 640px) {
  .wf-main { padding: var(--space-base); }
}
</style>
