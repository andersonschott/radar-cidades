---
artifact_id          : w01-i01-s02-closeout
artifact_type        : sprint_closeout
status               : closed
context_tier         : T3
updated_at           : 2026-11-16
summary_budget_lines : 220
---

# Sprint Closeout

## Outcome Summary

Passed. Persistência idempotente provada em SQL Server real e contrato JSON público com snapshot. São 63 testes no total.

## Outcome And Learning Review

- Achieved: tudo entre "proposição classificada" e "arquivo JSON".
- Project improvement: a S03 só precisa do adaptador e das Functions para ter dado real publicado.
- Could be better: o bug de cascade só apareceu com o banco real; os testes de Data deveriam ter vindo antes da modelagem completa.
- Follow-up disposition: o CI precisa de Docker no runner (ubuntu-latest já tem).

## Forecast Delta

- Planned vs actual: sprint reordenada (era parte da S03); escopo igual.
- Hidden prerequisite discovered: Docker Desktop estava desligado; o analisador exigiu tratamento de código gerado.
- Remaining forecast impact: S03 vertical (adaptador + Functions + publicação real), S04 front + deploy.
- Owner updates: `roadmap.md`.

## Evidence

`evidence/index.md`.

## Validation

`dotnet build -warnaserror` com 0 avisos. `dotnet test` com 63 testes passando. Cobertura de 98% em Data e 100% em Publishing.

## Broader Writebacks

`.editorconfig` (migrations geradas), `tests/Directory.Build.props`, `Directory.Packages.props`.

## Mini-Retro

- Process friction: reordenar a sprint exigiu atualizar o roadmap; foi barato.
- Evidence cost: normal.
- Context cost: normal.
- Decision latency: normal.
- Workflow adjustment: none.
- Retro evidence check: sinal objetivo; controlável; primeira ocorrência.

## Handoff

S03 vertical: adaptador SISCAM, a partir da discovery d01 aceita, mais as Functions e a primeira publicação real.
