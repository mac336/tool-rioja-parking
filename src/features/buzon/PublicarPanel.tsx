import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TriangleAlert, Megaphone, Lightbulb, FileEdit, Clock, Check, Ban } from 'lucide-react'
import { Card, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaHora } from '@/lib/format'
import { misPublicaciones } from '@/lib/api'
import type { Mensaje, MensajeEstado, MensajeTipo } from '@/types'
import { AsistenteMensaje } from '@/features/mensajes/AsistenteMensaje'

const ESTADO_META: Record<MensajeEstado, { label: string; cls: string; Icon: typeof Clock }> = {
  borrador: { label: 'Borrador', cls: 'bg-surface-2 text-muted', Icon: FileEdit },
  pendiente: { label: 'Pendiente de aprobar', cls: 'bg-warn-soft text-warn-ink', Icon: Clock },
  publicado: { label: 'Publicado', cls: 'bg-success-soft text-success-ink', Icon: Check },
  rechazado: { label: 'No publicado', cls: 'bg-danger-soft text-danger-ink', Icon: Ban },
}

/** Panel "Publicar" del buzón: el vecino reporta una incidencia, publica un
 *  anuncio o propone una sugerencia. El formulario es el ASISTENTE ÚNICO
 *  (`AsistenteMensaje`, v1.54.0), el mismo de Gestión → Mensajes y de
 *  Sugerencias; aquí se abre con el tipo ya elegido, así que se salta el paso 1.
 *  El comportamiento no cambia: sigue yendo a aprobación (o privado a admin). */
export function PublicarPanel() {
  const mias = useAsync(misPublicaciones, [])
  const [tipoNuevo, setTipoNuevo] = useState<MensajeTipo | null>(null)

  // Deep-link desde la invitación del tablón vacío de Inicio: /buzon?publicar=
  // sugerencia abre el asistente YA en ese tipo. Se limpia el parámetro tras
  // abrir (replace) para que recargar o volver atrás no lo repita.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    const tipo = params.get('publicar')
    if (tipo === 'incidencia' || tipo === 'anuncio' || tipo === 'sugerencia') {
      setTipoNuevo(tipo)
      const siguiente = new URLSearchParams(params)
      siguiente.delete('publicar')
      setParams(siguiente, { replace: true })
    }
    // Solo al montar: solo nos importa el valor que traía la URL al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lista = mias.data ?? []

  return (
    <section className="flex flex-col gap-2">
      <h2 className="section-title">Publicar</h2>
      <p className="-mt-1 text-[12.5px] text-muted">Reporta una incidencia o publica un anuncio. Antes de verse en la app lo revisa la administración.</p>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setTipoNuevo('incidencia')}
          className="flex flex-col items-center justify-center gap-1 rounded-[14px] border border-border bg-surface px-2 py-2.5 text-[12.5px] font-bold text-ink hover:bg-surface-2">
          <TriangleAlert size={19} className="text-danger" /> Incidencia
        </button>
        <button type="button" onClick={() => setTipoNuevo('anuncio')}
          className="flex flex-col items-center justify-center gap-1 rounded-[14px] border border-border bg-surface px-2 py-2.5 text-[12.5px] font-bold text-ink hover:bg-surface-2">
          <Megaphone size={19} className="text-primary" /> Anuncio
        </button>
        <button type="button" onClick={() => setTipoNuevo('sugerencia')}
          className="flex flex-col items-center justify-center gap-1 rounded-[14px] border border-border bg-surface px-2 py-2.5 text-[12.5px] font-bold text-ink hover:bg-surface-2">
          <Lightbulb size={19} style={{ color: '#6D4AA3' }} /> Sugerencia
        </button>
      </div>

      {/* Mis publicaciones (estado) */}
      {lista.length > 0 && (
        <div className="mt-1 flex flex-col gap-2">
          <div className="text-[12px] font-bold uppercase tracking-wide text-faint">Mis publicaciones</div>
          {lista.map((m: Mensaje) => {
            const est = ESTADO_META[m.estado ?? 'publicado']
            return (
              <Card key={m.id} className="flex items-center gap-3 py-3">
                {m.tipo === 'incidencia'
                  ? <TriangleAlert size={18} className="shrink-0 text-danger" />
                  : m.tipo === 'sugerencia'
                  ? <Lightbulb size={18} className="shrink-0" style={{ color: '#6D4AA3' }} />
                  : <Megaphone size={18} className="shrink-0 text-primary" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{m.titulo}</div>
                  <div className="text-[11.5px] text-faint">{m.destino === 'administracion' ? 'Solo administración · ' : ''}{fechaHora(m.created_at)}</div>
                </div>
                <span className={cx('flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-0.5 text-[11px] font-bold', est.cls)}>
                  <est.Icon size={12} /> {est.label}
                </span>
              </Card>
            )
          })}
        </div>
      )}

      {/* Formulario */}      {tipoNuevo && (
        <AsistenteMensaje
          origen="buzon"
          tipos={['incidencia', 'anuncio', 'sugerencia']}
          tipoInicial={tipoNuevo}
          onCerrar={() => setTipoNuevo(null)}
          onHecho={mias.refetch} />
      )}
    </section>
  )
}
