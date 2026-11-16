# ADR 0003 — Coletar o SISCAM de Americana apesar do robots.txt

- **Status:** aceita pelo dono do projeto em 2026-11-16 ("Mesma regra de SBO"); provisória como a [ADR 0002](0002-coleta-siscam-sbo-apesar-do-robots.md) (revisar depois do parecer jurídico)
- **Data:** 2026-11-16
- **Decisor:** dono do projeto
- **Relacionada:** SDD §8.2; ADR 0002; `docs/sources/siscam.md`; `docs/sources/siscam-americana.md`

## Contexto

O `robots.txt` de `americana.siscam.com.br` (lido em 16/11/2026, fixture `tests/Radar.Sources.Tests/Fixtures/siscam/americana/robots.txt`) é igual ao de SBO. Ele libera só buscadores nomeados (Googlebot, Bingbot, Applebot…) e termina com:

```
User-agent: *
Disallow: /
```

O SDD §8.2 manda abortar a cidade nesse caso.

O site da Câmara (`www.camara-americana.sp.gov.br`) não publica proposituras nem sessões. A home só tem links para o SISCAM (`americana.siscam.com.br` e `consulta.siscam.com.br/camaraamericana`). `siscam.camara-americana.sp.gov.br` serve apenas `/arquivo` e não tem `robots.txt` (404).

Os dados são atos oficiais do Legislativo, de publicação obrigatória (transparência ativa), sem login.

## Decisão

1. A coleta de Americana segue mesmo com o `robots.txt` proibindo. A exceção é declarada em `cities/americana.json` (`robotsOverride`, apontando para esta ADR). Sem esse campo, o adaptador continua abortando.
2. **A etiqueta é a mesma da ADR 0002:**
   - no máximo 1 requisição/s por host e 1 em voo;
   - 1 run por dia;
   - coleta incremental;
   - sem retry em 4xx;
   - só páginas públicas: sem login, formulário ou captcha.
3. **O User-Agent continua honesto:** `RadarCidades/1.0 (+<site>/metodologia)`. Fingir ser buscador está vetado.
4. Cada run registra em log um aviso de que o robots.txt foi ignorado, com a referência desta ADR.
5. O parecer jurídico e o pedido de autorização formal da ADR 0002 passam a cobrir também Americana. O pedido à Câmara de Americana é feito à parte.

## Consequências

- Risco jurídico e reputacional assumido conscientemente, o mesmo da ADR 0002.
- O volume é cerca de 3 vezes o de SBO (35.662 documentos desde 01/01/2025 contra 12.197). A primeira carga fica mais longa, mas o ritmo de 1 req/s não muda (custo em `docs/sources/siscam-americana.md`).
- **Reversão:** basta remover `robotsOverride` de `cities/americana.json` para voltar ao comportamento do SDD.
- Se a Câmara ou a SINO pedir para parar, a coleta para e esta ADR é revogada.
