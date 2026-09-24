// Hilo de comentarios de una tarjeta (mig. 0063).
// Vive en el VISOR a pantalla completa, nunca en el post-it de la Home: la Home
// es un panel de gadgets SIN scroll (specs/10). El post-it solo lleva el
// contador. Autor siempre visible — nada anónimo, igual que las firmas (0062).
import { useEffect, useState } from 'react'
import { Send, Trash2, Flag } from 'lucide-react'
import { useApp } from '@/store'
import { puedeComentar, esGestion } from '@/lib/roles'
import { listComentarios, crearComentario, borrarComentario, reportarComentario } from '@/lib/api'
import { fechaHora } from '@/lib/format'
import type { Comentario } from '@/types'
import { cx } from '@/components/ui'

const MAX = 1000

export function Comentarios({ mensajeId, onCambio }: { mensajeId: string; onCambio?: () => void }) {
  const { user, toast } = useApp()
  const [lista, setLista] = useState<Comentario[] | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const puedo = puedeComentar(user.rol)
  const modera = esGestion(user.rol)

  const cargar = async () => {
    try { setLista(await listComentarios(mensajeId)) } catch { setLista([]) }
  }
  useEffect(() => { void cargar() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mensajeId])

  const enviar = async () => {
    const cuerpo = texto.trim()
    if (!cuerpo || enviando) return
    setEnviando(true)
    try {
      await crearComentario(mensajeId, cuerpo)
      setTexto(''); await cargar(); onCambio?.()
    } catch { toast('No se pudo publicar el comentario', 'error') }
    finally { setEnviando(false) }
  }

  const borrar = async (c: Comentario) => {
    if (!window.confirm('¿Borrar este comentario?')) return
    try { await borrarComentario(c.id); await cargar(); onCambio?.() }
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
    <div className="mt-4 border-t border-white/15 pt-3" onClick={(e) => e.stopPropagation()}>
      <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-white/50">
        Comentarios{lista ? ` · ${lista.length}` : ''}
      </div>

      {lista === null ? (
        <div className="text-[13px] text-white/50">Cargando…</div>
      ) : lista.length === 0 ? (
        <div className="text-[13px] text-white/50">Todavía no hay comentarios.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((c) => {
            const mio = c.created_by === user.id
            return (
              <li key={c.id} className="rounded-[12px] bg-white/10 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12.5px] font-bold text-white/85">
                    {c.autor_nombre ?? 'Vecino'}{c.autor_vivienda ? ` · ${c.autor_vivienda}` : ''}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {modera && (c.reportes ?? 0) > 0 && (
                      <span className="rounded-pill bg-danger/25 px-1.5 text-[10.5px] font-extrabold text-white">
                        {c.reportes} ⚑
                      </span>
                    )}
                    {!mio && !c.yo_reporte && (
                      <button type="button" onClick={() => void reportar(c)} aria-label="Reportar comentario"
                        className="rounded-full p-1 text-white/45 hover:bg-white/10"><Flag size={13} /></button>
                    )}
                    {(mio || modera) && (
                      <button type="button" onClick={() => void borrar(c)} aria-label="Borrar comentario"
                        className="rounded-full p-1 text-white/45 hover:bg-white/10"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-[1.5] text-white/90">{c.cuerpo}</p>
                <div className="mt-1 text-[11px] text-white/40">{fechaHora(c.created_at)}</div>
              </li>
            )
          })}
        </ul>
      )}

      {puedo ? (
        <div className="mt-3">
          <textarea
            value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={MAX} rows={2}
            placeholder="Escribe una respuesta…"
            className="w-full resize-none rounded-[12px] border border-white/20 bg-white/10 px-3 py-2 text-[14px] text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none" />
          {/* Recordatorio de las normas que el vecino YA aceptó al entrar por
              primera vez (profiles.normas_aceptadas_at, specs/15). */}
          <p className="mt-1.5 text-[11.5px] leading-[1.45] text-white/45">
            Al comentar aceptas las <b className="text-white/65">normas de convivencia</b>: sin insultos,
            groserías ni comentarios que inciten a una pelea. Quien las incumpla puede perder el acceso a
            los comentarios.
          </p>
          <button type="button" onClick={() => void enviar()} disabled={!texto.trim() || enviando}
            className={cx('mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-pill text-[14px] font-bold transition-opacity',
              !texto.trim() || enviando ? 'bg-white/15 text-white/40' : 'bg-primary text-white')}>
            <Send size={16} /> {enviando ? 'Enviando…' : 'Comentar'}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-white/45">Tu cuenta no puede escribir comentarios.</p>
      )}
    </div>
  )
}
