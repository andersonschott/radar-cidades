import { Suspense, use, useMemo, useState, type ReactNode } from 'react'
import { Form, Link, useParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatMonthYear, formatNumber, groups, groupTotals, load, titleCase, today, type Councilor, type Meta, type Request } from '../data'
import { repeatedStreets, topNeighborhoods } from '../insights'
import { OfficialLink, UpdatedAt } from '../layout'
import { Authors, Avatar, BigNumber, Chip, ChipRow, GroupIcon, MoreButton, Panel, PropositionCard, Section } from '../pieces'


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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <BigNumber value={formatNumber(meta.totals.propositions)} label="propostas desde a posse" />
          <BigNumber value={formatNumber(meta.totals.neighborhoodRequests)} label="pedidos que citam rua ou bairro" tone="text-info-foreground" />
          <BigNumber value={formatNumber(totals.lei)} label="propostas de lei" />
          <BigNumber value={formatNumber(totals.mocao)} label="moções" />
        </div>
        <UpdatedAt meta={meta} />
      </header>

      <Section id="busca" kicker="Comece por aqui" title="O que pediram pelo seu bairro?" intro="Digite o nome do bairro ou da rua.">
        <Form action={`/${city}/bairros`} role="search" className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="q" className="sr-only">Bairro ou rua</label>
          <input id="q" name="q" type="search" placeholder="Ex.: Jardim Europa" autoComplete="off"
            className="min-h-14 flex-1 rounded-2xl border-2 border-foreground/80 bg-card px-4 text-lg outline-none focus-visible:ring-4 focus-visible:ring-ring/40" />
          <button type="submit" className="min-h-14 rounded-2xl bg-foreground px-6 text-lg font-bold text-background">Buscar</button>
        </Form>
        <Suspense fallback={<Skeleton className="h-11 w-full rounded-full" />}>
          <NeighborhoodChips city={city} />
        </Suspense>
      </Section>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
        <Section id="quem" kicker="Pedidos para os bairros" title="Quem mais registrou pedidos com endereço"
          intro="Indicações e requerimentos que citam rua ou bairro. Volume não mede qualidade nem atendimento.">
          <Panel>
            <RankBars city={city} councilors={councilors} />
          </Panel>
        </Section>
        <Section id="bairros" kicker="No mapa da cidade" title="Bairros mais citados" intro="Quantos pedidos citam cada bairro. Toque para ver os pedidos.">
          <Panel>
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <TopNeighborhoods city={city} />
            </Suspense>
          </Panel>
        </Section>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <StreetsAndRecent city={city} councilors={councilors} />
      </Suspense>

      <Section id="tipos" kicker="O trabalho da Câmara" title="Que tipo de proposta eles fazem"
        intro={`São ${formatNumber(meta.totals.propositions)} propostas desde a posse, separadas pelo tipo oficial.`}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.key}>
              <Panel className="flex h-full items-start gap-4">
                <GroupIcon group={g.key} size="size-12" />
                <div>
                  <p className="text-3xl font-black tabular-nums tracking-tight">{formatNumber(totals[g.key])}</p>
                  <p className="text-lg font-bold leading-tight">{g.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{g.hint}</p>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="vereadores" kicker="Um por um" title={`Os ${meta.councilors} vereadores`} intro="Veja o que cada um apresentou, com foto, partido e todos os documentos.">
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
          <Fact title="Pedido não é obra feita">Um pedido é só um pedido. O sistema da Câmara não informa se a Prefeitura atendeu.</Fact>
          <Fact title="Rua e bairro">São lidos do texto de cada pedido por regras automáticas e podem sair incompletos.</Fact>
          <Fact title="Achou um erro?">Compare com o documento oficial pelo link de cada item. <Link to={`/${city}/metodologia`} className="font-semibold underline">Como funciona</Link></Fact>
        </ul>
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
  const [all, setAll] = useState(false)
  const ranked = [...councilors].sort((a, b) => b.totals.neighborhoodRequests - a.totals.neighborhoodRequests)
  const max = ranked[0]?.totals.neighborhoodRequests || 1
  return (
    <>
      <ol className="flex flex-col gap-4">
        {(all ? ranked : ranked.slice(0, 5)).map((c) => (
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
      {!all && <button type="button" onClick={() => setAll(true)} className="mt-4 min-h-11 text-sm font-bold underline-offset-4 hover:underline">Ver os {ranked.length} →</button>}
    </>
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

function TopNeighborhoods({ city }: { city: string }) {
  const requests = use(load<Request[]>(`${city}/requests.json`)).data
  const top = useMemo(() => topNeighborhoods(requests, 8), [requests])
  return (
    <ol className="flex flex-col">
      {top.map((n) => (
        <li key={n.key}>
          <Link to={`/${city}/bairros?q=${encodeURIComponent(n.key)}`} className="flex min-h-11 items-center gap-3 font-semibold text-info-foreground hover:underline">
            <GroupIcon group="melhoria" size="size-8" />
            <span className="flex-1">{titleCase(n.key)}</span>
            <span className="font-black tabular-nums text-foreground">{formatNumber(n.count)}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

function StreetsAndRecent({ city, councilors }: { city: string; councilors: Councilor[] }) {
  const requests = use(load<Request[]>(`${city}/requests.json`)).data
  const bySlug = useMemo(() => new Map(councilors.map((c) => [c.slug, c])), [councilors])
  const streets = useMemo(() => repeatedStreets(requests), [requests])
  const recent = useMemo(() => {
    const now = today()
    // Datas futuras existem na fonte (erro de digitação); ficam fora de "mais recentes".
    return requests.filter((r) => r.date <= now).sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
  }, [requests])
  const [shownStreets, setShownStreets] = useState(5)

  return (
    <>
      <Section id="ruas" kicker="Pedidos repetidos" title="Ruas com mais pedidos"
        intro="Quando o mesmo endereço aparece em vários pedidos. O site da Câmara não mostra esse cruzamento.">
        <ul className="grid gap-3 lg:grid-cols-2">
          {streets.slice(0, shownStreets).map((s) => (
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
        {shownStreets < streets.length && (
          <MoreButton onClick={() => setShownStreets((n) => n + 10)}>Mostrar mais ruas ({formatNumber(streets.length - shownStreets)})</MoreButton>
        )}
        <p className="text-sm text-muted-foreground">Pedido repetido não prova que a Prefeitura deixou de atender: pode ser outro trecho da mesma rua ou outro serviço. Abra e leia os pedidos.</p>
      </Section>

      <Section id="recentes" kicker="Na cidade inteira" title="Os pedidos mais recentes">
        <ul className="flex flex-col gap-3">
          {recent.slice(0, 3).map((r) => (
            <PropositionCard key={r.id} item={r} authors={<Authors city={city} slugs={r.authors} councilors={bySlug} />} />
          ))}
        </ul>
        <Link to={`/${city}/bairros`} className="flex min-h-12 items-center justify-center rounded-xl bg-foreground px-4 text-base font-bold text-background">
          Ver todos os {formatNumber(requests.length)} pedidos
        </Link>
      </Section>
    </>
  )
}
