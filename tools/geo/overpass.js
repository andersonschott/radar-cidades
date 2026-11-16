// Baixa as vias com nome do município (uma consulta Overpass por cidade) para o streets.js.
// Uso: node tools/geo/overpass.js cities/<slug>.json <ruas.json>
// Se <ruas.json> já existe não consulta de novo. Tenta o servidor principal e o espelho, com espera crescente entre tentativas.
const fs = require('fs')
const [cityPath, outPath] = process.argv.slice(2)
if (fs.existsSync(outPath)) { console.log('já baixado:', outPath); process.exit(0) }
const { ibgeCode } = JSON.parse(fs.readFileSync(cityPath, 'utf8'))
const query = `[out:json][timeout:180];area["IBGE:GEOCODIGO"="${ibgeCode}"]->.a;way(area.a)["highway"]["name"];out center tags;`
const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const UA = 'RadarCidades/1.0 (+https://github.com/andersonschott/radar-cidades)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  for (let attempt = 0; attempt < 8; attempt++) {
    const url = servers[attempt % servers.length]
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: query }) })
      const text = await r.text()
      // Overpass às vezes responde 200 com "remark" de timeout e lista vazia: conta como falha.
      const json = r.ok ? JSON.parse(text) : null
      if (json?.elements?.length) {
        fs.writeFileSync(outPath, text)
        console.log(`overpass ${attempt + 1} tentativa(s), ${json.elements.length} vias, via ${url}`)
        return
      }
      console.error(`tentativa ${attempt + 1} ${url}: status ${r.status} ${json?.remark ?? text.slice(0, 120)}`)
    } catch (e) { console.error(`tentativa ${attempt + 1} ${url}: ${e.message}`) }
    await sleep(Math.min(5000 * 2 ** attempt, 120000))
  }
  console.error('Overpass não respondeu; rode de novo mais tarde')
  process.exit(1)
})()
