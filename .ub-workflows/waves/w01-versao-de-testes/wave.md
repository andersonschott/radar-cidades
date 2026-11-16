# Wave W01: Versão de testes

## Outcome

Uma URL pública (Static Web Apps) mostrando os vereadores de Santa Bárbara d'Oeste e a busca "o que pediram pelo seu bairro?" com dados reais coletados do SISCAM e link oficial em cada item.

## Why Now

O M0 deixou a fundação pronta, mas sem nada no ar. Sem dado real não dá para validar a premissa do produto (evidence question 2) nem testar com pessoas.

## Scope Boundaries

1. Uma cidade: Santa Bárbara d'Oeste.
2. Features F-01, F-02, F-03, F-10, F-11, F-12 do SDD (M1).
3. Infra no Azure pessoal, resource group `rg-radar-prod-brs`, ambiente único.

## Bet Framing

- Appetite: uma sessão longa de trabalho assistido (dia de 2026-11-16).
- Success evidence: site público com dados reais; 10 proposições conferidas contra o site oficial.
- Circuit breaker: se o SISCAM não for coletável sem login/captcha, parar e abrir discovery de fonte alternativa.
- Deferral path: root `options.md`.

## Outcome Signals

- Product/user signal: busca por um bairro conhecido de SBO devolve pedidos reais com link.
- Delivery/flow signal: deploy automatizado pelo `deploy.yml` a cada merge.
- Quality/stability signal: coleta idempotente (rodar duas vezes não duplica); CI verde.
- Context/evidence cost signal: fonte mapeada em `docs/sources/siscam.md` com fixtures.

## Forecast And Appetite

- Appetite: 1 dia.
- Forecast range/count: 1 initiative, 3–4 sprints.
- Confidence: média — a fonte ainda não foi mapeada.
- Throughput basis: M0 entregou 6 PRs em ~2 h.
- Known unknowns: estrutura do SISCAM; free offer do SQL; Flex Consumption em brazilsouth.
- Scope hammers: trocar o SQL por publicação direta do JSON a partir da coleta (adiar persistência); publicar só vereadores + pedidos (sem perfil completo).
- Expansion trigger: qualquer feature M2 (presença, votos, rankings) exige decisão do operador.

## Non-Goals

1. Presença, votações, rankings, contador de salário (M2).
2. Domínio próprio, OG images (M4).
3. Outras cidades.

## Status

State: active.

## Initiative Map

- I01 `sbo-vereadores-pedidos` — ativa.

## Retained Inputs

- `docs/SDD.md` (§6–§10, §14 M1).
- `docs/adr/0001-arquitetura.md`.

## Transition And Reroute Rules

1. Fechar a wave quando o site de testes estiver público e a amostra de 10 proposições conferida.
2. Reroute se a fonte exigir login/captcha ou bloquear o IP do Azure.
