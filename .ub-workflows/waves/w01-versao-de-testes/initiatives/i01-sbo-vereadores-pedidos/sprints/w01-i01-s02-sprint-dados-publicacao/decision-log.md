---
artifact_id          : w01-i01-s02-decision-log
artifact_type        : sprint_decision_log
status               : closed
context_tier         : T3
updated_at           : 2026-11-16
summary_budget_lines : 140
---

# Sprint Decision Log

## Decisions

1. **DTOs da fonte (`SourceCouncilor`, `SourceProposition`, `ClassifiedProposition`) moram no Domain.** `Data` não pode referenciar `Sources` (SDD §5); o Domain é o contrato comum.
2. **`TextFolding` (acentos, slug) foi para o Domain** e `TextNormalizer.Fold` delega a ele: o slug do vereador é calculado em `Data`.
3. **FKs para `City` com `DeleteBehavior.Restrict`.** O SQL Server real recusou a migration com múltiplos caminhos de cascade até `PropositionAuthor`; nada é deletado no sistema (§6), então Restrict é correto.
4. **Migrations marcadas como `generated_code` no `.editorconfig`** em vez de editar o código gerado para satisfazer os analisadores.
5. **Analisadores relaxados só em `tests/`** (CA2007, CA1515, CA1711, CA1308), cada um com motivo em `tests/Directory.Build.props`.
6. **Snapshot sem biblioteca.** O SDD §9 vetou o Verify; o teste compara com `Expected/*.json` versionado e gera o arquivo quando ele falta.
7. **Escape JSON com `UnicodeRanges.All`.** Os acentos ficam legíveis e `<`/`>` continuam escapados.

## Reversals And Deferrals

- Troca de partido sobrescreve o mandato atual (`shortcut` no código), até a fonte expor histórico de filiação.
- `PublicationQueries` carrega tudo em memória (`shortcut`, revisar acima de ~100 mil linhas).
