// Geocodifica cada bairro uma vez no Nominatim (1 req/s, UA honesto), preso ao retângulo do município.
// Uso: node tools/geo/geocode.js <requests.json publicado> cities/<slug>.neighborhoods.json
// Retoma de onde parou: bairros já resolvidos ou recusados no arquivo de saída não são consultados de novo.
const fs = require('fs')
const { key } = require('./norm.js')
const [requestsPath, outPath] = process.argv.slice(2)
const counts = new Map()
for (const r of JSON.parse(fs.readFileSync(requestsPath, 'utf8')).data) for (const n of new Set(r.neighborhoods ?? [])) counts.set(n, (counts.get(n) ?? 0) + 1)
const ours = [...counts.entries()]
const groups = new Map()
for (const [n, c] of ours) { const k = key(n); const g = groups.get(k) ?? { key: k, total: 0, names: [] }; g.total += c; g.names.push([n, c]); groups.set(k, g) }
const list = [...groups.values()].sort((a, b) => b.total - a.total)
const file = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : { source: 'OpenStreetMap via Nominatim', license: 'ODbL 1.0 — © colaboradores do OpenStreetMap', neighborhoods: {} }
const done = file.neighborhoods
const save = () => { file.updatedAt = new Date().toISOString().slice(0, 10); fs.writeFileSync(outPath, JSON.stringify(file, null, 1) + '\n') }
const ok = new Set(['place', 'landuse', 'boundary'])
const UA = 'RadarCidades/1.0 (+https://github.com/andersonschott/radar-cidades)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  for (const g of list) {
    if (done[g.key]) continue
    const spelling = g.names.sort((a, b) => b[1] - a[1])[0][0]
    const q = new URLSearchParams({ q: `${spelling}, Santa Bárbara d'Oeste, SP`, format: 'jsonv2', limit: '5', countrycodes: 'br', viewbox: '-47.56,-22.64,-47.28,-22.96', bounded: '1', addressdetails: '1' })
    let hits = []
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' } })
      if (r.status === 429 || r.status >= 500) { console.error('status', r.status, 'parando'); break }
      hits = await r.json()
    } catch (e) { console.error('erro', g.key, e.message) }
    // Só vale se for área (não rua), dentro do município e com o mesmo nome normalizado; o resto vai para revisão manual.
    const inCity = (h) => Object.values(h.address ?? {}).some((v) => key(String(v)) === key("Santa Bárbara d'Oeste"))
    const hit = hits.find((h) => ok.has(h.category) && inCity(h) && key(h.name) === g.key)
    done[g.key] = { names: g.names.map((x) => x[0]), total: g.total, query: spelling,
      match: hit ? { name: hit.name, lat: +hit.lat, lon: +hit.lon, category: hit.category, type: hit.type, osm: `${hit.osm_type}/${hit.osm_id}` } : null,
      rejected: hit ? undefined : hits.slice(0, 3).map((h) => `${h.category}/${h.type}: ${h.name} (${h.address?.city ?? h.address?.town ?? h.address?.municipality ?? '?'})`) }
    save()
    await sleep(1100)
  }
  const v = Object.values(done)
  console.log('feitos', v.length, 'com bairro', v.filter((x) => x.match).length, 'pedidos cobertos', v.filter((x) => x.match).reduce((a, x) => a + x.total, 0))
})()
