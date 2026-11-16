# Fonte: SISCAM — Piracicaba

Notas da descoberta de 16/11/2026. O mapeamento de rotas e seletores é o de [`siscam.md`](siscam.md) (SBO); aqui fica só o que muda.
Fixtures: `tests/Radar.Sources.Tests/Fixtures/siscam/piracicaba/` (teste `PiracicabaSiscamTests`).

## Instalação

- Base: `https://siave.camarapiracicaba.sp.gov.br/`. SISCAM 8.8.1.91 (rodapé, "Sino.Siave"), atrás da Cloudflare.
- `robots.txt` ambíguo, com dois grupos `*`, mas as duas leituras permitem a coleta: ver [ADR 0004](../adr/0004-robots-piracicaba.md).
- Pesquisa de proposituras: índice `id=78`, módulo 8.
- Códigos `Documento` (select de `/index/78`):

| Código | Tipo bruto | `PropositionType` |
|---|---|---|
| 135 | Indicações | `Indicacao` |
| 134 | Requerimentos | `Requerimento` |
| 136 | Moções | `Mocao` |
| 129 | Projetos de Lei | `ProjetoLei` |
| 130 | Projetos de Lei Complementar | `ProjetoLeiComplementar` |
| 131 | Projetos de Decreto Legislativo | `ProjetoDecretoLegislativo` |
| 132 | Projetos de Resolução | `ProjetoResolucao` |
| 133 | Projetos de Emenda à Lei Orgânica | `Outro` (como o 121 de SBO) |

O select também tem 121 Substitutivos, 122 Novas Redações e 125 Respostas, fora do escopo.

- O HTML de `/vereadores`, da exportação de impressão, de `/Sessoes/Pesquisa` e do bloco "Frequências" é igual ao de SBO; o parser roda sem mudança.

## Peculiaridades

1. **Nome civil em todo lugar.** Em `/vereadores`, o texto do `h4 > a` e o `title` da foto são o **nome civil** ("André Gustavo Bandeira", não "André Bandeira"). O `SiscamParser.ParseCouncilors` usa o texto do `h4` como `Name`, então o nome exibido é o civil e só há um alias por vereador. A autoria da exportação (nov/2026) e a chamada das sessões também usam o nome civil, então o casamento por alias funciona: 0 autores desconhecidos nas 299 Indicações de 01–16/11/2026.
   - Documentos antigos usam outra forma: a lista de PRs de 2023 traz "WAGNER OLIVEIRA (WAGNÃO)" como autoria. As amostras verificadas desde 2025 (Indicações de out/2026, 01–16/11/2026 e uma página de dez/2025) só têm nome civil; o início de 2025 não foi conferido e pode ter outra forma.
   - O nome parlamentar não está no SISCAM. Para exibi-lo seria preciso outra fonte (site da Câmara).
2. **Nomes na chamada fora da lista atual.** A 6ª Sessão Extraordinária de 2025 (id 4239) tem "Cássio Luiz Barbosa" presente, e ele não está entre os 23 de `/vereadores` (hipótese não verificada: suplente que deixou o exercício). O `SiscamSource` deixa o nome de fora e registra em log (`LogUnknownAttendee`).
3. **Frequências publicadas com atraso de mais de 1 mês.** Em 16/11/2026: as sessões de 09/11 (4411), 26/10 (4408) e 15/10 (4404) não tinham o bloco "Frequências"; a de 28/09 (4398) tinha (22 presentes, 1 ausente). O `ScrapeCityFunction` só volta a buscar sessões dos últimos 14 dias (`RecentSessionDays`), então **sessões gravadas sem chamada não seriam reprocessadas** quando a chamada sair. Precisa de ajuste antes de ativar a coleta de presença de Piracicaba (ex.: rebuscar sessões com `HasRollCall = false` até N dias).
4. **Exportação traz "Tipo:"** (Mesa Diretora, Vereador, Comissão) em projetos, e um `p` com link para documento relacionado (ex.: "Ofício Legislativo Nº …") dentro do bloco do item. O parser ignora os dois: só lê `h4` com link de documento.

## Volume e custo da primeira carga

- Indicações: 435 em out/2026 (~805 KB na exportação) e 299 em 01–16/11/2026 (~530 KB).
- Sessões: 209 desde 01/01/2025 (14 páginas de 15).
- Primeira carga desde `TermStart` (01/01/2025), como o `SiscamSource` faz hoje:
  - propostas: 23 janelas mensais × 8 tipos = **184** exportações (as de Indicação com ~0,5–0,8 MB cada);
  - sessões: 14 páginas de lista + 209 detalhes = **223**;
  - `robots.txt` + `/vereadores`: ~3.
  - Total ≈ **410 requisições**, ~7 min a 1 req/s.
- Run diário: 8 ou 16 exportações (janela desde o último run − 7 dias) + 14 páginas de lista de sessões + detalhes das sessões novas ou recentes.
