<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  useWaterFee,
  type Statement,
  type StatementSummary,
  type UnitRow,
  type HistoryRow,
  type ExtraCost,
  type Me,
} from '../../../composables/useWaterFee'

definePageMeta({ layout: false })
useSeoMeta({ title: '중앙그린빌라 수도요금' })
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=Noto+Sans+KR:wght@400;600;800&display=swap' },
  ],
})

const {
  listStatements, getStatement, getUnitHistory, downloadExcel, verifyHousehold, saveMyReading,
  createStatement, saveGlobals, saveUnit, setManager, saveExtraCosts, resetHousehold,
} = useWaterFee()

/** 15세대 */
const UNIT_NUMBERS = [
  '101', '102', '103',
  '201', '202', '203', '204',
  '301', '302', '303', '304',
  '401', '402', '403', '404',
]

const ME_KEY = 'water-fee:me'
type Tab = 'mine' | 'hist' | 'all' | 'manage'

const me = ref<Me | null>(null)
const tab = ref<Tab>('mine')

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

// 내 검침 입력 / 관리 인라인 편집 / 추가비용 초안
const readingInput = ref<number | null>(null)
const editingUnit = ref('')
const extraDraft = ref<ExtraCost[]>([])
const resetUnit = ref('')
const downloading = ref(false)

// 히어로의 "계량기 숫자 적기 ↓" → 입력칸으로 스크롤 + 포커스 (스크롤 컨테이너는 .wf-body)
const readingSec = ref<HTMLElement | null>(null)
const readingEl = ref<HTMLInputElement | null>(null)
const goToReading = () => {
  readingSec.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  readingEl.value?.focus({ preventScroll: true })
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const dec1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ko-KR', { minimumFractionDigits: 1 })
const monthNum = (ym: string) => Number(ym.split('-')[1] ?? 0)

const tabTitle = computed(() => ({ mine: '우리 집', hist: '쓴 물 내역', all: '전체 집', manage: '관리' }[tab.value]))

const myRow = computed<UnitRow | null>(() =>
  me.value && statement.value ? statement.value.rows.find((r) => r.unitNo === me.value!.unitNo) ?? null : null,
)

/** 계량기는 매달 20일에 읽고, 요금은 매달 25일까지 낸다. */
const METER_DAY = 20
const PAY_DUE_DAY = 25

/**
 * 정산서 N월이 청구하는 기간 = (N-2)월 20일 ~ (N-1)월 20일.
 * 수도국 고지서가 두 달 늦게 나오는 탓에 생기는 시차라, 화면에서는 "몇 월 검침"이 아니라
 * 항상 날짜(6월 20일)와 기간(6월 20일 ~ 7월 20일)으로 말한다. 월 이름만 쓰면
 * "8월 요금 = 8월에 쓴 물"로 읽혀서 이 도메인의 유일한 오해가 거기서 생긴다.
 *
 * before=2 → 요금 시작(prevReading) / 1 → 요금 끝(currReading) / 0 → 지금 적는 숫자(thisReading)
 */
const readingDate = (ym: string, before: number): Date => {
  const d = new Date(`${ym}-01T00:00:00`)
  d.setMonth(d.getMonth() - before)
  d.setDate(METER_DAY)
  return d
}
const md = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`
const ymd = (d: Date) => `${d.getFullYear()}년 ${md(d)}`
/** 해가 바뀌면 양쪽에 연도를 붙인다 (2월 정산서 = 2025년 12월 20일 ~ 2026년 1월 20일) */
const fmtRange = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() ? `${md(a)} ~ ${md(b)}` : `${ymd(a)} ~ ${ymd(b)}`

const billStart = computed(() => (statement.value ? readingDate(statement.value.yearMonth, 2) : null))
const billEnd = computed(() => (statement.value ? readingDate(statement.value.yearMonth, 1) : null))
const readDay = computed(() => (statement.value ? readingDate(statement.value.yearMonth, 0) : null))
/** "6월 20일 ~ 7월 20일" — 이번 요금이 청구하는 기간 */
const billPeriod = computed(() => (billStart.value && billEnd.value ? fmtRange(billStart.value, billEnd.value) : ''))
/** "7월 20일 ~ 8월 20일" — 지금 적는 숫자가 만들 다음 달 기간 */
const nextPeriod = computed(() => (billEnd.value && readDay.value ? fmtRange(billEnd.value, readDay.value) : ''))
const billMonth = computed(() => (statement.value ? monthNum(statement.value.yearMonth) : 0))
/** 정산서 다음 달 = 지금 적는 숫자가 요금이 되는 달 */
const nextBillMonth = computed(() => (billMonth.value % 12) + 1)

/**
 * 월 선택기 라벨. 연도는 반드시 남긴다 — 이력이 13개월을 넘으면 "8월"이 두 개가 되어 구분이 안 된다.
 * 기간(6월 20일~7월 20일)은 히어로 주문장에 크게 나오므로 여기선 빼서 헤더 폭을 지킨다.
 */
const monthLabel = (ym: string) => `${ym.split('-')[0]}년 ${monthNum(ym)}월 요금`

/** 새 달 만들기는 항상 '가장 최근 정산서'의 다음 달이다(createNext와 같은 기준) */
const isLatest = computed(() => !!selectedMonth.value && selectedMonth.value === months.value[0]?.yearMonth)
const nextYm = computed(() => nextMonth(months.value[0]?.yearMonth))
const nextYmMonth = computed(() => monthNum(nextYm.value))
/** 이번 달 계량기 숫자를 아직 안 적은 호수 — 반장이 독촉할 대상 */
const pendingThis = computed(() => (statement.value?.rows ?? []).filter((r) => !r.thisEntered).map((r) => r.unitNo))

/** 최근 6개월 막대차트 (오래된→최신) */
const chart = computed(() => {
  const rows = myHistory.value.slice(0, 6).reverse()
  const max = Math.max(1, ...rows.map((r) => r.usage))
  return rows.map((r, i) => ({
    ym: r.yearMonth,
    label: `${monthNum(r.yearMonth)}월`,
    usage: r.usage,
    hPct: Math.max(3, Math.round((r.usage / max) * 100)),
    latest: i === rows.length - 1,
  }))
})

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
  readingInput.value = myRow.value ? (myRow.value.thisReading || null) : null
  extraDraft.value = (statement.value.extraCosts ?? []).map((c) => ({ name: c.name, amount: c.amount, excludedUnits: [...(c.excludedUnits ?? [])] }))
  editingUnit.value = ''
  exclOpen.value = -1
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
    tab.value = 'mine'
    readingInput.value = myRow.value ? (myRow.value.thisReading || null) : null
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
  tab.value = 'mine'
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
const saveU = async (row: UnitRow, field: 'prevReading' | 'currReading' | 'households' | 'discount' | 'thisReading') => {
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
    me.value = { ...me.value, isManager: updated.managerUnit === me.value.unitNo }
    localStorage.setItem(ME_KEY, JSON.stringify(me.value))
  } catch (e2: unknown) { errorText.value = errMsg(e2, '반장 변경 실패') } finally { saving.value = false }
}

// ── 추가비용 ──
const exclOpen = ref(-1) // 제외 세대 편집 패널이 열린 항목 인덱스
const addExtra = () => extraDraft.value.push({ name: '', amount: 0, excludedUnits: [] })
const removeExtra = async (i: number) => {
  extraDraft.value.splice(i, 1)
  if (exclOpen.value === i) exclOpen.value = -1
  await commitExtra()
}
const toggleExclPanel = (i: number) => { exclOpen.value = exclOpen.value === i ? -1 : i }
const toggleUnitExcl = async (i: number, unitNo: string) => {
  const c = extraDraft.value[i]
  const ex = c.excludedUnits ?? (c.excludedUnits = [])
  const at = ex.indexOf(unitNo)
  if (at >= 0) ex.splice(at, 1)
  else ex.push(unitNo)
  await commitExtra()
}
const commitExtra = async () => {
  if (!me.value || !statement.value) return
  const clean = extraDraft.value
    .filter((c) => c.name.trim() !== '')
    .map((c) => ({ name: c.name.trim(), amount: Number(c.amount) || 0, excludedUnits: c.excludedUnits ?? [] }))
  saving.value = true
  try {
    statement.value = await saveExtraCosts(statement.value.yearMonth, me.value, clean)
  } catch (e: unknown) { errorText.value = errMsg(e, '추가비용 저장 실패') } finally { saving.value = false }
}

const doReset = async () => {
  if (!me.value || !resetUnit.value) return
  const target = resetUnit.value
  if (!confirm(`${target}호의 이름 등록을 지울까요? ${target}호는 다음에 들어올 때 이름을 다시 넣어야 해요. 계량기 숫자와 요금은 그대로 남아요.`)) return
  saving.value = true
  try {
    await resetHousehold(target, me.value)
    resetUnit.value = ''
    errorText.value = ''
    if (target === me.value.unitNo) { alert('지웠어요. 새 이름으로 다시 들어와 주세요.'); logout() }
    else alert('지웠어요.')
  } catch (e: unknown) { errorText.value = errMsg(e, '초기화 실패') } finally { saving.value = false }
}

const doDownload = async () => {
  if (!statement.value) return
  downloading.value = true
  errorText.value = ''
  try {
    await downloadExcel(statement.value.yearMonth, me.value ?? undefined)
  } catch {
    errorText.value = '엑셀 다운로드에 실패했어요.'
  } finally {
    downloading.value = false
  }
}

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
}
</script>

<template>
  <div class="wf-shell">
    <div class="wf-app">
      <!-- 헤더 -->
      <header class="wf-head">
        <div class="wf-head__l">
          <span class="wf-head__title">{{ me ? tabTitle : '수도요금' }}</span>
        </div>
        <div class="wf-head__r">
          <select v-if="me && months.length" v-model="selectedMonth" class="wf-monthsel" aria-label="어느 달 요금표를 볼지 고르기">
            <option v-for="m in months" :key="m.yearMonth" :value="m.yearMonth">{{ monthLabel(m.yearMonth) }}</option>
          </select>
          <button v-if="me" type="button" class="wf-linkbtn" @click="logout">다른 집</button>
        </div>
      </header>

      <main class="wf-body">
        <p v-if="errorText" class="wf-err" role="alert">{{ errorText }}</p>
        <section v-if="loading" class="wf-note">불러오는 중…</section>

        <!-- ── 식별 ── -->
        <section v-else-if="!me" class="wf-identify">
          <div class="wf-identify__hero">
            <span class="wf-kicker">중앙그린빌라</span>
            <h2 class="wf-identify__title">우리 집<br />수도요금 보기</h2>
            <p class="wf-identify__sub">호수와 이름을 넣어 주세요. 비밀번호는 없어요.</p>
          </div>
          <form class="wf-identify__form" @submit.prevent="submitIdentify">
            <label class="wf-field">
              <span class="wf-field__label">우리 집 호수</span>
              <select v-model="fUnit" class="wf-input wf-input--lg">
                <option value="" disabled>호수를 골라주세요</option>
                <option v-for="u in UNIT_NUMBERS" :key="u" :value="u">{{ u }}호</option>
              </select>
            </label>
            <label class="wf-field">
              <span class="wf-field__label">이름 (또는 아이디)</span>
              <input v-model="fId" type="text" class="wf-input wf-input--lg" placeholder="예: 홍길동" autocomplete="off" />
            </label>
            <p v-if="idError" class="wf-err" role="alert">{{ idError }}</p>
            <button type="submit" class="btn btn-primary wf-btn-lg" :disabled="identifying">
              {{ identifying ? '확인 중…' : '확인' }}
            </button>
            <p class="wf-identify__hint">처음이면 이 이름으로 등록돼요. 다음부터 같은 이름으로 들어와요.</p>
          </form>
        </section>

        <!-- ── 로그인 후 ── -->
        <template v-else>
          <div v-if="statement && !statement.allEntered" class="wf-provisional">
            아직 {{ statement.rows.length }}집 중 <b>{{ statement.enteredCount }}집만</b> {{ md(billEnd!) }} 계량기 숫자를 냈어요.
            나머지 집은 지난달만큼 쓴 걸로 잡아서, <b>금액이 조금 바뀔 수 있어요.</b>
          </div>

          <!-- 우리 집 -->
          <template v-if="tab === 'mine'">
            <section v-if="!statement" class="wf-empty">
              <p class="wf-empty__t">아직 요금표가 없어요.</p>
              <p class="wf-muted">{{ me.isManager ? '‘관리’ 탭에서 새 요금표를 만들어 주세요.' : '반장님이 만들면 여기에 나와요.' }}</p>
            </section>
            <template v-else>
              <!-- 이번에 낼 돈 — 기간을 금액 바로 옆에 붙여 "언제 쓴 물값인가"를 5초 안에 답한다 -->
              <div class="wf-hero">
                <span class="wf-kicker">{{ billMonth }}월 수도요금{{ statement.allEntered ? '' : ' · 아직 확정 전' }}</span>
                <div class="wf-hero__amt"><b>{{ won(myRow?.payment ?? 0) }}</b><span>원</span></div>
                <p class="wf-say">
                  <b>{{ billPeriod }}</b>에<br />쓰신 물값이에요.
                </p>
                <div class="wf-tagrow">
                  <span class="tag tag-accent">{{ myRow?.usage ?? 0 }}톤{{ myRow?.estimated ? ' (예상)' : '' }}</span>
                  <span class="tag tag-outline">{{ PAY_DUE_DAY }}일까지 내주세요</span>
                  <span v-if="myRow?.isManager" class="tag tag-outline">반장</span>
                </div>
                <button v-if="!myRow?.thisEntered" type="button" class="btn btn-primary wf-cta" @click="goToReading">
                  {{ md(readDay!) }} 계량기 숫자 적기 ↓
                </button>
              </div>

              <!-- 헷갈리는 지점을 딱 한 번, 물어볼 만한 자리에서 설명한다 -->
              <details class="wf-why">
                <summary class="wf-why__q">왜 두 달 전에 쓴 물값인가요?</summary>
                <div class="wf-why__a">
                  <p>수도국에서 보내는 고지서가 두 달 늦게 나옵니다.</p>
                  <p>그래서 {{ billMonth }}월 요금에는 {{ billPeriod }}에 쓴 물값이 적혀 있어요.</p>
                  <p>계량기는 매달 {{ METER_DAY }}일에 읽어요. 오늘 적으시는 숫자는 다음 {{ nextBillMonth }}월 요금에 쓰입니다.</p>
                  <p>지금은 {{ billMonth }}월 요금만 내시면 돼요.</p>
                </div>
              </details>

              <!-- 금액의 근거가 되는 계량기 숫자 두 개 (읽기 전용) -->
              <div class="wf-sec wf-reading2">
                <template v-if="myRow?.estimated">
                  <p class="wf-reading2__est">
                    {{ md(billEnd!) }} 계량기 숫자를 아직 못 받아서,
                    지난달만큼(<b>{{ myRow?.usage ?? 0 }}톤</b>) 쓴 걸로 계산했어요.
                  </p>
                </template>
                <template v-else>
                  <p class="wf-reading2__row">
                    <span>{{ md(billStart!) }}</span><b>{{ myRow?.prevReading ?? 0 }}</b>
                    <em aria-hidden="true">→</em>
                    <span>{{ md(billEnd!) }}</span><b>{{ myRow?.currReading ?? 0 }}</b>
                  </p>
                  <p class="wf-reading2__sum">그 사이에 <b>{{ myRow?.usage ?? 0 }}톤</b> 쓰셨어요.</p>
                </template>
              </div>

              <div class="wf-sec">
                <div class="wf-sechead"><span>요금 내역</span></div>
                <div class="wf-line"><span class="wf-line__l">수도료</span><span class="wf-line__v">{{ won(myRow?.water ?? 0) }}원</span></div>
                <!-- 반장은 수고비를 내지 않고 받는다(0원 줄은 뜻이 없어 숨기고, 아래에서 받는 돈으로 보여준다) -->
                <div v-if="!myRow?.isManager" class="wf-line"><span class="wf-line__l">수고비</span><span class="wf-line__v">{{ won(myRow?.labor ?? 0) }}원</span></div>
                <div class="wf-line"><span class="wf-line__l">전기·계단청소</span><span class="wf-line__v">{{ won(myRow?.elecStair ?? 0) }}원</span></div>
                <div v-if="(myRow?.extra ?? 0) > 0" class="wf-line">
                  <span class="wf-line__l">추가비용<em>{{ statement.extraCosts.filter((c) => !(c.excludedUnits ?? []).includes(me.unitNo)).map((c) => c.name).join(', ') }}</em></span>
                  <span class="wf-line__v">{{ won(myRow?.extra ?? 0) }}원</span>
                </div>
                <div v-if="(myRow?.other ?? 0) > 0" class="wf-line"><span class="wf-line__l">기타</span><span class="wf-line__v">{{ won(myRow?.other ?? 0) }}원</span></div>
                <div v-if="(myRow?.discount ?? 0) > 0" class="wf-line"><span class="wf-line__l">깎아드린 금액</span><span class="wf-line__v">−{{ won(myRow?.discount ?? 0) }}원</span></div>
                <div v-if="myRow?.isManager" class="wf-line">
                  <span class="wf-line__l">수고비로 받은 돈<em>다른 {{ statement.rows.length - 1 }}집이 내신 수고비예요</em></span>
                  <span class="wf-line__v">−{{ won(statement.totalLaborFee) }}원</span>
                </div>
                <div class="wf-line wf-line--total"><span class="wf-line__l">내실 돈</span><span class="wf-line__total">{{ won(myRow?.payment ?? 0) }}원</span></div>
              </div>

              <!-- 절취선 — 위는 이미 정해진 이번 요금, 아래는 다음 달 요금을 만들 숫자 -->
              <p class="wf-cut"><span aria-hidden="true">✂</span> 여기부터는 <b>다음 {{ nextBillMonth }}월 요금</b>을 만들려고 지금 적는 숫자예요.</p>

              <div ref="readingSec" class="wf-sec wf-ask">
                <h2 class="wf-ask__t">{{ md(readDay!) }} 계량기 숫자를 적어 주세요</h2>
                <div class="wf-readrow">
                  <label class="wf-sr" for="wf-reading">{{ md(readDay!) }} 계량기 숫자</label>
                  <input
                    id="wf-reading" ref="readingEl" v-model.number="readingInput"
                    type="number" inputmode="numeric" class="wf-readinput" placeholder="예: 145"
                  />
                  <button type="button" class="btn btn-primary wf-savebtn" :disabled="saving" @click="submitReading">
                    {{ saving ? '저장 중' : '저장' }}
                  </button>
                </div>
                <p class="wf-readhint">
                  지금 계량기에 보이는 숫자를 그대로 적으시면 돼요.<br />
                  <template v-if="myRow?.currReading">지난 {{ md(billEnd!) }}에는 {{ myRow.currReading }}이었어요.<br /></template>
                  여기 적는 숫자는 <b>다음 {{ nextBillMonth }}월 요금</b>({{ nextPeriod }} 사용분)에 쓰여요.
                  위의 {{ billMonth }}월 요금은 바뀌지 않아요.
                </p>
                <p v-if="myRow?.thisEntered" class="wf-done">
                  ✓ {{ md(readDay!) }} 계량기 숫자 <b>{{ myRow.thisReading }}</b>, 잘 받았어요.
                  고치시려면 다시 적고 저장하시면 돼요.
                </p>
              </div>

              <div v-if="myHistory.length > 1" class="wf-sec">
                <div class="wf-sechead">
                  <span>우리 집이 낸 돈</span><button type="button" class="wf-linkbtn" @click="tab = 'hist'">전체보기</button>
                </div>
                <div v-for="h in myHistory.slice(0, 3)" :key="h.yearMonth" class="wf-line">
                  <span class="wf-line__l">{{ monthNum(h.yearMonth) }}월 요금<em>{{ h.usage }}톤</em></span>
                  <span class="wf-line__v">{{ won(h.payment) }}원</span>
                </div>
              </div>
            </template>
          </template>

          <!-- 내역 -->
          <template v-else-if="tab === 'hist'">
            <section v-if="!myHistory.length" class="wf-empty"><p class="wf-muted">아직 내역이 없어요.</p></section>
            <template v-else>
              <div class="wf-sec">
                <div class="wf-sechead"><span>달마다 쓴 물</span><span class="wf-kicker">최근 {{ chart.length }}개월 · 톤</span></div>
                <p class="wf-chart__cap">막대 하나가 요금표 한 장이에요. 예를 들어 {{ billMonth }}월 요금은 {{ billPeriod }}에 쓴 물이에요.</p>
                <div class="wf-chart">
                  <div v-for="c in chart" :key="c.ym" class="wf-chart__col">
                    <div class="wf-chart__val" :class="{ 'is-latest': c.latest }">{{ c.usage }}</div>
                    <div class="wf-chart__bar" :class="{ 'is-latest': c.latest }" :style="{ height: c.hPct + '%' }" />
                  </div>
                </div>
                <div class="wf-chart__labels">
                  <div v-for="c in chart" :key="c.ym" class="wf-chart__lb" :class="{ 'is-latest': c.latest }">{{ c.label }}</div>
                </div>
              </div>
              <div class="wf-sec">
                <div v-for="h in myHistory" :key="h.yearMonth" class="wf-line">
                  <span class="wf-line__l">{{ monthNum(h.yearMonth) }}월 요금<em>{{ h.usage }}톤</em></span>
                  <span class="wf-line__v">{{ won(h.payment) }}원</span>
                </div>
              </div>
            </template>
          </template>

          <!-- 전체 세대 -->
          <template v-else-if="tab === 'all'">
            <section v-if="!statement" class="wf-empty"><p class="wf-muted">아직 요금표가 없어요.</p></section>
            <template v-else>
              <p class="wf-allcap">
                아래 사용량과 금액은 모두 <b>{{ billPeriod }}</b>에 쓴 물 기준이에요.
              </p>
              <div class="wf-stats">
                <div class="wf-stat"><span class="wf-kicker">집 수</span><div class="wf-stat__v">{{ statement.rows.length }}</div></div>
                <div class="wf-stat"><span class="wf-kicker">다 같이 쓴 물</span><div class="wf-stat__v">{{ statement.meteredTons }}<em>톤</em></div></div>
                <div class="wf-stat"><span class="wf-kicker">모두 낼 돈</span><div class="wf-stat__v wf-stat__v--sm">{{ won(statement.totals.payment) }}</div></div>
              </div>

              <div class="wf-toolbar">
                <button type="button" class="btn btn-secondary" :disabled="downloading" @click="doDownload">
                  {{ downloading ? '엑셀 만드는 중…' : '⬇ 엑셀 내려받기' }}
                </button>
                <span v-if="saving" class="wf-saving">저장 중…</span>
              </div>

              <div class="wf-units">
                <div class="wf-units__head">
                  <span>집</span><span class="wf-units__ru">쓴 물</span><span class="wf-units__rf">낼 돈</span>
                </div>
                <template v-for="row in statement.rows" :key="row.unitNo">
                  <component
                    :is="me.isManager ? 'button' : 'div'"
                    class="wf-unit"
                    :class="{ 'is-mine': row.unitNo === me.unitNo, 'is-open': editingUnit === row.unitNo, 'is-btn': me.isManager }"
                    @click="me.isManager && (editingUnit = editingUnit === row.unitNo ? '' : row.unitNo)"
                  >
                    <span class="wf-unit__name">
                      {{ row.unitNo }}호
                      <span v-if="row.unitNo === me.unitNo" class="tag tag-accent">우리집</span>
                      <span v-if="row.isManager" class="tag tag-outline">반장</span>
                      <span v-if="row.estimated" class="wf-est">예상</span>
                    </span>
                    <span class="wf-unit__u" :class="{ 'is-est': row.estimated }">{{ row.usage }}톤</span>
                    <span class="wf-unit__f" :class="{ 'is-est': row.estimated }">{{ won(row.payment) }}원</span>
                  </component>
                  <div v-if="me.isManager && editingUnit === row.unitNo" :key="row.unitNo + '-e'" class="wf-edit">
                    <p class="wf-edit__cap">이번 {{ billMonth }}월 요금이 청구하는 기간 — 두 숫자의 차이가 요금이 돼요.</p>
                    <div class="wf-edit__pair">
                      <label class="wf-field"><span class="wf-field__label">{{ md(billStart!) }} 계량기</span>
                        <input v-model.number="row.prevReading" type="number" class="wf-input" @change="saveU(row, 'prevReading')" /></label>
                      <label class="wf-field"><span class="wf-field__label">{{ md(billEnd!) }} 계량기</span>
                        <input v-model.number="row.currReading" type="number" class="wf-input" @change="saveU(row, 'currReading')" /></label>
                    </div>
                    <p class="wf-edit__usage">
                      <template v-if="row.estimated">아직 {{ md(billEnd!) }} 숫자를 안 받아서, 지난달만큼 <b>{{ row.usage }}톤</b>으로 잡았어요.</template>
                      <template v-else>→ 이번 {{ billMonth }}월 요금 사용량 <b>{{ row.usage }}톤</b></template>
                    </p>

                    <p class="wf-edit__cap wf-edit__cap--next">다음 {{ nextBillMonth }}월 요금에 쓰일 숫자 — 주민이 직접 적는 칸이에요.</p>
                    <label class="wf-field"><span class="wf-field__label">{{ md(readDay!) }} 계량기 {{ row.thisEntered ? '· 적음' : '· 아직 안 적음' }}</span>
                      <input v-model.number="row.thisReading" type="number" class="wf-input" @change="saveU(row, 'thisReading')" /></label>

                    <div class="wf-edit__pair">
                      <label class="wf-field"><span class="wf-field__label">깎아주는 금액 (원)</span>
                        <input v-model.number="row.discount" type="number" class="wf-input" @change="saveU(row, 'discount')" /></label>
                      <label class="wf-field"><span class="wf-field__label">가구수</span>
                        <input v-model.number="row.households" type="number" class="wf-input" @change="saveU(row, 'households')" /></label>
                    </div>
                  </div>
                </template>
              </div>
              <p v-if="me.isManager" class="wf-hint">
                집을 누르면 계량기 숫자·깎아주는 금액·가구수를 고칠 수 있어요.
                주민이 적은 {{ md(readDay!) }} 숫자는 웬만하면 그대로 두세요.
              </p>
            </template>
          </template>

          <!-- 관리 (반장) -->
          <template v-else>
            <section v-if="!statement" class="wf-empty">
              <p class="wf-empty__t">아직 요금표가 없어요.</p>
              <button type="button" class="btn btn-primary wf-btn-lg" :disabled="saving" @click="createNext">첫 요금표 만들기</button>
            </section>
            <template v-else>
              <div class="wf-sec">
                <div class="wf-sechead"><span>{{ billMonth }}월 요금표 금액</span><span class="wf-kicker">1톤당 {{ dec1(statement.perTon) }}원</span></div>
                <p class="wf-seccap">수도국이 보낸 고지서({{ billPeriod }} 사용분)를 보고 그대로 적어 주세요.</p>
                <label class="wf-field wf-field--row"><span class="wf-field__label">고지서 금액 (원)</span>
                  <input v-model.number="statement.totalWaterFee" type="number" class="wf-input wf-input--r" @change="saveG('totalWaterFee')" /></label>
                <label class="wf-field wf-field--row"><span class="wf-field__label">공동전기 (원)</span>
                  <input v-model.number="statement.commonElectricity" type="number" class="wf-input wf-input--r" @change="saveG('commonElectricity')" /></label>
                <label class="wf-field wf-field--row"><span class="wf-field__label">고지서의 총 사용량 (톤)</span>
                  <input v-model.number="statement.bureauTotalTons" type="number" class="wf-input wf-input--r" @change="saveG('bureauTotalTons')" /></label>
                <label class="wf-field wf-field--row"><span class="wf-field__label">계단청소 (한 라인당, 원)</span>
                  <input v-model.number="statement.stairCleaningFee" type="number" class="wf-input wf-input--r" @change="saveG('stairCleaningFee')" /></label>
                <div class="wf-line"><span class="wf-line__l">{{ statement.rows.length }}집 계량기 합계 / 고지서와 차이</span><span class="wf-line__v">{{ statement.meteredTons }} / {{ statement.bureauDiff }}톤</span></div>
              </div>

              <div class="wf-sec">
                <div class="wf-sechead"><span>추가비용</span><span v-if="statement.totalExtra > 0" class="wf-kicker">합계 {{ won(statement.totalExtra) }}원</span></div>
                <div v-for="(c, i) in extraDraft" :key="i" class="wf-extraitem">
                  <div class="wf-extrarow">
                    <input v-model="c.name" type="text" class="wf-input" placeholder="항목명 (예: 소독비)" @change="commitExtra" />
                    <input v-model.number="c.amount" type="number" class="wf-input wf-input--amt" placeholder="금액" @change="commitExtra" />
                    <button type="button" class="wf-x" :disabled="saving" aria-label="삭제" @click="removeExtra(i)">✕</button>
                  </div>
                  <button type="button" class="wf-excl-btn" @click="toggleExclPanel(i)">
                    제외 세대 {{ (c.excludedUnits?.length || 0) }}곳
                    <span v-if="(c.excludedUnits?.length || 0)" class="wf-excl-list">· {{ c.excludedUnits!.join(', ') }}</span>
                    <span class="wf-excl-caret">{{ exclOpen === i ? '▲' : '▾' }}</span>
                  </button>
                  <div v-if="exclOpen === i" class="wf-excl-grid">
                    <button
                      v-for="u in UNIT_NUMBERS" :key="u" type="button"
                      class="wf-excl-cell" :class="{ 'is-excl': (c.excludedUnits ?? []).includes(u) }"
                      :disabled="saving" @click="toggleUnitExcl(i, u)"
                    >{{ u }}</button>
                  </div>
                </div>
                <button type="button" class="btn btn-secondary wf-add" :disabled="saving" @click="addExtra">＋ 추가비용 항목</button>
              </div>

              <div class="wf-sec">
                <div class="wf-sechead"><span>요금표 설정</span></div>
                <label class="wf-field wf-field--row"><span class="wf-field__label">반장 호수</span>
                  <select class="wf-input wf-input--r" :value="statement.managerUnit" @change="changeManager">
                    <option v-for="u in UNIT_NUMBERS" :key="u" :value="u">{{ u }}호</option>
                  </select></label>
                <div class="wf-field wf-field--row"><span class="wf-field__label">이름 등록 지우기</span>
                  <div class="wf-resetrow">
                    <select v-model="resetUnit" class="wf-input">
                      <option value="" disabled>호수</option>
                      <option v-for="u in UNIT_NUMBERS" :key="u" :value="u">{{ u }}호</option>
                    </select>
                    <button type="button" class="btn btn-secondary" :disabled="!resetUnit || saving" @click="doReset">지우기</button>
                  </div>
                </div>
              </div>

              <div class="wf-sec wf-sec--actions">
                <div class="wf-sechead"><span>다음 달 요금표 만들기</span></div>
                <p class="wf-thisprog">
                  <b>{{ md(readDay!) }} 계량기 숫자</b>는 {{ statement.rows.length }}집 중 {{ statement.thisEnteredCount }}집이 적었어요.
                </p>
                <p v-if="pendingThis.length" class="wf-pending">아직 안 적은 집: {{ pendingThis.join(', ') }}호</p>
                <p v-else class="wf-thisprog">모두 적었어요. 다음 요금표를 만드셔도 됩니다.</p>

                <!-- 새 달은 항상 '가장 최근 요금표'의 다음 달로 만들어진다(createNext 기준) -->
                <p class="wf-nextinfo">
                  {{ nextYmMonth }}월 요금표는 <b>{{ nextPeriod }}</b>에 쓴 물값을 계산해요.
                  지금 모으는 {{ md(readDay!) }} 계량기 숫자가 그대로 넘어갑니다.
                </p>
                <p v-if="pendingThis.length" class="wf-warn">
                  지금 만들면 아직 안 적은 {{ pendingThis.length }}집은 지난달만큼 쓴 걸로 잡혀요.
                  나중에 숫자를 넣으면 금액이 다시 맞춰집니다.
                </p>
                <p v-if="!isLatest" class="wf-warn">
                  지난 요금표를 보고 계세요. 새로 만들려면 위에서 가장 최근 달({{ months[0]?.yearMonth }})을 골라 주세요.
                </p>
                <button type="button" class="btn btn-secondary wf-btn-lg" :disabled="saving || !isLatest" @click="createNext">
                  ＋ {{ nextYmMonth }}월 요금표 만들기
                </button>
                <button type="button" class="btn btn-secondary wf-btn-lg" :disabled="downloading" @click="doDownload">
                  {{ downloading ? '엑셀 만드는 중…' : '⬇ 엑셀 내려받기' }}
                </button>
              </div>
            </template>
          </template>
        </template>
      </main>

      <!-- 하단 탭 -->
      <nav v-if="me" class="wf-tabs">
        <button type="button" class="wf-tab" :class="{ 'is-on': tab === 'mine' }" @click="tab = 'mine'">우리집</button>
        <button type="button" class="wf-tab" :class="{ 'is-on': tab === 'hist' }" @click="tab = 'hist'">내역</button>
        <button type="button" class="wf-tab" :class="{ 'is-on': tab === 'all' }" @click="tab = 'all'">전체</button>
        <button v-if="me.isManager" type="button" class="wf-tab" :class="{ 'is-on': tab === 'manage' }" @click="tab = 'manage'">관리</button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* ── Modernist 디자인 토큰 (Claude Design: modernist) ── */
.wf-app {
  --bg: #f3f2f2;
  --surface: #eae9e9;
  --ink: #201e1d;
  --accent: #ec3013;
  --divider: color-mix(in srgb, #201e1d 40%, transparent);
  --n200: #eae7e7;
  --n300: #d7d3d3;
  --n400: #bab6b6;
  --n600: #7d7979;
  --n700: #605d5d;
  --a100: #fff2ef;
  --a600: #dd2b0f;
  --a700: #ae1800;
  --a800: #7c1405;
  --head: "Archivo", "Noto Sans KR", system-ui, sans-serif;
  --body: "Archivo", "Noto Sans KR", system-ui, sans-serif;
}

.wf-shell {
  min-height: 100dvh;
  background: #e4e2e2;
  display: flex;
  justify-content: center;
}
.wf-app {
  width: 100%;
  max-width: 460px;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--body);
  font-size: 15px;
  line-height: 1.5;
}
.wf-app :deep(*) { box-sizing: border-box; }
@media (min-width: 520px) {
  .wf-shell { padding: 28px 16px; align-items: flex-start; }
  .wf-app { min-height: min(920px, calc(100dvh - 56px)); border: 1px solid var(--divider); box-shadow: 0 12px 40px color-mix(in srgb, #201e1d 18%, transparent); }
}

/* 공통 요소 */
.wf-kicker { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--n600); font-weight: 600; }
.wf-muted { color: var(--n700); font-size: 14px; margin: 0; }
.wf-err { margin: 12px 20px; padding: 10px 14px; background: var(--a100); color: var(--a800); font-size: 13px; font-weight: 600; border-left: 3px solid var(--accent); }
.wf-note { padding: 40px 20px; text-align: center; color: var(--n600); }
.wf-linkbtn { border: none; background: none; padding: 0; font-family: var(--head); font-weight: 800; font-size: 12px; color: var(--accent); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.wf-saving { font-size: 12px; color: var(--n600); }

/* 헤더 */
.wf-head {
  position: sticky; top: 0; z-index: 5;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 10px;
  padding: calc(env(safe-area-inset-top) + 18px) 20px 12px;
  background: var(--bg); border-bottom: 2px solid var(--divider);
}
.wf-head__l { display: flex; align-items: baseline; gap: 9px; min-width: 0; }
.wf-head__title { font-family: var(--head); font-weight: 800; font-size: 21px; letter-spacing: -0.015em; white-space: nowrap; }
.wf-head__r { display: flex; align-items: center; gap: 12px; }
.wf-monthsel {
  font-family: var(--head); font-weight: 600; font-size: 12px; color: var(--n700);
  background: var(--bg); border: 1px solid var(--divider); border-radius: 0; padding: 5px 8px; cursor: pointer;
  max-width: 148px; /* 긴 옵션 텍스트가 sticky 헤더를 밀어내지 않게 */
}
.wf-head__r .wf-linkbtn { white-space: nowrap; }

/* 바디 */
.wf-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.wf-empty { padding: 48px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.wf-empty__t { font-family: var(--head); font-weight: 800; font-size: 16px; margin: 0; }

/* 식별 */
.wf-identify { padding: 8px 20px 32px; }
.wf-identify__hero { padding: 28px 0; border-bottom: 2px solid var(--divider); }
.wf-identify__title { font-family: var(--head); font-weight: 800; font-size: 32px; line-height: 1.12; letter-spacing: -0.02em; margin: 10px 0 0; }
.wf-identify__sub { margin: 10px 0 0; font-size: 14px; color: var(--n700); }
.wf-identify__form { display: flex; flex-direction: column; gap: 16px; padding-top: 24px; }
.wf-identify__hint { margin: 0; font-size: 12px; color: var(--n600); }

/* 필드/인풋 */
.wf-field { display: flex; flex-direction: column; gap: 6px; }
.wf-field__label { font-size: 12px; color: var(--n700); font-weight: 600; }
.wf-input {
  width: 100%; min-height: 40px; padding: 8px 12px; font: inherit; font-size: 15px;
  color: var(--ink); background: var(--surface); border: 1px solid var(--divider); border-radius: 0;
  caret-color: var(--accent); outline: none;
}
.wf-input:focus-visible { border-color: var(--accent); }
.wf-input--lg { min-height: 52px; font-size: 18px; }
.wf-input--r { text-align: right; }
.wf-field--row { flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; }
.wf-field--row .wf-field__label { flex: none; }
.wf-field--row .wf-input { max-width: 150px; }

/* 버튼 */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; font-family: var(--head); font-weight: 800; font-size: 14px; line-height: 1.2; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 0; padding: 10px 16px; }
.btn:disabled { opacity: 0.5; cursor: default; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--a600); }
.btn-primary:active:not(:disabled) { background: var(--a700); }
.btn-secondary { border-color: var(--divider); }
.btn-secondary:hover:not(:disabled) { background: color-mix(in srgb, var(--ink) 7%, transparent); }
.wf-btn-lg { min-height: 52px; font-size: 16px; width: 100%; }

/* 태그 */
.tag { display: inline-flex; align-items: center; font-size: 11px; letter-spacing: 0.02em; padding: 3px 9px; border-radius: 0; font-weight: 600; }
.tag-accent { background: var(--a100); color: var(--a800); }
.tag-outline { border: 1px solid var(--accent); color: var(--accent); }

/* 잠정/예상 */
.wf-provisional { padding: 12px 20px; background: var(--a100); color: var(--a800); font-size: 13px; line-height: 1.55; border-bottom: 2px solid var(--divider); }
.wf-provisional b { font-weight: 800; }
.wf-est { font-size: 10px; font-weight: 700; letter-spacing: 0.02em; color: var(--n600); border: 1px dashed var(--n400); padding: 1px 5px; }
.wf-unit__u.is-est, .wf-unit__f.is-est { color: var(--n600); }

/* 우리집 - 히어로 */
.wf-hero { padding: 24px 20px; border-bottom: 2px solid var(--divider); }
.wf-hero__amt { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; }
.wf-hero__amt b { font-family: var(--head); font-weight: 800; font-size: 44px; line-height: 1; letter-spacing: -0.02em; }
.wf-hero__amt span { font-family: var(--head); font-weight: 800; font-size: 20px; }
.wf-tagrow { display: flex; gap: 6px; margin-top: 14px; }

/* 주문장 — "언제 쓴 물값인가"에 5초 안에 답하는 한 줄. 금액 바로 아래가 제자리다. */
.wf-say { margin: 14px 0 0; font-family: var(--head); font-size: 19px; line-height: 1.4; letter-spacing: -0.01em; }
.wf-say b { font-weight: 800; color: var(--a700); text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }
.wf-cta { width: 100%; min-height: 52px; margin-top: 16px; font-size: 16px; }

/* 왜 두 달 전 물값인가 — 평소엔 한 줄, 궁금할 때만 펼친다 */
.wf-why { border-bottom: 2px solid var(--divider); }
.wf-why__q { padding: 15px 20px; font-family: var(--head); font-weight: 800; font-size: 15px; color: var(--a700); cursor: pointer; list-style: none; }
.wf-why__q::-webkit-details-marker { display: none; }
.wf-why__q::after { content: " ▾"; font-size: 11px; }
.wf-why[open] .wf-why__q::after { content: " ▴"; }
.wf-why__q:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.wf-why__a { padding: 0 20px 18px; }
.wf-why__a p { margin: 0 0 10px; font-size: 15px; line-height: 1.6; color: var(--n700); }
.wf-why__a p:last-child { margin-bottom: 0; }

/* 금액의 근거가 되는 계량기 숫자 두 개 */
.wf-reading2 { gap: 4px; }
.wf-reading2__row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; margin: 0; font-size: 14px; color: var(--n700); }
.wf-reading2__row b { font-family: var(--head); font-size: 19px; color: var(--ink); }
.wf-reading2__row em { font-style: normal; color: var(--n600); margin: 0 2px; }
.wf-reading2__sum { margin: 6px 0 0; font-size: 15px; }
.wf-reading2__sum b, .wf-reading2__est b { font-family: var(--head); font-weight: 800; }
.wf-reading2__est { margin: 0; font-size: 14px; line-height: 1.55; color: var(--n700); }

/* 절취선 — 위(확정된 이번 요금)와 아래(다음 달용 숫자)를 물리적으로 가른다 */
.wf-cut {
  margin: 0; padding: 14px 20px; font-size: 13px; line-height: 1.5; color: var(--n700);
  background: var(--surface); border-top: 2px dashed var(--n400); border-bottom: 2px dashed var(--n400);
}
.wf-cut b { font-weight: 800; color: var(--ink); }
.wf-cut span { margin-right: 6px; }

/* 계량기 입력 */
.wf-ask__t { margin: 0 0 4px; font-family: var(--head); font-weight: 800; font-size: 18px; line-height: 1.35; letter-spacing: -0.01em; }
.wf-done { margin: 10px 0 0; padding: 10px 12px; background: var(--a100); font-size: 13.5px; line-height: 1.5; color: var(--a800); }
.wf-done b { font-family: var(--head); font-weight: 800; }

/* 반장 편집 — 세 숫자가 한꺼번에 보이는 곳이라 구간 설명을 붙인다 */
.wf-edit__cap { grid-column: 1 / -1; margin: 0 4px; font-size: 12.5px; line-height: 1.5; font-weight: 600; color: var(--n700); }
.wf-edit__cap--next { margin-top: 6px; padding-top: 10px; border-top: 1px dashed var(--n400); }
.wf-edit__pair { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wf-edit__usage { grid-column: 1 / -1; margin: 0 4px; font-size: 13px; color: var(--a700); }
.wf-edit__usage b { font-family: var(--head); font-weight: 800; }

/* 안내 문구 */
.wf-allcap { margin: 0; padding: 13px 20px; font-size: 13.5px; line-height: 1.5; color: var(--n700); border-bottom: 2px solid var(--divider); }
.wf-allcap b, .wf-nextinfo b { font-weight: 800; color: var(--ink); }
.wf-seccap { margin: 6px 0 10px; font-size: 12.5px; line-height: 1.5; color: var(--n700); }
.wf-chart__cap { margin: 8px 0 0; font-size: 12px; line-height: 1.5; color: var(--n700); }
.wf-nextinfo { margin: 2px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--n700); }
.wf-pending { margin: 0; font-size: 13px; line-height: 1.5; color: var(--a700); font-weight: 600; }
.wf-warn { margin: 2px 0 0; padding: 10px 12px; background: var(--a100); font-size: 12.5px; line-height: 1.5; color: var(--a800); }

/* 스크린리더 전용 */
.wf-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* 섹션 */
.wf-sec { padding: 18px 20px; border-bottom: 2px solid var(--divider); display: flex; flex-direction: column; }
.wf-sec:last-child { border-bottom: none; }
.wf-sec--actions { gap: 10px; }
.wf-thisprog { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--n700); }
.wf-thisprog b { font-weight: 800; color: var(--ink); }
.wf-sechead { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-bottom: 8px; margin-bottom: 4px; border-bottom: 2px solid var(--divider); }
.wf-sechead > span:first-child { font-family: var(--head); font-weight: 800; font-size: 15px; }

/* 검침 입력 */
.wf-readrow { display: flex; gap: 8px; margin-top: 12px; }
.wf-readinput { flex: 1; min-width: 0; min-height: 56px; padding: 10px 14px; font-family: var(--head); font-weight: 800; font-size: 26px; text-align: right; color: var(--ink); background: var(--surface); border: 1px solid var(--accent); border-radius: 0; outline: none; }
.wf-savebtn { flex: none; min-height: 56px; padding-inline: 22px; font-size: 16px; }
.wf-readhint { margin: 10px 0 0; font-size: 13px; line-height: 1.6; color: var(--n700); }

/* 라인 항목 */
.wf-line { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--n300); }
.wf-line:last-child { border-bottom: none; }
.wf-line__l { font-size: 14px; font-weight: 600; }
.wf-line__l em { display: block; font-style: normal; font-size: 12px; font-weight: 400; color: var(--n600); margin-top: 1px; }
.wf-line__v { font-family: var(--head); font-weight: 800; font-size: 15px; white-space: nowrap; }
.wf-line--total { border-top: 2px solid var(--divider); border-bottom: none; margin-top: 4px; padding-top: 14px; }
.wf-line--total .wf-line__l { font-family: var(--head); font-weight: 800; font-size: 15px; }
.wf-line__total { font-family: var(--head); font-weight: 800; font-size: 24px; letter-spacing: -0.02em; color: var(--a700); }

/* 차트 */
.wf-chart { display: flex; align-items: flex-end; gap: 10px; height: 130px; margin-top: 12px; border-bottom: 2px solid var(--divider); }
.wf-chart__col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px; height: 100%; }
.wf-chart__val { font-family: var(--head); font-weight: 800; font-size: 11px; color: var(--n600); }
.wf-chart__val.is-latest { color: var(--a700); }
.wf-chart__bar { width: 100%; max-width: 32px; background: var(--n400); }
.wf-chart__bar.is-latest { background: var(--accent); }
.wf-chart__labels { display: flex; gap: 10px; margin-top: 6px; }
.wf-chart__lb { flex: 1; text-align: center; font-size: 11px; color: var(--n600); }
.wf-chart__lb.is-latest { font-weight: 800; font-family: var(--head); color: var(--ink); }

/* 전체 세대 */
.wf-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 2px solid var(--divider); }
.wf-stat { padding: 14px 16px; }
.wf-stat + .wf-stat { border-left: 2px solid var(--divider); }
.wf-stat__v { font-family: var(--head); font-weight: 800; font-size: 20px; margin-top: 4px; }
.wf-stat__v--sm { font-size: 15px; }
.wf-stat__v em { font-style: normal; font-size: 12px; font-weight: 600; color: var(--n600); }
.wf-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 20px; border-bottom: 2px solid var(--divider); }

.wf-units { padding: 4px 20px 8px; }
.wf-units__head { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; padding: 10px 0 8px; border-bottom: 2px solid var(--divider); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--n600); }
.wf-units__ru { text-align: right; min-width: 48px; }
.wf-units__rf { text-align: right; min-width: 70px; }
.wf-unit { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: baseline; width: 100%; padding: 13px 0; border-bottom: 1px solid var(--n300); background: none; text-align: left; font: inherit; color: inherit; }
.wf-unit.is-btn { border-left: none; cursor: pointer; }
.wf-unit.is-btn:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }
.wf-unit.is-mine { background: var(--a100); }
.wf-unit.is-open { background: color-mix(in srgb, var(--ink) 5%, transparent); }
.wf-unit__name { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600; }
.wf-unit__u { text-align: right; min-width: 48px; font-size: 13px; font-weight: 600; white-space: nowrap; }
.wf-unit__f { text-align: right; min-width: 70px; font-family: var(--head); font-weight: 800; font-size: 14px; white-space: nowrap; }
.wf-edit { display: grid; grid-template-columns: 1fr; gap: 10px; padding: 14px 0; border-bottom: 1px solid var(--n300); background: color-mix(in srgb, var(--ink) 4%, transparent); }
.wf-edit .wf-field { padding: 0 4px; }

/* 추가비용 편집 */
.wf-extraitem { border: 1px solid var(--divider); padding: 10px; margin-bottom: 10px; }
.wf-extrarow { display: flex; gap: 8px; }
.wf-input--amt { max-width: 110px; text-align: right; }
.wf-x { flex: none; width: 40px; border: 1px solid var(--divider); background: var(--bg); color: var(--n700); cursor: pointer; font-size: 13px; }
.wf-x:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.wf-add { margin-top: 4px; }
.wf-excl-btn { width: 100%; margin-top: 8px; padding: 7px 10px; border: 1px dashed var(--n400); background: none; color: var(--n700); font-family: var(--head); font-weight: 700; font-size: 12px; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.wf-excl-btn:hover { border-color: var(--ink); color: var(--ink); }
.wf-excl-list { font-weight: 400; color: var(--n600); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wf-excl-caret { margin-left: auto; }
.wf-excl-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-top: 8px; }
.wf-excl-cell { min-height: 34px; border: 1px solid var(--divider); background: var(--bg); color: var(--ink); font-family: var(--head); font-weight: 700; font-size: 12px; cursor: pointer; }
.wf-excl-cell:hover:not(:disabled) { border-color: var(--ink); }
.wf-excl-cell.is-excl { background: var(--accent); color: #fff; border-color: var(--accent); }
.wf-resetrow { display: flex; gap: 8px; }
.wf-resetrow .wf-input { max-width: 90px; }

.wf-hint { margin: 10px 20px 0; font-size: 12.5px; line-height: 1.5; color: var(--n700); }

/* 하단 탭 */
.wf-tabs { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; border-top: 2px solid var(--divider); background: var(--surface); padding-bottom: env(safe-area-inset-bottom); }
.wf-tab { height: 54px; border: none; border-top: 3px solid transparent; background: none; cursor: pointer; font-family: var(--head); font-weight: 800; font-size: 12.5px; color: var(--n600); letter-spacing: 0.02em; }
.wf-tab:hover { background: var(--n200); }
.wf-tab.is-on { border-top-color: var(--accent); color: var(--ink); }
</style>
