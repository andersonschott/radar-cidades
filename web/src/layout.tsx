import { Suspense, use, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Form, isRouteErrorResponse, Link, NavLink, Outlet, useLocation, useMatches, useNavigate, useParams, useRouteError } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, load, type Meta } from './data'
import { LogoMark } from './logo'

const footerText = 'Projeto independente. Sem vínculo com Câmara, Prefeitura ou partido. Dados oficiais, atualizados diariamente.'

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Outlet />
      <footer className="mt-auto border-t pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] text-sm text-muted-foreground sm:pb-6">
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-4"><LogoMark className="size-5 shrink-0" />{footerText}</p>
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

/** Dado da rota (`handle` em main.tsx): nome da seção para o título da aba. */
export interface RouteHandle { title?: string }

// Nome do site na cidade atual ("Radar Santa Bárbara d'Oeste"); o layout atualiza antes de as páginas chamarem usePageTitle.
let siteName = 'Radar Cidades'
const composeTitle = (section?: string) => (section ? `${section} – ${siteName}` : siteName)

/** Para a página trocar o título da aba por algo mais específico (ex.: o nome do vereador). */
export function usePageTitle(title: string | undefined) {
  useEffect(() => { if (title) document.title = composeTitle(title) }, [title])
}

export function CityLayout() {
  const { city = '' } = useParams()
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const previous = useRef(pathname)
  // Ao trocar de página, leva o foco (e o leitor de tela) para o começo do conteúdo novo. Busca (?q=) não conta.
  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  const link = (cls: string) => ({ isActive }: { isActive: boolean }) => `${cls} ${isActive ? 'bg-city/10 text-city' : 'text-muted-foreground hover:text-foreground'}`
  return (
    <>
      <a href="#conteudo" className="sr-only z-20 rounded-lg bg-foreground px-4 py-3 font-bold text-background focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-4 focus:py-3">
        Pular para o conteúdo
      </a>
      <Suspense fallback={null}><DocumentTitle city={city} /><CityAccent city={city} /></Suspense>
      <header className="border-t-4 border-b border-t-city">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to={`/${city}`} className="inline-flex min-h-11 items-center gap-2 text-lg font-black tracking-tight"><LogoMark className="size-7 shrink-0 text-city" /><span><span className="text-city">Radar</span> <Suspense fallback={null}><CityName city={city} /></Suspense></span></Link>
          <nav aria-label="Seções" className="hidden gap-1 sm:flex">
            {sections.map((s) => (
              <NavLink key={s.to} end={s.end} to={`/${city}/${s.to}`} className={link('rounded-lg px-3 py-2 text-sm font-semibold')}>{s.label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      {/* No celular a navegação fica embaixo, ao alcance do polegar. Colunas do tamanho do rótulo: "Como funciona" não quebra. */}
      <nav aria-label="Seções" className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {sections.map((s) => (
          <NavLink key={s.to} end={s.end} to={`/${city}/${s.to}`} className={link('flex min-h-14 flex-auto items-center justify-center px-1.5 text-center text-[13px] font-bold whitespace-nowrap')}>
            {s.label}
          </NavLink>
        ))}
      </nav>
      <main id="conteudo" ref={main} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  )
}

/** Aplica a cor da cidade como variável CSS; só aceita "#rrggbb" vindo do JSON. */
function CityAccent({ city }: { city: string }) {
  const color = use(load<Meta>(`${city}/meta.json`)).data.accentColor
  useLayoutEffect(() => {
    if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return
    document.documentElement.style.setProperty('--city', color)
    return () => { document.documentElement.style.removeProperty('--city') }
  }, [color])
  return null
}

function CityName({ city }: { city: string }) {
  return use(load<Meta>(`${city}/meta.json`)).data.name
}

/** Título da aba por rota: "Vereadores – Radar Santa Bárbara d'Oeste". */
function DocumentTitle({ city }: { city: string }) {
  const name = use(load<Meta>(`${city}/meta.json`)).data.name
  const section = (useMatches().at(-1)?.handle as RouteHandle | undefined)?.title
  // Layout effect: roda antes do usePageTitle das páginas, que pode sobrescrever.
  useLayoutEffect(() => {
    siteName = `Radar ${name}`
    document.title = composeTitle(section)
    return () => { siteName = 'Radar Cidades'; document.title = siteName }
  }, [name, section])
  return null
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

/**
 * Busca por bairro ou rua, igual na página inicial e em "Meu bairro": digita e toca em Buscar (ou Enter).
 */
export function SearchField({ action, q = '' }: { action: string; q?: string }) {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(q)
  // Acompanha chip, "limpar" e botão voltar sem remontar o campo (remontar tiraria o foco de quem digita).
  const [synced, setSynced] = useState(q)
  if (synced !== q) { setSynced(q); setValue(q) }
  const clear = () => {
    setValue('')
    input.current?.focus()
    if (q) navigate(action)
  }
  return (
    <Form action={action} role="search" className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="q" className="sr-only">Bairro ou rua</label>
      <div className="relative flex-1">
        <input ref={input} id="q" name="q" type="search" value={value} onChange={(e) => setValue(e.currentTarget.value)}
          placeholder="Ex.: Jardim Europa" autoComplete="off" enterKeyHint="search"
          className="min-h-14 w-full rounded-2xl border-2 border-foreground/80 bg-card pr-14 pl-4 text-lg placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none" />
        {value && (
          <button type="button" onClick={clear} aria-label="Limpar busca"
            className="absolute inset-y-0 right-1 my-auto grid size-12 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>
      <button type="submit" className="min-h-14 rounded-2xl bg-city px-6 text-lg font-bold text-white hover:opacity-90">Buscar</button>
    </Form>
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
  // Rota sem par (/cidade/xyz) cai no erro da raiz, sem :city; aí a cidade é o primeiro trecho do caminho.
  const params = useParams()
  const { pathname } = useLocation()
  const city = params.city ?? pathname.split('/')[1]
  // Volta para a cidade, a não ser que o erro seja a própria cidade (meta.json não carregou): aí, para a lista de cidades.
  const cityBroken = !(error instanceof Response || isRouteErrorResponse(error)) || (error instanceof Response && error.statusText.includes('meta.json'))
  const home = city && !cityBroken ? `/${city}` : '/'
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-black">{error?.status === 404 ? 'Página não encontrada' : 'Não deu para carregar os dados'}</h1>
      <p className="mt-2 text-muted-foreground">
        Tente de novo em instantes. <Link className="inline-flex min-h-11 items-center font-semibold underline" to={home}>Voltar ao início</Link>
      </p>
    </main>
  )
}

/** Link externo para a fonte oficial (SDD §10: todo dado tem "ver no site oficial"). Só para dados da Câmara. */
export function OfficialLink({ href, label = 'Ver no site oficial' }: { href: string; label?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start text-sm font-bold text-info-foreground underline-offset-4 hover:underline">
      {label} ↗<span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}

/** Link externo que não é fonte oficial (repositório, issues): texto comum sublinhado, sem o azul de "site oficial". */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline">
      {children}<span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}
