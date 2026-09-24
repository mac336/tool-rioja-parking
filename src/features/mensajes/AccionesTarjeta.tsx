// Barra de acciones de una tarjeta, al estilo de las redes (v1.57.0):
// iconos de trazo, discretos, con el número al lado. Va tanto en el post-it de
// la HOME como en el visor, y en los dos sitios hace lo mismo.
//   · Comentar  → abre el POPUP del hilo (ver y escribir), sin salir de donde estás.
//   · Compartir → genera un PNG de la tarjeta y lo pasa al menú del móvil.
import { useState } from 'react'
import { MessageCircle, Share2 } from 'lucide-react'
import { useApp } from '@/store'
import { compartirTarjeta } from '@/lib/compartir'
import { ComentariosModal } from './ComentariosModal'
import { cx } from '@/components/ui'

export function AccionesTarjeta({ mensajeId, titulo, nComentarios, tint, nodoCaptura, compacto }: {
  mensajeId: string
  titulo: string
  nComentarios: number
  tint: string
  /** Nodo a fotografiar al compartir (el post-it entero). */
  nodoCaptura: () => HTMLElement | null
  compacto?: boolean
}) {
  const { toast } = useApp()
  const [abierto, setAbierto] = useState(false)
  // Contador local: al comentar o borrar se ve al instante, sin esperar a que
  // caduque la caché del tablón (2 min).
  const [n, setN] = useState(nComentarios)
  const [compartiendo, setCompartiendo] = useState(false)
  const size = compacto ? 15 : 18

  const compartir = async () => {
    const nodo = nodoCaptura()
    if (!nodo || compartiendo) return
    setCompartiendo(true)
    try {
      const r = await compartirTarjeta(nodo, titulo)
      if (r === 'descargado') toast('Imagen descargada', 'ok')
      if (r === 'error') toast('No se pudo generar la imagen', 'error')
    } finally { setCompartiendo(false) }
  }

  // data-no-captura: estos botones no salen en la foto que se comparte.
  return (
    <>
      <div data-no-captura="1" className={cx('flex items-center', compacto ? 'gap-3' : 'gap-5')}
        onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => setAbierto(true)}
          aria-label={n > 0 ? `Ver ${n} comentarios` : 'Comentar'}
          className="flex items-center gap-1.5 rounded-full px-1 py-0.5 opacity-70 transition-opacity active:scale-95 hover:opacity-100"
          style={{ color: tint }}>
          <MessageCircle size={size} strokeWidth={1.9} />
          {n > 0 && <span className={cx('font-bold', compacto ? 'text-[12px]' : 'text-[13px]')}>{n}</span>}
        </button>

        <button type="button" onClick={() => void compartir()} disabled={compartiendo}
          aria-label="Compartir esta tarjeta"
          className="flex items-center rounded-full px-1 py-0.5 opacity-70 transition-opacity active:scale-95 hover:opacity-100 disabled:opacity-35"
          style={{ color: tint }}>
          <Share2 size={size} strokeWidth={1.9} />
        </button>
      </div>

      {abierto && (
        <ComentariosModal mensajeId={mensajeId} titulo={titulo}
          onCerrar={() => setAbierto(false)} onCambio={setN} />
      )}
    </>
  )
}
