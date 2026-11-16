import { Suspense, use, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useParams, useRouteError } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, load, type Meta } from './data'

const footerText = 'Projeto independente. Sem vínculo com Câmara, Prefeitura ou partido. Dados oficiais, atualizados diariamente.'

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Outlet />
      <footer className="mt-auto border-t px-4 py-4 text-center text-sm text-muted-foreground">{footerText}</footer>
    </div>
  )
}

export function CityLayout() {
  const { city = '' } = useParams()
  return (
    <>
      <Suspense fallback={<HeaderShell city={city} title={<Skeleton className="h-6 w-48" />} />}>
        <CityHeader city={city} />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  )
}

function CityHeader({ city }: { city: string }) {
  const meta = use(load<Meta>(`${city}/meta.json`)).data
  return (
    <HeaderShell
      city={city}
      title={<span>Radar {meta.name}</span>}
      updatedAt={meta.lastSuccessfulScrape ? `Atualizado em ${formatDateTime(meta.lastSuccessfulScrape)}` : 'Ainda sem coleta concluída'}
    />
  )
}

function HeaderShell({ city, title, updatedAt }: { city: string; title: ReactNode; updatedAt?: string }) {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Link to={`/${city}`} className="text-xl font-semibold tracking-tight">{title}</Link>
          {updatedAt && <p className="text-xs text-muted-foreground">{updatedAt}</p>}
        </div>
        <nav aria-label="Seções" className="-mx-1 flex gap-1 overflow-x-auto [scrollbar-width:none]">
          <NavLink end to={`/${city}`} className={tab}>Início</NavLink>
          <NavLink to={`/${city}/vereadores`} className={tab}>Vereadores</NavLink>
          <NavLink to={`/${city}/bairros`} className={tab}>Pedidos por bairro</NavLink>
          <NavLink to={`/${city}/metodologia`} className={tab}>Metodologia</NavLink>
        </nav>
      </div>
    </header>
  )
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

export function RouteError() {
  const error = useRouteError() as { status?: number } | undefined
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold">{error?.status === 404 ? 'Página não encontrada' : 'Não foi possível carregar os dados'}</h1>
      <p className="mt-2 text-muted-foreground">
        Tente de novo em instantes. <Link className="underline" to="/">Voltar ao início</Link>
      </p>
    </main>
  )
}

/** Link externo para a fonte oficial (SDD §10: todo dado tem "ver no site oficial"). */
export function OfficialLink({ href, label = 'Ver no site oficial' }: { href: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-info-foreground underline-offset-4 hover:underline">
      {label}<span className="sr-only"> (abre em nova aba)</span> ↗
    </a>
  )
}
