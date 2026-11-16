# Product Options Board

This board preserves curated product-level, future-wave, and unknown-owner options before commitment. It is not a backlog ledger, completion history, or execution authorization surface.

Order is document order within each horizon lane. Order means current review preference, not delivery commitment.

## Board Rules

- Keep cards compact; move deep context into source packs, discoveries, or owner artifacts.
- Remove a card after it is promoted, rejected, merged, or completed and the receiving artifact records the durable trace.
- Revalidate every card before activation; stale cards are not executable.
- If this file becomes hard to scan quickly, prune, merge, or move context back into source packs before adding more cards.
- During wave or initiative transition, review this board plus unresolved local initiative options before selecting the next route.

## Next Wave Candidate

No active cards.

## Probable Later Wave

- **Comparativo entre cidades** (pedido do operador, 2026-11-16). Quando houver 2+ cidades (M3, Piracicaba): ver onde os vereadores apresentam mais leis, moções etc.
  - Normalizar por vereador e por mês, porque as Câmaras têm tamanhos diferentes.
  - Mapear os tipos de cada Câmara para os mesmos grupos ("moção" numa pode ser "requerimento" na outra).
  - Ranking neutro, com a limitação ao lado (docs/editorial.md).

## Unassigned Product Option

- **Mapa de pedidos por bairro em /bairros** (pedido do operador, 2026-11-16).
  - Dados em 16/11: 9.927 pedidos, 7.523 com bairro, 598 grafias de bairro; 134 bairros com 10+ pedidos.
  - Bolinha por bairro (área proporcional ao total), nunca por endereço: o texto traz número da casa.
  - Antes: unificar grafias ("jardim mollon 4" / "vila mollon iv"). Depois, geocodificar uma vez por bairro (OSM Nominatim, 1 req/s, revisão manual) num arquivo versionado por cidade.
  - Front: Leaflet + tiles OSM com crédito; lista acessível ao lado (o mapa não pode ser o único caminho).

## Update Rules

Add only options that are likely to matter after context loss and do not yet belong in a committed roadmap. Remove cards once the receiving artifact owns the trace.
