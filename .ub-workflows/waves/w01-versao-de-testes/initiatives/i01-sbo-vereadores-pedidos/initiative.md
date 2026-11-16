# Initiative: SBO — vereadores e pedidos por bairro

## Summary

Entregar o M1 do SDD para Santa Bárbara d'Oeste: coleta SISCAM → classificação → Azure SQL → JSON público → front com lista de vereadores, perfil, busca por bairro e metodologia, publicado no Azure.

## Outcome Bet

- Appetite: 1 dia de trabalho assistido.
- Success evidence: URL pública com dados reais; 10 proposições conferidas contra o site oficial; coleta reexecutada sem duplicar.
- Circuit breaker: fonte exige login/captcha, ou bloqueia IP do Azure.
- Deferral path: local `options.md`; M2+ no root `options.md`.

## Outcome Signals

- Product/user signal: busca por bairro devolve pedidos reais.
- Delivery/flow signal: cada sprint fecha com PR mergeado e CI verde.
- Quality/stability signal: parser testado contra fixtures reais; upsert idempotente testado com Testcontainers.
- Context/evidence cost signal: `docs/sources/siscam.md` + `evidence/index.md` por sprint.

## Forecast And Appetite

- Appetite: 1 dia.
- Forecast range/count: 4 sprints (domínio+classificação, adaptador, dados+publicação+functions, front+deploy).
- Confidence: média.
- Throughput basis: M0 — 6 PRs em ~2 h.
- Known unknowns: estrutura do SISCAM (discovery d01).
- Scope hammers: pular SQL e publicar JSON direto da coleta; deixar o perfil do vereador para depois.
- Expansion trigger: features M2.

## Goals

1. Vereadores de SBO com partido, foto e link oficial.
2. Indicações e requerimentos desde 2025-01-01, com ruas/bairros extraídos.
3. Site público com busca por bairro e página de metodologia.

## Non-Goals

1. Presença, votos, rankings, salário (M2).
2. Classificação completa §7.1 (só `PedidoBairro` vs resto).

## Constraints

1. Project evolution mode: `forward-only` (projeto novo, sem compatibilidade a preservar).
2. Etiqueta de coleta do SDD §8.2.
3. Comandos que criam recurso no Azure: autorizados pelo operador para o RG `rg-radar-prod-brs` na conta pessoal.

## Current Status

- Interaction mode: `continuous`
- Active discovery: `w01-i01-d01-siscam-fonte`
- Active sprint: `none`
- Current gate: `discovery_active`
- Next allowed action: aceitar d01 e preparar S01.

## Durable Decisions

Ver `index.md` e os `decision-log.md` das sprints.
