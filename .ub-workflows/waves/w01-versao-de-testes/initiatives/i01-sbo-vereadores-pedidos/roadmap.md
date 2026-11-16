# Initiative Roadmap

## Objective

SDD M1 para Santa Bárbara d'Oeste publicado como versão de testes no Azure pessoal.

## Current Position

- Current state: `in progress`
- Active or next sprint: S02 `adaptador-siscam` (próxima)
- Active discovery: `w01-i01-d01-siscam-fonte`
- WIP state: 1 discovery ativa, nenhuma sprint de entrega ativa.

## Forecast Control

- Appetite state: `within_appetite`
- Completed count: 1 (S01)
- Registered remaining: 3
- Forecast delta: none.
- Confidence: média até fechar d01.
- Next scope tradeoff: se o SQL atrasar a S03, publicar JSON direto da coleta (scope hammer da wave).
- Operator buy-more state: not needed.

## Active Or Next Sprint Route

S02 sai da discovery d01 quando aceita.

## Adaptive Plan

1. ~~S01 domínio + classificação~~ (closed, enabling).
2. S02 adaptador SISCAM: vereadores + proposições contra fixtures (enabling — 2ª seguida; route review aceito: pré-requisito sem alternativa).
3. S03 vertical: Data (EF + upsert idempotente) + Publishing (JSON §9) + Functions (timer, filas, backfill) — termina com JSON real publicado no Blob.
4. S04 front (rotas M1) + deploy + amostra de 10 proposições conferidas.
5. Pre-audit continuation window (`adaptive insertion`).
6. Final audit (`terminal audit`).

## Sequence Changes

- 2026-11-16: route review da cadeia enabling (regra 31) — aceito comprar a 2ª sprint enabling (S02); S03 obrigatoriamente vertical.

## Revalidation Rules

- Revalidate stale candidates on touch.
- Promote discovery-driven sequence changes into this roadmap before accepting the discovery.
- Promote closeout-driven next-route changes into this roadmap before closing the sprint.
- Keep product-level future-wave options in root `options.md`; keep initiative-local possible insertions in local `options.md` until promoted, moved, rejected, or removed.

## Update Rules

Update this roadmap only when objective, current position, active route, candidate order, insertion points, WIP state, revalidation rules, or final audit posture changes. Keep token history in `index.md`, not here.
