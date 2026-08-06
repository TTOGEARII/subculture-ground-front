<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  useWaterFee,
  type Statement,
  type StatementSummary,
  type UnitRow,
  type HistoryRow,
  type Me,
} from '../../../composables/useWaterFee'

definePageMeta({ layout: 'main' })
useSeoMeta({ title: '중앙그린빌라 수도요금 - Subculture Ground' })

const {
  listStatements, getStatement, getUnitHistory, verifyHousehold, saveMyReading,
  createStatement, saveGlobals, saveUnit, setManager, resetHousehold,
} = useWaterFee()

/** 15세대 (식별 화면 선택용) */
const UNIT_NUMBERS = [
  '101', '102', '103',
  '201', '202', '203', '204',
  '301', '302', '303', '304',
  '401', '402', '403', '404',
]

const ME_KEY = 'water-fee:me'

const me = ref<Me | null>(null)
const view = ref<'mine' | 'all'>('mine')

const months = ref<StatementSummary[]>([])
const selectedMonth = ref('')
const statement = ref<Statement | null>(null)
const myHistory = ref<HistoryRow[]>([])
const loading = ref(true)
const saving = ref(false)
const errorText = ref('')

// 식별 폼
const fUnit = ref('')
const fId = ref('')
const identifying = ref(false)
const idError = ref('')

// 내 검침 입력
const readingInput = ref<number | null>(null)

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const dec1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ko-KR', { minimumFractionDigits: 1 })

const myRow = computed<UnitRow | null>(() =>
  me.value && statement.value ? statement.value.rows.find((r) => r.unitNo === me.value!.unitNo) ?? null : null,
)

onMounted(async () => {
  try {
    const saved = localStorage.getItem(ME_KEY)
    if (saved) me.value = JSON.parse(saved)
  } catch { /* 무시 */ }
  try {
    months.value = await listStatements()
    if (months.value.length) await load(months.value[0].yearMonth)
    if (me.value) await loadHistory()
  } catch {
    errorText.value = '불러오기에 실패했어요.'
  } finally {
    loading.value = false
  }
})

const load = async (ym: string) => {
  statement.value = await getStatement(ym)
  selectedMonth.value = ym
  readingInput.value = myRow.value ? myRow.value.currReading : null
}
watch(selectedMonth, (ym) => {
  if (ym && ym !== statement.value?.yearMonth) load(ym).catch(() => (errorText.value = '불러오기 실패'))
})

const loadHistory = async () => {
  if (!me.value) return
  try { myHistory.value = await getUnitHistory(me.value.unitNo) } catch { /* 무시 */ }
}

// ── 식별 ──
const submitIdentify = async () => {
  idError.value = ''
  if (!fUnit.value) { idError.value = '호수를 선택해 주세요.'; return }
  if (!fId.value.trim()) { idError.value = '이름(아이디)을 입력해 주세요.'; return }
  identifying.value = true
  try {
    me.value = await verifyHousehold(fUnit.value, fId.value.trim())
    localStorage.setItem(ME_KEY, JSON.stringify(me.value))
    view.value = 'mine'
    readingInput.value = myRow.value ? myRow.value.currReading : null
    await loadHistory()
  } catch (e: unknown) {
    idError.value = errMsg(e, '확인에 실패했어요.')
  } finally {
    identifying.value = false
  }
}

const logout = () => {
  me.value = null
  myHistory.value = []
  view.value = 'mine'
  fUnit.value = ''
  fId.value = ''
  localStorage.removeItem(ME_KEY)
}

// ── 일반 세대: 내 검침 저장 ──
const submitReading = async () => {
  if (!me.value || !statement.value || readingInput.value == null) return
  saving.value = true
  errorText.value = ''
  try {
    statement.value = await saveMyReading(statement.value.yearMonth, me.value, readingInput.value)
    await loadHistory()
  } catch (e: unknown) {
    errorText.value = errMsg(e, '저장 실패')
  } finally {
    saving.value = false
  }
}

// ── 관리자(반장) ──
const nextMonth = (ym?: string): string => {
  const base = ym ? new Date(`${ym}-01T00:00:00`) : new Date()
  if (ym) base.setMonth(base.getMonth() + 1)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
}
const createNext = async () => {
  if (!me.value) return
  const ym = nextMonth(months.value[0]?.yearMonth)
  saving.value = true
  errorText.value = ''
  try {
    statement.value = await createStatement(ym, me.value)
    months.value = await listStatements()
    selectedMonth.value = ym
  } catch (e: unknown) {
    errorText.value = errMsg(e, '생성 실패')
  } finally {
    saving.value = false
  }
}
const saveG = async (field: 'totalWaterFee' | 'commonElectricity' | 'bureauTotalTons' | 'stairCleaningFee') => {
  if (!me.value || !statement.value) return
  saving.value = true
  try {
    statement.value = await saveGlobals(statement.value.yearMonth, me.value, { [field]: statement.value[field] })
  } catch (e: unknown) { errorText.value = errMsg(e, '저장 실패') } finally { saving.value = false }
}
const saveU = async (row: UnitRow, field: 'prevReading' | 'currReading' | 'households' | 'discount') => {
  if (!me.value || !statement.value) return
  saving.value = true
  try {
    statement.value = await saveUnit(statement.value.yearMonth, me.value, row.unitNo, { [field]: row[field] })
  } catch (e: unknown) { errorText.value = errMsg(e, '저장 실패') } finally { saving.value = false }
}
const changeManager = async (e: Event) => {
  if (!me.value || !statement.value) return
  const managerUnit = (e.target as HTMLSelectElement).value
  saving.value = true
  try {
    const updated = await setManager(statement.value.yearMonth, me.value, managerUnit)
    statement.value = updated
    // 반장이 나에서 다른 세대로 바뀌면 내 관리 권한 갱신
    me.value = { ...me.value, isManager: updated.managerUnit === me.value.unitNo }
    localStorage.setItem(ME_KEY, JSON.stringify(me.value))
  } catch (e2: unknown) { errorText.value = errMsg(e2, '반장 변경 실패') } finally { saving.value = false }
}
const resetUnit = ref('')
const doReset = async () => {
  if (!me.value || !resetUnit.value) return
  const target = resetUnit.value
  if (!confirm(`${target}호의 아이디 등록을 초기화할까요? 그 세대는 새 아이디로 다시 등록해야 해요.`)) return
  saving.value = true
  try {
    await resetHousehold(target, me.value)
    resetUnit.value = ''
    errorText.value = ''
    if (target === me.value.unitNo) {
      // 내 세대를 초기화하면 내 로그인도 풀고 재등록 화면으로 보낸다
      alert('초기화했어요. 새 이름으로 다시 등록해 주세요.')
      logout()
    } else {
      alert('초기화했어요.')
    }
  } catch (e: unknown) { errorText.value = errMsg(e, '초기화 실패') } finally { saving.value = false }
}

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
}
</script>

<template>
  <div class="page">
    <main class="wf-main">
      <header class="wf-head">
        <div>
          <h1 class="wf-title">중앙그린빌라 수도요금</h1>
        </div>
        <div v-if="me" class="wf-who">
          <span class="wf-who__name">{{ me.unitNo }}호 {{ me.residentId }}님</span>
          <button type="button" class="wf-btn wf-btn--ghost" @click="logout">다른 집</button>
        </div>
      </header>

      <p v-if="errorText" class="wf-error" role="alert">{{ errorText }}</p>
      <section v-if="loading" class="wf-empty">불러오는 중…</section>

      <!-- ── 모드 0: 세대 식별 ── -->
      <section v-else-if="!me" class="wf-identify">
        <h2 class="wf-identify__title">우리 집 수도요금 보기</h2>
        <p class="wf-identify__sub">우리 집 <b>호수</b>와 <b>이름</b>을 넣어 주세요. 비밀번호는 없어요.</p>
        <form class="wf-identify__form" @submit.prevent="submitIdentify">
          <label class="wf-bigfield">
            <span>우리 집 호수</span>
            <select v-model="fUnit" class="wf-biginput">
              <option value="" disabled>호수를 골라주세요</option>
              <option v-for="u in UNIT_NUMBERS" :key="u" :value="u">{{ u }}호</option>
            </select>
          </label>
          <label class="wf-bigfield">
            <span>이름 (또는 아이디)</span>
            <input v-model="fId" type="text" class="wf-biginput" placeholder="예: 홍길동" autocomplete="off" />
          </label>
          <p v-if="idError" class="wf-error" role="alert">{{ idError }}</p>
          <button type="submit" class="wf-bigbtn" :disabled="identifying">
            {{ identifying ? '확인 중…' : '확인' }}
          </button>
          <p class="wf-identify__hint">처음이면 이 이름으로 등록돼요. 다음부터는 같은 이름으로 들어와요.</p>
        </form>
      </section>

      <!-- ── 모드 1: 내 세대 ── -->
      <template v-else-if="view === 'mine'">
        <section v-if="!statement" class="wf-empty">
          <p>아직 이번 달 정산표가 없어요.</p>
          <button v-if="me.isManager" type="button" class="wf-btn wf-btn--primary" @click="createNext">첫 명세서 만들기</button>
          <p v-else class="wf-muted">반장이 정산표를 만들면 여기에 보여요.</p>
        </section>

        <template v-else>
          <div class="wf-monthbar">
            <select v-if="months.length > 1" v-model="selectedMonth" class="wf-select" aria-label="정산 월">
              <option v-for="m in months" :key="m.yearMonth" :value="m.yearMonth">{{ m.yearMonth }}</option>
            </select>
            <span v-else class="wf-monthbar__label">{{ statement.yearMonth }}</span>
          </div>

          <section class="wf-mecard">
            <h2 class="wf-mecard__unit">
              우리 집 <strong>{{ me.unitNo }}호</strong>
              <span v-if="myRow?.isManager" class="wf-tag">반장</span>
            </h2>

            <div class="wf-reading">
              <label for="wf-reading-input" class="wf-reading__label">이번 달 계량기 숫자</label>
              <input
                id="wf-reading-input"
                v-model.number="readingInput"
                type="number"
                inputmode="numeric"
                class="wf-reading__input"
              />
              <button type="button" class="wf-bigbtn wf-bigbtn--save" :disabled="saving" @click="submitReading">
                {{ saving ? '저장 중…' : '저장' }}
              </button>
            </div>
            <p class="wf-reading__prev">지난달 검침: <b>{{ myRow?.prevReading }}</b></p>

            <dl class="wf-mestats">
              <div><dt>사용량</dt><dd>{{ myRow?.usage }} 톤</dd></div>
              <div class="wf-mestats--pay"><dt>이번 달 내는 돈</dt><dd>{{ won(myRow?.payment ?? 0) }} 원</dd></div>
            </dl>
            <ul class="wf-medetail">
              <li><span>수도료</span><b>{{ won(myRow?.water ?? 0) }}</b></li>
              <li><span>수고비</span><b>{{ won(myRow?.labor ?? 0) }}</b></li>
              <li><span>전기·계단청소</span><b>{{ won(myRow?.elecStair ?? 0) }}</b></li>
              <li v-if="(myRow?.discount ?? 0) > 0"><span>감면</span><b>-{{ won(myRow?.discount ?? 0) }}</b></li>
            </ul>
          </section>

          <section v-if="myHistory.length > 1" class="wf-hist">
            <h3 class="wf-hist__title">지난 사용 내역</h3>
            <ul class="wf-hist__list">
              <li v-for="h in myHistory" :key="h.yearMonth">
                <span class="wf-hist__ym">{{ h.yearMonth }}</span>
                <span class="wf-hist__use">{{ h.usage }}톤</span>
                <span class="wf-hist__pay">{{ won(h.payment) }}원</span>
              </li>
            </ul>
          </section>

          <button type="button" class="wf-bigbtn wf-bigbtn--outline" @click="view = 'all'">전체 세대 보기</button>
        </template>
      </template>

      <!-- ── 모드 2: 전체 보기 ── -->
      <template v-else>
        <div class="wf-allbar">
          <button type="button" class="wf-btn" @click="view = 'mine'">← 내 집</button>
          <div class="wf-allbar__right">
            <select v-if="months.length > 1" v-model="selectedMonth" class="wf-select" aria-label="정산 월">
              <option v-for="m in months" :key="m.yearMonth" :value="m.yearMonth">{{ m.yearMonth }}</option>
            </select>
            <span v-if="saving" class="wf-saving">저장 중…</span>
            <button v-if="me.isManager" type="button" class="wf-btn" :disabled="saving" @click="createNext">＋ 새 달</button>
          </div>
        </div>

        <section v-if="!statement" class="wf-empty">아직 정산표가 없어요.</section>

        <template v-else>
          <!-- 요약 -->
          <section class="wf-summary">
            <h2 class="wf-summary__title">{{ statement.yearMonth }} 요금내역서</h2>
            <div class="wf-summary__grid">
              <label class="wf-field">
                <span>총 수도요금 (원)</span>
                <input v-model.number="statement.totalWaterFee" type="number" class="wf-input" :readonly="!me.isManager" @change="me.isManager && saveG('totalWaterFee')" />
              </label>
              <label class="wf-field">
                <span>공동전기 (원)</span>
                <input v-model.number="statement.commonElectricity" type="number" class="wf-input" :readonly="!me.isManager" @change="me.isManager && saveG('commonElectricity')" />
              </label>
              <label class="wf-field">
                <span>수도국 총사용량 (톤)</span>
                <input v-model.number="statement.bureauTotalTons" type="number" class="wf-input" :readonly="!me.isManager" @change="me.isManager && saveG('bureauTotalTons')" />
              </label>
              <label class="wf-field">
                <span>계단청소 (라인당, 원)</span>
                <input v-model.number="statement.stairCleaningFee" type="number" class="wf-input" :readonly="!me.isManager" @change="me.isManager && saveG('stairCleaningFee')" />
              </label>
              <div class="wf-field wf-field--calc"><span>1톤당 (원)</span><strong>{{ dec1(statement.perTon) }}</strong></div>
              <div class="wf-field wf-field--calc"><span>검침 총사용량 (톤)</span><strong>{{ statement.meteredTons }}</strong></div>
              <div class="wf-field wf-field--calc"><span>수도국과의 차이 (톤)</span><strong>{{ statement.bureauDiff }}</strong></div>
              <label v-if="me.isManager" class="wf-field">
                <span>반장 호수</span>
                <select class="wf-input" :value="statement.managerUnit" @change="changeManager">
                  <option v-for="u in UNIT_NUMBERS" :key="u" :value="u">{{ u }}호</option>
                </select>
              </label>
            </div>
          </section>

          <!-- 표 -->
          <div class="wf-table-wrap">
            <table class="wf-table">
              <thead>
                <tr>
                  <th>호수</th><th>이전검침</th><th>현재검침</th><th>사용량<br />(t)</th>
                  <th>수도료</th><th>수고비</th><th>전기/계단</th><th>감면</th><th>납입액</th><th>가구수</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in statement.rows" :key="row.unitNo" :class="{ 'is-manager': row.isManager, 'is-me': row.unitNo === me.unitNo }">
                  <th scope="row">{{ row.unitNo }}<span v-if="row.isManager" class="wf-tag">반장</span></th>
                  <template v-if="me.isManager">
                    <td><input v-model.number="row.prevReading" type="number" class="wf-cell" @change="saveU(row, 'prevReading')" /></td>
                    <td><input v-model.number="row.currReading" type="number" class="wf-cell" @change="saveU(row, 'currReading')" /></td>
                  </template>
                  <template v-else>
                    <td class="wf-num">{{ row.prevReading }}</td>
                    <td class="wf-num">{{ row.currReading }}</td>
                  </template>
                  <td class="wf-num">{{ row.usage }}</td>
                  <td class="wf-num">{{ won(row.water) }}</td>
                  <td class="wf-num">{{ won(row.labor) }}</td>
                  <td class="wf-num">{{ won(row.elecStair) }}</td>
                  <td v-if="me.isManager"><input v-model.number="row.discount" type="number" class="wf-cell" @change="saveU(row, 'discount')" /></td>
                  <td v-else class="wf-num">{{ won(row.discount) }}</td>
                  <td class="wf-num wf-pay">{{ won(row.payment) }}</td>
                  <td v-if="me.isManager"><input v-model.number="row.households" type="number" class="wf-cell wf-cell--sm" @change="saveU(row, 'households')" /></td>
                  <td v-else class="wf-num">{{ row.households }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">합계</th><td /><td />
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
          <p v-if="me.isManager" class="wf-hint">검침값·감면·가구수를 고치면 자동 저장되고 나머지는 자동 계산돼요.</p>

          <!-- 관리자 도구: 아이디 초기화 -->
          <section v-if="me.isManager" class="wf-mgrtools">
            <h3 class="wf-mgrtools__title">세대 아이디 초기화</h3>
            <p class="wf-muted">아이디를 잊은 세대를 초기화하면, 그 세대가 새 이름으로 다시 등록할 수 있어요.</p>
            <div class="wf-mgrtools__row">
              <select v-model="resetUnit" class="wf-select">
                <option value="" disabled>호수 선택</option>
                <option v-for="u in UNIT_NUMBERS" :key="u" :value="u">{{ u }}호</option>
              </select>
              <button type="button" class="wf-btn" :disabled="!resetUnit || saving" @click="doReset">아이디 초기화</button>
            </div>
          </section>
        </template>
      </template>
    </main>
  </div>
</template>

<style scoped>
.wf-main { max-width: 1000px; margin: 0 auto; padding: var(--space-lg); }

.wf-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: var(--space-base); margin-bottom: var(--space-lg); flex-wrap: wrap;
}
.wf-title { margin: 0; font-size: 22px; font-weight: 700; color: var(--ink); }
.wf-who { display: flex; align-items: center; gap: var(--space-sm); }
.wf-who__name { font-size: 15px; font-weight: 600; color: var(--ink); }

.wf-error { margin: 0 0 var(--space-sm); font-size: 14px; color: var(--error); }
.wf-muted { color: var(--muted); font-size: 14px; }

.wf-btn {
  padding: 8px 14px; border: 1px solid var(--hairline); border-radius: 8px;
  background: var(--canvas); color: var(--body-text); font-size: 13px; font-weight: 600; cursor: pointer;
}
.wf-btn:hover:not(:disabled) { border-color: var(--ink); }
.wf-btn:disabled { opacity: 0.5; cursor: default; }
.wf-btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }
.wf-btn--ghost { background: transparent; }

.wf-empty {
  padding: var(--space-2xl); text-align: center; color: var(--muted);
  border: 1px dashed var(--hairline); border-radius: 14px;
  display: flex; flex-direction: column; align-items: center; gap: var(--space-base);
}

/* ── 모드 0: 식별 (크게) ── */
.wf-identify {
  max-width: 460px; margin: 4vh auto 0; text-align: center;
}
.wf-identify__title { margin: 0 0 8px; font-size: 26px; font-weight: 800; color: var(--ink); }
.wf-identify__sub { margin: 0 0 var(--space-lg); font-size: 16px; color: var(--body-text); }
.wf-identify__form { display: flex; flex-direction: column; gap: var(--space-base); text-align: left; }
.wf-bigfield { display: flex; flex-direction: column; gap: 6px; font-size: 15px; font-weight: 600; color: var(--ink); }
.wf-biginput {
  padding: 16px; border: 2px solid var(--hairline); border-radius: 12px;
  font-size: 20px; color: var(--ink); background: var(--canvas); outline: none;
}
.wf-biginput:focus { border-color: var(--primary); }
.wf-bigbtn {
  margin-top: 4px; padding: 18px; border: none; border-radius: 12px;
  background: var(--primary); color: #fff; font-size: 20px; font-weight: 700; cursor: pointer;
}
.wf-bigbtn:disabled { opacity: 0.6; cursor: default; }
.wf-bigbtn--save { margin: 0; padding: 16px 24px; white-space: nowrap; }
.wf-bigbtn--outline { background: var(--canvas); color: var(--ink); border: 2px solid var(--hairline); }
.wf-bigbtn--outline:hover { border-color: var(--ink); }
.wf-identify__hint { margin: 4px 0 0; font-size: 13px; color: var(--muted); text-align: center; }

/* ── 모드 1: 내 세대 (크게) ── */
.wf-monthbar { margin-bottom: var(--space-base); }
.wf-monthbar__label { font-size: 16px; font-weight: 700; color: var(--ink); }
.wf-select {
  padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 8px;
  background: var(--canvas); color: var(--ink); font-size: 15px;
}
.wf-mecard {
  padding: var(--space-lg); border: 1px solid var(--hairline-soft);
  border-radius: 18px; background: var(--surface-soft); margin-bottom: var(--space-base);
}
.wf-mecard__unit { margin: 0 0 var(--space-base); font-size: 20px; font-weight: 700; color: var(--ink); }
.wf-mecard__unit strong { font-size: 24px; }
.wf-reading {
  display: flex; gap: var(--space-sm); align-items: flex-end; flex-wrap: wrap;
}
.wf-reading__label { flex-basis: 100%; font-size: 16px; font-weight: 700; color: var(--ink); }
.wf-reading__input {
  flex: 1; min-width: 140px; padding: 16px; border: 2px solid var(--primary); border-radius: 12px;
  font-size: 24px; text-align: right; color: var(--ink); background: var(--canvas); outline: none;
}
.wf-reading__prev { margin: 8px 0 var(--space-base); font-size: 14px; color: var(--muted); }

.wf-mestats { display: flex; gap: var(--space-sm); margin: 0 0 var(--space-base); }
.wf-mestats > div {
  flex: 1; padding: var(--space-base); background: var(--canvas);
  border: 1px solid var(--hairline-soft); border-radius: 12px; text-align: center;
}
.wf-mestats dt { font-size: 13px; color: var(--muted); margin-bottom: 6px; }
.wf-mestats dd { margin: 0; font-size: 22px; font-weight: 700; color: var(--ink); }
.wf-mestats--pay { background: var(--primary) !important; border-color: var(--primary) !important; }
.wf-mestats--pay dt { color: rgba(255,255,255,0.85); }
.wf-mestats--pay dd { color: #fff; }

.wf-medetail { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.wf-medetail li { display: flex; justify-content: space-between; font-size: 14px; color: var(--body-text); padding: 6px 2px; border-bottom: 1px solid var(--hairline-soft); }
.wf-medetail b { font-variant-numeric: tabular-nums; color: var(--ink); }

.wf-hist { margin: var(--space-base) 0; }
.wf-hist__title { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: var(--ink); }
.wf-hist__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.wf-hist__list li {
  display: grid; grid-template-columns: 1fr auto auto; gap: var(--space-base);
  padding: 10px 12px; background: var(--surface-soft); border-radius: 10px; font-size: 14px;
}
.wf-hist__ym { color: var(--muted); }
.wf-hist__use { color: var(--body-text); }
.wf-hist__pay { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }

/* ── 모드 2: 전체 보기 ── */
.wf-allbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); margin-bottom: var(--space-base); }
.wf-allbar__right { display: flex; align-items: center; gap: var(--space-sm); }
.wf-saving { font-size: 12px; color: var(--muted); }

.wf-summary {
  padding: var(--space-base); border: 1px solid var(--hairline-soft);
  border-radius: 14px; background: var(--surface-soft); margin-bottom: var(--space-lg);
}
.wf-summary__title { margin: 0 0 var(--space-base); font-size: 16px; font-weight: 700; color: var(--ink); }
.wf-summary__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-sm); }
.wf-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
.wf-input {
  padding: 8px 10px; border: 1px solid var(--hairline); border-radius: 8px;
  font-size: 14px; color: var(--ink); text-align: right; outline: none; background: var(--canvas);
}
.wf-input:focus { border-color: var(--ink); }
.wf-input[readonly] { background: var(--surface-soft); color: var(--body-text); }
.wf-field--calc { justify-content: space-between; padding: 8px 10px; background: var(--canvas); border: 1px solid var(--hairline-soft); border-radius: 8px; }
.wf-field--calc strong { font-size: 15px; color: var(--ink); }

.wf-table-wrap { overflow-x: auto; }
.wf-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
.wf-table th, .wf-table td { border: 1px solid var(--hairline); padding: 6px 8px; text-align: center; }
.wf-table thead th { background: var(--surface-strong); color: var(--ink); font-weight: 600; font-size: 12px; }
.wf-table tbody th { font-weight: 600; color: var(--ink); background: var(--surface-soft); white-space: nowrap; }
.wf-num { text-align: right; font-variant-numeric: tabular-nums; }
.wf-pay { font-weight: 700; color: var(--ink); }
.wf-cell {
  width: 100%; max-width: 90px; padding: 4px 6px; border: 1px solid transparent; border-radius: 6px;
  font-size: 13px; text-align: right; color: var(--ink); background: var(--canvas); outline: none;
}
.wf-cell:hover { border-color: var(--hairline); }
.wf-cell:focus { border-color: var(--ink); background: var(--surface-soft); }
.wf-cell--sm { max-width: 56px; }
.wf-table tr.is-manager { background: rgba(255, 56, 92, 0.04); }
.wf-table tr.is-me th { box-shadow: inset 3px 0 0 var(--primary); }
.wf-tag { margin-left: 4px; font-size: 10px; color: var(--primary); border: 1px solid var(--primary); border-radius: 6px; padding: 0 4px; }
.wf-table tfoot th, .wf-table tfoot td { background: var(--surface-strong); font-weight: 700; color: var(--ink); }
.wf-hint { margin: var(--space-sm) 0 0; font-size: 12px; color: var(--muted-soft); }

.wf-mgrtools { margin-top: var(--space-lg); padding: var(--space-base); border: 1px solid var(--hairline-soft); border-radius: 12px; }
.wf-mgrtools__title { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: var(--ink); }
.wf-mgrtools__row { display: flex; gap: var(--space-sm); margin-top: var(--space-sm); }

@media (max-width: 640px) {
  .wf-main { padding: var(--space-base); }
  .wf-mestats { flex-direction: column; }
}
</style>
