import { useApi } from './useUtil'

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
  payment: number
  isManager: boolean
}

export interface Statement {
  yearMonth: string
  totalWaterFee: number
  commonElectricity: number
  bureauTotalTons: number
  stairCleaningFee: number
  managerUnit: string
  perTon: number
  meteredTons: number
  bureauDiff: number
  totalLaborFee: number
  rows: UnitRow[]
  totals: {
    usage: number
    water: number
    labor: number
    elecStair: number
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
    const { data } = await api.post<Statement>(stmts, { yearMonth: ym, ...globals, identity: me })
    return data
  }
  const saveGlobals = async (ym: string, me: Identity, patch: GlobalPatch): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${stmts}/${ym}`, { ...patch, identity: me })
    return data
  }
  const saveUnit = async (ym: string, me: Identity, unitNo: string, patch: UnitPatch): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${stmts}/${ym}/units/${unitNo}`, { ...patch, identity: me })
    return data
  }
  const setManager = async (ym: string, me: Identity, managerUnit: string): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${stmts}/${ym}/manager`, { managerUnit, identity: me })
    return data
  }
  const deleteStatement = async (ym: string, me: Identity): Promise<void> => {
    await api.delete(`${stmts}/${ym}`, { data: { identity: me } })
  }
  const resetHousehold = async (unitNo: string, me: Identity): Promise<void> => {
    await api.post(`${base}/households/${unitNo}/reset`, { identity: me })
  }

  return {
    listStatements,
    getStatement,
    getUnitHistory,
    verifyHousehold,
    saveMyReading,
    createStatement,
    saveGlobals,
    saveUnit,
    setManager,
    deleteStatement,
    resetHousehold,
  }
}
