// Consejo de convivencia en el hueco de la Home (v1.59.0).
// ---------------------------------------------------------------------------
// La Home es un panel SIN scroll (specs/10): según el móvil y lo que haya en el
// tablón queda un hueco vacío entre el tablón y Servicios. Se aprovecha para
// recordar NORMAS REALES de la comunidad, editables desde Gestión.
//
// Tres decisiones del usuario (2026-09-24):
//   · Discreto, tipo nota al pie: rellena sin competir con el tablón, que es la
//     pieza principal. Nada de tarjeta con color.
//   · Rota POR ORDEN, uno por apertura de la Home (índice en localStorage).
//   · Ocupa 1 o 2 líneas según el hueco: con sitio se usa `texto_largo`.
import { useEffect, useState } from 'react'
import * as Iconos from 'lucide-react'
import { Info } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { listConsejos } from '@/lib/api'
import type { Consejo } from '@/types'
import { cx } from '@/components/ui'
import { useLineasQueCaben } from '@/lib/useLineasQueCaben'

const CLAVE_IDX = 'r25-consejo-idx'
/** Alto aproximado de una línea de texto del consejo, en px. */
const LINEA_PX = 17

/** Siguiente índice de la rotación. Se avanza UNA vez por montaje de la Home. */
function siguienteIndice(total: number): number {
  if (total <= 0) return 0
  let prev = -1
  try { prev = Number(localStorage.getItem(CLAVE_IDX) ?? '-1') } catch { /* noop */ }
  const idx = (Number.isFinite(prev) ? prev + 1 : 0) % total
  try { localStorage.setItem(CLAVE_IDX, String(idx)) } catch { /* noop */ }
  return idx
}

/** Icono de lucide por nombre; si la clave no existe, cae en Info. */
function IconoConsejo({ nombre, size }: { nombre: string | null; size: number }) {
  const mapa = Iconos as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>
  const C = (nombre && mapa[nombre]) || Info
  return <C size={size} className="shrink-0 text-faint" />
}

export function ConsejoConvivencia({ className }: { className?: string }) {
  const { data } = useAsync(listConsejos, [], { key: 'consejos', ttlMs: TTL.contactos })
  // Mismo hook que usa el post-it del tablón para su cuerpo elástico: mide el
  // hueco real y dice cuántas líneas caben. `minimo: 0` porque aquí la
  // respuesta legítima puede ser "ninguna" → no se enseña nada.
  const { ref, lineas } = useLineasQueCaben(LINEA_PX, 0)
  // El índice se fija UNA vez, al montar: si dependiera del render, el consejo
  // cambiaría al vuelo cada vez que algo se recalcula.
  const [idx, setIdx] = useState<number | null>(null)

  const lista = data ?? []
  useEffect(() => { if (lista.length > 0 && idx === null) setIdx(siguienteIndice(lista.length)) }, [lista.length, idx])

  if (lista.length === 0 || idx === null) return <div ref={ref} className={className} />

  const c: Consejo = lista[idx % lista.length]
  const cabenDos = lineas >= 2
  const hayHueco = lineas >= 1
  const texto = cabenDos && c.texto_largo ? c.texto_largo : c.texto_corto

  return (
    <div ref={ref} className={cx('flex items-center justify-center', className)}>
      {hayHueco && (
        <div className="flex max-w-[420px] items-start gap-2 px-4 text-center">
          <IconoConsejo nombre={c.icono} size={15} />
          <p className={cx('text-left text-[12.5px] leading-[1.35] text-faint', !cabenDos && 'line-clamp-1')}>
            {texto}
          </p>
        </div>
      )}
    </div>
  )
}
