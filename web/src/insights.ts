import type { Place, Request } from './data'

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

export interface PlaceCount { place: Place; count: number }

/** Pedidos por bairro no mapa (um voto por pedido e bairro) e quantos pedidos com bairro ficaram de fora por falta de posição. */
export function placeCounts(requests: Request[], places: Place[]): { items: PlaceCount[]; withNeighborhood: number; mapped: number } {
  const byAlias = new Map(places.flatMap((p) => p.aliases.map((a) => [a, p] as const)))
  const counts = new Map<Place, number>()
  let withNeighborhood = 0, mapped = 0
  for (const r of requests) {
    if (r.neighborhoods.length === 0) continue
    withNeighborhood++
    const hit = new Set(r.neighborhoods.map((n) => byAlias.get(n)).filter((p) => p !== undefined))
    if (hit.size > 0) mapped++
    for (const p of hit) counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  return { items: [...counts].map(([place, count]) => ({ place, count })).sort((a, b) => b.count - a.count), withNeighborhood, mapped }
}
