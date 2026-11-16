# Initiative Roadmap

## Objective

SDD M1 para Santa Bárbara d'Oeste publicado como versão de testes no Azure pessoal.

## Current Position

- Current state: `in progress`
- Active or next sprint: S03 `coleta-vertical` (próxima)
- Active discovery: `w01-i01-d01-siscam-fonte`
- WIP state: 1 discovery ativa, nenhuma sprint de entrega ativa.

## Forecast Control

- Appetite state: `within_appetite`
- Completed count: 2 (S01, S02)
- Registered remaining: 2
- Forecast delta: none.
- Confidence: média até fechar d01.
- Next scope tradeoff: se o SQL atrasar a S03, publicar JSON direto da coleta (scope hammer da wave).
- Operator buy-more state: not needed.

## Active Or Next Sprint Route

S03 sai da discovery d01 quando aceita.

## Adaptive Plan

1. ~~S01 domínio + classificação~~ (closed, enabling).
2. ~~S02 dados + publicação~~ (closed, enabling — 2ª seguida; route review aceito).
3. S03 vertical: adaptador SISCAM + Functions — **blocked**: código pronto e pipeline provado com replay das fixtures; coleta real proibida pelo robots.txt do SISCAM (discovery d01).
4. S04 front (rotas M1) + deploy + amostra de 10 proposições conferidas.
5. Pre-audit continuation window (`adaptive insertion`).
6. Final audit (`terminal audit`).

## Sequence Changes

- 2026-11-16: route review da cadeia enabling (regra 31) — aceito comprar a 2ª sprint enabling; S03 obrigatoriamente vertical.
- 2026-11-16: Data + Publishing antecipados para S02 (independem da fonte) enquanto a discovery d01 corria; adaptador passa para a S03 junto com as Functions.

## Revalidation Rules

- Revalidate stale candidates on touch.
- Promote discovery-driven sequence changes into this roadmap before accepting the discovery.
- Promote closeout-driven next-route changes into this roadmap before closing the sprint.
- Keep product-level future-wave options in root `options.md`; keep initiative-local possible insertions in local `options.md` until promoted, moved, rejected, or removed.

## Update Rules

Update this roadmap only when objective, current position, active route, candidate order, insertion points, WIP state, revalidation rules, or final audit posture changes. Keep token history in `index.md`, not here.
- 2026-11-16: S03 bloqueada. O robots.txt do SISCAM proíbe agentes não nomeados; a rota depende de autorização da Câmara (d01, decisão do dono).
