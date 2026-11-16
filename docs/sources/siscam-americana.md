# Fonte: SISCAM — Americana

Mesmo produto de SBO (SISCAM 8.8.1.82, ASP.NET MVC 4 no IIS). Rotas, seletores e gotchas estão em [`siscam.md`](siscam.md); aqui fica só o que muda.
Descoberta em 2026-11-16, com curl, o UA do projeto e ≤1 req/s. Fixtures: `tests/Radar.Sources.Tests/Fixtures/siscam/americana/`.

## Endereços

- Base: `https://americana.siscam.com.br/`. A home da Câmara também linka `consulta.siscam.com.br/camaraamericana/` (não testado).
- `siscam.camara-americana.sp.gov.br` só serve `/arquivo`; `robots.txt` e o resto dão 404.
- `robots.txt` de `americana.siscam.com.br` termina com `User-agent: *` / `Disallow: /`. A coleta segue pela [ADR 0003](../adr/0003-coleta-siscam-americana-apesar-do-robots.md).

## Índice e códigos (select `Documento` de `/index/74`)

| `Documento` | Tipo bruto | `PropositionType` |
|---|---|---|
| 125 | Indicações | `Indicacao` |
| 124 | Requerimentos | `Requerimento` |
| 126 | Moções | `Mocao` |
| 119 | Projetos de Lei | `ProjetoLei` |
| 120 | Projetos de Lei Complementar | `ProjetoLeiComplementar` |
| 121 | Projetos de Decreto Legislativo | `ProjetoDecretoLegislativo` |
| 122 | Projetos de Resolução | `ProjetoResolucao` |
| 123 | Projetos de Emenda à Lei Orgânica | `Outro` (como o 121 de SBO) |

Índice da pesquisa: `id=74`. Total de documentos desde 01/01/2025 (todos os tipos): **35.662**, cerca de 3 vezes SBO.

## O que foi verificado contra o parser atual (sem mudança de código)

| Página | Fixture | Resultado |
|---|---|---|
| `/vereadores` | `vereadores.html` | 19 itens, todos com foto; nome civil no `title` |
| Exportação `tipo=0`, Indicações | `exportar-impressao-indicacao-2026-11-10a11.html` | cabeçalho 140 = 140 `h4` |
| `/Sessoes/Pesquisa` | `sessoes-pesquisa-p1.html` | 15 itens; 100 sessões desde 01/01/2025 |
| `/Sessoes/Sessao/1713` | `sessao-1713-ausencia.html` | Frequências: 1 chamada, 17 presentes, 2 ausentes; Votações com grupo "Ausente (n)" |

Autoria: nas 842 Indicações de 01–16/11/2026, todos os 842 autores são o nome parlamentar de um dos 19 atuais (0% desconhecido), sem coautoria. Em Projetos aparecem autores de legislaturas anteriores (ex.: DR. DANIEL, MARSCHELO MECHE no PR 2/2024) e "Mesa Diretora", "Secretaria Geral".

## Diferenças e peculiaridades em relação a SBO

- **Volume:** Indicações de 01 a 16/11/2026 deram 842 itens e 1,27 MB numa resposta (SBO: 672 no mês inteiro de out/2026). Um mês cheio de Indicações deve passar de 2,5 MB. A fixture usa por isso uma janela de **2 dias** (10–11/11/2026), não um mês.
- Numeração alta: `Indicação Nº 15881/2026`.
- Situação em caixa mista (`Tramitando`), não `TRAMITANDO`.
- A exportação de projetos traz "Documentos Relacionados" com links `/Documentos/Documento/{id}` dentro de `p`; o parser só pega `h4`, então não confunde.
- Resoluções promulgadas têm numeração contínua sem ano no título (`Resolução Nº 436`); o PDF diz "Resolução nº 436/2024". O nome do arquivo no SISCAM é "RES 436-2021 PR 2-2024" (ano errado no título do arquivo).
- O carimbo do cabeçalho da exportação (`16/11/2026 01:48`) não bate com o horário real da consulta (18:48 em Brasília); relógio do servidor, sem efeito na coleta.
- Na lista de sessões, o texto do link vem com quebras de linha; o parser normaliza.

## Subsídio

Resolução nº 436, de 19/03/2024 (Projeto de Resolução nº 2/2024), página `/Documentos/Documento/377192`, PDF assinado `/arquivo?Id=563944`. Art. 1º fixa, em parcela única e a partir de 1º/01/2025: vereador R$ 10.305,64; presidente R$ 11.283,75. Não trata de 13º nem de revisão anual.

## Custo da primeira carga (como o `SiscamSource` faz hoje)

- Proposições: 8 tipos × 23 janelas mensais (jan/2025–nov/2026) = **184** requisições, mais 1 para `/vereadores`. Volume ~35.662 itens, na ordem de 50 MB de HTML no total.
- Sessões: 7 páginas de lista + ~100 páginas de sessão ≈ **107**.
- Total ≈ **292** requisições, cerca de 5 min a 1 req/s (mais o tempo de download das respostas grandes).
- Não foram testados: perfil do vereador, legislatura, votações nominais em detalhe, Emendas/Substitutivos.
