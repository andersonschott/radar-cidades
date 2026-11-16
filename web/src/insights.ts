import type { Request } from './data'

export interface Count { key: string; count: number }

/** Bairros citados, um voto por pedido. */
export function topNeighborhoods(requests: Request[], limit: number): Count[] {
  const counts = new Map<string, number>()
  for (const r of requests) for (const n of new Set(r.neighborhoods)) counts.set(n, (counts.get(n) ?? 0) + 1)
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, limit)
}

export interface StreetRepeat {
  street: string
  neighborhood: string | null
  count: number
  authors: number
  from: string
  to: string
}

/** Ruas (com o bairro, quando citado) que aparecem em mais de um pedido. */
export function repeatedStreets(requests: Request[]): StreetRepeat[] {
  const byKey = new Map<string, StreetRepeat & { authorSet: Set<string> }>()
  for (const r of requests) {
    const neighborhood = r.neighborhoods[0] ?? null
    for (const street of new Set(r.streets)) {
      const key = `${street}|${neighborhood ?? ''}`
      let s = byKey.get(key)
      if (!s) byKey.set(key, (s = { street, neighborhood, count: 0, authors: 0, from: r.date, to: r.date, authorSet: new Set() }))
      s.count++
      r.authors.forEach((a) => s.authorSet.add(a))
      if (r.date < s.from) s.from = r.date
      if (r.date > s.to) s.to = r.date
    }
  }
  return [...byKey.values()]
    .filter((s) => s.count > 1)
    .map(({ authorSet, ...s }) => ({ ...s, authors: authorSet.size }))
    .sort((a, b) => b.count - a.count || a.street.localeCompare(b.street))
}
