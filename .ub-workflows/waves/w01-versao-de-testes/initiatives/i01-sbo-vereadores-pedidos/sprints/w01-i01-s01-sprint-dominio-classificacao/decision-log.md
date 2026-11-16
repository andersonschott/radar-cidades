---
artifact_id          : w01-i01-s01-decision-log
artifact_type        : sprint_decision_log
status               : closed
context_tier         : T3
updated_at           : 2026-11-16
summary_budget_lines : 140
---

# Sprint Decision Log

## Purpose

Record sprint-scoped decisions, reversals, deferrals, and evidence pointers.

## Decisions

1. **`Proposition.RawType` adicionado ao modelo do SDD §6.** Guarda o tipo como veio da fonte, para auditar o mapeamento e reclassificar sem recoletar.
2. **`Proposition.FullText` fora do M1.** O resumo basta para extração de endereço; texto integral (PDF) é caro de coletar.
3. **Projeto `Radar.Domain.Tests` criado** (não previsto no SDD §5) para cobrir `CityConfigLoader` — o SDD exige ≥85% em Domain.
4. **`coverlet.runsettings` exclui código gerado e auto-props.** O `[GeneratedRegex]` derrubava a cobertura de Classification para 71% com código que não é nosso.
5. **Bairro dentro de nome de rua é ignorado** ("Rua Vila Rica" não gera bairro "Vila Rica").

## Reversals And Deferrals

- Categorias além de `PedidoBairro`/`Outro`: deferidas para M2 (SDD §14).
- `monthlySalary` = 0 em `cities/santa-barbara-doeste.json` até F-08 (M2) buscar o valor oficial.
