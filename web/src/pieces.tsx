import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDate, groupOf, groups, typeSingular, type Councilor, type GroupKey } from './data'
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

const icons: Record<GroupKey, string> = {
  melhoria: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 10h.01',
  cobranca: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01',
  mocao: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.4 9.3l6-.7z',
  lei: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  outros: 'M6 12h.01M12 12h.01M18 12h.01',
}

/** Ícone do grupo num quadradinho com o fundo claro da cor do grupo (a cor nunca vem sozinha: há rótulo ao lado). */
export function GroupIcon({ group, size = 'size-10' }: { group: GroupKey; size?: string }) {
  const g = groups.find((x) => x.key === group)!
  return (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-xl ${g.soft}`}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icons[group]} /></svg>
    </span>
  )
}

export function Avatar({ councilor, size = 'size-8' }: { councilor: Councilor; size?: string }) {
  return councilor.photoUrl ? (
    <img src={councilor.photoUrl} alt="" loading="lazy" className={`${size} shrink-0 rounded-full bg-muted object-cover`} />
  ) : (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground`}>
      {councilor.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
    </span>
  )
}

/** Autores com foto pequena; depois de 3, "+N". Slug sem vereador (suplente, Mesa) aparece pelo slug. */
export function Authors({ city, slugs, councilors }: { city: string; slugs: string[]; councilors: Map<string, Councilor> }) {
  if (slugs.length === 0) return null
  return (
    <ul aria-label="Quem pediu" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {slugs.slice(0, 3).map((slug) => {
        const c = councilors.get(slug)
        return (
          <li key={slug}>
            <Link to={`/${city}/vereadores/${slug}`} className="flex min-h-8 items-center gap-1.5 font-semibold hover:underline">
              {c && <Avatar councilor={c} size="size-6" />}{c?.name ?? slug}
            </Link>
          </li>
        )
      })}
      {slugs.length > 3 && <li className="text-muted-foreground">+{slugs.length - 3}</li>}
    </ul>
  )
}

interface CardItem { id: string; type: string; number: number; year: number; date: string; summary: string; url: string }

/** Uma proposição: ícone do grupo, o texto, etiqueta colorida, data, número, autoria e o link oficial. */
export function PropositionCard({ item, authors }: { item: CardItem; authors?: ReactNode }) {
  const group = groups.find((g) => g.key === groupOf(item.type))!
  return (
    <li className="flex gap-3 rounded-2xl border bg-card p-4">
      <GroupIcon group={group.key} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-base font-semibold leading-snug">{item.summary}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className={`rounded-md px-2 py-0.5 font-semibold ${group.soft}`}>{group.label}</span>
          <span>{formatDate(item.date)}</span>
          <span aria-hidden>·</span>
          <span>{typeSingular[item.type] ?? item.type} nº {item.number}/{item.year}</span>
        </p>
        {authors}
        <OfficialLink href={item.url} />
      </div>
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
