# Product Vision

## Product Promise

Mostrar, por cidade, o que cada vereador fez desde a posse, só com dados públicos oficiais da Câmara Municipal e com link para o registro de origem em todo número. Especificação completa: `docs/SDD.md`.

## Audiences

1. Morador que recebe o link pelo WhatsApp e quer saber o que pediram para a sua rua ou bairro.
2. Eleitor que compara vereadores (presença, projetos, homenagens, pedidos).
3. Imprensa local e organizações civis que precisam de dado citável.

## Durable Principles

1. Só dado oficial, sempre com link. Nada digitado à mão.
2. Fato sem adjetivo (`docs/editorial.md`). Sem score, sem opinião, sem cor de partido.
3. Site estático em runtime: o front só lê JSON pré-calculado.
4. Custo-alvo < US$ 5/mês.
5. Coleta educada: ≤ 1 req/s por host, User-Agent identificado, `robots.txt` respeitado.

## Capability Pillars

1. Coleta multi-cidade por adaptador (`ILegislativeSource`).
2. Classificação determinística e auditável (regras versionadas).
3. Publicação de JSON com contrato versionado (`schemaVersion`).
4. Front mobile-first com busca por bairro.

## Evidence Questions

1. A fonte oficial de cada cidade expõe vereadores, proposições, presença e votos de forma coletável?
2. A busca por rua/bairro encontra pedidos reais que o morador reconhece?
3. Amostras conferidas contra o site oficial batem 100%?

## Change Rule

Update this vision only through reviewed discovery, closeout, transition, or an explicit product decision.
