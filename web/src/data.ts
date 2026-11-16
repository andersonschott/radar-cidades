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
  termStart: string
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

/** Grupos em linguagem simples para quem não conhece os nomes do Regimento. Cor por grupo, nunca por partido; sempre junto do rótulo. */
export const groups = [
  { key: 'melhoria', color: 'bg-blue-600', label: 'Pedidos de melhoria', types: ['Indicacao'], hint: 'Indicações: tapar buraco, podar árvore, trocar lâmpada. É um pedido; a Prefeitura decide se faz.' },
  { key: 'cobranca', color: 'bg-orange-600', label: 'Perguntas e cobranças', types: ['Requerimento'], hint: 'Requerimentos: pedidos de informação à Prefeitura e a outros órgãos.' },
  { key: 'mocao', color: 'bg-pink-600', label: 'Moções', types: ['Mocao'], hint: 'Homenagens, votos de pesar, apoio ou repúdio.' },
  { key: 'lei', color: 'bg-emerald-600', label: 'Propostas de lei', types: ['ProjetoLei', 'ProjetoLeiComplementar'], hint: 'Projetos que criam ou mudam regras da cidade.' },
  { key: 'outros', color: 'bg-slate-500', label: 'Outros', types: ['ProjetoDecretoLegislativo', 'ProjetoResolucao', 'Emenda', 'Outro'], hint: 'Decretos legislativos, regras internas da Câmara e emendas.' },
] as const

export type GroupKey = (typeof groups)[number]['key']

export const groupOf = (type: string): GroupKey =>
  groups.find((g) => (g.types as readonly string[]).includes(type))?.key ?? 'outros'

export function groupTotals(byType: Record<string, number>): Record<GroupKey, number> {
  const totals = Object.fromEntries(groups.map((g) => [g.key, 0])) as Record<GroupKey, number>
  for (const [type, n] of Object.entries(byType)) totals[groupOf(type)] += n
  return totals
}

const small = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
const roman = /^(?:i{1,3}|iv|v|vi{1,3}|ix|x)$/

/** "jardim mollon iv" -> "Jardim Mollon IV". shortcut: rua/bairro chegam sem acento (normalizados); publicar o texto bruto se a leitura incomodar. */
export const titleCase = (text: string) =>
  text.split(' ').map((w, i) =>
    roman.test(w) ? w.toUpperCase()
      : i > 0 && small.has(w) ? w
        : w.replace(/^(d')?(\p{L})/u, (_, d: string | undefined, c: string) => (d ?? '') + c.toUpperCase()),
  ).join(' ')

const monthYearFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
export const formatMonthYear = (iso: string) => monthYearFormat.format(new Date(`${iso}T00:00:00Z`)).replace('.', '').replace(' de ', ' ')
export const today = () => new Date().toISOString().slice(0, 10)
