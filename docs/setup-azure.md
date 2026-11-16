# Setup do Azure (uma vez)

Passos manuais que o `deploy.yml` não faz sozinho. **Executar junto com o dono do projeto**: todos criam recurso ou mexem em permissão (SDD §14, M0.5).

Até o passo 4 terminar, o `deploy.yml` fica inerte (`if: vars.AZURE_CLIENT_ID != ''`).

## 0. Conferir conta e tenant

```sh
az login                       # conta pessoal, não a da empresa
az account show --query "{tenant:tenantId, sub:id, name:name}"
az functionapp list-flexconsumption-runtimes --location brazilsouth --runtime dotnet-isolated -o table
```

Se `10.0` não aparecer em `brazilsouth`, usar `eastus2` (SDD §0, D5) e trocar `location` em `infra/parameters/prod.bicepparam`.

## 1. Resource group

```sh
az group create --name rg-radar-prod-brs --location brazilsouth
```

## 2. Administrador Entra do SQL

O SQL Server aceita só autenticação Entra. O admin pode ser você ou um grupo:

```sh
az ad signed-in-user show --query "{login:userPrincipalName, objectId:id}"
```

## 3. App registration com federated credential (OIDC)

Repositórios criados depois de 2026-07-15 usam **subject imutável**, com os IDs numéricos do dono e do repo. O subject por nome (`repo:andersonschott/radar-cidades:...`) **não casa** e o login falha com `AADSTS700213`. Conferir o prefixo antes:

```sh
gh api repos/andersonschott/radar-cidades/actions/oidc/customization/sub
# sub_claim_prefix: repo:andersonschott@13530908/radar-cidades@1460070986
```

O job de deploy usa `environment: prod`, então o subject termina em `:environment:prod`:

```sh
APP_ID=$(az ad app create --display-name gh-radar-cidades-deploy --query appId -o tsv)
az ad sp create --id "$APP_ID"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "github-prod",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:andersonschott@13530908/radar-cidades@1460070986:environment:prod",
  "audiences": ["api://AzureADTokenExchange"]
}'

RG_ID=$(az group show --name rg-radar-prod-brs --query id -o tsv)
# Contributor cria os recursos; o Bicep também cria role assignments (Function → Storage),
# o que exige User Access Administrator restrito a esses papéis.
az role assignment create --assignee "$APP_ID" --role Contributor --scope "$RG_ID"
az role assignment create --assignee "$APP_ID" --role "User Access Administrator" --scope "$RG_ID" \
  --condition-version 2.0 \
  --condition "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR (@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {b7e6dc6d-f1e8-4753-8033-0f276bb0955b, 974c5e8b-45b9-4653-ba55-5f855dd0fb88, 0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3}))"
```

## 4. Variables do repositório

Nada disso é segredo; são identificadores. Ficam em *variables*, não em *secrets*:

```sh
R=andersonschott/radar-cidades
gh variable set AZURE_CLIENT_ID       --repo $R --body "$APP_ID"
gh variable set AZURE_TENANT_ID       --repo $R --body "$(az account show --query tenantId -o tsv)"
gh variable set AZURE_SUBSCRIPTION_ID --repo $R --body "$(az account show --query id -o tsv)"
gh variable set SQL_ADMIN_LOGIN       --repo $R --body "<login do passo 2>"
gh variable set SQL_ADMIN_OBJECT_ID   --repo $R --body "<objectId do passo 2>"
```

Disparar o deploy: `gh workflow run deploy.yml --repo $R`. No log, procurar `Azure CLI login succeeds by using OIDC`.

## 5. Depois do primeiro deploy

1. **CORS dos dados:** pegar o `staticWebAppHostname` nos outputs e gravar
   `gh variable set DATA_CORS_ORIGINS --repo $R --body '["https://<hostname>"]'`.
2. **Identidade da Function como usuário do banco** (T-SQL, não Bicep). Conectado ao `sqldb-radar` como admin Entra:

   ```sql
   CREATE USER [func-radar-prod-brs] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_datareader ADD MEMBER [func-radar-prod-brs];
   ALTER ROLE db_datawriter ADD MEMBER [func-radar-prod-brs];
   ```

   As migrations rodam com a identidade do workflow (M1). Ela também precisa de usuário no banco, com `db_ddladmin`, criado da mesma forma com o nome do app registration.
