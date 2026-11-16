# Radar Cidades — Spec-Driven Development (SDD)

> Especificação executável para o Claude Code. Coloque este arquivo em `docs/SDD.md` do novo repositório e rode o prompt da seção 14.
> Versão 1.0 — 2026-11-16

---

## 0. Decisões a confirmar ANTES de executar

| # | Decisão | Default nesta spec | Trocar? |
|---|---|---|---|
| D1 | Nome do repo | `andersonschott/radar-cidades` | |
| D2 | Visibilidade | Público | |
| D3 | Licença do código | **AGPL-3.0** (quem fizer fork e hospedar precisa abrir o código). Alternativa: Apache-2.0 | |
| D4 | Licença dos dados publicados | CC BY 4.0 | |
| D5 | Região Azure | `brazilsouth` (fallback `eastus2` se Flex Consumption indisponível) | |
| D6 | Nome do produto | "Radar Cidades" (por cidade: "Radar Santa Bárbara", "Radar Piracicaba") | |
| D7 | Domínio | nenhum no M0–M3 (usa `*.azurestaticapps.net`) | |

O Claude Code deve **parar e perguntar** se alguma dessas estiver em aberto.

---

## 1. Visão

Site independente, apartidário e automatizado que mostra **o que cada vereador fez desde a posse**, por cidade, a partir **exclusivamente** de dados públicos oficiais da Câmara Municipal. Inspirado em radarptlandia.org (Hortolândia). Implementação própria, do zero.

**Cidades iniciais:** Santa Bárbara d'Oeste (M1) e Piracicaba (M3). Arquitetura multi-cidade desde o dia 1: nova cidade = configuração + (eventualmente) um adaptador novo.

### Não-objetivos (fora do escopo até v1)
- Login, comentários, contas de usuário.
- Opinião editorial, notas ou "score" de vereador.
- Dados digitados à mão. Tudo vem da fonte oficial, com link.
- Afirmar que a Prefeitura atendeu/ignorou um pedido (a fonte não tem esse dado).

---

## 2. Funcionalidades (por cidade)

| ID | Feature | Descrição | Marco |
|---|---|---|---|
| F-01 | Lista de vereadores | Nome, partido, foto (URL oficial), link oficial. Busca por nome, filtro por partido | M1 |
| F-02 | "O que pediram pelo seu bairro?" | Busca por rua/bairro nas indicações/requerimentos. Sem termo = cidade toda, mais recentes primeiro | M1 |
| F-03 | Perfil do vereador | Totais por tipo de proposição + lista paginada com link oficial | M1 |
| F-04 | "O problema que não some" | Ruas com ≥2 pedidos em datas distintas. Aviso fixo: "pedido repetido não prova que a Prefeitura ignorou" | M2 |
| F-05 | "Homenagem ou trabalho?" | Classificação das proposições em categorias (seção 7) | M2 |
| F-06 | Presença | % de presença em sessões, ranking "quem mais faltou" | M2 |
| F-07 | Votações | Votos nominais; ranking "quem mais votou não" | M2 |
| F-08 | Contador de salários | Estimativa: `cadeiras × subsídio × meses desde a posse`, animado no front, rotulado como **estimativa** com fonte do subsídio | M2 |
| F-09 | Rankings | Ordenar vereadores por: nome, faltas, projetos de lei, homenagens, pedidos para bairros, votos "não" | M2 |
| F-10 | Metodologia | Página explicando fontes, regras de classificação, limitações, data da última coleta | M1 |
| F-11 | Seletor de cidade | Home lista cidades disponíveis | M1 |
| F-12 | "Atualizado em" | Timestamp da última coleta bem-sucedida em toda página | M1 |

**Regra de ouro:** todo número exibido tem link para o registro oficial que o originou.

---

## 3. Arquitetura

```
Timer Trigger (diário, 06:00 BRT)
  └─► enfileira 1 msg por cidade ativa  ──► Queue "scrape-city"
                                               │
                         ScrapeCityFunction (Queue Trigger)
                           ├─ resolve ILegislativeSource pelo city.Source
                           ├─ coleta incremental (since = último sucesso − 7 dias)
                           ├─ classifica + extrai endereços
                           ├─ upsert no Azure SQL
                           └─ enfileira ──► Queue "publish-city"
                                               │
                         PublishCityFunction (Queue Trigger)
                           ├─ consulta agregados no SQL
                           └─ grava JSON em Blob  $web-data/{city}/*.json
                                               │
React SPA (Azure Static Web Apps) ──fetch──────┘
```

Princípios:
- **Site 100% estático em runtime.** O front nunca chama API dinâmica, só lê JSON pré-calculado. Barato, rápido, aguenta pico.
- **Isolamento por cidade.** Falha numa cidade não afeta outras; retry por mensagem (poison queue após 5 tentativas).
- **Idempotência.** Reexecutar a coleta não duplica nada (upsert por chave natural, seção 6).
- **Coleta educada.** Ver seção 8.

---

## 4. Stack

| Camada | Escolha | Licença |
|---|---|---|
| Runtime | .NET 10, Azure Functions **isolated worker**, plano **Flex Consumption** | MIT |
| HTML parsing | AngleSharp | MIT |
| HTTP resiliência | Microsoft.Extensions.Http.Resilience (Polly v8) | MIT / BSD-3 |
| ORM | EF Core 10 (SqlServer provider) | MIT |
| Banco | Azure SQL Database **serverless, free offer** | — |
| Storage | Azure Storage (filas + blob `$web-data`) | — |
| Observabilidade | Application Insights + Log Analytics | — |
| Front | React 19 + Vite + TypeScript + React Router + Tailwind CSS | MIT |
| Busca no front | MiniSearch | MIT |
| Hospedagem front | Azure Static Web Apps (Free) | — |
| IaC | Bicep | — |
| CI/CD | GitHub Actions com OIDC (federated credential, sem secrets de senha) | — |
| Testes .NET | xUnit + Shouldly + NSubstitute + Testcontainers (MsSql) | Apache/BSD/MIT |
| Testes front | Vitest + Testing Library | MIT |

**Vetados** (licença): MediatR ≥12, FluentAssertions ≥8, AutoMapper ≥15, Hangfire.Pro. CI roda `nuget-license` com allowlist `Apache-2.0;MIT;BSD-3-Clause;BSD-2-Clause;MS-PL;Microsoft.NET.Library` (separador **ponto e vírgula**) e `license-checker` no npm com allowlist equivalente + `ISC;0BSD`.

---

## 5. Estrutura do repositório

```
radar-cidades/
├── Radar.slnx
├── global.json                      # .NET 10, rollForward latestFeature
├── Directory.Build.props            # net10.0, Nullable, ImplicitUsings, TreatWarningsAsErrors, AnalysisMode=All
├── Directory.Packages.props         # Central Package Management
├── cities/                          # configuração das cidades (fonte da verdade)
│   ├── santa-barbara-doeste.json
│   └── piracicaba.json
├── src/
│   ├── Radar.Domain/                # entidades, value objects, enums. Zero dependências externas
│   ├── Radar.Sources/               # ILegislativeSource + adaptadores (Siscam/, Sapl/, ...)
│   ├── Radar.Classification/        # categorização + extração de endereço (puro, sem I/O)
│   ├── Radar.Data/                  # EF Core DbContext, configs, migrations, queries de agregação
│   ├── Radar.Publishing/            # monta os DTOs JSON públicos (contrato seção 9)
│   └── Radar.Functions/             # triggers, DI, composição
├── tests/
│   ├── Radar.Sources.Tests/         # usa fixtures HTML salvas
│   │   └── Fixtures/siscam/santa-barbara-doeste/*.html
│   ├── Radar.Classification.Tests/
│   ├── Radar.Data.Tests/            # Testcontainers MsSql
│   ├── Radar.Publishing.Tests/      # snapshot do JSON gerado
│   └── Radar.Architecture.Tests/    # NetArchTest
├── web/                             # React + Vite
├── infra/
│   ├── main.bicep
│   ├── modules/*.bicep
│   └── parameters/prod.bicepparam
├── docs/
│   ├── SDD.md                       # este arquivo
│   ├── adr/0001-arquitetura.md
│   ├── sources/siscam.md            # mapeamento descoberto das páginas
│   └── editorial.md                 # guia de linguagem (seção 11)
├── .github/workflows/{ci.yml,deploy.yml}
├── CLAUDE.md
├── LICENSE
└── README.md
```

**Regras de dependência (architecture tests):**
- `Domain` não referencia nada do projeto.
- `Classification` → só `Domain`.
- `Sources` → só `Domain`.
- `Data` → `Domain`.
- `Publishing` → `Domain`, `Data`.
- `Functions` → todos. Nenhum projeto referencia `Functions`.

---

## 6. Modelo de dados

```
City(Id, Slug UK, Name, Uf, IbgeCode, SourceSystem, BaseUrl, Seats, MonthlySalary,
     SalarySourceUrl, TermStart, Active)

Party(Id, Acronym UK, Name)

Councilor(Id, CityId, SourceId, Name, Slug, PhotoUrl, ProfileUrl,
          UK(CityId, SourceId))

Mandate(Id, CouncilorId, PartyId, Start, End?, IsSubstitute)

Proposition(Id, CityId, SourceId, Type, Number, Year, PresentedOn, Summary, FullText?,
            Status?, OfficialUrl, Category, ContentHash, FirstSeenAt, LastSeenAt,
            UK(CityId, SourceId))

PropositionAuthor(PropositionId, CouncilorId)          # N:N

PropositionLocation(Id, PropositionId, StreetRaw, StreetNormalized,
                    NeighborhoodRaw, NeighborhoodNormalized)

Session(Id, CityId, SourceId, Date, Kind, OfficialUrl, UK(CityId, SourceId))

Attendance(SessionId, CouncilorId, Present bit, Justified bit?)

RollCallVote(Id, SessionId, PropositionId?, Subject, OfficialUrl)
VoteCast(RollCallVoteId, CouncilorId, Value)  # Sim | Nao | Abstencao | Ausente

ScrapeRun(Id, CityId, StartedAt, FinishedAt?, Status, Stats json, Error?)
```

Enums:
- `PropositionType`: `ProjetoLei`, `ProjetoLeiComplementar`, `ProjetoResolucao`, `ProjetoDecretoLegislativo`, `Indicacao`, `Requerimento`, `Mocao`, `Emenda`, `Outro`. Mapear o tipo bruto da fonte; tipo desconhecido vira `Outro` e é logado como warning.
- `PropositionCategory`: ver seção 7.

Upsert: chave `(CityId, SourceId)`. Se `ContentHash` mudou, atualiza campos + `LastSeenAt`. Nunca deleta. Se o registro sumir da fonte, mantém (log).

---

## 7. Classificação (Radar.Classification)

Funções **puras**, determinísticas, 100% testadas por tabela de casos.

### 7.1 Categoria
| Categoria | Regra (ordem de avaliação) |
|---|---|
| `Homenagem` | Tipo `Mocao` com palavras de congratulação/aplauso/pesar, ou `ProjetoDecretoLegislativo`/`ProjetoResolucao` concedendo título, medalha, diploma, cidadania honorária; ou `ProjetoLei` que **denomina** via pública/próprio ("denomina", "dá denominação") |
| `PedidoBairro` | `Indicacao`, ou `Requerimento` com endereço extraído |
| `Fiscalizacao` | `Requerimento` pedindo informações ("solicita informações", "requer informações") |
| `Legislacao` | `ProjetoLei*` restante, `Emenda` |
| `DataComemorativa` | Projeto que institui dia/semana/mês comemorativo |
| `Outro` | o resto |

Palavras-chave ficam em `Radar.Classification/Rules/*.json` (versionadas, citadas na página de metodologia). Comparação case/acento-insensitive.

### 7.2 Extração de endereço
- Regex sobre `Summary`/`FullText` normalizados para logradouros: `Rua|R\.|Avenida|Av\.?|Travessa|Tv\.|Alameda|Al\.|Praça|Pça\.?|Estrada|Rodovia|Viela|Largo` + nome.
- Bairro: após "bairro", "no", "na", "Jardim|Jd\.?|Vila|Vl\.?|Parque|Pq\.?|Residencial|Res\.?|Conjunto|Chácara|Núcleo".
- Normalização: remove acento, caixa baixa, expande abreviações (`jd`→`jardim`, `av`→`avenida`), colapsa espaços.
- Uma proposição pode gerar N locations.
- **M2 opcional:** dicionário de bairros oficiais por cidade (`cities/{slug}.neighborhoods.json`) para casar variações.

### 7.3 "Problema que não some"
Agrupar `PedidoBairro` por `StreetNormalized` (+ bairro quando houver). Mostrar grupos com ≥2 proposições em datas distintas, ordenado por contagem desc.

---

## 8. Coleta (Radar.Sources)

### 8.1 Contrato
```csharp
public interface ILegislativeSource
{
    SourceSystem System { get; }
    Task<IReadOnlyList<CouncilorDto>> GetCouncilorsAsync(CityConfig city, CancellationToken ct);
    IAsyncEnumerable<PropositionDto> GetPropositionsAsync(CityConfig city, DateOnly since, CancellationToken ct);
    IAsyncEnumerable<SessionDto> GetSessionsAsync(CityConfig city, DateOnly since, CancellationToken ct);
}
```
Resolvido via keyed services: `services.AddKeyedScoped<ILegislativeSource, SiscamSource>(SourceSystem.Siscam)`.

Capacidades parciais são válidas: se um sistema não expõe votos nominais, o adaptador retorna vazio e a cidade declara `"capabilities": ["councilors","propositions","attendance"]` na config; o front esconde seções não suportadas.

### 8.2 Etiqueta de coleta (obrigatório)
- `HttpClient` nomeado por host, **máx. 1 requisição/segundo por host** (rate limiter), concorrência 1 por host.
- `User-Agent: RadarCidades/1.0 (+https://<url-do-site>/metodologia)`.
- Respeitar `robots.txt` (checar no início de cada run; se proibido, abortar a cidade e logar erro).
- Retry exponencial só para 5xx/timeout (máx. 3). 4xx não repete.
- Coleta **incremental**: `since = último ScrapeRun bem-sucedido − 7 dias`. Primeira carga: desde `TermStart`.
- Primeira carga completa roda **manualmente** (HTTP trigger protegido por function key, `POST /api/admin/backfill/{city}`) e não no timer.

### 8.3 Descoberta da fonte (tarefa obrigatória antes de codar o adaptador)
Para cada sistema novo, o Claude Code deve:
1. Navegar manualmente (curl com o UA acima, ≤1 req/s) e mapear URLs de: lista de vereadores, perfil, pesquisa de proposições (paginação + filtros por tipo/data), detalhe de proposição, lista de sessões, presença, votações.
2. Verificar se existe endpoint JSON/XHR por trás das páginas (inspecionar HTML/JS). Preferir JSON quando houver.
3. Salvar 2–3 exemplos reais de cada página em `tests/Radar.Sources.Tests/Fixtures/{system}/{city}/`.
4. Documentar tudo em `docs/sources/{system}.md` (URLs, parâmetros, seletores CSS, paginação, limitações, o que **não** está disponível).
5. Só então escrever testes de parsing contra as fixtures e o adaptador.

### 8.4 Fontes conhecidas
- **Santa Bárbara d'Oeste — SISCAM**
  - Portal: `https://santabarbara.siscam.com.br/` (pesquisa: `/Documentos/Pesquisa?...`, arquivos `/arquivo?Id=`)
  - Consulta: `https://consulta.siscam.com.br/camarasantabarbara/` (`/sessoes`, `/protocolo`, `/index/75`)
  - Site da Câmara: `https://www.camarasantabarbara.sp.gov.br/` (vereadores em `/Vereador/Listar/{id}`, partidos em `/Vereador/ListarPartido/{id}`)
  - Transparência (subsídio): `https://transparencia-cmsantabarbaradoeste.smarapd.com.br/`
- **Piracicaba — desconhecido.** Site `https://www.camarapiracicaba.sp.gov.br/` retornou **403 a partir de IP de datacenter**. M3 começa com descoberta a partir de máquina local. Se o bloqueio persistir no Azure, ver ADR futura (opções: pedir liberação à Câmara via e-mail/LAI, ou runner self-hosted no Brasil).

---

## 9. Contrato JSON público

Blob container `data` (acesso público de leitura, CORS liberado para o domínio do SWA). Caminho: `/{citySlug}/{arquivo}.json`. Todo arquivo tem envelope:

```json
{ "schemaVersion": 1, "generatedAt": "2026-11-16T09:12:00Z", "city": "santa-barbara-doeste", "data": { } }
```

| Arquivo | Conteúdo |
|---|---|
| `/cities.json` (raiz) | lista de cidades ativas: slug, nome, capabilities, lastUpdated |
| `meta.json` | nome, cadeiras, subsídio + fonte, termStart, lastSuccessfulScrape, totais gerais |
| `councilors.json` | vereadores com partido, foto, link e **todas** as métricas usadas nos rankings (faltas, presença %, nº por categoria, votos não) |
| `councilors/{slug}.json` | perfil + proposições do vereador (id, tipo, nº/ano, data, resumo, categoria, link) |
| `requests.json` | todas as `PedidoBairro` com ruas/bairros normalizados e autores — alimenta o índice MiniSearch no front |
| `repeated-streets.json` | grupos da seção 7.3 |
| `categories.json` | contagem por categoria × vereador |
| `votes.json` | votações nominais (M2) |

Se `requests.json` passar de ~3 MB, particionar por ano (`requests-2025.json`, ...) e listar os arquivos no `meta.json`.

Testes de snapshot (Verify não — usar comparação de JSON com arquivo esperado em `tests/.../Expected/`) garantem estabilidade do contrato. Mudança incompatível = `schemaVersion` + 1.

---

## 10. Front-end (web/)

- React 19 + Vite + TS (strict) + React Router + Tailwind. Sem SSR.
- Base URL dos dados por env `VITE_DATA_BASE_URL`.
- Rotas:
  - `/` — escolher cidade
  - `/:city` — home: contador de salário, busca por bairro, destaques, top rankings
  - `/:city/vereadores` — lista + busca + filtro partido + ordenação (F-09)
  - `/:city/vereadores/:slug` — perfil
  - `/:city/bairros` — busca completa F-02 + F-04
  - `/:city/metodologia`
  - `/sobre`
- Mobile first (maioria do acesso virá de WhatsApp). Lighthouse ≥90 em performance e acessibilidade.
- `staticwebapp.config.json` com fallback de rota para `index.html` e headers de segurança (CSP, HSTS).
- Todo card/linha com dado tem botão "ver no site oficial".
- Rodapé fixo: "Projeto independente. Sem vínculo com Câmara, Prefeitura ou partido. Dados oficiais, atualizados diariamente."
- Open Graph por página (compartilhamento de perfil de vereador no WhatsApp com preview).

---

## 11. Diretrizes editoriais (docs/editorial.md)

Obrigatórias em todo texto de UI:
- Descrever fato, nunca adjetivar. ✅ "12 faltas em 48 sessões". ❌ "vereador faltoso".
- Rankings em ordem neutra; o título descreve o critério ("Mais ausências registradas").
- Explicar limitações junto do dado (faltas justificadas, suplentes, mandatos parciais).
- Estimativas sempre rotuladas como estimativa, com fonte.
- Nenhuma cor/ícone associado a partido.
- Canal de correção: e-mail na página de metodologia; correções aparecem na próxima coleta.

---

## 12. Infra (Bicep, `infra/`)

Recursos (resource group `rg-radar-prod-brs`):
- Log Analytics + Application Insights
- Storage Account (funcs runtime + filas `scrape-city`, `publish-city` + container `data` público)
- Function App Flex Consumption, .NET 10 isolated, **system-assigned managed identity**
  - RBAC: Storage Blob Data Contributor, Storage Queue Data Contributor
- Azure SQL logical server + database **serverless free offer** (`useFreeLimit: true`, `freeLimitExhaustionBehavior: AutoPause`), autenticação **somente Entra ID**; managed identity da Function como usuário do DB
- Static Web App (Free), ligado ao repo via deploy token no workflow

Nomenclatura CAF: `func-radar-prod-brs`, `sql-radar-prod-brs`, `sqldb-radar`, `st radarprodbrs`, `stapp-radar-prod`, `appi-radar-prod-brs`, `log-radar-prod-brs`.

Custo-alvo: **< US$ 5/mês** no M1–M3.

---

## 13. CI/CD e qualidade

`.github/workflows/ci.yml` (PR e push):
- `build-test-dotnet`: restore, build `-warnaserror`, test com coverage (Coverlet OpenCover). Testcontainers roda no runner ubuntu.
- `build-test-web`: `npm ci`, lint, typecheck, vitest, build.
- `license-check`: nuget-license + license-checker (seção 4).
- `bicep-lint`: `az bicep build` em `infra/main.bicep`.

`.github/workflows/deploy.yml` (push em `main`):
- Login Azure via OIDC (`azure/login` com federated credential).
- `az deployment group create` do Bicep.
- Aplica migrations EF via bundle (`dotnet ef migrations bundle`) usando a identidade do workflow.
- Publica Function App (`Azure/functions-action`).
- Publica SWA (`Azure/static-web-apps-deploy`).

Qualidade:
- TDD obrigatório: teste falhando → implementação mínima → verde → commit.
- Cobertura ≥85% em `Domain`, `Classification`, `Sources`, `Publishing`.
- Conventional Commits. Uma PR por tarefa, branch `feat/<marco>-<curto>`, squash merge.
- `main` protegida (required checks: os 4 jobs do CI).

---

## 14. Plano de execução

### M0 — Fundação
1. Criar repo (D1–D3), `LICENSE`, `README.md`, `.gitignore`, `.editorconfig`, `CLAUDE.md` (resumo das seções 4, 5, 11, 13 desta spec).
2. `global.json`, `Directory.Build.props`, `Directory.Packages.props`, `Radar.slnx`, projetos vazios + projetos de teste, architecture tests com as regras da seção 5.
3. `web/` com Vite + React + TS + Tailwind, página "Radar Cidades — em breve".
4. `ci.yml` verde.
5. Bicep completo + `deploy.yml`. Setup OIDC documentado em `docs/setup-azure.md` (comandos `az ad app create`, federated credential, role assignment) — **executar com o usuário, não sozinho**.
6. `docs/adr/0001-arquitetura.md` registrando seções 3–4.
7. Proteger `main` (ruleset).
**Pronto quando:** PR mergeada, deploy vazio funcionando, SWA abrindo a página placeholder.

### M1 — Santa Bárbara d'Oeste (vereadores + pedidos por bairro)
1. Domínio + `CityConfig` + `cities/santa-barbara-doeste.json`.
2. Descoberta SISCAM (8.3) → `docs/sources/siscam.md` + fixtures.
3. `SiscamSource`: vereadores → proposições (TDD contra fixtures).
4. Classificação 7.1 (só `PedidoBairro` vs resto já basta) + extração 7.2.
5. `Radar.Data`: DbContext, migrations, upsert idempotente (testes Testcontainers).
6. `Radar.Publishing`: `cities.json`, `meta.json`, `councilors.json`, `councilors/{slug}.json`, `requests.json`.
7. Functions: timer, `ScrapeCityFunction`, `PublishCityFunction`, backfill HTTP.
8. Front: rotas `/`, `/:city`, `/:city/vereadores`, `/:city/vereadores/:slug`, `/:city/bairros`, `/:city/metodologia`.
9. Backfill de produção desde 01/01/2025 + validação manual por amostragem (10 proposições conferidas contra o site oficial).
**Pronto quando:** site público mostra os vereadores de SBO e busca por bairro funciona com dados reais e links oficiais.

### M2 — Conteúdo completo (SBO)
F-04 a F-09: presença, votações, categorias completas, ruas repetidas, contador de salário, rankings. Se o SISCAM não expuser presença/votos, documentar e esconder a seção.

### M3 — Piracicaba
Descoberta a partir de máquina local → ADR sobre acesso (bloqueio 403) → adaptador → `cities/piracicaba.json`.

### M4 — Produto
Domínio próprio, OG images, dicionário de bairros, página "adicione sua cidade" (guia de como contribuir com um adaptador), monitoramento (alerta App Insights se `ScrapeRun` falhar 2 dias seguidos).

---

## 15. Prompt para o terminal

Com o repositório criado e este arquivo em `docs/SDD.md`:

```
Leia docs/SDD.md inteiro. Confirme comigo as decisões da seção 0 que estiverem em aberto.
Depois execute o marco M0 da seção 14, tarefa por tarefa, uma PR por tarefa, seguindo TDD
e as regras das seções 4, 5 e 13. Antes de qualquer comando que crie recursos no Azure ou
mexa em permissões (Entra ID, RBAC, rulesets), me mostre o comando e espere meu ok.
Ao terminar o M0, pare e me mostre um resumo antes de começar o M1.
```

Para cada marco seguinte: `Execute o marco M1 de docs/SDD.md` (e assim por diante).
