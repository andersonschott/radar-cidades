---
artifact_id          : w01-i01-s01-closeout
artifact_type        : sprint_closeout
status               : closed
context_tier         : T3
updated_at           : 2026-11-16
summary_budget_lines : 220
---

# Sprint Closeout

## Outcome Summary

Passed. Domínio do SDD §6 (sem sessões/votos), `CityConfig` + `cities/santa-barbara-doeste.json`, normalizador, extrator de endereço e classificador M1, com 40 testes verdes.

## Outcome And Learning Review

- Achieved: toda a lógica pura do M1 que não depende da fonte.
- Project improvement: a S02 só precisa produzir `PropositionDto` corretos; classificação e endereço já estão prontos e testados.
- Could be better: os casos de teste do extrator são sintéticos; precisam ser reconferidos contra resumos reais do SISCAM.
- Follow-up disposition: local follow-up na S02 — rodar o extrator sobre os resumos das fixtures e ajustar.

## Forecast Delta

- Planned vs actual: como planejado.
- Hidden prerequisite discovered: cobertura medida com código gerado (resolvido com `coverlet.runsettings`).
- Remaining forecast impact: nenhum.
- Owner updates: `roadmap.md`.

## Evidence

`evidence/index.md`.

## Validation

`dotnet build -warnaserror` (0 avisos), `dotnet test` (47 testes no total), cobertura 100% em Domain e Classification. CI no PR.

## Broader Writebacks

`ci.yml` passa a usar `coverlet.runsettings`.

## Mini-Retro

- Process friction: o template de sprint é longo para uma fatia de ~1 h; preencher custou quase o mesmo que o código.
- Evidence cost: normal.
- Context cost: normal.
- Decision latency: normal (modo continuous).
- Workflow adjustment: none.
- Retro evidence check: sinal objetivo (testes); controlável; primeira ocorrência.

## Handoff

Route review da cadeia enabling: a S02 (adaptador SISCAM) é a segunda sprint enabling seguida. Decisão registrada no roadmap: aceitar, porque o adaptador é pré-requisito sem alternativa, e a S03 tem que ser vertical até o JSON publicado.
