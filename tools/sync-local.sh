#!/usr/bin/env bash
# Coleta uma cidade nesta máquina (IP residencial) e sobe os JSON publicados para o Blob do Azure.
# Para cidades com "localCollection": true (ex.: Piracicaba, cujo Cloudflare bloqueia IP de datacenter; ADR 0004).
#
# Uso: tools/sync-local.sh <slug> [full]
#   sem "full": coleta incremental (últimos 7 dias; ScrapeCity já reconsulta sessões sem chamada por 90 dias)
#   com "full": carga completa desde a posse
#
# Pré-requisitos locais: SQL (docker radar-sql), Azurite e o host de Functions em http://localhost:7071,
# com "AzureWebJobs.ScheduleScrape.Disabled": "true" no local.settings.json (o timer local não deve coletar).
# Azure: `az login` na conta pessoal, com Storage Blob Data Contributor no stradarprodbrs.
set -euo pipefail
export MSYS_NO_PATHCONV=1

slug=${1:?uso: tools/sync-local.sh <slug> [full]}
mode=${2:-incremental}
local_blob="http://127.0.0.1:10000/devstoreaccount1/data"
account=stradarprodbrs
dev="UseDevelopmentStorage=true"

last() { curl -sf "$1/$slug/meta.json" | node -e "try{console.log(JSON.parse(require('fs').readFileSync(0)).data.lastSuccessfulScrape??'')}catch{console.log('')}" || true; }

before=$(last "$local_blob")
query=""
[ "$mode" = full ] || query="?since=$(date -d '7 days ago' +%Y-%m-%d)"
curl -sf -X POST "http://localhost:7071/api/ops/backfill/$slug$query" >/dev/null
echo "coleta local de $slug iniciada ($mode)"

# Espera a publicação local trocar o lastSuccessfulScrape (até 40 min).
for _ in $(seq 1 240); do
  now=$(last "$local_blob")
  [ -n "$now" ] && [ "$now" != "$before" ] && break
  sleep 10
done
[ -n "${now:-}" ] && [ "$now" != "$before" ] || { echo "coleta local não terminou (veja o log do host)"; exit 1; }
echo "coleta local concluída em $now"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
az storage blob download-batch --connection-string "$dev" -s data -d "$tmp" --pattern "$slug/*" -o none
az storage blob upload-batch --account-name "$account" --auth-mode login -d data -s "$tmp" --overwrite \
  --content-type "application/json; charset=utf-8" --content-cache-control "public, max-age=300" -o none
echo "arquivos de $slug enviados ao Azure"

# cities.json do Azure só conhece runs do banco da nuvem: grava a data desta coleta no índice publicado.
az storage blob download --account-name "$account" --auth-mode login -c data -n cities.json -f "$tmp/cities.json" -o none
node -e "
const fs=require('fs'), f=process.argv[1], d=JSON.parse(fs.readFileSync(f));
const c=d.data.find(x=>x.slug===process.argv[2]); if(!c) throw new Error('cidade fora do índice: '+process.argv[2]);
c.lastUpdated=process.argv[3]; fs.writeFileSync(f, JSON.stringify(d, null, 2));" "$tmp/cities.json" "$slug" "$now"
az storage blob upload --account-name "$account" --auth-mode login -c data -n cities.json -f "$tmp/cities.json" --overwrite \
  --content-type "application/json; charset=utf-8" --content-cache-control "public, max-age=300" -o none
echo "índice atualizado: $slug em $now"
