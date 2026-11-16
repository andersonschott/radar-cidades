// Posição de bairro pelas ruas: mediana dos centros das ruas citadas junto com ele nos pedidos.
// Uso: node tools/geo/streets.js <requests.json publicado> <ruas Overpass .json> cities/<slug>.neighborhoods.json
// Ruas: baixadas por tools/geo/overpass.js (uma consulta Overpass por município, pelo código IBGE).
// Só preenche bairro sem "match" do OSM; nos que têm, grava o desvio do método ("streetCheckKm") como prova
// e, se o desvio passar de MAX_DISAGREE_KM, troca pela posição das ruas e guarda o ponto do OSM em "osmDisagrees".
const fs = require('fs')
const { key, canonical } = require('./norm.js')
const [requestsPath, streetsPath, outPath] = process.argv.slice(2)
const MIN_STREETS = 3
const MAX_SPREAD_KM = 1.2
const MAX_DISAGREE_KM = 1 // OSM e ruas discordam além disso: vale o que os pedidos descrevem (as ruas)

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const km = (a, b) => { const r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r; return 6371 * Math.hypot(x, y) }

// Rua (chave) -> centro: mediana dos trechos com o mesmo nome. Nome repetido longe demais (duas ruas homônimas) fica de fora.
const segments = new Map()
for (const e of JSON.parse(fs.readFileSync(streetsPath, 'utf8')).elements) {
  if (!e.center) continue
  const k = key(e.tags.name)
  segments.set(k, [...(segments.get(k) ?? []), { lat: e.center.lat, lon: e.center.lon }])
}
const streets = new Map()
for (const [k, pts] of segments) {
  const c = { lat: median(pts.map((p) => p.lat)), lon: median(pts.map((p) => p.lon)) }
  if (Math.max(...pts.map((p) => km(c, p))) <= 3) streets.set(k, c)
}

const file = JSON.parse(fs.readFileSync(outPath, 'utf8'))
const byHood = new Map()
for (const r of JSON.parse(fs.readFileSync(requestsPath, 'utf8')).data) {
  for (const n of new Set(r.neighborhoods ?? [])) {
    const h = canonical(n, file.merge)
    const g = byHood.get(h) ?? { names: new Map(), requests: 0, streets: new Map() }
    g.names.set(n, (g.names.get(n) ?? 0) + 1)
    g.requests++
    for (const s of r.streets ?? []) { const c = streets.get(key(s)); if (c) g.streets.set(key(s), c) }
    byHood.set(h, g)
  }
}

let filled = 0, checked = []
for (const [h, g] of byHood) {
  const entry = file.neighborhoods[h] ?? (file.neighborhoods[h] = { names: [...g.names.keys()], total: g.requests, query: null, match: null })
  entry.names = [...new Set([...entry.names, ...g.names.keys()])].sort()
  entry.total = g.requests
  // Grafia mais usada nos pedidos: é o que a busca do site entende e o rótulo quando o OSM não dá nome.
  entry.label = [...g.names].sort((x, y) => y[1] - x[1])[0][0]
  // Bairro unificado busca pelo nome da junção ("mollon" acha Jardim, Vila e Mollon 4); os demais, pela grafia mais usada.
  entry.search = (file.merge ?? []).some((m) => m.into === h) ? h : entry.label
  const pts = [...g.streets.values()]
  if (pts.length < MIN_STREETS) continue
  const c = { lat: median(pts.map((p) => p.lat)), lon: median(pts.map((p) => p.lon)) }
  const spread = median(pts.map((p) => km(c, p)))
  if (entry.match && entry.match.category !== 'streets') {
    const d = km(c, entry.match)
    checked.push(d)
    entry.streetCheckKm = +d.toFixed(2)
    if (d <= MAX_DISAGREE_KM || spread > MAX_SPREAD_KM) continue
    entry.osmDisagrees = entry.match
  }
  if (spread > MAX_SPREAD_KM) { entry.match = null; entry.rejectedStreets = `ruas espalhadas demais (${spread.toFixed(1)} km)`; continue }
  entry.match = { lat: +c.lat.toFixed(5), lon: +c.lon.toFixed(5), category: 'streets', type: 'median', streets: pts.length, spreadKm: +spread.toFixed(2) }
  delete entry.rejectedStreets
  filled++
}
file.neighborhoods = Object.fromEntries(Object.entries(file.neighborhoods).sort((a, b) => b[1].total - a[1].total))
file.streetsSource = 'OpenStreetMap via Overpass (vias com nome no município), ODbL'
file.updatedAt = new Date().toISOString().slice(0, 10)
fs.writeFileSync(outPath, JSON.stringify(file, null, 1) + '\n')

const v = Object.values(file.neighborhoods), all = v.reduce((a, x) => a + x.total, 0), located = v.filter((x) => x.match)
console.log(`ruas OSM ${streets.size} | bairros ${v.length} | localizados ${located.length} (${filled} pelas ruas) | pedidos ${located.reduce((a, x) => a + x.total, 0)} de ${all}`)
if (checked.length) console.log(`prova nos bairros do OSM (${checked.length}): desvio mediano ${median(checked).toFixed(2)} km, máximo ${Math.max(...checked).toFixed(2)} km`)
// Sanidade: todo ponto tem de cair no retângulo do município gravado pelo geocode.js.
if (file.bbox) {
  const [w, s, e, n] = file.bbox
  const out = Object.entries(file.neighborhoods).filter(([, x]) => x.match && !(x.match.lon >= w && x.match.lon <= e && x.match.lat >= s && x.match.lat <= n))
  console.log(out.length ? `FORA do retângulo do município: ${out.map(([k]) => k).join(', ')}` : 'todos os pontos dentro do retângulo do município')
  if (out.length) process.exitCode = 1
}
