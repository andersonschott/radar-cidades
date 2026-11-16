import { use } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { fold, formatNumber, groups, groupTotals, load, type Councilor, type Meta } from '../data'
import { OfficialLink, UpdatedAt } from '../layout'

const sorts = {
  nome: { label: 'Nome (A–Z)', compare: (a: Councilor, b: Councilor) => a.name.localeCompare(b.name, 'pt-BR') },
  pedidos: { label: 'Mais pedidos com endereço', compare: (a: Councilor, b: Councilor) => b.totals.neighborhoodRequests - a.totals.neighborhoodRequests },
  propostas: { label: 'Mais propostas no total', compare: (a: Councilor, b: Councilor) => b.totals.propositions - a.totals.propositions },
  leis: { label: 'Mais propostas de lei', compare: (a: Councilor, b: Councilor) => groupTotals(b.totals.byType).lei - groupTotals(a.totals.byType).lei },
  mocoes: { label: 'Mais moções', compare: (a: Councilor, b: Councilor) => groupTotals(b.totals.byType).mocao - groupTotals(a.totals.byType).mocao },
} as const
type SortKey = keyof typeof sorts

const selectCls = 'min-h-12 w-full rounded-xl border bg-card px-3 text-base'

export default function Councilors() {
  const { city = '' } = useParams()
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  const all = use(load<Councilor[]>(`${city}/councilors.json`)).data
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const party = params.get('partido') ?? ''
  const sort = (params.get('ordem') ?? 'nome') as SortKey
  const set = (key: string, value: string) =>
    setParams((p) => { if (value) p.set(key, value); else p.delete(key); return p }, { replace: true })

  const parties = [...new Set(all.map((c) => c.party).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const list = all
    .filter((c) => fold(c.name).includes(fold(q)) && (!party || c.party === party))
    .sort((sorts[sort] ?? sorts.nome).compare)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-4xl font-black leading-tight tracking-tight">Os {meta.councilors} vereadores</h1>
        <p className="mt-2 text-lg text-muted-foreground">Toque em um número para ver os documentos.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Buscar por nome
          <input type="search" className={selectCls} value={q} onChange={(e) => set('q', e.currentTarget.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Partido
          <select className={selectCls} value={party} onChange={(e) => set('partido', e.currentTarget.value)}>
            <option value="">Todos</option>
            {parties.map((p) => <option key={p} value={p}>{p} ({all.filter((c) => c.party === p).length})</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Ordenar por
          <select className={selectCls} value={sort} onChange={(e) => set('ordem', e.currentTarget.value === 'nome' ? '' : e.currentTarget.value)}>
            {Object.entries(sorts).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">Mostrando {list.length === all.length ? `os ${all.length} vereadores` : `${list.length} de ${all.length}`}.</p>

      {list.length === 0 ? (
        <Empty><EmptyHeader><EmptyTitle>Nenhum vereador encontrado</EmptyTitle><EmptyDescription>Revise a busca ou o filtro de partido.</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => <li key={c.slug}><Badge city={city} councilor={c} /></li>)}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">
        Uma proposta com vários autores conta para cada um. Suplentes e ex-vereadores que assinaram propostas nesta legislatura ainda não aparecem aqui.
      </p>
      <UpdatedAt meta={meta} />
    </div>
  )
}

/** Crachá: foto, nome, partido e o que propôs, em grupos simples. */
function Badge({ city, councilor: c }: { city: string; councilor: Councilor }) {
  const totals = groupTotals(c.totals.byType)
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4">
      <Link to={c.slug} className="flex items-center gap-3">
        <Avatar councilor={c} size="size-16" />
        <span>
          <span className="block text-xl font-black leading-tight">{c.name}</span>
          <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-sm font-semibold">{c.party ?? 'Sem partido informado'}</span>
        </span>
      </Link>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O que propôs até agora</p>
      <ul className="flex flex-col divide-y">
        {groups.map((g) => (
          <li key={g.key}>
            <Link to={`/${city}/vereadores/${c.slug}?tipo=${g.key}`} className="flex min-h-11 items-center justify-between gap-2 text-base hover:underline">
              <span>{g.label}</span>
              <span className="flex items-center gap-2 font-black tabular-nums">{formatNumber(totals[g.key])}<span aria-hidden className="text-muted-foreground">›</span></span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto"><OfficialLink href={c.profileUrl} label="Ficha oficial na Câmara" /></div>
    </article>
  )
}

export function Avatar({ councilor, size = 'size-8' }: { councilor: Councilor; size?: string }) {
  return councilor.photoUrl ? (
    <img src={councilor.photoUrl} alt="" loading="lazy" className={`${size} shrink-0 rounded-full bg-muted object-cover`} />
  ) : (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground`}>
      {councilor.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
    </span>
  )
}
