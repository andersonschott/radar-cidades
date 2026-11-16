// Contrato JSON público (SDD §9). Espelha src/Radar.Publishing/PublicContract.cs.

export interface Envelope<T> {
  schemaVersion: number
  generatedAt: string
  city?: string
  data: T
}

export interface CitySummary {
  slug: string
  name: string
  uf: string
  capabilities: string[]
  lastUpdated: string | null
}

export interface Totals {
  propositions: number
  neighborhoodRequests: number
  byType: Record<string, number>
}

export interface Meta {
  name: string
  uf: string
  seats: number
  officialUrl: string
  lastSuccessfulScrape: string | null
  capabilities: string[]
  councilors: number
  totals: Totals
}

export interface Councilor {
  slug: string
  name: string
  party: string | null
  photoUrl: string | null
  profileUrl: string
  totals: Totals
}

export interface Proposition {
  id: string
  type: string
  rawType: string
  number: number
  year: number
  date: string
  summary: string
  category: string
  url: string
}

export interface CouncilorProfile {
  councilor: Councilor
  propositions: Proposition[]
}

export interface Request {
  id: string
  type: string
  number: number
  year: number
  date: string
  summary: string
  url: string
  authors: string[]
  streets: string[]
  neighborhoods: string[]
}

const baseUrl = (import.meta.env.VITE_DATA_BASE_URL ?? '/data').replace(/\/$/, '')
const cache = new Map<string, Promise<unknown>>()

/** Promessa estável por caminho, para usar com `use()` dentro de `<Suspense>`. */
export function load<T>(path: string): Promise<Envelope<T>> {
  let promise = cache.get(path)
  if (!promise) {
    promise = fetch(`${baseUrl}/${path}`).then((r) => {
      if (!r.ok) throw new Response(null, { status: r.status, statusText: `Falha ao carregar ${path}` })
      return r.json()
    })
    cache.set(path, promise)
  }
  return promise as Promise<Envelope<T>>
}

/** Sem acento e minúsculo, como o TextFolding do back-end. */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export const typeLabels: Record<string, string> = {
  Indicacao: 'Indicações',
  Requerimento: 'Requerimentos',
  Mocao: 'Moções',
  ProjetoLei: 'Projetos de lei',
  ProjetoLeiComplementar: 'Projetos de lei complementar',
  ProjetoDecretoLegislativo: 'Projetos de decreto legislativo',
  ProjetoResolucao: 'Projetos de resolução',
  Emenda: 'Emendas',
  Outro: 'Outros',
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
const numberFormat = new Intl.NumberFormat('pt-BR')

export const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`))
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso))
export const formatNumber = (n: number) => numberFormat.format(n)

export const typeSingular: Record<string, string> = {
  Indicacao: 'Indicação',
  Requerimento: 'Requerimento',
  Mocao: 'Moção',
  ProjetoLei: 'Projeto de lei',
  ProjetoLeiComplementar: 'Projeto de lei complementar',
  ProjetoDecretoLegislativo: 'Projeto de decreto legislativo',
  ProjetoResolucao: 'Projeto de resolução',
  Emenda: 'Emenda',
  Outro: 'Proposição',
}
