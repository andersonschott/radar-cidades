---
artifact_id          : w01-i01-s01-sprint-dominio-classificacao
artifact_type        : sprint_plan
status               : closed
context_tier         : T3
updated_at           : 2026-11-16
summary_budget_lines : 480
---

# Sprint: Domínio e classificação

## Objective

Entregar `Radar.Domain` (entidades e enums do SDD §6, `CityConfig`) e `Radar.Classification` (§7.1 reduzido a `PedidoBairro` vs resto, §7.2 extração de endereço), puros e testados por tabela, mais `cities/santa-barbara-doeste.json`.

## Source

- Accepted discovery or reviewed preview: reviewed preview (este documento). A discovery `d01` (fonte SISCAM) corre em paralelo e não afeta este escopo.

## Routing Preflight

- Trigger categories considered: evidence, interoperability.
- Triggered categories: none — o modelo de dados e as regras vêm fixados do SDD §6–§7; nada depende do formato da fonte.
- Fail-closed result: `preview_ok`.

## Discovery Triage

- Outcome: `preview_ok`.
- Outside evidence trigger: not triggered — as regras de classificação são definidas no SDD e citadas na metodologia; não há padrão externo a escolher.
- Trigger-presumed check: sem mudança de autonomia, autoridade, runtime ou política.
- Promotion rule: se a discovery d01 mostrar campos que o domínio não comporta, abrir decisão no `decision-log.md` antes da S02.

## Why Preview Instead Of Discovery

- Routing trigger: rota decidida pelo SDD.
- Discovery trigger check: none.
- Promotion rule: padrão do template.

## Product Increment Contribution

- Contribution type: `enabling`.
- Visible increment unblocked: busca por bairro (F-02) depende da extração de endereço; perfil (F-03) depende do domínio.
- Why not direct: sem a fonte mapeada não há fatia vertical com dado real ainda; esta é a parte da cadeia que não depende dela.
- Enabling-chain check: primeira sprint enabling. A S02 (adaptador) também é enabling → route review obrigatório antes da S03 (regra 31): S03 deve ser vertical até o JSON publicado.

## Bet Framing

- Appetite: ~1 h.
- Success evidence: testes por tabela verdes; cobertura ≥ 85% em Domain e Classification.
- Circuit breaker: regras de endereço com falso positivo alto nos exemplos reais → simplificar para rua apenas e registrar.
- Non-goals: categorias Homenagem/Fiscalizacao/Legislacao/DataComemorativa (M2); dicionário de bairros (M2).
- Deferral path: initiative `options.md`.

## Scope

1. `Radar.Domain`: `City`, `Party`, `Councilor`, `Mandate`, `Proposition`, `PropositionLocation`, `ScrapeRun`, enums `PropositionType`, `PropositionCategory`, `SourceSystem`; `CityConfig` carregável de `cities/*.json`.
2. `Radar.Classification`: `PropositionClassifier` (PedidoBairro vs Outro) e `AddressExtractor` (logradouros + bairro, normalização).
3. `cities/santa-barbara-doeste.json`.

## Scope Completion Rule

When this sprint uses words like `smallest`, `narrow`, or `only as needed`,
they mean the smallest objective-complete vertical slice. Every named owned
surface, required evidence gate, and exit criterion remains in scope unless
the operator explicitly changes the objective.

## Operational Surface Preflight

- Triggered: no.
- Surfaces: none.
- Owner and lifecycle: not triggered.
- Visibility and safety: not triggered.
- Inventory impact: none.
- Validation path: not triggered.

## Execution Slices

1. Domínio + enums + `CityConfig` (teste: desserializa `cities/santa-barbara-doeste.json`).
2. `AddressExtractor` TDD por tabela (casos reais típicos de indicação).
3. `PropositionClassifier` TDD por tabela.

## Validation Plan

1. `dotnet build Radar.slnx -warnaserror`
2. `dotnet test Radar.slnx --collect:"XPlat Code Coverage"`
3. CI (4 jobs) verde no PR.

## Live Validation Matrix

| Gate | Status | Command | Credentials / env | Evidence path | Pass criteria | Redaction |
| --- | --- | --- | --- | --- | --- | --- |
| `provider_live_smoke` | out of scope | `n/a` | `n/a` | `n/a` | Not touched by this sprint. | n/a |
| `external_agent_live_probe` | out of scope | `n/a` | `n/a` | `n/a` | Not touched by this sprint. | n/a |

## User Or Operator Evidence

- Status: `used`.
- Evidence: operador pediu "evoluir até termos uma versão de testes" e autorizou Azure pessoal.
- Decision impact: modo `continuous`; sem pausa de aprovação entre preview e execução.

## Reviewed-Mode Start Checkpoint

Modo `continuous`: início autorizado pela instrução do operador de 2026-11-16.

## Context Receipt

Carregados: `docs/SDD.md` §6–§7, `CLAUDE.md`, status/wave/initiative. Ignorados: source packs (nenhum).

## Exit Criteria

1. Every accepted objective claim has fresh named passing proof.
2. Required validation and live gates pass after the final relevant change.
3. Evidence is routed through `evidence/index.md`.
4. Required objective proof is not deferred while closing the original objective as passed.
5. Decision log and closeout are current, including the closeout outcome and learning review.
