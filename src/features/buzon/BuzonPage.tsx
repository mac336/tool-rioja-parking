import { useState } from 'react'
import { Plus, Send, X, ChevronLeft, Megaphone, ShieldCheck, CircleDot } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, Field, Textarea, SelectField, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { useApp } from '@/store'
import { esGestion } from '@/lib/roles'
import { fechaHora } from '@/lib/format'
import { misHilos, hilosGestion, getHilo, crearHilo, responderHilo, cerrarHilo, convertirEnMensaje } from '@/lib/api'
import type { Hilo, MensajeTipo } from '@/types'
import { TIPO_META } from '@/features/mensajes/MensajeCard'

export function BuzonPage() {
  const { user, toast } = useApp()
  const gestor = esGestion(user.rol)
  const [abierto, setAbierto] = useState<string | null>(null)

  if (abierto) return <HiloVista id={abierto} gestor={gestor} onBack={() => setAbierto(null)} />
  return <Bandeja gestor={gestor} onOpen={setAbierto} onToast={toast} />
}

// ---- Lista de hilos ----------------------------------------------------------
function Bandeja({ gestor, onOpen, onToast }: { gestor: boolean; onOpen: (id: string) => void; onToast: (t: string, k?: 'ok' | 'error' | 'info') => void }) {
  const { data, state, refetch } = useAsync(gestor ? hilosGestion : misHilos, [])
  const [nuevo, setNuevo] = useState<null | { asunto: string; texto: string }>(null)
  const [saving, setSaving] = useState(false)

  const enviar = async () => {
    if (!nuevo || nuevo.asunto.trim().length < 1 || nuevo.texto.trim().length < 1) return
    setSaving(true)
    try {
      const id = await crearHilo({ asunto: nuevo.asunto.trim(), texto: nuevo.texto.trim() })
      setNuevo(null); refetch(); onToast('Mensaje enviado a administración', 'ok'); onOpen(id)
    } catch { onToast('No se pudo enviar', 'error') } finally { setSaving(false) }
  }

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo={gestor ? 'Buzón de administración' : 'Contactar con administración'}
        right={!gestor ? (
          <button onClick={() => setNuevo({ asunto: '', texto: '' })} className="flex h-10 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary">
            <Plus size={18} /> Nuevo
          </button>
        ) : undefined} />
      <Page className="flex flex-col gap-3">
        {!gestor && (
          <p className="text-[13px] text-muted">Escribe a la administración para reportar una avería, un problema o cualquier consulta. Solo lo ven ellos.</p>
        )}
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {(state === 'empty' || (state === 'ready' && (data ?? []).length === 0)) && (
          <EmptyState titulo={gestor ? 'Buzón vacío' : 'Sin conversaciones'} texto={gestor ? 'No hay mensajes de vecinos.' : 'Cuando escribas a administración, tus conversaciones aparecerán aquí.'} />
        )}
        {state === 'ready' && (data ?? []).map((h: Hilo) => {
          const sinLeer = gestor ? h.no_leido_gestion : h.no_leido_vecino
          return (
            <Card key={h.id} role="button" onClick={() => onOpen(h.id)} className="cursor-pointer hover:bg-surface-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {sinLeer && <CircleDot size={15} className="shrink-0 text-primary" />}
                  <span className="truncate font-semibold text-ink">{h.asunto}</span>
                </div>
                {h.estado === 'cerrado' && <span className="shrink-0 rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">Cerrado</span>}
              </div>
              {gestor && <div className="mt-0.5 text-[13px] text-muted">{h.vecino_nombre ?? 'Vecino'} · {h.vecino_vivienda}</div>}
              <div className="mt-0.5 text-[11px] text-faint">{fechaHora(h.updated_at)}</div>
            </Card>
          )
        })}
      </Page>

      {nuevo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setNuevo(null)}>
          <div className="w-full max-w-[520px] rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">Nuevo mensaje a administración</h3>
              <button onClick={() => setNuevo(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Asunto" value={nuevo.asunto} maxLength={140} onChange={(e) => setNuevo({ ...nuevo, asunto: e.target.value })} placeholder="Ej. Avería en el garaje" />
              <Textarea label="Mensaje" value={nuevo.texto} maxLength={4000} rows={5} onChange={(e) => setNuevo({ ...nuevo, texto: e.target.value })} placeholder="Cuéntanos qué ocurre…" />
              <Button block size="lg" disabled={saving || !nuevo.asunto.trim() || !nuevo.texto.trim()} onClick={enviar}>
                <Send size={18} /> {saving ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Vista de un hilo (chat) -------------------------------------------------
function HiloVista({ id, gestor, onBack }: { id: string; gestor: boolean; onBack: () => void }) {
  const { user, toast } = useApp()
  const { data, state, refetch } = useAsync(() => getHilo(id), [id])
  const [texto, setTexto] = useState('')
  const [saving, setSaving] = useState(false)
  const [convertir, setConvertir] = useState<null | { tipo: MensajeTipo; titulo: string; cuerpo: string }>(null)

  const responder = async () => {
    if (texto.trim().length < 1) return
    setSaving(true)
    try { await responderHilo(id, texto.trim()); setTexto(''); refetch() }
    catch { toast('No se pudo enviar', 'error') } finally { setSaving(false) }
  }

  const hilo = data?.hilo
  const cerrado = hilo?.estado === 'cerrado'

  const alternarCierre = async () => {
    if (!hilo) return
    await cerrarHilo(id, !cerrado); refetch(); toast(cerrado ? 'Conversación reabierta' : 'Conversación cerrada', 'info')
  }

  const abrirConvertir = () => {
    const primer = data?.mensajes.find((m) => !m.de_gestion)
    setConvertir({ tipo: 'incidencia', titulo: hilo?.asunto ?? '', cuerpo: primer?.texto ?? '' })
  }
  const publicar = async () => {
    if (!convertir || !convertir.titulo.trim() || !convertir.cuerpo.trim()) return
    setSaving(true)
    try { await convertirEnMensaje(id, { ...convertir, titulo: convertir.titulo.trim(), cuerpo: convertir.cuerpo.trim() }); setConvertir(null); toast('Publicado como mensaje y notificado', 'ok') }
    catch { toast('No se pudo publicar', 'error') } finally { setSaving(false) }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface/95 px-3 py-3 backdrop-blur safe-top">
        <button onClick={onBack} aria-label="Atrás" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 truncate font-display text-[17px] font-bold text-ink">{hilo?.asunto ?? 'Conversación'}</h1>
        {gestor && hilo && (
          <button onClick={alternarCierre} className="rounded-pill px-3 py-1.5 text-[12px] font-bold text-muted hover:bg-surface-2">{cerrado ? 'Reabrir' : 'Cerrar'}</button>
        )}
      </header>

      <div className="mx-auto w-full max-w-[720px] flex-1 px-4 py-4">
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state === 'ready' && data && (
          <>
            {gestor && (
              <Button variant="secondary" block className="mb-4" onClick={abrirConvertir}><Megaphone size={17} /> Convertir en mensaje público</Button>
            )}
            <div className="flex flex-col gap-2.5">
              {data.mensajes.map((m) => {
                const mio = m.autor_id === user.id
                return (
                  <div key={m.id} className={cx('flex', mio ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[80%] rounded-[16px] px-3.5 py-2.5 text-[14px]',
                      mio ? 'bg-primary text-white' : 'bg-surface text-ink shadow-neu-sm')}>
                      {!mio && (
                        <div className="mb-0.5 flex items-center gap-1 text-[11px] font-bold opacity-70">
                          {m.de_gestion && <ShieldCheck size={12} />}{m.de_gestion ? 'Administración' : (m.autor_nombre ?? 'Vecino')}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap leading-relaxed">{m.texto}</div>
                      <div className={cx('mt-1 text-[10.5px]', mio ? 'text-white/70' : 'text-faint')}>{fechaHora(m.created_at)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Barra de respuesta */}
      {!cerrado && (
        <div className="sticky bottom-0 border-t border-border bg-surface/95 p-3 backdrop-blur safe-bottom">
          <div className="mx-auto flex max-w-[720px] items-end gap-2">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} placeholder="Escribe un mensaje…"
              className="max-h-32 min-h-[46px] flex-1 resize-none rounded-[16px] border border-border bg-surface px-3.5 py-2.5 text-[15px] text-ink shadow-neu-inset focus:border-primary focus:outline-none" />
            <button onClick={responder} disabled={saving || !texto.trim()} aria-label="Enviar"
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-primary disabled:opacity-50">
              <Send size={19} />
            </button>
          </div>
        </div>
      )}

      {/* Convertir en mensaje público (gestión) */}
      {convertir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setConvertir(null)}>
          <div className="w-full max-w-[520px] rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">Publicar como mensaje</h3>
              <button onClick={() => setConvertir(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <SelectField label="Tipo" value={convertir.tipo} onChange={(e) => setConvertir({ ...convertir, tipo: e.target.value as MensajeTipo })}>
                {(['aviso', 'anuncio', 'incidencia'] as MensajeTipo[]).map((t) => <option key={t} value={t}>{TIPO_META[t].label}</option>)}
              </SelectField>
              <Field label="Título" value={convertir.titulo} maxLength={140} onChange={(e) => setConvertir({ ...convertir, titulo: e.target.value })} />
              <Textarea label="Mensaje" value={convertir.cuerpo} maxLength={4000} rows={5} onChange={(e) => setConvertir({ ...convertir, cuerpo: e.target.value })} />
              <Button block size="lg" disabled={saving || !convertir.titulo.trim() || !convertir.cuerpo.trim()} onClick={publicar}>
                <Megaphone size={18} /> Publicar y notificar a todos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
