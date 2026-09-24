// Popup del hilo de comentarios (v1.57.0). Se abre desde el icono discreto de la
// tarjeta, tanto en el tablón de la HOME como en el visor. Hoja inferior en
// móvil y diálogo centrado en escritorio, con `.app-viewport` para que el
// teclado de iOS no descuadre la pantalla (specs/10 § Layout app-shell).
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Comentarios } from './Comentarios'

export function ComentariosModal({ mensajeId, titulo, onCerrar, onCambio }: {
  mensajeId: string
  titulo: string
  onCerrar: () => void
  onCambio?: (n: number) => void
}) {
  // PORTAL a <body> a propósito: el post-it tiene `transform: rotate(...)`, y un
  // ancestro con transform pasa a ser el marco de referencia de sus hijos
  // `position: fixed`. Sin el portal, `.app-viewport` se quedaba encerrado
  // DENTRO de la tarjeta: se veía el velo oscuro sobre el post-it y el popup no
  // aparecía por ningún lado.
  return createPortal(
    <div className="app-viewport z-[70] flex items-end justify-center bg-black/45 sm:items-center"
      onClick={onCerrar}>
      <div className="flex max-h-full w-full max-w-[520px] flex-col rounded-t-[20px] bg-surface p-4 shadow-xl sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}>
        <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-[17px] font-bold text-ink">Comentarios</h3>
            <p className="truncate text-[12.5px] text-muted">{titulo}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="shrink-0 rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
        </div>
        <Comentarios mensajeId={mensajeId} onCambio={onCambio} />
      </div>
    </div>,
    document.body,
  )
}
