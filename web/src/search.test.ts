import { describe, expect, it } from 'vitest'
import type { Request } from './data'
import { buildIndex, expandQuery, searchRequests } from './search'

const req = (id: string, date: string, summary: string, streets: string[], neighborhoods: string[]): Request => ({
  id, type: 'Indicacao', number: Number(id), year: 2026, date, summary, url: `https://x/${id}`, authors: [], streets, neighborhoods,
})

const data = [
  req('1', '2026-01-10', 'Tapa-buraco na Rua do Café, Jd. Pérola', ['rua do cafe'], ['jardim perola']),
  req('2', '2026-03-05', 'Poda de árvore na Avenida da Indústria', ['avenida da industria'], []),
  req('3', '2026-02-01', 'Limpeza no bairro Jardim Europa', [], ['jardim europa']),
]

describe('searchRequests', () => {
  const index = buildIndex(data)

  it('sem termo devolve tudo, mais recente primeiro', () => {
    expect(searchRequests(data, index, '  ').map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('ignora acento e caixa', () => {
    expect(searchRequests(data, index, 'PEROLA').map((r) => r.id)).toEqual(['1'])
    expect(searchRequests(data, index, 'industria').map((r) => r.id)).toEqual(['2'])
  })

  it('com termo também ordena do mais recente', () => {
    expect(searchRequests(data, index, 'jardim').map((r) => r.id)).toEqual(['3', '1'])
  })

  it('aceita prefixo e exige todos os termos', () => {
    expect(searchRequests(data, index, 'jardim eur').map((r) => r.id)).toEqual(['3'])
  })

  it('entende abreviações de endereço', () => {
    for (const q of ['jd perola', 'Jd. Pérola', 'JD. perola']) expect(searchRequests(data, index, q).map((r) => r.id)).toEqual(['1'])
    expect(searchRequests(data, index, 'r. do cafe').map((r) => r.id)).toEqual(['1'])
    expect(searchRequests(data, index, 'av. da industria').map((r) => r.id)).toEqual(['2'])
  })
})

describe('expandQuery', () => {
  it('expande jd, vl, pq com ou sem ponto; r. e av. só com ponto', () => {
    expect(expandQuery('jd. europa Vl pq. r. av.')).toBe('jardim europa vila parque rua avenida')
    expect(expandQuery(' r av rio ')).toBe('r av rio')
  })
})
