// Unifica grafias de bairro: abreviações, numerais romanos, "bairro"/"do"/"da".
const roman = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 }
const abbr = { jd: 'jardim', jdm: 'jardim', vl: 'vila', res: 'residencial', resid: 'residencial', pq: 'parque', prq: 'parque', cj: 'conjunto', conj: 'conjunto', ch: 'chacara', chac: 'chacaras', 'n.': 'nossa', sta: 'santa', sto: 'santo', st: 'santo', dr: 'doutor' }
function key(name) {
  let s = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[.'’"]/g, ' ').replace(/[^a-z0-9 ]/g, ' ')
  let w = s.split(/\s+/).filter(Boolean).map((x) => abbr[x] ?? x).map((x) => (roman[x] ? String(roman[x]) : x))
  w = w.filter((x) => !['bairro', 'de', 'do', 'da', 'dos', 'das', 'e'].includes(x))
  return w.join(' ')
}
/** Chave final: aplica as junções da cidade ({ into, pattern }) depois da normalização. */
function canonical(name, merges = []) {
  const k = key(name)
  return merges.find((m) => new RegExp(m.pattern).test(k))?.into ?? k
}
module.exports = { key, canonical }
if (require.main === module) {
  const ours = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'))
  const groups = new Map()
  for (const [n, c] of ours) { const k = key(n); const g = groups.get(k) ?? { total: 0, names: [] }; g.total += c; g.names.push(n); groups.set(k, g) }
  const s = [...groups.entries()].sort((a, b) => b[1].total - a[1].total)
  console.log('grafias', ours.length, '-> chaves', groups.size, '| >=10:', s.filter((x) => x[1].total >= 10).length)
  for (const [k, g] of s.filter((x) => x[1].names.length > 1).slice(0, 15)) console.log(k, g.total, JSON.stringify(g.names))
}
