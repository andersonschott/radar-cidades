---
artifact_id          : w01-i01-d01-siscam-fonte
artifact_type        : discovery
status               : blocked
context_tier         : T3
updated_at           : 2026-11-16
summary_budget_lines : 160
---

# Discovery: fonte SISCAM de Santa Bárbara d'Oeste

## Question

Como obter vereadores e proposições de SBO desde 01/01/2025, de forma estável e dentro da etiqueta de coleta (SDD §8.2)?

## Context Receipt

SDD §8, `docs/sources/siscam.md`, fixtures em `tests/Radar.Sources.Tests/Fixtures/siscam/santa-barbara-doeste/`.

## Repo Truth

- O mapeamento técnico está completo e testado: a versão de impressão (`/Documentos/Exportar?tipo=0`) traz todas as linhas com id, sem paginação. `SiscamSource` + `SiscamParser` estão implementados e cobertos por testes.
- **Bloqueio:** o `robots.txt` de `santabarbara.siscam.com.br` libera só buscadores nomeados e termina com `User-agent: *` / `Disallow: /`. A discovery feita por subagente afirmou o contrário sem conferir, e as 41 requisições dela foram feitas sob essa leitura errada. Quem pegou o erro foi o `RobotsTxt` do próprio adaptador, na primeira execução local.
- O site da Câmara (`camarasantabarbara.sp.gov.br`, sem robots.txt) não tem dados legislativos próprios: só aponta para o SISCAM.

## User Or Operator Evidence

- Status: `deferred`. A decisão de rota é do dono do projeto (TickTick).
- Evidence: n/a.
- Decision impact: sem autorização, nenhuma coleta real acontece; o pipeline fica provado só com replay das fixtures.

## Forecast Impact

- Status: `reroutes/stops`.
- Evidence: o critério de saída da wave ("dado real publicado") depende de uma decisão externa.
- Decision impact: S03 fica `blocked`; `roadmap.md` atualizado.

## Options

1. **Pedir autorização à Câmara** (e-mail ou pedido via LAI), citando o propósito, a frequência (1 run/dia, ≤1 req/s) e o User-Agent. É o caminho que o SDD já prevê para Piracicaba (§8.3). Recomendado.
2. **Pedir os dados à Câmara via LAI** em formato aberto e importar por arquivo. Lento, mas não depende de coleta.
3. **Decisão explícita de coletar mesmo assim**, tratando o robots.txt como regra para indexadores. Contradiz o SDD §8.2 e o editorial; só com decisão registrada em ADR.
- Rejected: contornar o check (UA de buscador, flag de bypass). Seria enganoso.

## Recommendation

Opção 1, com a 2 em paralelo como plano B.

## Validation Expectations

Com autorização: backfill desde 01/01/2025 e 10 proposições conferidas contra o site.

## Decision Slot

Pending operator decision.
