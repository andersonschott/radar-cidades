# Fonte: SISCAM (SINO Informática) — Santa Bárbara d'Oeste

Descoberta feita em 2026-11-16 (SDD §8.3), com curl e o UA do projeto, a ≤1 req/s e 41 requisições.
Fixtures: `tests/Radar.Sources.Tests/Fixtures/siscam/santa-barbara-doeste/`.

## Resumo

| Item | Disponível? | Rota recomendada |
|---|---|---|
| Vereadores (id, nome, partido, foto) | Sim | `GET /vereadores` (HTML) |
| Mandato (início/fim, partido na posse, titular/suplente) | Sim | `GET /Vereadores/Vereador/{id}` ou `GET /Legislaturas/Legislatura/4` |
| Proposições | Sim | `GET /Documentos/Exportar?tipo=0&…` (versão de impressão: **todas as linhas, sem paginação, com id**) |
| Autoria por id | Sim, via filtro | `AutoriaId={id}` na pesquisa (casa autor **e** coautor, inclusive grafias diferentes do nome) |
| Sessões | Sim | `GET /Sessoes/Pesquisa?…` (paginado) |
| Presença | Sim, HTML | `GET /Sessoes/Sessao/{id}`, bloco "Frequências" |
| Votação nominal | Sim, HTML | `GET /Sessoes/Sessao/{id}`, bloco "Votações" |
| JSON/XHR | **Não** para dados | Só lookups do formulário (abaixo) |

- Base: `https://santabarbara.siscam.com.br` (`consulta.siscam.com.br/camarasantabarbara` redireciona para cá).
- Servidor: ASP.NET MVC 4 no IIS. SISCAM versão 8.8.1.82 (rodapé).
- **`robots.txt` PROÍBE a coleta** (corrigido em 16/11/2026): libera só buscadores nomeados (Googlebot, Bingbot…) e termina com `User-agent: *` / `Disallow: /` (fixture `robots.txt`). A primeira leitura desta discovery estava errada, e as 41 requisições abaixo foram feitas sob essa leitura. O `SiscamSource` aborta a coleta, como manda o SDD §8.2. **Coletar exige autorização da Câmara ou decisão explícita do dono do projeto.**
- Encoding: UTF-8 em tudo. O HTML mistura texto cru com entidades (`&#225;`, `&#186;`); aplique sempre `HtmlDecode`. O CSV vem com BOM.
- Não há login nem cookie para consultar. O servidor seta `ASP.NET_SessionId`, mas ele não é necessário.
- Query string: o binder do MVC ignora caixa (`pagina` e `Pagina` funcionam) e aceita datas `dd/MM/yyyy` com ou sem URL-encode da barra.

## 1. Vereadores

### `GET /vereadores` — legislatura atual (fixture `vereadores.html`)

São 19 itens `div.data-list-item`. Seletores dentro de cada item:

| Campo | Seletor | Exemplo |
|---|---|---|
| `SourceId` | `h4 > a[href^="/Vereadores/Vereador/"]`, número final | `3881` |
| Nome parlamentar | texto de `h4 > a` | `CABO DORIGON` |
| Nome civil | `title` do `a` que envolve a foto (`div.col-md-2 > a`) | `CLAUDEMIR DORIGON` |
| Partido **atual** | `p` cujo `strong` é `Partido:`; o texto vem depois do `strong` | `PODEMOS` |
| Foto | `div.col-md-2 img[src^="/Vereadores/Foto/"]` | `/Vereadores/Foto/3543` |
| E-mail | `p` com `strong` `E-mail:` (opcional) | |

- **Foto é opcional:** 7 dos 19 não têm (`span.fa-male` no lugar do `img`). O site da Câmara tem foto de todos (seção 6).
- `/vereadores/Anteriores` lista as legislaturas passadas.
- `ProfileUrl` = `https://santabarbara.siscam.com.br/Vereadores/Vereador/{id}`.

### `GET /Vereadores/Vereador/{id}` — perfil (fixture `vereador-3881.html`)

- `h3.page-header small`: `- CABO DORIGON - PODEMOS - PODEMOS`.
- A tabela de caption "Legislaturas" tem as colunas Descrição (link `/Legislaturas/Legislatura/{n}`), Data Início, Data Término, Partido, Votos e Cargo (`Titular`/`Suplente`). É a fonte de `Mandate`.
- A tabela "Comissões" vem depois, com Descrição, Cargo, Início e Término.

### `GET /Legislaturas/Legislatura/4` — 42ª legislatura (fixture `legislatura-4.html`)

- Tem Eleição 06/10/2024, Posse 01/01/2025 e Encerramento 31/12/2028.
- A tabela lista os eleitos com **nome civil** (não o parlamentar), início, término, partido **na posse**, votos e cargo. O nome é link `/Vereadores/Vereador/{id}`, exceto `JESUS` (UNIÃO, id 3147 no select de autores), que vem sem link.
- **WILSON DA ENGENHARIA (id 32) não aparece na 42ª legislatura**, embora esteja em `/vereadores` e nas chamadas de presença. O perfil dele só tem a 39ª legislatura (fixture `vereador-32-sem-mandato-atual.html`). *Hipótese não verificada:* JESUS se licenciou e WILSON é o suplente em exercício. O `Mandate` dele terá de vir da config da cidade ou de outra fonte.
- Divergência de partido: PAULO MONARO tem PSB na legislatura (posse) e PSD em `/vereadores` (atual). Para `Mandate.PartyId`, use o partido da legislatura e registre a troca.

### Ids de quem já foi autor na legislatura e não está em `/vereadores`

Esses ids saem do `<select name="AutoriaId">` do formulário de pesquisa (fixture `proposituras-index-formulario.html`):

| id | Nome no select | Observação |
|---|---|---|
| 22 | ALEX BACKER | Vereadores anteriores; coautor de uma Indicação em 2025/26 |
| 3865 | VALDEMAR GOMES PEIXOTO DA SILVA | Vereadores anteriores; Indicações de ago/2025; **perfil `/Vereadores/Vereador/3865` dá 404** |
| 3978 | JEOVÁ DEPÓSITO MIGRAÇÃO | Vereadores anteriores; **verificado**: `AutoriaId=3978` devolve a Indicação 3644/2025, de autoria "JEOVÁ APARECIDO RAMOS CARNAVALLI" (out/2025) |
| 3147 | JESUS | Vereadores anteriores |
| 3557 | RAFAEL PIOVEZAN | **Prefeitos atuais** (não é vereador) |

Pessoas que assinaram como vereador por pouco tempo (provavelmente suplentes) não aparecem em `/vereadores`, e o SISCAM **não expõe de forma confiável o período em exercício**: um perfil deu 404 e outro (32) não tem a 42ª legislatura. Para descobri-las, procure autores do texto de Autoria que não casam com os 19 atuais e resolva o id pelo `<select name="AutoriaId">` (optgroups "Vereadores atuais" e "Vereadores anteriores"). As datas do mandato de suplente ficam na config da cidade (fonte manual) ou são inferidas pela primeira e última proposição.

## 2. Proposições

### Tipos (`Documento`, módulo 8, índice 74 "Proposituras")

> O índice da pesquisa (`id=`) e os códigos abaixo **mudam por instalação** do SISCAM. Valores de SBO; cada cidade declara os seus em `cities/<slug>.json`, bloco `siscam` (`searchIndex`, `documentTypes`). Para achar: abrir `/index/<id>` da Câmara e ler o select de tipos. Ex.: Piracicaba usa `id=78` e códigos 129–136; Americana, `id=74` e 119–126.

| `Documento` | Tipo bruto | `PropositionType` | Volume 01/01/2025–16/11/2026 |
|---|---|---|---|
| 123 | Indicações | `Indicacao` | 9378 |
| 122 | Requerimentos | `Requerimento` | 1487 |
| 124 | Moções | `Mocao` | 919 |
| 117 | Projetos de Lei | `ProjetoLei` | 324 |
| 118 | Projetos de Lei Complementar | `ProjetoLeiComplementar` | 32 |
| 119 | Projetos de Decreto Legislativo | `ProjetoDecretoLegislativo` | 46 |
| 120 | Projetos de Resolução Municipal | `ProjetoResolucao` | 8 |
| 121 | Projetos de Emenda à Lei Orgânica | `Outro` | 3 |
| 0 | Todos | | **12197** (a soma bate) |

Emendas (108) e Substitutivos (111) existem, mas ficam fora do índice 74. Aparecem no select do perfil do vereador e como "Documentos Relacionados" no detalhe. **A rota de pesquisa delas não foi mapeada.**

Ritmo médio (contadores ÷ 22,5 meses): cerca de 417 Indicações, 66 Requerimentos e 41 Moções por mês. Out/2026 teve 672 Indicações.

### Pesquisa avançada (HTML, paginada)

```
GET /Documentos/Pesquisa?Pesquisa=Avancada&id=74&Modulo=8&Pagina={n}
    &Documento={tipo}
    &DataInicial=dd/MM/yyyy&DataFinal=dd/MM/yyyy
    [&TipoAutor=Vereador&AutoriaId={id}] [&Iniciativa=Autor|CoAutor]
    [&NumeroInicial=&AnoInicial=&NumeroFinal=&AnoFinal=] [&Situacao={id}] [&Assunto=texto]
```

- A página traz **15 itens**. O total aparece em `nav[aria-label="Page navigation"] > div` como `9378 registro(s) encontrado(s)`, e os links ficam em `ul.pagination` (`li.active` é a página atual). Indicações desde 2025 somam 626 páginas.
- Ordem: data desc, depois número desc.
- Sem resultado: não há `nav`; aparece o texto "Nenhum resultado encontrado" (fixture `pesquisa-sem-resultado.html`).
- `DataInicial` sem `DataFinal` filtra **só aquele dia**, segundo o tooltip do campo. O teste com 02/11/2026 voltou vazio, o que é coerente (o CSV também não tem linha nessa data, que é feriado), mas não prova a regra. Para "desde X", mande sempre `DataFinal` (use uma data distante, como `31/12/2099`; veja os gotchas).

### Rota recomendada: exportação "Impressão" (`tipo=0`), sem paginação

```
GET /Documentos/Exportar?tipo=0&Pesquisa=Avancada&id=74&Modulo=8&pagina=1
    &Documento={tipo}&DataInicial=dd/MM/yyyy&DataFinal=31/12/2099
    [&TipoAutor=Vereador&AutoriaId={id}]
```

- A resposta traz todas as linhas numa página e inclui o link do PDF assinado (`/arquivo?Id=`).
- **Delimitação dos itens diferente da pesquisa:** não há `div.data-list-item`. Os itens são blocos irmãos dentro de `main > div.container`, cada um começando num `<h4><a href="/Documentos/Documento/{id}">` e terminando num `<hr/>`. Os campos internos (`div.row > p > strong`) são iguais aos da pesquisa. Parser sugerido: para cada `h4` com esse link, percorra os irmãos seguintes até o próximo `hr`.
- Cabeçalho: `p.text-center` com `Documentos - Versão de Impressão - 158 registro(s) - 16/11/2026 11:13`. Use esse número para conferir a contagem de `h4`.
- **Sem limite de linhas (verificado):** Indicações de out/2026 deram 672 no cabeçalho, 672 `h4` e 672 no contador da pesquisa, em ~950 KB. A carga inicial de todas as Indicações daria ~13 MB numa resposta só; use **janelas mensais**.
- Fixtures: `exportar-impressao-indicacao-2026-11.html` (1 tipo, 158 linhas) e `exportar-impressao-autor-3881-2026-10.html` (todos os tipos de um autor, com coautorias).

`tipo=1` gera PDF e `tipo=2` gera CSV. O CSV é UTF-8 com BOM, separado por `;`, com campos entre aspas quando há quebra de linha. As colunas são `Documento;Numero;Ano;Data;Ementa;Autoria;Situação;Protocolo;Classificacao` e **não há o id do documento**, por isso o CSV não serve como fonte primária (fixture truncada: `exportar-csv-indicacao-truncado.csv`). Ele só serve para conferir contagens.

### Campos do item (na pesquisa o item é `div.data-list-item`; na impressão, o bloco `h4`…`hr`)

```html
<h4><a href="/Documentos/Documento/225840" title="Indicação Nº 5172/2026">Indicação Nº 5172/2026</a></h4>
<p><strong>Data:</strong> 16/11/2026</p>   <p><strong>Protocolo:</strong> 09488/2026</p>
<p><strong>Situação:</strong> TRAMITANDO</p> <p><strong>Regime:</strong> Ordinário</p>
<p><strong>Autoria:</strong> CABO DORIGON</p>
<p><strong>Assunto:</strong> Indica ao Poder Executivo Municipal ...</p>
[<ul class="list-inline"><li><a href="/arquivo?Id=359644" title="Documento Assinado">…pdf</a></li></ul>]   (só na impressão)
```

| Campo SDD | Origem |
|---|---|
| `SourceId` | número em `h4 > a[href^="/Documentos/Documento/"]` (id interno e estável) |
| `Type` | o `Documento` da consulta (mais seguro que o texto do título) |
| `Number`/`Year` | regex `Nº\s*(\d+)/(\d{4})` sobre o texto do `h4` |
| `PresentedOn` | `p` com `strong` "Data:" (`dd/MM/yyyy`) |
| `Summary` | `p` com `strong` "Assunto:" (pode ter quebras de linha e espaço sobrando; normalizar) |
| `Status` | `p` com `strong` "Situação:" |
| Autores | `p` com `strong` "Autoria:", nomes separados por `, ` (até 19 nomes) |
| `OfficialUrl` | `https://santabarbara.siscam.com.br/Documentos/Documento/{id}` |
| PDF (opcional) | `a[href^="/arquivo?Id="]`. Documento recém-criado ainda não tem PDF |

Localize os campos pelo texto do `<strong>`, não pela posição: Protocolo e Regime às vezes não vêm.

### Detalhe: `GET /Documentos/Documento/{id}`

- Fixtures: `proposicao-detalhe-225840.html` (Indicação nova, sem arquivo) e `proposicao-detalhe-197365.html` (PL com tramitação).
- O detalhe repete os campos da lista. Projetos também trazem Tipo (Legislativo/Executivo), Finalizado, Quórum e as tabelas "Arquivos", "Tramitações" e "Documentos Relacionados" (emendas, despachos, pareceres).
- **Para Indicação, Requerimento e Moção, não é preciso buscar o detalhe**: a lista já tem tudo. Só vale buscar se quisermos `FullText` (PDF) ou tramitação de projetos.

## 3. Autoria: texto vs id

- O campo "Autoria" é **texto**, com o nome usado **na data do protocolo**. Isso inclui nomes civis no lugar do parlamentar (`CLAUDEMIR DORIGON` = CABO DORIGON, `MARCELO JOSÉ MORAES` = MARCELO CURY, `RONY GONÇALVES DA SILVA` = RONY TAVARES, `LUCIO DONIZETE ROCHA DA SILVA` = LUCIO DONIZETE), comissões ("Comissão Permanente de Justiça e Redação"), Mesa e o prefeito.
- **O filtro `AutoriaId` resolve por id no servidor**, e isso foi verificado em dois casos:
  - `AutoriaId=3881` devolve a Indicação 195/2025, cujo autor está escrito "CLAUDEMIR DORIGON".
  - `AutoriaId=3544` (TIKINHO TK) devolve a Indicação 3678/2025, de autoria "ARNALDO ALVES, TIKINHO TK", ou seja, coautores também casam.
- Para o vereador 3881, desde 2025, o filtro devolve 581 Indicações; casar pelo nome parlamentar acharia menos.

### Rota recomendada (duas passadas)

1. **Conjunto de documentos:** uma exportação de impressão por tipo (`Documento`) e por janela mensal. Ela define `Proposition` e inclui documentos sem vereador autor (prefeito, comissões, Mesa), que uma coleta só por autor perderia.
2. **Vínculos de autoria:** uma exportação de impressão com `Documento=0&TipoAutor=Vereador&AutoriaId={id}` por vereador da legislatura (os 19 atuais e os ids extras da seção 1) e por janela. Cada linha vira um par (`SourceId`, vereador). Um documento com N coautores aparece em N exportações.

Custo da carga inicial: (8 tipos + ~24 autores) × 23 meses ≈ 740 requisições, cerca de 13 min a 1 req/s. A coleta incremental faz ~32 requisições por run.

A ordem dos nomes em "Autoria" e o filtro `Iniciativa=Autor|CoAutor` **não foram testados** para distinguir autor de coautor; o SDD não exige essa distinção.

Alternativa mais barata, sem a passada 2: casar o texto de Autoria com uma tabela de aliases (nome parlamentar, nome civil do `title` e da legislatura). É frágil para nomes novos.

## 4. Sessões, presença e votações

### Lista: `GET /Sessoes/Pesquisa?Classe=Sessao&Pagina={n}&tipo={t}&dataInicial=dd/MM/yyyy&dataFinal=dd/MM/yyyy`

- Valores de `tipo`: 0 Todas, 7 Ordinárias, 8 Extraordinárias, 9 Solenes, 587/625/1203/1342 Audiências Públicas e 1405 Eleição da Mesa.
- Retorna 15 itens por página em `div.data-list-item` (não é tabela): link `h4 > a[href^="/Sessoes/Sessao/"]` com o texto "39ª Sessão Ordinária de 2026", Data, Hora, Hora Término, URL do vídeo (costuma vir vazia) e Observações.
- O total segue o mesmo padrão (`105 registro(s)` desde 01/01/2025, 7 páginas).
- Fixture: `sessoes-pesquisa-p1.html`. `GET /sessoes` mostra só as "Recentes".

### Detalhe: `GET /Sessoes/Sessao/{id}` (HTML, sem PDF necessário)

- `h3.page-header small` tem o nome da sessão; `p` com `strong` "Data:" e "Hora:".
- **Documentos da sessão:** Ementário, Ordem do dia e Ata, cada um com link `/Sessoes/Documento/{id}` e arquivos em `/arquivo?Id=` (PDF ou Word).
- **Frequências** (vem depois de `<h3><strong>Frequências</strong></h3>`): cada `div.data-list-item` tem `h4` "Chamada Regimental - HH:mm" e, dentro, `p` assim:
  - `<strong>Presentes (19)</strong> - NOME, NOME, …`
  - `<strong>Ausentes (1)</strong> - ESTHER MORAES` (fixture `sessao-840-ausencia.html`)
  - Pode haver **mais de uma chamada** por sessão (a 840 tem duas iguais). Considere presente quem aparece como presente em qualquer chamada.
  - **Não foi visto marcador de falta justificada.** `Attendance.Justified` fica `null`.
- **Votações** (depois de `<h3><strong>Votações</strong></h3>`): cada `div.data-list-item` traz:
  - link da matéria `a[href^="/Documentos/Documento/"]` com texto "Projeto de Lei Nº 75/2025 - Legislativo"; o id casa direto com `Proposition.SourceId`;
  - "Autoria", "Assunto", "Quórum", "Votação:" (`Nominal` em todas as amostras) e "Fase:";
  - grupos `<strong>A favor (15)</strong> - …`, `Contra (n)`, `Não vota (n)` e `Ausente (n)`. Grupo com 0 votos não aparece;
  - "Resultado:" é `Aprovado` ou, na maioria dos casos, `...`. Isso **não** quer dizer "pendente": a 1ª sessão de 2025 (fixture `sessao-822-primeira-2025.html`) também tem 33 de 35 com `...`. O resultado precisa ser calculado a partir dos votos ou fica como desconhecido.
  - Mapeamento para `VoteCast`: A favor → `Sim`, Contra → `Nao`, Ausente → `Ausente`. `Não vota` é o presidente; não existe no enum do SDD, então mapeie para `Abstencao` ou acrescente um valor. Abstenção explícita não apareceu nas amostras.
  - Fixtures: `sessao-927-votacoes.html` (36 votações, "Não vota" e "Ausente") e `sessao-919-extraordinaria.html` (com "Contra").
- Em presenças e votos, os nomes são **apenas texto** (nome parlamentar atual) e não há id. Case com a tabela de aliases da seção 3.

## 5. JSON/XHR

O bundle `/bundles/myscripts` só chama endpoints JSON de lookup do formulário: `GET /Documentos/SubDocumentos?id=` e `GET /Documentos/SubTipoDocumentos?id=` (subtipos de projeto). Não existe endpoint JSON para documentos, vereadores ou sessões. O resto (`Normas/*`, `Home/EnviarEmail`, `Home/CadastrarNovidade`) é POST de escrita ou de área logada e **não deve ser usado**.

## 6. Site da Câmara (`www.camarasantabarbara.sp.gov.br`), complementar

- Não tem `robots.txt` (404).
- A home (fixture `camara-home.html`) tem um card por vereador:
  - `a[href^="/Vereador/Listar/{idCamara}"] > img[src^="/Arquivos/Vereadores/"]` com `alt` = nome em caixa mista;
  - o partido **só como logo**: `a[href^="/Vereador/ListarPartido/{idPartido}"] > img`.
- O perfil `/Vereador/Listar/{id}` (fixture `camara-vereador-103.html`) tem telefone, e-mail, comissões e notícias, mas **não mostra o partido em texto** nem tem link para o id do SISCAM.
- Uso recomendado: **só a foto**, casando pelo nome parlamentar normalizado (`Marcelo Cury` ↔ `MARCELO CURY`). O id e o partido vêm do SISCAM.

## 7. Gotchas

1. **Datas no futuro por erro de digitação.** A Indicação 5129/2026 tem data 13/12/2026 (consultado em 16/11/2026). Com `DataFinal` = hoje, ela some. Use `DataFinal=31/12/2099` e trate data futura como suspeita (log de warning).
2. `DataInicial` sem `DataFinal` filtra um único dia.
3. O mesmo vereador aparece com nomes diferentes ao longo do tempo (seção 3). Não use o nome como chave.
4. Autoria inclui não vereadores (prefeito, comissões, Mesa). Ignore o que não casar com um `Councilor` e registre em log.
5. O partido atual (`/vereadores`) pode diferir do partido na posse (legislatura).
6. O `Assunto` pode ter `\r\n` e espaços duplicados no meio. No CSV, isso vira campo entre aspas com várias linhas.
7. Paginação de 15 itens torna a carga inicial pela pesquisa cara (~800 páginas para todos os tipos). Use a exportação `tipo=0` em janelas mensais (seção 3).
8. Coleta incremental: a exportação desde `since` (último run − 7 dias) cabe em uma requisição por tipo e por autor.
9. Datas de mandato de suplentes não são confiáveis no SISCAM (seção 1).
10. O formulário e o detalhe trazem `__RequestVerificationToken` e hCaptcha só nos POSTs de e-mail/notificação. Nada disso é necessário para ler.

## 8. O que não está disponível

- API JSON de dados.
- Id de vereador no texto de autoria, presença e votos (só nome); a resolução por id existe apenas via filtro `AutoriaId`.
- Falta justificada na frequência.
- Texto integral fora de PDF (`/arquivo?Id=`); o `FullText` exigiria extração de PDF.
- Partido em texto no site da Câmara.
