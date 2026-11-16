export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight">Radar Cidades</h1>
        <p className="text-lg text-slate-700">
          O que cada vereador fez desde a posse, a partir de dados públicos oficiais da Câmara Municipal.
        </p>
        <p className="text-slate-600">Em breve.</p>
      </main>
      <footer className="border-t border-slate-200 px-4 py-4 text-center text-sm text-slate-600">
        Projeto independente. Sem vínculo com Câmara, Prefeitura ou partido.
      </footer>
    </div>
  )
}
