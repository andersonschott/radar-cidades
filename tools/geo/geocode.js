// Geocodifica cada bairro uma vez no Nominatim (1 req/s, UA honesto), preso ao retângulo do município.
// Uso: node tools/geo/geocode.js <requests.json publicado> cities/<slug>.neighborhoods.json
// Nome, UF e código IBGE vêm de cities/<slug>.json; o retângulo do município vem do Nominatim (uma vez por cidade) e fica em "bbox".
// Retoma de onde parou: bairros já resolvidos ou recusados no arquivo de saída não são consultados de novo; erro de rede não grava.
const fs = require('fs')
const path = require('path')
const { key, canonical } = require('./norm.js')
const [requestsPath, outPath] = process.argv.slice(2)
const city = JSON.parse(fs.readFileSync(path.join(path.dirname(outPath), path.basename(outPath).replace('.neighborhoods.json', '.json')), 'utf8'))
const counts = new Map()
for (const r of JSON.parse(fs.readFileSync(requestsPath, 'utf8')).data) for (const n of new Set(r.neighborhoods ?? [])) counts.set(n, (counts.get(n) ?? 0) + 1)
const ours = [...counts.entries()]
const file = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : { source: 'OpenStreetMap via Nominatim', license: 'ODbL 1.0 — © colaboradores do OpenStreetMap', neighborhoods: {} }
const groups = new Map()
for (const [n, c] of ours) { const k = canonical(n, file.merge); const g = groups.get(k) ?? { key: k, total: 0, names: [] }; g.total += c; g.names.push([n, c]); groups.set(k, g) }
const list = [...groups.values()].sort((a, b) => b.total - a.total)
const done = file.neighborhoods
const save = () => { file.updatedAt = new Date().toISOString().slice(0, 10); fs.writeFileSync(outPath, JSON.stringify(file, null, 1) + '\n') }
const ok = new Set(['place', 'landuse', 'boundary'])
const UA = 'RadarCidades/1.0 (+https://github.com/andersonschott/radar-cidades)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let calls = 0
const nominatim = async (params) => {
  calls++
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ format: 'jsonv2', ...params })}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' } })
  if (r.status === 429 || r.status >= 500) throw Object.assign(new Error(`status ${r.status}, parando`), { stop: true })
  return r.json()
}
// SBO foi geocodificado com este retângulo antes de existir "bbox"; mantido para um bairro novo de SBO cair na mesma busca.
const LEGACY = { 'santa-barbara-doeste': [-47.56, -22.96, -47.28, -22.64] }
// [oeste, sul, leste, norte] do limite municipal, conferido pelo código IBGE.
async function bbox() {
  if (file.bbox) return file.bbox
  if (LEGACY[city.slug]) return LEGACY[city.slug]
  const hits = await nominatim({ city: city.name, state: 'São Paulo', country: 'Brasil', extratags: '1', limit: '5' })
  await sleep(1100)
  const h = hits.find((x) => x.category === 'boundary' && x.extratags?.['IBGE:GEOCODIGO'] === String(city.ibgeCode))
  if (!h) throw new Error(`limite de ${city.name} (IBGE ${city.ibgeCode}) não achado no Nominatim`)
  const [s, n, w, e] = h.boundingbox.map(Number)
  file.bbox = [w, s, e, n]
  file.bboxSource = `Nominatim ${h.osm_type}/${h.osm_id} (limite municipal, IBGE ${city.ibgeCode})`
  return file.bbox
}
;(async () => {
  const todo = list.filter((g) => !done[g.key])
  const box = todo.length ? await bbox() : null
  for (const g of todo) {
    const spelling = g.names.sort((a, b) => b[1] - a[1])[0][0]
    let hits
    try {
      hits = await nominatim({ q: `${spelling}, ${city.name}, ${city.uf}`, limit: '5', countrycodes: 'br', viewbox: box.join(','), bounded: '1', addressdetails: '1' })
    } catch (e) { console.error('erro', g.key, e.message); if (e.stop) break; await sleep(1100); continue }
    // Só vale se for área (não rua), dentro do município e com o mesmo nome normalizado (junções aplicadas); o resto vai para revisão manual.
    const inCity = (h) => Object.values(h.address ?? {}).some((v) => key(String(v)) === key(city.name))
    const hit = hits.find((h) => ok.has(h.category) && inCity(h) && canonical(h.name, file.merge) === g.key)
    done[g.key] = { names: g.names.map((x) => x[0]), total: g.total, query: spelling,
      match: hit ? { name: hit.name, lat: +hit.lat, lon: +hit.lon, category: hit.category, type: hit.type, osm: `${hit.osm_type}/${hit.osm_id}` } : null,
      rejected: hit ? undefined : hits.slice(0, 3).map((h) => `${h.category}/${h.type}: ${h.name} (${h.address?.city ?? h.address?.town ?? h.address?.municipality ?? '?'})`) }
    save()
    await sleep(1100)
  }
  if (todo.length) save()
  const v = Object.values(done)
  console.log('nominatim', calls, '| feitos', v.length, 'com bairro', v.filter((x) => x.match).length, 'pedidos cobertos', v.filter((x) => x.match).reduce((a, x) => a + x.total, 0))
})()
