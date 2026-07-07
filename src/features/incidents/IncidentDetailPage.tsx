import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Send, ImageIcon } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, StatusChip, CategoryChip, Avatar, Alert, ErrorState, SkeletonList, Stepper, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaHora, iniciales } from '@/lib/format'
import { esGestion, ROLE_LABEL } from '@/lib/roles'
import { useApp } from '@/store'
import { getIncidencia, comentarIncidencia, cambiarEstadoIncidencia } from '@/lib/api'
import type { Incident, IncidentStatus, IncidentComment } from '@/types'

const CAT_LABEL: Record<Incident['categoria'], string> = {
  limpieza: 'Limpieza', ascensor: 'Ascensor', garaje: 'Garaje', jardin: 'Jardín',
  piscina: 'Piscina', ruido: 'Ruido', otros: 'Otros',
}

const ESTADOS: { key: IncidentStatus; label: string }[] = [
  { key: 'abierta', label: 'Abierta' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'resuelta', label: 'Resuelta' },
  { key: 'cerrada', label: 'Cerrada' },
]

function Comentario({ c }: { c: IncidentComment }) {
  return (
    <div className="flex gap-2.5">
      <Avatar text={iniciales(c.autor_nombre)} size={36} />
      <div className="flex-1">
        <div className="rounded-[14px] rounded-tl-sm border border-border bg-surface-2 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13px] font-semibold text-ink">{c.autor_nombre}</span>
            <span className="text-[11.5px] font-semibold text-muted">{ROLE_LABEL[c.autor_rol]}</span>
          </div>
          <p className="mt-0.5 text-[14px] text-ink">{c.texto}</p>
        </div>
        <div className="mt-1 pl-1 text-[11.5px] text-faint">{fechaHora(c.created_at)}</div>
      </div>
    </div>
  )
}

export function IncidentDetailPage() {
  const { id = '' } = useParams()
  const { user, toast } = useApp()
  const { data: inc, state, refetch } = useAsync(() => getIncidencia(id), [id])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cambiando, setCambiando] = useState(false)

  const enviarComentario = async () => {
    const t = texto.trim()
    if (!t) return
    setEnviando(true)
    try {
      await comentarIncidencia(id, t)
      setTexto('')
      refetch()
    } finally {
      setEnviando(false)
    }
  }

  const cambiarEstado = async (estado: IncidentStatus) => {
    setCambiando(true)
    try {
      await cambiarEstadoIncidencia(id, estado)
      toast('Estado actualizado')
      refetch()
    } finally {
      setCambiando(false)
    }
  }

  return (
    <div>
      <SubHeader titulo="Incidencia" />

      {state === 'loading' && <Page><SkeletonList n={3} /></Page>}
      {(state === 'error' || (state === 'ready' && !inc)) && (
        <Page><ErrorState onRetry={refetch} /></Page>
      )}

      {inc && (
        <>
          <Page className="pb-40">
            <StatusChip status={inc.estado} />
            <h1 className="mt-2 font-display text-[24px] font-bold leading-tight text-ink">{inc.titulo}</h1>
            <div className="mt-1 text-[13px] text-muted">
              {[inc.ubicacion, `reportada por ${inc.autor_vivienda}`, fechaHora(inc.created_at)]
                .filter(Boolean).join(' · ')}
            </div>
            <div className="mt-2">
              <CategoryChip active>{CAT_LABEL[inc.categoria]}</CategoryChip>
            </div>

            <div className="mt-5">
              <Stepper actual={inc.estado} />
            </div>

            {esGestion(user.rol) && (
              <Card className="mt-5">
                <div className="mb-2 text-[13px] font-semibold text-muted">Cambiar estado</div>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS.map((e) => (
                    <Button
                      key={e.key}
                      size="md"
                      variant={e.key === inc.estado ? 'primary' : 'secondary'}
                      disabled={cambiando || e.key === inc.estado}
                      onClick={() => cambiarEstado(e.key)}
                    >
                      {e.label}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {/* Fotos */}
            <div className="mt-5">
              <h2 className="overline mb-2">Fotos</h2>
              {inc.fotos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {inc.fotos.map((src, i) => (
                    <img key={i} src={src} alt={`Foto ${i + 1}`}
                      className="h-24 w-24 rounded-[12px] border border-border object-cover" />
                  ))}
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-[12px] border border-dashed border-border-strong bg-surface-2 text-faint">
                  <ImageIcon size={26} />
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="mt-5">
              <h2 className="overline mb-2">Descripción</h2>
              <p className="whitespace-pre-line text-[15px] text-ink">{inc.descripcion}</p>
            </div>

            {/* Comentarios */}
            <div className="mt-6">
              <h2 className="overline mb-3">Comentarios</h2>
              {inc.comentarios.length === 0 ? (
                <p className="text-[14px] text-muted">Aún no hay comentarios.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {inc.comentarios.map((c) => <Comentario key={c.id} c={c} />)}
                </div>
              )}
            </div>
          </Page>

          {/* Barra de comentario fija */}
          <div className={cx(
            'sticky bottom-[90px] z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0',
            'mx-auto w-full max-w-[720px]',
          )}>
            {inc.comentarios_bloqueados ? (
              <Alert tipo="warn">Comentarios cerrados</Alert>
            ) : (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); enviarComentario() }}
              >
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribe un comentario…"
                  className="min-h-[46px] flex-1 rounded-pill border-[1.5px] border-border-strong bg-surface px-4 text-[15px] text-ink placeholder:text-faint"
                />
                <button
                  type="submit"
                  aria-label="Enviar comentario"
                  disabled={enviando || !texto.trim()}
                  className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-primary transition-colors hover:bg-primary-700 disabled:bg-surface-2 disabled:text-faint disabled:shadow-none"
                >
                  <Send size={20} />
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}
