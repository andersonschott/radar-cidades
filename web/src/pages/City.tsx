import { Suspense, use, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatMonthYear, formatNumber, groups, groupTotals, load, titleCase, type Councilor, type Meta, type Request } from '../data'
import { repeatedStreets, topNeighborhoods } from '../insights'
import { OfficialLink, SearchField, UpdatedAt } from '../layout'
import { Avatar, BigNumber, SalaryCounter, Chip, ChipRow, GroupIcon, MoreButton, Panel, Section } from '../pieces'

/** Um caminho só: buscar o bairro → ruas → vereadores → de onde vêm os números. */
export default function City() {
  const { city = '' } = useParams()
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  const councilors = use(load<Councilor[]>(`${city}/councilors.json`)).data
  const totals = groupTotals(meta.totals.byType)

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-balance">
          O que cada vereador de {meta.name} fez desde a posse
        </h1>
        <p className="text-lg text-muted-foreground">
          Tudo o que os {meta.councilors} vereadores apresentaram na Câmara desde {formatDate(meta.termStart)}, com link para o documento oficial.
        </p>
        <SalaryCounter meta={meta} />
      </header>

      <Section id="busca" kicker="Comece por aqui" title="O que pediram pelo seu bairro?" intro="Digite o nome do bairro ou da rua.">
        <SearchField action={`/${city}/bairros`} />
        <Suspense fallback={<Skeleton className="h-11 w-full rounded-full" />}>
          <NeighborhoodChips city={city} />
        </Suspense>
        <div className="grid grid-cols-2 gap-3">
          <BigNumber value={formatNumber(meta.totals.propositions)} label="propostas desde a posse" />
          <BigNumber value={formatNumber(meta.totals.neighborhoodRequests)} label="pedidos que citam rua ou bairro" tone="text-info-foreground" />
        </div>
        <UpdatedAt meta={meta} />
      </Section>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <Streets city={city} />
      </Suspense>

      <Section id="vereadores" kicker="Um por um" title={`Os ${meta.councilors} vereadores`} intro="Veja o que cada um apresentou, com foto, partido e todos os documentos.">
        <Panel>
          <h3 className="font-bold">Quem mais registrou pedidos com endereço</h3>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">Indicações e requerimentos que citam rua ou bairro. Volume não mede qualidade nem atendimento.</p>
          <RankBars city={city} councilors={councilors} />
        </Panel>
        <Link to={`/${city}/vereadores`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-card p-4 font-bold hover:bg-accent">
          <span className="flex -space-x-2">
            {councilors.slice(0, 6).map((c) => <Avatar key={c.slug} councilor={c} size="size-10 ring-2 ring-background" />)}
          </span>
          <span>Ver os {meta.councilors} →</span>
        </Link>
      </Section>

      <Section id="fonte" kicker="Transparência" title="De onde vêm os números">
        <ul className="grid gap-3 sm:grid-cols-2">
          <Fact title="Fonte oficial">Tudo sai do sistema da própria Câmara. Nada é digitado à mão. <OfficialLink href={meta.officialUrl} label="Abrir o sistema da Câmara" /></Fact>
          <Fact title="Pedido não é obra feita">Um pedido é só um pedido. A Prefeitura não é obrigada a fazer, e o sistema da Câmara não informa se ela atendeu.</Fact>
          <Fact title="Rua e bairro">São lidos do texto de cada pedido por regras automáticas e podem sair incompletos.</Fact>
          <Fact title="Achou um erro?">Compare com o documento oficial pelo link de cada item. <Link to={`/${city}/metodologia`} className="font-semibold underline">Como funciona</Link></Fact>
        </ul>
        <Panel>
          <h3 className="font-bold">As {formatNumber(meta.totals.propositions)} propostas, pelo tipo oficial</h3>
          <ul className="mt-2 flex flex-col">
            {groups.map((g) => (
              <li key={g.key}>
                {/* O que cada tipo significa fica a um toque; o número fica sempre à vista. */}
                <details className="group border-b last:border-b-0">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                    <GroupIcon group={g.key} size="size-8" />
                    <span className="flex-1 font-semibold">{g.label}</span>
                    <span className="font-black tabular-nums">{formatNumber(totals[g.key])}</span>
                    <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </summary>
                  <p className="pb-3 pl-11 text-sm text-muted-foreground">{g.hint}</p>
                </details>
              </li>
            ))}
          </ul>
        </Panel>
      </Section>
    </div>
  )
}

function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li><Panel className="h-full">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </Panel></li>
  )
}

function RankBars({ city, councilors }: { city: string; councilors: Councilor[] }) {
  const ranked = [...councilors].sort((a, b) => b.totals.neighborhoodRequests - a.totals.neighborhoodRequests).slice(0, 5)
  const max = ranked[0]?.totals.neighborhoodRequests || 1
  return (
    <ol className="flex flex-col gap-4">
      {ranked.map((c) => (
        <li key={c.slug}>
          <Link to={`/${city}/vereadores/${c.slug}`} className="flex min-h-11 items-center gap-3">
            <Avatar councilor={c} size="size-10" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="min-w-0"><span className="block truncate font-bold">{c.name}</span><span className="block text-sm text-muted-foreground">{c.party ?? 'Sem partido informado'}</span></span>
                <span className="text-lg font-black tabular-nums">{formatNumber(c.totals.neighborhoodRequests)}</span>
              </span>
              <span aria-hidden className="mt-1.5 block h-2 rounded-full bg-muted">
                <span className="block h-2 rounded-full bg-info-foreground" style={{ width: `${(c.totals.neighborhoodRequests / max) * 100}%` }} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

function NeighborhoodChips({ city }: { city: string }) {
  const requests = use(load<Request[]>(`${city}/requests.json`)).data
  const top = useMemo(() => topNeighborhoods(requests, 10), [requests])
  return (
    <ChipRow label="Bairros mais citados">
      {top.map((n) => <li key={n.key}><Chip to={`/${city}/bairros?q=${encodeURIComponent(n.key)}`}>{titleCase(n.key)}</Chip></li>)}
    </ChipRow>
  )
}

function Streets({ city }: { city: string }) {
  const requests = use(load<Request[]>(`${city}/requests.json`)).data
  const streets = useMemo(() => repeatedStreets(requests), [requests])
  const [shown, setShown] = useState(3)

  return (
    <Section id="ruas" kicker="Pedidos repetidos" title="Ruas com mais pedidos"
      intro="Quando o mesmo endereço aparece em vários pedidos. O site da Câmara não mostra esse cruzamento.">
      <ul className="grid gap-3 lg:grid-cols-2">
        {streets.slice(0, shown).map((s) => (
          <li key={`${s.street}|${s.neighborhood}`}>
            <Link to={`/${city}/bairros?q=${encodeURIComponent(s.neighborhood ? `${s.street} ${s.neighborhood}` : s.street)}`}
              className="flex gap-4 rounded-2xl border bg-card p-4 hover:bg-accent">
              <span className="w-16 shrink-0 text-center">
                <span className="block text-4xl font-black leading-none tabular-nums">{s.count}</span>
                <span className="text-xs font-bold uppercase text-muted-foreground">pedidos</span>
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-lg font-bold leading-tight">{titleCase(s.street)}</span>
                {s.neighborhood && <span className="text-muted-foreground">{titleCase(s.neighborhood)}</span>}
                <span className="text-sm text-muted-foreground">
                  {s.authors === 1 ? '1 vereador pediu' : `${s.authors} vereadores pediram`} · de {formatMonthYear(s.from)} a {formatMonthYear(s.to)}
                </span>
                <span className="text-sm font-bold">Ver os pedidos →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {shown < streets.length && (
        <MoreButton onClick={() => setShown((n) => n + 10)}>Mostrar mais ruas ({formatNumber(streets.length - shown)})</MoreButton>
      )}
      <p className="text-sm text-muted-foreground">Pedido repetido não prova que a Prefeitura deixou de atender: pode ser outro trecho da mesma rua ou outro serviço. Abra e leia os pedidos.</p>
      <Link to={`/${city}/bairros`} className="font-bold underline underline-offset-4">Ver todos os {formatNumber(requests.length)} pedidos da cidade, dos mais novos aos mais antigos</Link>
    </Section>
  )
}
