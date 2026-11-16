---
artifact_id          : w01-i01-s01-evidence-index
artifact_type        : evidence_index
status               : closed
context_tier         : T4
updated_at           : 2026-11-16
summary_budget_lines : 100
---

# Evidence Index

## State

Fechada em 2026-11-16. Validação local e CI do PR.

## Validated Claims

| Claim | Evidence | Gate | Status | Consumed By |
| --- | --- | --- | --- | --- |
| Domínio compila sem warnings com AnalysisMode=All | `dotnet build Radar.slnx -warnaserror` → 0 avisos | validation | passed | closeout |
| `CityConfig` de SBO carrega do JSON | `CityConfigLoaderTests` (3) | validation | passed | closeout |
| Extração de endereço cobre os padrões do SDD §7.2 | `AddressExtractorTests` + `TextNormalizerTests` | validation | passed | closeout |
| Classificação M1 (PedidoBairro vs Outro) e mapeamento de tipo | `PropositionClassifierTests` | validation | passed | closeout |
| Cobertura ≥ 85% em Domain e Classification | `dotnet test --settings coverlet.runsettings` → 100% / 100% | validation | passed | closeout |
| Regras de dependência continuam válidas | `Radar.Architecture.Tests` (7) | validation | passed | closeout |

## Evidence Files

Nenhum arquivo: toda a prova é reproduzível pelos comandos acima.

## Live Gates And Deferred Evidence

Sem gate live. Validação contra textos reais do SISCAM fica para a S02 (fixtures da discovery d01).

## Redaction And Retention

Sem segredos.

## Promotion

Closeout desta sprint.

## Read Policy

Open this index for claim verification, validation audit, closeout review, or regression investigation.
