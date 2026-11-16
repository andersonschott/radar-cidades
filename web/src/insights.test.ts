import { describe, expect, it } from 'vitest'
import { groupTotals, titleCase, type Request } from './data'
import { repeatedStreets, topNeighborhoods } from './insights'

const req = (id: string, date: string, streets: string[], neighborhoods: string[], authors: string[]): Request =>
  ({ id, type: 'Indicacao', number: Number(id), year: 2025, date, summary: '', url: '', authors, streets, neighborhoods })

const data = [
  req('1', '2025-02-01', ['rua espanha'], ['jardim europa'], ['a']),
  req('2', '2025-06-01', ['rua espanha', 'rua espanha'], ['jardim europa'], ['b', 'a']),
  req('3', '2025-04-01', ['rua espanha'], ['vila brasil'], ['c']),
  req('4', '2025-05-01', [], ['jardim europa', 'jardim europa'], ['c']),
]

describe('insights', () => {
  it('conta cada bairro uma vez por pedido', () => {
    expect(topNeighborhoods(data, 1)).toEqual([{ key: 'jardim europa', count: 3 }])
  })

  it('agrupa rua + bairro e ignora rua citada uma vez só', () => {
    expect(repeatedStreets(data)).toEqual([
      { street: 'rua espanha', neighborhood: 'jardim europa', count: 2, authors: 2, from: '2025-02-01', to: '2025-06-01' },
    ])
  })

  it('soma tipos nos grupos simples', () => {
    expect(groupTotals({ Indicacao: 5, ProjetoLei: 2, ProjetoLeiComplementar: 1, Emenda: 1 }))
      .toEqual({ melhoria: 5, cobranca: 0, mocao: 0, lei: 3, outros: 1 })
  })

  it('título legível com conectivos e numeral romano', () => {
    expect(titleCase('jardim mollon iv')).toBe('Jardim Mollon IV')
    expect(titleCase('rua dos tupis')).toBe('Rua dos Tupis')
    expect(titleCase("santa barbara d'oeste")).toBe("Santa Barbara d'Oeste")
  })
})

describe('salário', () => {
  it('estima cadeiras × subsídio × meses desde a vigência', async () => {
    const { salaryEstimate } = await import('./data')
    const meta = { seats: 19, monthlySalary: 15422.93, salaryFrom: '2025-02-01' } as const
    const oneMonthLater = Date.parse('2025-02-01T03:00:00Z') + 30.4375 * 24 * 3600 * 1000
    expect(salaryEstimate(meta, oneMonthLater)).toBeCloseTo(19 * 15422.93, 2)
    expect(salaryEstimate(meta, Date.parse('2025-01-15T00:00:00Z'))).toBe(0)
    expect(salaryEstimate({ ...meta, monthlySalary: 0 }, oneMonthLater)).toBeNull()
  })

  it('soma o presidente à parte e dilui o 13º por mês', async () => {
    const { monthlyPayroll } = await import('./data')
    const meta = { seats: 19, monthlySalary: 14158.92, presidentSalary: 15921.41, salaryFrom: '2025-01-01' }
    expect(monthlyPayroll(meta)).toBeCloseTo(18 * 14158.92 + 15921.41, 2)
    expect(monthlyPayroll({ ...meta, thirteenthSalary: true })).toBeCloseTo(((18 * 14158.92 + 15921.41) * 13) / 12, 2)
    expect(monthlyPayroll({ ...meta, presidentSalary: null })).toBeCloseTo(19 * 14158.92, 2)
  })
})

describe('situação de projeto de lei', () => {
  it('traduz a situação só para projetos de lei', async () => {
    const { billStatus } = await import('./data')
    expect(billStatus('ProjetoLei', 'Aprovado')).toBe('Aprovado pela Câmara')
    expect(billStatus('ProjetoLei', 'PEDIDO DE PARECER - SUSPENSO O TRÂMITE')).toBe('Em análise, aguardando parecer')
    expect(billStatus('ProjetoLeiComplementar', 'TRAMITANDO')).toBe('Em análise na Câmara')
    expect(billStatus('Indicacao', 'TRAMITANDO')).toBeNull()
  })
})
