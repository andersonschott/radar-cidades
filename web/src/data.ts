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
  /** Opcional: JSON publicado antes do campo (ou ainda em cache) não o traz. */
  bills?: Bills
}

/** Projetos de lei pela situação no site da Câmara. Aprovado = votado pela Câmara; a sanção do prefeito não aparece lá. */
export interface Bills {
  total: number
  approved: number
  inProgress: number
  withdrawn: number
  other: number
}

export interface Meta {
  name: string
  uf: string
  seats: number
  termStart: string
  monthlySalary: number
  salarySourceUrl: string
  salaryFrom: string | null
  /** Subsídio do presidente da Câmara, se diferente; ausente em JSON antigo. */
  presidentSalary?: number | null
  /** 13º pago (só true com fonte oficial). */
  thirteenthSalary?: boolean
  salarySourceLabel?: string | null
  /** "#rrggbb" da bandeira da cidade; ausente em JSON antigo. */
  accentColor?: string | null
  sessions: number
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
  attendance: Attendance | null
}

/** Sessões com chamada em que o vereador foi chamado. A fonte não diz se a ausência foi justificada. */
export interface Attendance {
  sessions: number
  present: number
  absent: number
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
  status: string | null
}

export interface CouncilorProfile {
  councilor: Councilor
  propositions: Proposition[]
}

/** Posição aproximada de um bairro (places.json, gerado por tools/geo). "ruas": mediana das ruas citadas nos pedidos. */
export interface Place {
  label: string
  search: string
  lat: number
  lon: number
  method: 'osm' | 'ruas'
  aliases: string[]
}
export interface Places { attribution: string; places: Place[] }

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
  { key: 'melhoria', soft: 'bg-blue-50 text-blue-700', color: 'bg-blue-600', label: 'Pedidos de melhoria', types: ['Indicacao'], hint: 'Indicações: tapar buraco, podar árvore, trocar lâmpada. É um pedido à Prefeitura, que não é obrigada a fazer. O site da Câmara não registra se foi feito.' },
  { key: 'cobranca', soft: 'bg-orange-50 text-orange-700', color: 'bg-orange-600', label: 'Perguntas e cobranças', types: ['Requerimento'], hint: 'Requerimentos: pedidos de informação à Prefeitura e a outros órgãos.' },
  { key: 'mocao', soft: 'bg-pink-50 text-pink-700', color: 'bg-pink-600', label: 'Moções', types: ['Mocao'], hint: 'Homenagens, votos de pesar, apoio ou repúdio.' },
  { key: 'lei', soft: 'bg-violet-50 text-violet-700', color: 'bg-violet-600', label: 'Propostas de lei', types: ['ProjetoLei', 'ProjetoLeiComplementar'], hint: 'Projetos que criam ou mudam regras da cidade.' },
  { key: 'outros', soft: 'bg-slate-100 text-slate-700', color: 'bg-slate-500', label: 'Outros', types: ['ProjetoDecretoLegislativo', 'ProjetoResolucao', 'Emenda', 'Outro'], hint: 'Decretos legislativos, regras internas da Câmara e emendas.' },
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

export const AvgMonthMs = 30.4375 * 24 * 3600 * 1000

/** Estimativa (SDD F-08): cadeiras × subsídio × meses corridos desde a vigência. */
type SalaryMeta = Pick<Meta, 'seats' | 'monthlySalary' | 'salaryFrom' | 'presidentSalary' | 'thirteenthSalary'>

/** Folha mensal da Câmara: presidente + demais vereadores; com 13º, o ano tem 13 pagamentos (diluídos por mês). */
export function monthlyPayroll(meta: SalaryMeta): number {
  const president = meta.presidentSalary ?? meta.monthlySalary
  const base = (meta.seats - 1) * meta.monthlySalary + president
  return meta.thirteenthSalary ? (base * 13) / 12 : base
}

export function salaryEstimate(meta: SalaryMeta, now: number): number | null {
  if (!meta.salaryFrom || meta.monthlySalary <= 0) return null
  const elapsed = now - Date.parse(`${meta.salaryFrom}T03:00:00Z`)
  return elapsed <= 0 ? 0 : (monthlyPayroll(meta) * elapsed) / AvgMonthMs
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatMoney = (n: number) => money.format(n)
export const percent = (a: Attendance) => Math.round((a.present / a.sessions) * 100)

/** Situação de um projeto de lei em palavras simples; outros tipos não mostram situação (indicação fica sempre "tramitando"). */
export function billStatus(type: string, status: string | null | undefined): string | null {
  if (!status || !(groups.find((g) => g.key === 'lei')!.types as readonly string[]).includes(type)) return null
  const s = status.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  if (s.includes('aprovad')) return 'Aprovado pela Câmara'
  if (s.includes('retirad')) return 'Retirado pelo autor'
  if (s.includes('rejeitad')) return 'Rejeitado pela Câmara'
  if (s.includes('arquivad')) return 'Arquivado'
  if (s.includes('suspens')) return 'Em análise, aguardando parecer'
  if (s.includes('tramit')) return 'Em análise na Câmara'
  return status.charAt(0) + status.slice(1).toLowerCase()
}
