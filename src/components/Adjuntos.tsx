import { useState } from 'react'
import { X } from 'lucide-react'

/** Galería de fotos de un mensaje (URLs firmadas). Miniaturas + visor a pantalla
 *  completa al tocar. Se usa en incidencias (tablón, panel de moderación, etc.). */
export function Adjuntos({ urls, size = 84 }: { urls?: string[]; size?: number }) {
  const [full, setFull] = useState<string | null>(null)
  if (!urls || urls.length === 0) return null
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <button key={i} type="button" onClick={() => setFull(u)} aria-label={`Ver foto ${i + 1}`}
            className="overflow-hidden rounded-[12px] border border-border bg-surface-2"
            style={{ height: size, width: size }}>
            <img src={u} alt={`Foto ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {full && (
        <div className="app-viewport z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setFull(null)}>
          <button aria-label="Cerrar" className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
            <X size={22} />
          </button>
          <img src={full} alt="Foto" className="max-h-full max-w-full rounded-[12px] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
