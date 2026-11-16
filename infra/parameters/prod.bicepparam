using '../main.bicep'

param location = 'brazilsouth'
param swaLocation = 'eastus2'

// Vêm das variables do repositório no deploy.yml (docs/setup-azure.md).
param sqlAdminLogin = readEnvironmentVariable('SQL_ADMIN_LOGIN')
param sqlAdminObjectId = readEnvironmentVariable('SQL_ADMIN_OBJECT_ID')

// Ex.: '["https://<defaultHostname do SWA>"]'. Vazio no primeiro deploy.
param dataCorsOrigins = json(readEnvironmentVariable('DATA_CORS_ORIGINS', '[]'))
