# ADR 0001 — Arquitetura e stack

- **Status:** aceita
- **Data:** 2026-11-16
- **Contexto completo:** [SDD §3–4](../SDD.md)

## Contexto

O Radar Cidades mostra o que cada vereador fez desde a posse, a partir só de dados públicos oficiais. A audiência chega em picos (links no WhatsApp). O projeto é independente e sem receita: o custo-alvo é **< US$ 5/mês** até o M3. Os dados mudam no máximo uma vez por dia, e cada cidade tem um sistema legislativo diferente (SISCAM, SAPL, …).

## Decisão

1. **Site estático em runtime.** Uma Azure Function coleta, classifica e grava no Azure SQL, depois publica JSON pré-calculado num container Blob público. O front React (Static Web Apps) só lê esse JSON e nunca chama API dinâmica.
2. **Pipeline por filas, uma mensagem por cidade.** Timer diário → `scrape-city` → `publish-city`. A falha de uma cidade não afeta as outras, e a poison queue entra após 5 tentativas.
3. **Coleta incremental e idempotente.** Upsert por `(CityId, SourceId)` com `ContentHash`, nunca delete. Janela de `último sucesso − 7 dias`.
4. **Multi-cidade por configuração.** `cities/*.json` mais um adaptador `ILegislativeSource` por sistema, resolvido por keyed services. Capacidades parciais são declaradas na config, e o front esconde o que a cidade não tem.
5. **Stack:** .NET 10 isolated em Flex Consumption, EF Core 10, Azure SQL serverless free offer, React 19 + Vite + Tailwind, Bicep, GitHub Actions com OIDC. Dependências só com licença permissiva (allowlist no CI). Código em AGPL-3.0, dados em CC BY 4.0.

## Consequências

- **Barato e resistente a pico:** o tráfego bate em Blob e na CDN do SWA, não em compute nem no banco. O SQL pode pausar o mês todo sem afetar o site.
- **Dados com até um dia de atraso.** É aceitável: as fontes oficiais também são atualizadas em lote.
- **O contrato JSON (SDD §9) é a fronteira entre back e front.** Mudança incompatível exige `schemaVersion` + 1 e testes de snapshot.
- **O free offer do SQL pausa ao esgotar a cota mensal** (`AutoPause`). A coleta falha até o mês virar, e o site continua no ar com o último JSON publicado.
- **Identidade sem segredo:** a Function acessa Storage e SQL por managed identity, e o deploy entra por federated credential. Nenhum segredo precisa ser rotacionado.

## Desvios registrados na implementação do M0

- O teste de arquitetura lê as `ProjectReference` dos `.csproj` em vez de usar NetArchTest. Com projetos ainda vazios, NetArchTest passaria sem checar nada.
- A Function recebe **Storage Blob Data Owner** (o SDD dizia Contributor), mais Queue e Table Data Contributor. É o mínimo exigido pelo host com identidade, segundo o Microsoft Learn (*manage-connections*).
- O Static Web App fica em `eastus2`, porque o serviço não é oferecido em `brazilsouth`.
