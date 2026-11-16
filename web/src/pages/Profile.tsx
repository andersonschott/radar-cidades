import { use, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { formatNumber, groupOf, groups, groupTotals, load, type CouncilorProfile, type GroupKey, type Meta } from '../data'
import { OfficialLink, UpdatedAt } from '../layout'
import { BigNumber, Chip, ChipRow, MoreButton, PropositionCard } from '../pieces'
import { Avatar } from './Councilors'

const PageSize = 20

export default function Profile() {
  const { city = '', slug = '' } = useParams()
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  const { councilor, propositions } = use(load<CouncilorProfile>(`${city}/councilors/${slug}.json`)).data
  const [params, setParams] = useSearchParams()
  const group = (params.get('tipo') ?? '') as GroupKey | ''
  const [shown, setShown] = useState(PageSize)
  const totals = groupTotals(councilor.totals.byType)
  const list = group ? propositions.filter((p) => groupOf(p.type) === group) : propositions
  const pick = (g: GroupKey | '') => { setShown(PageSize); setParams(g ? { tipo: g } : {}, { replace: true }) }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar councilor={councilor} size="size-20" />
        <div>
          <h1 className="text-3xl font-black leading-tight tracking-tight">{councilor.name}</h1>
          <p className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 font-semibold">{councilor.party ?? 'Sem partido informado'}</p>
          <div><OfficialLink href={councilor.profileUrl} label="Ficha oficial na Câmara" /></div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <BigNumber value={formatNumber(councilor.totals.propositions)} label="propostas desde a posse" />
        <BigNumber value={formatNumber(councilor.totals.neighborhoodRequests)} label="pedidos que citam rua ou bairro" tone="text-info-foreground" />
      </div>

      <section aria-labelledby="lista" className="flex flex-col gap-3">
        <h2 id="lista" className="text-2xl font-black">O que apresentou</h2>
        <ChipRow label="Filtrar por tipo">
          <li><Chip active={!group} onClick={() => pick('')}>Tudo ({formatNumber(propositions.length)})</Chip></li>
          {groups.filter((g) => totals[g.key] > 0).map((g) => (
            <li key={g.key}><Chip active={group === g.key} onClick={() => pick(g.key)}>{g.label} ({formatNumber(totals[g.key])})</Chip></li>
          ))}
        </ChipRow>
        {group && <p className="text-sm text-muted-foreground">{groups.find((g) => g.key === group)?.hint}</p>}
        <ul className="flex flex-col gap-3">
          {list.slice(0, shown).map((p) => <PropositionCard key={p.id} item={p} />)}
        </ul>
        {shown < list.length && (
          <MoreButton onClick={() => setShown((n) => n + PageSize)}>Mostrar mais ({formatNumber(list.length - shown)} restantes)</MoreButton>
        )}
      </section>
      <p className="text-sm text-muted-foreground">Uma proposta com vários autores aparece para cada um deles. Volume não mede qualidade nem resultado.</p>
      <UpdatedAt meta={meta} />
    </div>
  )
}
