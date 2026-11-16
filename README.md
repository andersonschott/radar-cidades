# Radar Cidades

Site independente, apartidário e automatizado que mostra **o que cada vereador fez desde a posse**, por cidade, a partir **exclusivamente** de dados públicos oficiais da Câmara Municipal. Todo número exibido tem link para o registro oficial que o originou.

Cidades planejadas: Santa Bárbara d'Oeste (M1) e Piracicaba (M3).

> Projeto independente. Sem vínculo com Câmara, Prefeitura ou partido.

## Como funciona

Uma Azure Function coleta diariamente os dados das Câmaras, classifica as proposições, grava no Azure SQL e publica JSON estático. O front (React, Azure Static Web Apps) só lê esse JSON. Detalhes em [`docs/SDD.md`](docs/SDD.md).

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/` | projetos .NET 10 (domínio, coleta, classificação, dados, publicação, functions) |
| `tests/` | testes xUnit, incluindo testes de arquitetura |
| `web/` | front React + Vite + TypeScript + Tailwind |
| `infra/` | Bicep |
| `cities/` | configuração das cidades |
| `docs/` | especificação, ADRs, guia editorial, mapeamento das fontes |

## Desenvolvimento

```sh
dotnet build Radar.slnx
dotnet test Radar.slnx
cd web && npm ci && npm run dev
```

## Licenças

- Código: [AGPL-3.0](LICENSE). Quem hospedar uma versão modificada precisa publicar o código.
- Dados publicados: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.pt-br). Os dados de origem são públicos e oficiais; a fonte de cada registro vai junto.
