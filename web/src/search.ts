import MiniSearch from 'minisearch'
import { fold, type Request } from './data'

export type RequestIndex = MiniSearch<Request>

export function buildIndex(requests: Request[]): RequestIndex {
  const index = new MiniSearch<Request>({
    fields: ['streets', 'neighborhoods', 'summary'],
    storeFields: [],
    extractField: (doc, field) => {
      const value = doc[field as keyof Request]
      return Array.isArray(value) ? value.join(' ') : String(value)
    },
    processTerm: (term) => fold(term),
    searchOptions: { prefix: true, fuzzy: 0.15, combineWith: 'AND' },
  })
  index.addAll(requests)
  return index
}

// Abreviações de endereço. "r." e "av." só com ponto: sem ele, "r" e "av" são começo de outras palavras ("rio", "ave").
const abbreviations: Record<string, string> = {
  jd: 'jardim', 'jd.': 'jardim', vl: 'vila', 'vl.': 'vila', pq: 'parque', 'pq.': 'parque', 'r.': 'rua', 'av.': 'avenida',
}

/** Troca abreviações pela palavra inteira antes de o MiniSearch quebrar o texto (ele descarta o ponto). */
export function expandQuery(query: string): string {
  return query.trim().split(/\s+/).map((w) => abbreviations[w.toLowerCase()] ?? w).join(' ')
}

const byRecent = (a: Request, b: Request) => b.date.localeCompare(a.date) || b.number - a.number

/** Sempre mais recentes primeiro (F-02); com termo, só os pedidos que casam com todas as palavras. */
export function searchRequests(requests: Request[], index: RequestIndex, query: string): Request[] {
  const q = expandQuery(query)
  if (!q) return [...requests].sort(byRecent)
  const hits = new Set(index.search(q).map((hit) => hit.id as string))
  return requests.filter((r) => hits.has(r.id)).sort(byRecent)
}
