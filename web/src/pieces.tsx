import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDate, groupOf, groups, typeSingular } from './data'
import { OfficialLink } from './layout'

/** Título de seção: chamada curta + pergunta grande + explicação simples. */
export function Section({ id, kicker, title, intro, children }: { id: string; kicker: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kicker}</p>
        <h2 id={id} className="mt-1 text-3xl font-black leading-tight tracking-tight text-balance">{title}</h2>
        {intro && <p className="mt-2 text-base text-muted-foreground">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

export function Panel({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border bg-card p-4 shadow-xs sm:p-5 ${className}`}>{children}</div>
}

export function BigNumber({ value, label, tone = 'text-foreground' }: { value: string; label: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-muted/70 p-4">
      <p className={`text-3xl font-black tabular-nums tracking-tight ${tone}`}>{value}</p>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">{label}</p>
    </div>
  )
}

/** Botão-pílula de atalho (bairros sugeridos, filtros). Altura mínima de toque: 44px. */
export function Chip({ to, active, onClick, children }: { to?: string; active?: boolean; onClick?: () => void; children: ReactNode }) {
  const cls = `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap ${
    active ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent'
  }`
  const ref = useRef<HTMLButtonElement>(null)
  // O filtro ativo pode estar fora da faixa rolável; traz para a vista.
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'nearest', inline: 'center' }) }, [active])
  return to
    ? <Link to={to} className={cls}>{children}</Link>
    : <button ref={ref} type="button" aria-pressed={active} onClick={onClick} className={cls}>{children}</button>
}

export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {children}
    </ul>
  )
}

interface CardItem { id: string; type: string; number: number; year: number; date: string; summary: string; url: string }

/** Uma proposição: o texto primeiro, depois tipo, data, número, autoria e o link oficial. */
export function PropositionCard({ item, authors }: { item: CardItem; authors?: ReactNode }) {
  const group = groups.find((g) => g.key === groupOf(item.type))!
  return (
    <li className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
      <p className="text-base font-semibold leading-snug">{item.summary}</p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">{group.label}</span>
        <span>{formatDate(item.date)}</span>
        <span aria-hidden>·</span>
        <span>{typeSingular[item.type] ?? item.type} nº {item.number}/{item.year}</span>
      </p>
      {authors && <p className="text-sm">{authors}</p>}
      <OfficialLink href={item.url} />
    </li>
  )
}

export function MoreButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-12 w-full rounded-xl bg-foreground px-4 text-base font-bold text-background hover:opacity-90">
      {children}
    </button>
  )
}
