# Radar Cidades — instruções para agentes

A especificação completa é [`docs/SDD.md`](docs/SDD.md). Leia a seção do marco em execução antes de codar. Este arquivo resume só o que vale para toda tarefa.

## Stack (SDD §4)

- .NET 10, Azure Functions isolated worker (Flex Consumption), EF Core 10 (SQL Server), AngleSharp, Microsoft.Extensions.Http.Resilience.
- Testes .NET: xUnit, Shouldly, NSubstitute, Testcontainers (MsSql). Regras de dependência testadas lendo as `ProjectReference` dos `.csproj`; NetArchTest só se surgir regra de nível de tipo.
- Front: React 19, Vite, TypeScript strict, React Router, Tailwind, MiniSearch. Testes: Vitest + Testing Library.
- IaC: Bicep. CI/CD: GitHub Actions com OIDC.
- **Vetados por licença:** MediatR ≥12, FluentAssertions ≥8, AutoMapper ≥15, Hangfire.Pro. O CI checa licenças (allowlist no `ci.yml`).
- Versões de pacote só em `Directory.Packages.props` (Central Package Management).

## Dependências entre projetos (SDD §5, verificadas em `Radar.Architecture.Tests`)

- `Domain` não referencia nada do projeto.
- `Classification` → `Domain`. `Sources` → `Domain`. `Data` → `Domain`.
- `Publishing` → `Domain`, `Data`.
- `Functions` → todos. Ninguém referencia `Functions`.

## Texto de interface (SDD §11)

Siga [`docs/editorial.md`](docs/editorial.md): fato sem adjetivo, rankings neutros, limitação junto do dado, estimativa rotulada, nada de cor de partido.

## Fluxo de trabalho (SDD §13)

- TDD: teste falhando → implementação mínima → verde → commit.
- Cobertura ≥85% em `Domain`, `Classification`, `Sources`, `Publishing`.
- Conventional Commits. Uma PR por tarefa, branch `feat/<marco>-<curto>`, squash merge.
- `main` protegida; os 4 jobs do CI são obrigatórios.
- Antes de qualquer comando que crie recurso no Azure ou mexa em permissão (Entra ID, RBAC, rulesets), mostre o comando ao dono do projeto e espere o ok.

## Comandos

```sh
dotnet build Radar.slnx -warnaserror
dotnet test Radar.slnx
cd web && npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

## Coleta (SDD §8.2)

Máx. 1 requisição/s por host, `User-Agent: RadarCidades/1.0 (+<url>/metodologia)`, respeitar `robots.txt`. Vale também para exploração manual com curl.
