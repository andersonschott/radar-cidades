# ADR 0004 — robots.txt ambíguo e Cloudflare no SISCAM de Piracicaba

- **Status:** Proposta — aguarda o dono. Até a aprovação, `cities/piracicaba.json` fica com `"active": false` (fora do índice e do timer).
- **Data:** 2026-11-16
- **Decisor:** dono do projeto
- **Relacionada:** SDD §8.2 e §8.4; ADR 0002; `docs/sources/siscam-piracicaba.md`

## Contexto

O SISCAM de Piracicaba fica em `https://siave.camarapiracicaba.sp.gov.br/`, atrás da Cloudflare. O `robots.txt` (fixture `tests/Radar.Sources.Tests/Fixtures/siscam/piracicaba/robots.txt`, lido em 16/11/2026) junta dois arquivos:

1. **Bloco gerenciado pela Cloudflare** (início): `User-agent: *`, `Content-Signal: search=yes,ai-train=no,use=reference`, `Allow: /`; depois, `Disallow: /` para robôs de treino de IA nomeados (GPTBot, ClaudeBot, CCBot…).
2. **Padrão do SISCAM** (fim): `Allow: /` para buscadores nomeados (Googlebot, Bingbot…) e `User-agent: *` / `Disallow: /`, o mesmo arquivo que bloqueia SBO (ADR 0002).

Há, portanto, dois grupos `*` que se contradizem.

## Decisão

1. **A coleta é permitida pelas duas leituras**, e a cidade **não** declara `robotsOverride`:
   - **Nosso `RobotsTxt.IsAllowed`** usa o primeiro grupo `*`, que é o da Cloudflare: `Allow: /`.
   - **RFC 9309:** grupos para o mesmo agente são combinados num só; vence a regra de caminho mais longo e, no empate, vence `Allow`. O grupo `*` combinado tem `Allow: /` e `Disallow: /`, de mesmo comprimento, então vale `Allow`.
   - O teste `PiracicabaSiscamTests.Robots_FirstStarGroupAllows` prova a primeira leitura sobre o arquivo real, para os caminhos que o `SiscamSource` checa.
2. O `Content-Signal` do bloco da Cloudflare diz `search=yes`, `ai-train=no` e `use=reference`, sem sinal `ai-input`. O Radar não treina modelo com o conteúdo; a compatibilidade com `use=reference` fica para o dono avaliar junto com esta ADR.
3. A etiqueta da ADR 0002 vale igual: 1 req/s por host, 1 run por dia, coleta incremental, sem retry em 4xx e User-Agent honesto. Se o `SiscamSource` passar a ler o grupo da forma da RFC, o resultado não muda.

## Riscos

- **A intenção do dono do site é incerta.** O `Disallow` do SISCAM pode ser a regra que a Câmara quer e o `Allow` da Cloudflare um efeito colateral do recurso gerenciado. Se o bloco da Cloudflare sair, o mesmo arquivo passa a proibir, e o adaptador aborta sozinho (comportamento correto do SDD §8.2).
- **Bloqueio de IP de datacenter (SDD §8.4).** O site da Câmara já devolveu 403 a partir de IP de datacenter. Desta máquina local (atendida pelo nó GRU da Cloudflare) o `siave` respondeu 200 em 16/11/2026, mas o Function App no Azure pode receber 403 ou desafio da Cloudflare. Hoje um 403 falha o run da cidade (4xx não repete).

## Mitigações

- Pedir à Câmara, por e-mail ou pedido via LAI, a confirmação de que a coleta é aceita e a liberação do User-Agent ou dos IPs de saída.
- Se a Cloudflare bloquear no Azure, rodar o coletor de Piracicaba num runner self-hosted no Brasil (rede residencial ou provedor nacional), com a mesma etiqueta.
- Nunca contornar o desafio da Cloudflare (sem navegador headless, sem trocar User-Agent).

## Consequências

- Piracicaba entra ativa e sem exceção de robots.
- Se a Câmara pedir para parar, ou se o `robots.txt` passar a proibir, a coleta para.
