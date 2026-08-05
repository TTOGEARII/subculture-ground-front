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

type GlobalPatch = Partial<Pick<Statement, 'totalWaterFee' | 'commonElectricity' | 'bureauTotalTons' | 'stairCleaningFee'>>
type UnitPatch = { unitNo: string } & Partial<Pick<UnitRow, 'prevReading' | 'currReading' | 'households' | 'other' | 'discount'>>

/** 수도요금 정산 API. 계산은 서버가 수행 — 저장하면 계산된 명세서를 그대로 돌려준다. */
export const useWaterFee = () => {
  const api = useApi()
  const base = '/water-fee/statements'

  const listStatements = async (): Promise<StatementSummary[]> => {
    const { data } = await api.get<StatementSummary[]>(base)
    return data
  }
  const getStatement = async (ym: string): Promise<Statement> => {
    const { data } = await api.get<Statement>(`${base}/${ym}`)
    return data
  }
  const createStatement = async (ym: string, globals?: GlobalPatch): Promise<Statement> => {
    const { data } = await api.post<Statement>(base, { yearMonth: ym, ...globals })
    return data
  }
  const saveGlobals = async (ym: string, patch: GlobalPatch): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${base}/${ym}`, patch)
    return data
  }
  const saveUnit = async (ym: string, unitNo: string, patch: Omit<UnitPatch, 'unitNo'>): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${base}/${ym}/units/${unitNo}`, patch)
    return data
  }
  const saveUnits = async (ym: string, units: UnitPatch[]): Promise<Statement> => {
    const { data } = await api.put<Statement>(`${base}/${ym}/units`, { units })
    return data
  }
  const deleteStatement = async (ym: string): Promise<void> => {
    await api.delete(`${base}/${ym}`)
  }

  return { listStatements, getStatement, createStatement, saveGlobals, saveUnit, saveUnits, deleteStatement }
}
