import { lazy, Suspense, use, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, load, titleCase, type Councilor, type Meta, type Places, type Request } from '../data'
import { placeCounts, topNeighborhoods } from '../insights'
import { SearchField, UpdatedAt } from '../layout'
import { Authors, Chip, ChipRow, MoreButton, PropositionCard } from '../pieces'
import { buildIndex, searchRequests } from '../search'

const PageSize = 20
const NeighborhoodMap = lazy(() => import('../NeighborhoodMap'))

// places.json é opcional (cidade sem tools/geo não tem mapa): falha vira null, com cache para o use() não pedir de novo.
const placesCache = new Map<string, Promise<Places | null>>()
const loadPlaces = (city: string) => {
  let p = placesCache.get(city)
  if (!p) placesCache.set(city, (p = load<Places>(`${city}/places.json`).then((e) => e.data, () => null)))
  return p
}

export default function Neighborhoods() {
  const { city = '' } = useParams()
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  const requests = use(load<Request[]>(`${city}/requests.json`)).data
  const councilors = use(load<Councilor[]>(`${city}/councilors.json`)).data
  const bySlug = useMemo(() => new Map(councilors.map((c) => [c.slug, c])), [councilors])
  const index = useMemo(() => buildIndex(requests), [requests])
  const top = useMemo(() => topNeighborhoods(requests, 12), [requests])
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  // A busca só muda ao enviar (Buscar/Enter) ou tocar num chip: a contagem (aria-live) não fala a cada tecla.
  const results = useMemo(() => searchRequests(requests, index, q), [requests, index, q])
  const [more, setMore] = useState({ q, shown: PageSize })
  const shown = more.q === q ? more.shown : PageSize
  const base = `/${city}/bairros`

  return (
    <div className="w-full max-w-3xl flex flex-col gap-5">
      <div>
        <h1 className="text-4xl font-black leading-tight tracking-tight">O que pediram pelo seu bairro?</h1>
        <p className="mt-2 text-lg text-muted-foreground">Digite o bairro ou a rua. Sem nada digitado, você vê a cidade inteira.</p>
      </div>
      <SearchField action={base} q={q} />
      <ChipRow label="Bairros mais citados">
        {top.map((n) => (
          <li key={n.key}><Chip active={q === n.key} to={q === n.key ? base : `${base}?q=${encodeURIComponent(n.key)}`}>{titleCase(n.key)}</Chip></li>
        ))}
      </ChipRow>

      {!q && (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl sm:h-[28rem]" />}>
          <CityMap city={city} requests={requests} base={base} />
        </Suspense>
      )}

      <p className="text-lg" aria-live="polite">
        <strong className="text-3xl font-black tabular-nums">{formatNumber(results.length)}</strong>{' '}
        {q ? <>pedidos para <strong>“{q}”</strong></> : <>pedidos na <strong>cidade inteira</strong>, dos mais novos para os mais antigos</>}
      </p>

      {results.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhum pedido encontrado</EmptyTitle>
            <EmptyDescription>Tente só o nome do bairro ou da rua, sem número.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to={base} className="flex min-h-12 items-center justify-center rounded-xl bg-city px-6 text-base font-bold text-white hover:opacity-90">
              Ver a cidade inteira
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.slice(0, shown).map((r) => (
            <PropositionCard key={r.id} item={r} authors={<Authors city={city} slugs={r.authors} councilors={bySlug} />} />
          ))}
        </ul>
      )}
      {shown < results.length && (
        <MoreButton onClick={() => setMore({ q, shown: shown + PageSize })}>Mostrar mais ({formatNumber(results.length - shown)} restantes)</MoreButton>
      )}
      <p className="max-w-prose text-sm text-muted-foreground">
        Rua e bairro são lidos do texto de cada pedido por regras automáticas e podem falhar. A busca também procura no texto completo.
        Pedidos sem autor listado foram feitos por suplentes, ex-vereadores ou pela Mesa.
      </p>
      <UpdatedAt meta={meta} />
    </div>
  )
}

/** Onde se concentram os pedidos: bolinha por bairro, posição aproximada do bairro (nunca do endereço). */
function CityMap({ city, requests, base }: { city: string; requests: Request[]; base: string }) {
  const places = use(loadPlaces(city))
  const counts = useMemo(() => (places ? placeCounts(requests, places.places) : null), [places, requests])
  if (!places || !counts || counts.items.length === 0) return null
  return (
    <section aria-labelledby="mapa" className="flex flex-col gap-3">
      <h2 id="mapa" className="text-2xl font-black tracking-tight">Onde se concentram os pedidos</h2>
      <div role="img" aria-label={`Mapa com ${counts.items.length} bairros. Os que têm mais pedidos estão nos atalhos acima.`}>
        <NeighborhoodMap items={counts.items} base={base} attribution={places.attribution} />
      </div>
      <p className="max-w-prose text-sm text-muted-foreground">
        Cada bolinha é um bairro, do tamanho do número de pedidos; toque para ver os pedidos dele.
        A posição é a do bairro, não a do endereço. {formatNumber(counts.mapped)} de {formatNumber(counts.withNeighborhood)} pedidos
        com bairro estão no mapa; bairros que não conseguimos localizar ficam de fora.
      </p>
    </section>
  )
}
