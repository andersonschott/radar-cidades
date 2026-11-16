---
artifact_id          : w01-i01-s02-sprint-dados-publicacao
artifact_type        : sprint_plan
status               : closed
context_tier         : T3
updated_at           : 2026-11-16
summary_budget_lines : 480
---

# Sprint: Dados e publicação

## Objective

`Radar.Data` (EF Core 10, migration inicial, upsert idempotente, ScrapeRun, consultas de publicação) e `Radar.Publishing` (contrato JSON §9 com snapshot), ambos independentes do formato da fonte.

## Source

- Accepted discovery or reviewed preview: reviewed preview. Reordenada à frente do adaptador porque a discovery d01 ainda corria; ver `roadmap.md` › Sequence Changes.

## Routing Preflight

- Trigger categories considered: interoperability (contrato JSON público), evidence.
- Triggered categories: interoperability — o contrato está fixado no SDD §9; o snapshot torna a mudança visível.
- Fail-closed result: `preview_ok`.

## Discovery Triage

- Outcome: `preview_ok`.
- Outside evidence trigger: not triggered — modelo e contrato definidos no SDD.
- Trigger-presumed check: sem mudança de autoridade ou runtime.
- Promotion rule: se a fonte exigir campo novo no contrato, `schemaVersion` continua 1 enquanto nada foi publicado.

## Why Preview Instead Of Discovery

- Routing trigger: rota decidida pelo SDD.
- Discovery trigger check: none.
- Promotion rule: padrão do template.

## Product Increment Contribution

- Contribution type: `enabling`.
- Visible increment unblocked: JSON publicado que o front consome (F-01, F-02, F-03, F-12).
- Why not direct: o adaptador ainda não existe.
- Enabling-chain check: segunda enabling seguida → route review feito: aceito, com a condição de a S03 ser vertical (coleta real → JSON no Blob).

## Bet Framing

- Appetite: ~1 h.
- Success evidence: upsert idempotente provado em SQL Server real; snapshots do contrato revisados.
- Circuit breaker: Testcontainers indisponível → publicar direto da coleta sem SQL (scope hammer da wave).
- Non-goals: sessões, presença, votos; `votes.json`, `categories.json`, `repeated-streets.json` (M2).
- Deferral path: initiative `options.md`.

## Scope

1. `RadarDbContext`, migration `Inicial`, `RadarStore`, `PublicationQueries`.
2. `PublicationBuilder` + DTOs públicos; `cities.json`, `meta.json`, `councilors.json`, `councilors/{slug}.json`, `requests.json`.
3. Testes: Testcontainers (MsSql) e snapshot JSON.

## Scope Completion Rule

When this sprint uses words like `smallest`, `narrow`, or `only as needed`, they mean the smallest objective-complete vertical slice.

## Operational Surface Preflight

- Triggered: yes.
- Surfaces: esquema do banco (migration) e contrato JSON público.
- Owner and lifecycle: `Radar.Data/Migrations` (forward-only); `Radar.Publishing/PublicContract.cs` (`schemaVersion`).
- Visibility and safety: JSON é público por desenho; nenhum dado pessoal além do que a Câmara já publica.
- Inventory impact: `docs/SDD.md` §9 continua sendo a referência.
- Validation path: testes Testcontainers e snapshot.

## Execution Slices

1. DbContext + migration + upsert (TDD Testcontainers).
2. PublicationBuilder + snapshot.

## Validation Plan

1. `dotnet build Radar.slnx -warnaserror`
2. `dotnet test Radar.slnx --settings coverlet.runsettings` (Docker ligado)
3. CI no PR.

## Live Validation Matrix

| Gate | Status | Command | Credentials / env | Evidence path | Pass criteria | Redaction |
| --- | --- | --- | --- | --- | --- | --- |
| `provider_live_smoke` | out of scope | `n/a` | `n/a` | `n/a` | Not touched by this sprint. | n/a |
| `external_agent_live_probe` | out of scope | `n/a` | `n/a` | `n/a` | Not touched by this sprint. | n/a |

## User Or Operator Evidence

- Status: `not triggered` — decisões técnicas dentro do SDD.
- Evidence: n/a.
- Decision impact: n/a.

## Reviewed-Mode Start Checkpoint

Modo `continuous`.

## Context Receipt

SDD §6, §9; S01 closeout.

## Exit Criteria

1. Every accepted objective claim has fresh named passing proof.
2. Required validation and live gates pass after the final relevant change.
3. Evidence is routed through `evidence/index.md`.
4. Required objective proof is not deferred while closing the original objective as passed.
5. Decision log and closeout are current.
