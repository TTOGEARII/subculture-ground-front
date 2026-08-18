import { useApi } from './useUtil'

export interface ExtraCost {
  name: string
  amount: number
}

export interface UnitRow {
  unitNo: string
  prevReading: number
  currReading: number
  households: number
  other: number
  discount: number
  usage: number
  water: number
  labor: number
  elecStair: number
  extra: number
  payment: number
  isManager: boolean
  estimated: boolean
}

export interface Statement {
  yearMonth: string
  totalWaterFee: number
  commonElectricity: number
  bureauTotalTons: number
  stairCleaningFee: number
  managerUnit: string
  extraCosts: ExtraCost[]
  perTon: number
  meteredTons: number
  bureauDiff: number
  totalLaborFee: number
  totalExtra: number
  enteredCount: number
  allEntered: boolean
  rows: UnitRow[]
  totals: {
    usage: number
    water: number
    labor: number
    elecStair: number
    extra: number
    other: number
    discount: number
    payment: number
    households: number
  }
  grandTotal: number
}

export interface StatementSummary {
  yearMonth: string
  totalWaterFee: number
  updatedAt: string
}

/** 한 세대의 월별 사용량·납입 이력 */
export interface HistoryRow {
  yearMonth: string
  prevReading: number
  currReading: number
  usage: number
  water: number
  labor: number
  elecStair: number
  discount: number
  payment: number
  isManager: boolean
  estimated?: boolean
}

/** 세대 신원 (호수 + 아이디) */
export interface Identity {
  unitNo: string
  residentId: string
}

/** 로그인된 세대 (신원 + 관리자 여부) */
export interface Me extends Identity {
  isManager: boolean
}

type GlobalPatch = Partial<Pick<Statement, 'totalWaterFee' | 'commonElectricity' | 'bureauTotalTons' | 'stairCleaningFee'>>
type UnitPatch = Partial<Pick<UnitRow, 'prevReading' | 'currReading' | 'households' | 'other' | 'discount'>>

/**
 * 수도요금 정산 API. 계산은 서버가 수행 — 저장하면 계산된 명세서를 그대로 돌려준다.
 * 세대 식별(호수+아이디, 비밀번호 없음) / 관리(반장 세대만) 포함.
 */
export const useWaterFee = () => {
  const api = useApi()
  const base = '/water-fee'
  const stmts = `${base}/statements`

  // me에는 isManager가 붙어 있으므로, 서버에는 신원 두 필드만 보낸다.
  // (백엔드 ValidationPipe가 forbidNonWhitelisted라 isManager를 그대로 보내면 거부된다)
  const idOnly = (me: Identity) => ({ unitNo: me.unitNo, residentId: me.residentId })

  // ── 조회 (공개) ──
  const listStatements = async (): Promise<StatementSummary[]> => {
    const { data } = await api.get<StatementSummary[]>(stmts)
    return data
  }
  const getStatement = async (ym: string): Promise<Statement> => {
    const { data } = await api.get<Statement>(`${stmts}/${ym}`)
    return data
  }
  const getUnitHistory = async (unitNo: string): Promise<HistoryRow[]> => {
    const { data } = await api.get<HistoryRow[]>(`${base}/units/${unitNo}/history`)
    return data
  }

  /** 명세서를 엑셀(xlsx)로 내려받아 파일 저장 트리거. 신원이 반장이면 가구수 열 포함. */
  const downloadExcel = async (ym: string, me?: Identity): Promise<void> => {
    const res = await api.get(`${stmts}/${ym}/excel`, {
      responseType: 'blob',
      params: me ? { unitNo: me.unitNo, residentId: me.residentId } : undefined,
    })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `중앙그린빌라_수도요금_${ym}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // ── 세대 식별 ──
  const verifyHousehold = async (unitNo: string, residentId: string): Promise<Me> => {
    const { data } = await api.post<Me>(`${base}/households/verify`, { unitNo, residentId })
    return data
  }

  // ── 일반 세대: 내 검침 저장 ──
  const saveMyReading = async (ym: string, me: Identity, currReading: number): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${stmts}/${ym}/my-reading`, {
      unitNo: me.unitNo,
      residentId: me.residentId,
      currReading,
    })
    return data
  }

  // ── 관리자(반장) 전용 — 신원 동봉 ──
  const createStatement = async (ym: string, me: Identity, globals?: GlobalPatch): Promise<Statement> => {
    const { data } = await api.post<Statement>(stmts, { yearMonth: ym, ...globals, identity: idOnly(me) })
    return data
  }
  const saveGlobals = async (ym: string, me: Identity, patch: GlobalPatch): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${stmts}/${ym}`, { ...patch, identity: idOnly(me) })
    return data
  }
  const saveUnit = async (ym: string, me: Identity, unitNo: string, patch: UnitPatch): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${stmts}/${ym}/units/${unitNo}`, { ...patch, identity: idOnly(me) })
    return data
  }
  const setManager = async (ym: string, me: Identity, managerUnit: string): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${stmts}/${ym}/manager`, { managerUnit, identity: idOnly(me) })
    return data
  }
  const saveExtraCosts = async (ym: string, me: Identity, extraCosts: ExtraCost[]): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${stmts}/${ym}/extra-costs`, { extraCosts, identity: idOnly(me) })
    return data
  }
  const deleteStatement = async (ym: string, me: Identity): Promise<void> => {
    await api.delete(`${stmts}/${ym}`, { data: { identity: idOnly(me) } })
  }
  const resetHousehold = async (unitNo: string, me: Identity): Promise<void> => {
    await api.post(`${base}/households/${unitNo}/reset`, { identity: idOnly(me) })
  }

  return {
    listStatements,
    getStatement,
    getUnitHistory,
    downloadExcel,
    verifyHousehold,
    saveMyReading,
    createStatement,
    saveGlobals,
    saveUnit,
    setManager,
    saveExtraCosts,
    deleteStatement,
    resetHousehold,
  }
}
