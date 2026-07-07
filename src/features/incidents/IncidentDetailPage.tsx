import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Send, ImageIcon, Pencil, Trash2 } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, StatusChip, CategoryChip, Avatar, Alert, ErrorState, SkeletonList, Stepper, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaHora, iniciales } from '@/lib/format'
import { esGestion, ROLE_LABEL } from '@/lib/roles'
import { useApp } from '@/store'
import {
  getIncidencia, comentarIncidencia, cambiarEstadoIncidencia,
  borrarIncidencia, ocultarComentario, bloquearComentarios,
} from '@/lib/api'
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

function Comentario({ c, puedeModerar, moderando, onToggle }: {
  c: IncidentComment
  puedeModerar: boolean
  moderando: boolean
  onToggle: () => void
}) {
  return (
    <div className={cx('flex gap-2.5', c.oculto && 'opacity-50')}>
      <Avatar text={iniciales(c.autor_nombre)} size={36} />
      <div className="flex-1">
        <div className="rounded-[14px] rounded-tl-sm border border-border bg-surface-2 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13px] font-semibold text-ink">{c.autor_nombre}</span>
            <span className="text-[11.5px] font-semibold text-muted">{ROLE_LABEL[c.autor_rol]}</span>
            {c.oculto && <span className="text-[11.5px] font-semibold text-danger">(oculto)</span>}
          </div>
          <p className="mt-0.5 text-[14px] text-ink">{c.texto}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-1">
          <span className="text-[11.5px] text-faint">{fechaHora(c.created_at)}</span>
          {puedeModerar && (
            <button
              type="button"
              onClick={onToggle}
              disabled={moderando}
              className="text-[11.5px] font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {c.oculto ? 'Mostrar' : 'Ocultar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function IncidentDetailPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { user, toast } = useApp()
  const { data: inc, state, refetch } = useAsync(() => getIncidencia(id), [id])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [bloqueando, setBloqueando] = useState(false)
  const [moderandoId, setModerandoId] = useState<string | null>(null)

  const puedeModerar = esGestion(user.rol)
  const esAutor = inc ? inc.autor_id === user.id : false
  const puedeVerOcultos = puedeModerar || esAutor

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

  const borrar = async () => {
    if (!window.confirm('¿Seguro que quieres borrar esta incidencia? Esta acción no se puede deshacer.')) return
    setBorrando(true)
    try {
      await borrarIncidencia(id)
      toast('Incidencia borrada')
      nav('/incidencias')
    } finally {
      setBorrando(false)
    }
  }

  const toggleComentario = async (c: IncidentComment) => {
    setModerandoId(c.id)
    try {
      await ocultarComentario(id, c.id, !c.oculto)
      toast(c.oculto ? 'Comentario visible' : 'Comentario oculto')
      refetch()
    } finally {
      setModerandoId(null)
    }
  }

  const toggleBloqueo = async () => {
    if (!inc) return
    const bloquear = !inc.comentarios_bloqueados
    setBloqueando(true)
    try {
      await bloquearComentarios(id, bloquear)
      toast(bloquear ? 'Hilo bloqueado' : 'Hilo desbloqueado')
      refetch()
    } finally {
      setBloqueando(false)
    }
  }

  const comentariosVisibles = inc
    ? inc.comentarios.filter((c) => !c.oculto || puedeVerOcultos)
    : []

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

            {/* Acciones del autor (solo mientras esté abierta) */}
            {esAutor && inc.estado === 'abierta' && (
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/incidencias/${inc.id}/editar`}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-pill bg-surface px-5 text-[15px] font-bold text-ink shadow-neu-sm transition-colors hover:brightness-[0.98] active:shadow-neu-inset"
                >
                  <Pencil size={16} /> Editar
                </Link>
                <Button variant="danger-outline" onClick={borrar} disabled={borrando}>
                  <Trash2 size={16} /> {borrando ? 'Borrando…' : 'Borrar'}
                </Button>
              </div>
            )}

            <div className="mt-5">
              <Stepper actual={inc.estado} />
            </div>

            {puedeModerar && (
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
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="overline">Comentarios</h2>
                {puedeModerar && (
                  <button
                    type="button"
                    onClick={toggleBloqueo}
                    disabled={bloqueando}
                    className="text-[12px] font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    {inc.comentarios_bloqueados ? 'Desbloquear hilo' : 'Bloquear hilo'}
                  </button>
                )}
              </div>
              {comentariosVisibles.length === 0 ? (
                <p className="text-[14px] text-muted">Aún no hay comentarios.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {comentariosVisibles.map((c) => (
                    <Comentario
                      key={c.id}
                      c={c}
                      puedeModerar={puedeModerar}
                      moderando={moderandoId === c.id}
                      onToggle={() => toggleComentario(c)}
                    />
                  ))}
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
              <Alert tipo="warn">Hilo bloqueado por la gestión</Alert>
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
