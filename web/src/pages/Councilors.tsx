import { use } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fold, formatNumber, load, type Councilor } from '../data'

const sorts = {
  nome: { label: 'Nome', compare: (a: Councilor, b: Councilor) => a.name.localeCompare(b.name, 'pt-BR') },
  proposicoes: { label: 'Proposições', compare: (a: Councilor, b: Councilor) => b.totals.propositions - a.totals.propositions },
  pedidos: { label: 'Pedidos para bairros', compare: (a: Councilor, b: Councilor) => b.totals.neighborhoodRequests - a.totals.neighborhoodRequests },
  leis: { label: 'Projetos de lei', compare: (a: Councilor, b: Councilor) => (b.totals.byType.ProjetoLei ?? 0) - (a.totals.byType.ProjetoLei ?? 0) },
} as const
type SortKey = keyof typeof sorts

const metrics = [
  { key: 'proposicoes', label: 'Proposições', value: (c: Councilor) => c.totals.propositions },
  { key: 'pedidos', label: 'Pedidos', value: (c: Councilor) => c.totals.neighborhoodRequests },
  { key: 'leis', label: 'Proj. de lei', value: (c: Councilor) => c.totals.byType.ProjetoLei ?? 0 },
]

export default function Councilors() {
  const { city = '' } = useParams()
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
  // No celular só cabe uma coluna numérica: a do critério de ordenação.
  const activeMetric = sort === 'nome' ? 'proposicoes' : sort

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Vereadores em exercício</h1>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor="busca-nome">Buscar por nome</label>
        <Input id="busca-nome" placeholder="Buscar por nome" value={q} onChange={(e) => set('q', e.currentTarget.value)} />
        <label className="flex items-center gap-2 text-sm">
          Partido
          <select className="h-9 rounded-lg border bg-background px-2" value={party} onChange={(e) => set('partido', e.currentTarget.value)}>
            <option value="">Todos</option>
            {parties.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Ordenar por
          <select className="h-9 rounded-lg border bg-background px-2" value={sort} onChange={(e) => set('ordem', e.currentTarget.value === 'nome' ? '' : e.currentTarget.value)}>
            {Object.entries(sorts).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <Empty><EmptyHeader><EmptyTitle>Nenhum vereador encontrado</EmptyTitle><EmptyDescription>Revise a busca ou o filtro de partido.</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vereador</TableHead>
              {metrics.map((m) => (
                <TableHead key={m.key} className={`text-right ${m.key === activeMetric ? '' : 'hidden sm:table-cell'}`}>{m.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.slug}>
                <TableCell>
                  <Link to={c.slug} className="flex items-center gap-3 hover:underline">
                    <Avatar councilor={c} />
                    <span className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.party ?? 'Sem partido informado'}</span>
                    </span>
                  </Link>
                </TableCell>
                {metrics.map((m) => (
                  <TableCell key={m.key} className={`text-right tabular-nums ${m.key === activeMetric ? '' : 'hidden sm:table-cell'}`}>{formatNumber(m.value(c))}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-sm text-muted-foreground">
        Contagens incluem coautorias. Suplentes e ex-vereadores que assinaram proposições nesta legislatura ainda não aparecem na lista.
      </p>
    </div>
  )
}

export function Avatar({ councilor, size = 'size-8' }: { councilor: Councilor; size?: string }) {
  return councilor.photoUrl ? (
    <img src={councilor.photoUrl} alt="" loading="lazy" className={`${size} shrink-0 rounded-full bg-muted object-cover`} />
  ) : (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground`}>
      {councilor.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
    </span>
  )
}
