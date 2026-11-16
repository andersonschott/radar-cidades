import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatNumber, titleCase } from './data'
import type { PlaceCount } from './insights'

/**
 * Uma bolinha por bairro, com área proporcional ao número de pedidos. Clicar filtra a lista pelo bairro.
 * Carregado sob demanda (React.lazy): o Leaflet só baixa em quem abre "Meu bairro".
 */
export default function NeighborhoodMap({ items, base, attribution }: { items: PlaceCount[]; base: string; attribution: string }) {
  const box = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!box.current || items.length === 0) return
    // No celular, um dedo rola a página; arrastar o mapa fica para dois dedos (pinça) — sem prender o usuário no mapa.
    const map = L.map(box.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomSnap: 0.5 })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · posições: ${attribution}`,
    }).addTo(map)

    const color = getComputedStyle(document.documentElement).getPropertyValue('--city').trim() || '#171717'
    const max = items[0].count
    // Maiores primeiro, menores por cima: bolinha pequena não some debaixo da grande.
    for (const { place, count } of items) {
      const label = place.method === 'osm' ? place.label : titleCase(place.label)
      L.circleMarker([place.lat, place.lon], {
        radius: 4 + 22 * Math.sqrt(count / max),
        color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.55,
      })
        .bindTooltip(tip(label, `${formatNumber(count)} ${count === 1 ? 'pedido' : 'pedidos'}`), { direction: 'top' })
        .on('click', () => navigate(`${base}?q=${encodeURIComponent(place.search)}`))
        .addTo(map)
    }
    // Enquadra os bairros que somam 90% dos pedidos: área rural isolada não encolhe a cidade (continua no mapa, fora do quadro).
    const total = items.reduce((a, i) => a + i.count, 0)
    let acc = 0
    const core = items.filter((i) => (acc += i.count) - i.count < total * 0.9)
    map.fitBounds(L.latLngBounds(core.map((i) => [i.place.lat, i.place.lon])), { padding: [16, 16] })
    return () => { map.remove() }
  }, [items, base, attribution, navigate])

  return <div ref={box} className="h-96 w-full overflow-hidden rounded-2xl border sm:h-[28rem]" />
}

/** Balão montado com textContent: nome de bairro vem de dado externo (OSM, texto dos pedidos), nunca vira HTML. */
function tip(title: string, detail: string): HTMLElement {
  const el = document.createElement('span')
  const strong = el.appendChild(document.createElement('strong'))
  strong.textContent = title
  el.append(document.createElement('br'), detail)
  return el
}
