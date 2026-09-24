// Hilo de comentarios de una tarjeta (mig. 0063). Desde v1.57.0 vive dentro de
// un POPUP (ComentariosModal) que se abre con el icono discreto de la tarjeta,
// así que va sobre fondo claro (antes estaba incrustado en el visor oscuro).
import { useEffect, useState } from 'react'
import { Send, Trash2, Flag } from 'lucide-react'
import { useApp } from '@/store'
import { puedeComentar, esGestion } from '@/lib/roles'
import { listComentarios, crearComentario, borrarComentario, reportarComentario } from '@/lib/api'
import { fechaHora } from '@/lib/format'
import type { Comentario } from '@/types'
import { cx } from '@/components/ui'

const MAX = 1000

export function Comentarios({ mensajeId, onCambio }: { mensajeId: string; onCambio?: (n: number) => void }) {
  const { user, toast } = useApp()
  const [lista, setLista] = useState<Comentario[] | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const puedo = puedeComentar(user.rol)
  const modera = esGestion(user.rol)

  const cargar = async () => {
    try {
      const l = await listComentarios(mensajeId)
      setLista(l); onCambio?.(l.length)   // el contador de la tarjeta se entera al vuelo
    } catch { setLista([]) }
  }
  useEffect(() => { void cargar() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mensajeId])

  const enviar = async () => {
    const cuerpo = texto.trim()
    if (!cuerpo || enviando) return
    setEnviando(true)
    try {
      await crearComentario(mensajeId, cuerpo)
      setTexto(''); await cargar()
    } catch { toast('No se pudo publicar el comentario', 'error') }
    finally { setEnviando(false) }
  }

  const borrar = async (c: Comentario) => {
    if (!window.confirm('¿Borrar este comentario?')) return
    try { await borrarComentario(c.id); await cargar() }
    catch { toast('No se pudo borrar', 'error') }
  }

  const reportar = async (c: Comentario) => {
    try {
      await reportarComentario(c.id)
      toast('Gracias, lo revisará la administración', 'ok')
      await cargar()
    } catch { toast('No se pudo reportar', 'error') }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {lista === null ? (
          <div className="py-6 text-center text-[13px] text-faint">Cargando…</div>
        ) : lista.length === 0 ? (
          <div className="py-6 text-center text-[13.5px] text-faint">
            Todavía no hay comentarios.<br />Sé el primero en responder.
          </div>
        ) : (
          <ul className="flex flex-col gap-2 pb-1">
            {lista.map((c) => {
              const mio = c.created_by === user.id
              return (
                <li key={c.id} className="rounded-[14px] bg-surface-2 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12.5px] font-bold text-ink">
                      {c.autor_nombre ?? 'Vecino'}{c.autor_vivienda ? ` · ${c.autor_vivienda}` : ''}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {modera && (c.reportes ?? 0) > 0 && (
                        <span className="rounded-pill bg-danger-soft px-1.5 text-[10.5px] font-extrabold text-danger-ink">
                          {c.reportes} ⚑
                        </span>
                      )}
                      {!mio && !c.yo_reporte && (
                        <button type="button" onClick={() => void reportar(c)} aria-label="Reportar comentario"
                          className="rounded-full p-1.5 text-faint hover:bg-black/5"><Flag size={13} /></button>
                      )}
                      {(mio || modera) && (
                        <button type="button" onClick={() => void borrar(c)} aria-label="Borrar comentario"
                          className="rounded-full p-1.5 text-faint hover:bg-black/5"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-[1.5] text-ink/85">{c.cuerpo}</p>
                  <div className="mt-1 text-[11px] text-faint">{fechaHora(c.created_at)}</div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {puedo ? (
        <div className="shrink-0 border-t border-border pt-2.5">
          <textarea
            value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={MAX} rows={2}
            placeholder="Escribe una respuesta…"
            className="w-full resize-none rounded-[14px] border border-border bg-surface px-3 py-2 text-[14.5px] text-ink placeholder:text-faint focus:border-primary focus:outline-none" />
          {/* Recordatorio de las normas que el vecino YA aceptó al entrar por
              primera vez (profiles.normas_aceptadas_at, specs/15). */}
          <p className="mt-1.5 text-[11.5px] leading-[1.45] text-faint">
            Al comentar aceptas las <b className="text-muted">normas de convivencia</b>: sin insultos,
            groserías ni comentarios que inciten a una pelea. Quien las incumpla puede perder el acceso a
            los comentarios.
          </p>
          <button type="button" onClick={() => void enviar()} disabled={!texto.trim() || enviando}
            className={cx('mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-pill text-[15px] font-bold transition-opacity',
              !texto.trim() || enviando ? 'bg-surface-2 text-faint' : 'bg-primary text-white shadow-primary')}>
            <Send size={17} /> {enviando ? 'Enviando…' : 'Comentar'}
          </button>
        </div>
      ) : (
        <p className="shrink-0 border-t border-border pt-3 text-[12.5px] text-faint">
          Tu cuenta no puede escribir comentarios.
        </p>
      )}
    </div>
  )
}
