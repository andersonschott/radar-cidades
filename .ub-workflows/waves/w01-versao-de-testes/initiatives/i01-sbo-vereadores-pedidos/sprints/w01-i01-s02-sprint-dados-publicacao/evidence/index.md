---
artifact_id          : w01-i01-s02-evidence-index
artifact_type        : evidence_index
status               : closed
context_tier         : T4
updated_at           : 2026-11-16
summary_budget_lines : 100
---

# Evidence Index

## State

Fechada em 2026-11-16.

## Validated Claims

| Claim | Evidence | Gate | Status | Consumed By |
| --- | --- | --- | --- | --- |
| Migration aplica em SQL Server 2022 real | `SqlServerFixture` (Testcontainers) roda `MigrateAsync` | validation | passed | closeout |
| Upsert idempotente (2ª execução = 0 inserts) | `UpsertPropositions_Twice_DoesNotDuplicate` | validation | passed | closeout |
| Mudança na fonte atualiza e troca filhos sem órfãos | `UpsertPropositions_ChangedContent_UpdatesAndReplacesChildren` | validation | passed | closeout |
| Coleta incremental usa só runs bem-sucedidos | `ScrapeRuns_LastSuccessfulRun_IgnoresFailures` | validation | passed | closeout |
| Contrato JSON §9 estável | `PublicationBuilderTests` + `Expected/*.json` | validation | passed | closeout |
| Cobertura ≥ 85% | Data 98%, Publishing 100% | validation | passed | closeout |

## Evidence Files

`tests/Radar.Publishing.Tests/Expected/*.json` (snapshots revisados).

## Live Gates And Deferred Evidence

Sem gate live.

## Redaction And Retention

Sem segredos.

## Promotion

Closeout.

## Read Policy

Open this index for claim verification, validation audit, closeout review, or regression investigation.
