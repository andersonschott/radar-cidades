# Workflow Status

## Current Product Posture

M0 (fundação) entregue sem Azure em 2026-11-16 (PRs #1–#6). O dono do projeto autorizou criar recursos no Azure pessoal (um resource group dedicado) e pediu evolução até uma **versão de testes** publicada.

## Current Operating State

State: active. Interaction mode: `continuous` (operador pediu avanço sem pausas de rotina; gates e evidência continuam valendo).

## WIP State

- Wave W01 ativa.
- Initiative I01 ativa: 1 discovery ativa (`w01-i01-d01-siscam-fonte`), nenhuma sprint de entrega ainda.

## Active Pointers

- Wave: `waves/w01-versao-de-testes/wave.md`
- Initiative: `waves/w01-versao-de-testes/initiatives/i01-sbo-vereadores-pedidos/`

## Pulled Forward From M2 (2026-11-16)

A pedido do operador, presença (F-06) e contador de salário (F-08) entraram antes do fechamento do M1, na branch `feat/m2-presenca`. Votações (F-07) continuam no M2. Subsídio: Resolução nº 04/2023 (R$ 15.422,93 desde 01/02/2025), lida no PDF oficial.

## Blockers

- Login na conta Azure pessoal (perfil `AZURE_CONFIG_DIR=C:\Users\ander\.azure-pessoal`) depende do operador.

## Wave Sequence

1. W01 — versão de testes: SBO com vereadores e pedidos por bairro publicados (SDD M0 restante + M1).
2. Futuro (root `options.md`): conteúdo completo SBO (M2), Piracicaba (M3), produto (M4).

## Conditional Candidate Tracks

Nenhuma.

## Retained-Context Routes

Use `SOURCE_PACK_ATLAS.md` before opening source packs. Mapeamento da fonte: `docs/sources/siscam.md`.

## Next Allowed Action

Aguardar a decisão da discovery d01. Enquanto isso, a S04 (front) pode avançar sobre o JSON gerado pelo replay das fixtures. O PR da S03 só sobe depois de decidir se as fixtures (coletadas sob leitura errada do robots) podem ir para o repositório público.
