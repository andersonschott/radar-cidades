# ADR 0002 — Coletar o SISCAM de Santa Bárbara d'Oeste apesar do robots.txt

- **Status:** aceita, provisória (revisar depois do parecer jurídico)
- **Data:** 2026-11-16
- **Decisor:** dono do projeto
- **Relacionada:** SDD §8.2; discovery `w01-i01-d01-siscam-fonte`; `docs/sources/siscam.md`

## Contexto

O `robots.txt` de `santabarbara.siscam.com.br` libera só buscadores nomeados e termina com `User-agent: *` / `Disallow: /`. O SDD §8.2 manda abortar a cidade nesse caso. O site da Câmara não tem outra fonte dos dados: ele só aponta para o SISCAM.

Os dados são atos oficiais do Legislativo, de publicação obrigatória (transparência ativa), sem login.

## Decisão

1. A coleta de SBO segue mesmo com o `robots.txt` proibindo. A exceção é declarada por cidade em `cities/santa-barbara-doeste.json` (`robotsOverride`, apontando para esta ADR). Sem esse campo, o adaptador continua abortando.
2. **A etiqueta continua igual:**
   - no máximo 1 requisição/s por host e 1 em voo;
   - 1 run por dia;
   - coleta incremental;
   - sem retry em 4xx.
3. **O User-Agent continua honesto:** `RadarCidades/1.0 (+<site>/metodologia)`. Fingir ser buscador está vetado.
4. Cada run registra em log um aviso de que o robots.txt foi ignorado, com a referência desta ADR.
5. Em paralelo, há duas frentes:
   - parecer jurídico preliminar em `docs/juridico/`;
   - pedido de autorização formal à Câmara.

## Consequências

- Risco jurídico e reputacional assumido conscientemente; o grau está no parecer.
- **Reversão:** basta remover `robotsOverride` da config para voltar ao comportamento do SDD.
- Se a Câmara ou a SINO pedir para parar, a coleta para e esta ADR é revogada.
