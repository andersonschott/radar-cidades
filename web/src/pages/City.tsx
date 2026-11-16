import { use } from 'react'
import { Form, Link, useParams } from 'react-router'
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDate, formatNumber, load, typeLabels, type Councilor, type Meta } from '../data'
import { OfficialLink } from '../layout'

export default function City() {
  const { city = '' } = useParams()
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  const councilors = use(load<Councilor[]>(`${city}/councilors.json`)).data
  const byType = Object.entries(meta.totals.byType).sort((a, b) => b[1] - a[1])
  const top = [...councilors].sort((a, b) => b.totals.neighborhoodRequests - a.totals.neighborhoodRequests).slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="busca">
        <h1 id="busca" className="text-2xl font-semibold tracking-tight">O que pediram pelo seu bairro?</h1>
        <Form action={`/${city}/bairros`} className="mt-3 flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">Rua ou bairro</label>
          <Input id="q" name="q" placeholder="Ex.: Jardim Europa, Rua do Café" className="flex-1" />
          <button type="submit" className="rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Buscar</button>
        </Form>
      </section>

      <section aria-label="Números da legislatura" className="grid gap-3 sm:grid-cols-3">
        <Stat label="Proposições desde a posse" value={meta.totals.propositions} />
        <Stat label="Pedidos para bairros" value={meta.totals.neighborhoodRequests} />
        <Stat label="Vereadores em exercício" value={meta.councilors} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proposições por tipo</CardTitle>
            <CardDescription>Desde {formatDate('2025-01-01')}, início da legislatura.</CardDescription>
          </CardHeader>
          <CardPanel>
            <dl className="divide-y">
              {byType.map(([type, n]) => (
                <div key={type} className="flex justify-between py-2 text-sm">
                  <dt>{typeLabels[type] ?? type}</dt>
                  <dd className="font-medium tabular-nums">{formatNumber(n)}</dd>
                </div>
              ))}
            </dl>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mais pedidos para bairros registrados</CardTitle>
            <CardDescription>Indicações e requerimentos que citam endereço. Volume não mede qualidade nem atendimento.</CardDescription>
          </CardHeader>
          <CardPanel>
            <ol className="divide-y">
              {top.map((c) => (
                <li key={c.slug} className="flex justify-between py-2 text-sm">
                  <Link to={`/${city}/vereadores/${c.slug}`} className="hover:underline">{c.name}</Link>
                  <span className="font-medium tabular-nums">{formatNumber(c.totals.neighborhoodRequests)}</span>
                </li>
              ))}
            </ol>
            <Link to={`/${city}/vereadores`} className="mt-3 inline-block text-sm font-medium hover:underline">Ver todos os vereadores →</Link>
          </CardPanel>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Fonte: Câmara Municipal de {meta.name}. <OfficialLink href={meta.officialUrl} label="Sistema legislativo oficial" />
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{formatNumber(value)}</CardTitle>
      </CardHeader>
    </Card>
  )
}
