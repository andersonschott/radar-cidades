import { use, useState } from 'react'
import { useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatNumber, load, typeLabels, type CouncilorProfile } from '../data'
import { OfficialLink } from '../layout'
import { Avatar } from './Councilors'

const PageSize = 20

export default function Profile() {
  const { city = '', slug = '' } = useParams()
  const { councilor, propositions } = use(load<CouncilorProfile>(`${city}/councilors/${slug}.json`)).data
  const [type, setType] = useState('todos')
  const [shown, setShown] = useState(PageSize)
  const types = Object.entries(councilor.totals.byType).sort((a, b) => b[1] - a[1])
  const list = type === 'todos' ? propositions : propositions.filter((p) => p.type === type)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar councilor={councilor} size="size-16" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{councilor.name}</h1>
          <p className="text-muted-foreground">{councilor.party ?? 'Sem partido informado'}</p>
          <OfficialLink href={councilor.profileUrl} label="Perfil no site oficial" />
        </div>
      </header>

      <section aria-label="Totais" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Total label="Proposições" value={councilor.totals.propositions} />
        <Total label="Pedidos para bairros" value={councilor.totals.neighborhoodRequests} />
        {types.slice(0, 2).map(([t, n]) => <Total key={t} label={typeLabels[t] ?? t} value={n} />)}
      </section>

      <section aria-labelledby="lista" className="flex flex-col gap-3">
        <h2 id="lista" className="text-lg font-semibold">Proposições assinadas</h2>
        <label className="flex items-center gap-2 text-sm">
          Tipo
          <select className="h-9 rounded-lg border bg-background px-2" value={type} onChange={(e) => { setType(e.currentTarget.value); setShown(PageSize) }}>
            <option value="todos">Todas ({formatNumber(propositions.length)})</option>
            {types.map(([t, n]) => <option key={t} value={t}>{typeLabels[t] ?? t} ({formatNumber(n)})</option>)}
          </select>
        </label>
        <ul className="divide-y rounded-xl border">
          {list.slice(0, shown).map((p) => (
            <li key={p.id} className="flex flex-col gap-1 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{p.rawType} nº {p.number}/{p.year}</span>
                <span className="text-muted-foreground">{formatDate(p.date)}</span>
                {p.category === 'PedidoBairro' && p.type !== 'Indicacao' && <Badge variant="secondary">Pedido para bairro</Badge>}
              </div>
              <p className="text-sm">{p.summary}</p>
              <OfficialLink href={p.url} />
            </li>
          ))}
        </ul>
        {shown < list.length && (
          <button type="button" onClick={() => setShown((n) => n + PageSize)} className="self-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
            Mostrar mais ({formatNumber(list.length - shown)} restantes)
          </button>
        )}
      </section>
    </div>
  )
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{formatNumber(value)}</CardTitle>
      </CardHeader>
    </Card>
  )
}
