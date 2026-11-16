import { use, useDeferredValue, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { formatNumber, load, titleCase, type Councilor, type Meta, type Request } from '../data'
import { topNeighborhoods } from '../insights'
import { UpdatedAt } from '../layout'
import { Authors, Chip, ChipRow, MoreButton, PropositionCard } from '../pieces'
import { buildIndex, searchRequests } from '../search'

const PageSize = 20

export default function Neighborhoods() {
  const { city = '' } = useParams()
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  const requests = use(load<Request[]>(`${city}/requests.json`)).data
  const councilors = use(load<Councilor[]>(`${city}/councilors.json`)).data
  const bySlug = useMemo(() => new Map(councilors.map((c) => [c.slug, c])), [councilors])
  const index = useMemo(() => buildIndex(requests), [requests])
  const top = useMemo(() => topNeighborhoods(requests, 12), [requests])
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const deferred = useDeferredValue(q)
  const results = useMemo(() => searchRequests(requests, index, deferred), [requests, index, deferred])
  const [shown, setShown] = useState(PageSize)
  const search = (v: string) => { setShown(PageSize); setParams(v ? { q: v } : {}, { replace: true }) }

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-5">
      <div>
        <h1 className="text-4xl font-black leading-tight tracking-tight">O que pediram pelo seu bairro?</h1>
        <p className="mt-2 text-lg text-muted-foreground">Digite o bairro ou a rua. Sem nada digitado, você vê a cidade inteira.</p>
      </div>
      <div role="search">
        <label htmlFor="q" className="sr-only">Bairro ou rua</label>
        <input id="q" type="search" value={q} placeholder="Ex.: Jardim Europa" autoComplete="off"
          onChange={(e) => search(e.currentTarget.value)}
          className="min-h-14 w-full rounded-2xl border-2 border-foreground/80 bg-card px-4 text-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/40" />
      </div>
      <ChipRow label="Bairros mais citados">
        {top.map((n) => (
          <li key={n.key}><Chip active={q === n.key} onClick={() => search(q === n.key ? '' : n.key)}>{titleCase(n.key)}</Chip></li>
        ))}
      </ChipRow>

      <p className="text-lg" aria-live="polite">
        <strong className="text-3xl font-black tabular-nums">{formatNumber(results.length)}</strong>{' '}
        {deferred.trim() ? <>pedidos para <strong>“{deferred.trim()}”</strong></> : <>pedidos na <strong>cidade inteira</strong>, dos mais novos para os mais antigos</>}
      </p>

      {results.length === 0 ? (
        <Empty><EmptyHeader><EmptyTitle>Nenhum pedido encontrado</EmptyTitle><EmptyDescription>Tente só o nome do bairro ou da rua, sem número.</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.slice(0, shown).map((r) => (
            <PropositionCard key={r.id} item={r} authors={<Authors city={city} slugs={r.authors} councilors={bySlug} />} />
          ))}
        </ul>
      )}
      {shown < results.length && (
        <MoreButton onClick={() => setShown((n) => n + PageSize)}>Mostrar mais ({formatNumber(results.length - shown)} restantes)</MoreButton>
      )}
      <p className="text-sm text-muted-foreground">
        Rua e bairro são lidos do texto de cada pedido por regras automáticas e podem falhar. A busca também procura no texto completo.
        Pedidos sem autor listado foram feitos por suplentes, ex-vereadores ou pela Mesa.
      </p>
      <UpdatedAt meta={meta} />
    </div>
  )
}
