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

const byRecent = (a: Request, b: Request) => b.date.localeCompare(a.date) || b.number - a.number

/** Sempre mais recentes primeiro (F-02); com termo, só os pedidos que casam com todas as palavras. */
export function searchRequests(requests: Request[], index: RequestIndex, query: string): Request[] {
  const q = query.trim()
  if (!q) return [...requests].sort(byRecent)
  const hits = new Set(index.search(q).map((hit) => hit.id as string))
  return requests.filter((r) => hits.has(r.id)).sort(byRecent)
}
