import { Suspense, use, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useParams, useRouteError } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, load, type Meta } from './data'

const footerText = 'Projeto independente. Sem vínculo com Câmara, Prefeitura ou partido. Dados oficiais, atualizados diariamente.'

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Outlet />
      <footer className="mt-auto border-t px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground sm:pb-6">
        {footerText}
      </footer>
    </div>
  )
}

const sections = [
  { to: '', label: 'Início', end: true },
  { to: 'bairros', label: 'Meu bairro' },
  { to: 'vereadores', label: 'Vereadores' },
  { to: 'metodologia', label: 'Como funciona' },
]

export function CityLayout() {
  const { city = '' } = useParams()
  const link = (cls: string) => ({ isActive }: { isActive: boolean }) => `${cls} ${isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to={`/${city}`} className="text-lg font-black tracking-tight">Radar <Suspense fallback={null}><CityName city={city} /></Suspense></Link>
          <nav aria-label="Seções" className="hidden gap-1 sm:flex">
            {sections.map((s) => (
              <NavLink key={s.to} end={s.end} to={`/${city}/${s.to}`} className={link('rounded-lg px-3 py-2 text-sm font-semibold')}>{s.label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      {/* No celular a navegação fica embaixo, ao alcance do polegar. */}
      <nav aria-label="Seções" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {sections.map((s) => (
          <NavLink key={s.to} end={s.end} to={`/${city}/${s.to}`} className={link('flex min-h-14 items-center justify-center px-1 text-center text-[13px] font-bold leading-tight')}>
            {s.label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  )
}

function CityName({ city }: { city: string }) {
  return use(load<Meta>(`${city}/meta.json`)).data.name
}

/** "Atualizado em" (F-12), em toda página da cidade. */
export function UpdatedAt({ meta }: { meta: Meta }) {
  return (
    <p className="text-sm text-muted-foreground">
      {meta.lastSuccessfulScrape
        ? <>Atualizado em {formatDateTime(meta.lastSuccessfulScrape).replace(', ', ' às ')}. Conferimos o site da Câmara uma vez por dia.</>
        : 'Ainda sem coleta concluída.'}
    </p>
  )
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  )
}

export function RouteError() {
  const error = useRouteError() as { status?: number } | undefined
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-black">{error?.status === 404 ? 'Página não encontrada' : 'Não deu para carregar os dados'}</h1>
      <p className="mt-2 text-muted-foreground">
        Tente de novo em instantes. <Link className="font-semibold underline" to="/">Voltar ao início</Link>
      </p>
    </main>
  )
}

/** Link externo para a fonte oficial (SDD §10: todo dado tem "ver no site oficial"). */
export function OfficialLink({ href, label = 'Ver no site oficial' }: { href: string; label?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-info-foreground underline-offset-4 hover:underline">
      {label} ↗<span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}
