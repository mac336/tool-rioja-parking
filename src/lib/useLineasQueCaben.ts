// ¿Cuántas líneas de texto caben en este hueco? (compartido)
// Lo usa el post-it del tablón para su cuerpo elástico y el consejo de
// convivencia para decidir si enseña su versión corta o la larga. Vivía dentro
// de TablonGadget; se extrajo al añadir el segundo consumidor (v1.59.0) para no
// tener dos ResizeObserver haciendo lo mismo.
import { useLayoutEffect, useRef, useState } from 'react'

export function useLineasQueCaben(lineaPx: number, minimo = 2) {
  const ref = useRef<HTMLDivElement>(null)
  const [lineas, setLineas] = useState(minimo)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setLineas(Math.max(minimo, Math.floor(el.clientHeight / lineaPx)))
    medir()
    if (typeof ResizeObserver === 'undefined') return // jsdom (tests)
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [lineaPx, minimo])
  return { ref, lineas }
}
