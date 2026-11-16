import { use } from 'react'
import { Link } from 'react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, load, type CitySummary } from '../data'
import { LogoMark } from '../logo'

export default function Home() {
  const cities = use(load<CitySummary[]>('cities.json')).data
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="flex items-center gap-3 text-5xl font-black tracking-tight"><LogoMark className="size-12 shrink-0" />Radar Cidades</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        O que cada vereador fez desde a posse, a partir de dados públicos oficiais da Câmara Municipal.
      </p>
      <h2 className="mt-10 mb-3 text-xl font-bold">Escolha a cidade</h2>
      <ul className="flex flex-col gap-3">
        {cities.map((c) => (
          <li key={c.slug}>
            <Card render={<Link to={`/${c.slug}`} />} className="min-h-14 transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>{c.name} – {c.uf}</CardTitle>
                <CardDescription>
                  {c.lastUpdated ? `Atualizado em ${formatDateTime(c.lastUpdated)}` : 'Ainda sem coleta concluída'}
                </CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  )
}
