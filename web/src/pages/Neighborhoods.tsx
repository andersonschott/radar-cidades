import { use, useDeferredValue, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { formatDate, formatNumber, load, typeSingular, type Councilor, type Request } from '../data'
import { OfficialLink } from '../layout'
import { buildIndex, searchRequests } from '../search'

const PageSize = 30

export default function Neighborhoods() {
  const { city = '' } = useParams()
  const requests = use(load<Request[]>(`${city}/requests.json`)).data
  const councilors = use(load<Councilor[]>(`${city}/councilors.json`)).data
  const names = useMemo(() => new Map(councilors.map((c) => [c.slug, c.name])), [councilors])
  const index = useMemo(() => buildIndex(requests), [requests])
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const deferred = useDeferredValue(q)
  const results = useMemo(() => searchRequests(requests, index, deferred), [requests, index, deferred])
  const [shown, setShown] = useState(PageSize)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">O que pediram pelo seu bairro?</h1>
      <div role="search">
        <label htmlFor="q" className="sr-only">Rua ou bairro</label>
        <Input
          id="q"
          type="search"
          placeholder="Digite uma rua ou bairro"
          value={q}
          onChange={(e) => { const v = e.currentTarget.value; setShown(PageSize); setParams(v ? { q: v } : {}, { replace: true }) }}
        />
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {deferred.trim()
          ? `${formatNumber(results.length)} pedidos encontrados para “${deferred.trim()}”.`
          : `${formatNumber(results.length)} pedidos na cidade, mais recentes primeiro.`}
      </p>

      {results.length === 0 ? (
        <Empty><EmptyHeader><EmptyTitle>Nenhum pedido encontrado</EmptyTitle><EmptyDescription>Tente só o nome do bairro ou da rua, sem número.</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <ul className="divide-y rounded-xl border">
          {results.slice(0, shown).map((r) => (
            <li key={r.id} className="flex flex-col gap-1 p-4">
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-medium">{typeSingular[r.type] ?? r.type} nº {r.number}/{r.year}</span>
                <span className="text-muted-foreground">{formatDate(r.date)}</span>
              </div>
              <p className="text-sm">{r.summary}</p>
              <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                {r.authors.length > 0 && (
                  <span>
                    Autoria:{' '}
                    {r.authors.map((a, i) => (
                      <span key={a}>{i > 0 && ', '}<Link to={`/${city}/vereadores/${a}`} className="hover:underline">{names.get(a) ?? a}</Link></span>
                    ))}
                  </span>
                )}
                <OfficialLink href={r.url} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {shown < results.length && (
        <button type="button" onClick={() => setShown((n) => n + PageSize)} className="self-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
          Mostrar mais ({formatNumber(results.length - shown)} restantes)
        </button>
      )}
      <p className="text-sm text-muted-foreground">
        Rua e bairro são extraídos automaticamente do texto do pedido e podem falhar. A busca também procura no texto completo.
      </p>
    </div>
  )
}
