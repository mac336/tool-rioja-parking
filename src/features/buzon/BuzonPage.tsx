import { useState } from 'react'
import { Plus, Send, X, ChevronLeft, Megaphone, ShieldCheck, CircleDot, Trash2 } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, Field, Textarea, SelectField, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { useApp } from '@/store'
import { puedePublicarMensajes } from '@/lib/roles'
import { fechaHora } from '@/lib/format'
import { listHilos, getHilo, crearHilo, responderHilo, cerrarHilo, borrarHilo, convertirEnMensaje } from '@/lib/api'
import type { Hilo, HiloCanal, MensajeTipo } from '@/types'
import { TIPO_META } from '@/features/mensajes/MensajeCard'

const CANAL_LABEL: Record<HiloCanal, string> = { administrador: 'Administración', presidencia: 'Presidencia', conserje: 'Conserje', desarrollador: 'Desarrollador de la app' }
// Por ahora solo se puede escribir al Desarrollador de la app (fase de pruebas).
// El resto de canales siguen definidos para mostrar hilos antiguos correctamente.
const CANALES: HiloCanal[] = ['desarrollador']

export function BuzonPage() {
  const [abierto, setAbierto] = useState<string | null>(null)
  if (abierto) return <HiloVista id={abierto} onBack={() => setAbierto(null)} />
  return <Bandeja onOpen={setAbierto} />
}

// ---- Lista de hilos (los míos + los de mi canal) -----------------------------
function Bandeja({ onOpen }: { onOpen: (id: string) => void }) {
  const { user, toast } = useApp()
  const { data, state, refetch } = useAsync(listHilos, [])
  const [nuevo, setNuevo] = useState<null | { asunto: string; texto: string; canal: HiloCanal }>(null)
  const [saving, setSaving] = useState(false)

  const enviar = async () => {
    if (!nuevo || nuevo.asunto.trim().length < 1 || nuevo.texto.trim().length < 1) return
    setSaving(true)
    try {
      const id = await crearHilo({ asunto: nuevo.asunto.trim(), texto: nuevo.texto.trim(), canal: nuevo.canal })
      setNuevo(null); refetch(); toast('Mensaje enviado', 'ok'); onOpen(id)
    } catch { toast('No se pudo enviar', 'error') } finally { setSaving(false) }
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <SubHeader titulo="Buzón" right={(
        <button onClick={() => setNuevo({ asunto: '', texto: '', canal: 'desarrollador' })} className="flex h-10 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary">
          <Plus size={18} /> Nuevo
        </button>
      )} />
      <Page className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <p className="text-[13px] text-muted">Escribe en privado al <b>Desarrollador de la app</b> para cualquier duda o problema durante las pruebas. Solo el destinatario lo ve.</p>
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {(state === 'empty' || (state === 'ready' && (data ?? []).length === 0)) && (
          <EmptyState titulo="Sin conversaciones" texto="Cuando escribas o recibas un mensaje, aparecerá aquí." />
        )}
        {state === 'ready' && (data ?? []).map((h: Hilo) => {
          const soyDueño = h.vecino_id === user.id
          const sinLeer = soyDueño ? h.no_leido_vecino : h.no_leido_gestion
          return (
            <Card key={h.id} role="button" onClick={() => onOpen(h.id)} className="cursor-pointer hover:bg-surface-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {sinLeer && <CircleDot size={15} className="shrink-0 text-primary" />}
                  <span className="truncate font-semibold text-ink">{h.asunto}</span>
                </div>
                <span className="shrink-0 rounded-pill bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-700">{CANAL_LABEL[h.canal]}</span>
              </div>
              <div className="mt-0.5 text-[13px] text-muted">
                {soyDueño ? 'Enviado por ti' : `${h.vecino_nombre ?? 'Vecino'} · ${h.vecino_vivienda}`}
                {h.estado === 'cerrado' && ' · cerrado'}
              </div>
              <div className="mt-0.5 text-[11px] text-faint">{fechaHora(h.updated_at)}</div>
            </Card>
          )
        })}
      </Page>

      {nuevo && (
        <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setNuevo(null)}>
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">Nuevo mensaje privado</h3>
              <button onClick={() => setNuevo(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <SelectField label="Para" value={nuevo.canal} onChange={(e) => setNuevo({ ...nuevo, canal: e.target.value as HiloCanal })}>
                {CANALES.map((c) => <option key={c} value={c}>{CANAL_LABEL[c]}</option>)}
              </SelectField>
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
function HiloVista({ id, onBack }: { id: string; onBack: () => void }) {
  const { user, toast } = useApp()
  const { data, state, refetch } = useAsync(() => getHilo(id), [id])
  const [texto, setTexto] = useState('')
  const [saving, setSaving] = useState(false)
  const [convertir, setConvertir] = useState<null | { tipo: MensajeTipo; titulo: string; cuerpo: string }>(null)

  const hilo = data?.hilo
  const soyDueño = !!hilo && hilo.vecino_id === user.id
  const staff = !!hilo && !soyDueño
  const cerrado = hilo?.estado === 'cerrado'

  const responder = async () => {
    if (texto.trim().length < 1) return
    setSaving(true)
    try { await responderHilo(id, texto.trim()); setTexto(''); refetch() }
    catch { toast('No se pudo enviar', 'error') } finally { setSaving(false) }
  }
  const alternarCierre = async () => {
    if (!hilo) return
    await cerrarHilo(id, !cerrado); refetch(); toast(cerrado ? 'Conversación reabierta' : 'Conversación cerrada', 'info')
  }
  const borrar = async () => {
    if (!window.confirm('¿Borrar esta conversación? Se eliminará para siempre, junto con todos sus mensajes.')) return
    try { await borrarHilo(id); toast('Conversación borrada', 'info'); onBack() }
    catch { toast('No se pudo borrar', 'error') }
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
    // Chat fijado al viewport visible (.app-viewport): sigue al teclado en altura
    // y desplazamiento; cabecera y barra de escribir quedan fijas y SOLO
    // scrollean los mensajes (el input queda siempre sobre el teclado).
    <div className="app-viewport z-50 flex flex-col bg-bg">
      <header className="z-10 flex shrink-0 items-center gap-1 border-b border-border bg-surface/95 px-2 py-3 backdrop-blur safe-top">
        <button onClick={onBack} aria-label="Atrás" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"><ChevronLeft size={24} /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[17px] font-bold text-ink">{hilo?.asunto ?? 'Conversación'}</h1>
          {hilo && <div className="text-[11.5px] text-faint">{CANAL_LABEL[hilo.canal]}{staff && hilo.vecino_nombre ? ` · ${hilo.vecino_nombre}` : ''}</div>}
        </div>
        {staff && <button onClick={alternarCierre} className="shrink-0 rounded-pill px-2.5 py-1.5 text-[12px] font-bold text-muted hover:bg-surface-2">{cerrado ? 'Reabrir' : 'Cerrar'}</button>}
        <button onClick={borrar} aria-label="Borrar conversación" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-soft"><Trash2 size={19} /></button>
      </header>

      <div className="mx-auto w-full min-h-0 max-w-[720px] flex-1 overflow-y-auto px-4 py-4">
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state === 'ready' && data && (
          <>
            {staff && puedePublicarMensajes(user.rol) && (
              <Button variant="secondary" block className="mb-4" onClick={abrirConvertir}><Megaphone size={17} /> Convertir en mensaje público</Button>
            )}
            <div className="flex flex-col gap-2.5">
              {data.mensajes.map((m) => {
                const mio = m.autor_id === user.id
                return (
                  <div key={m.id} className={cx('flex', mio ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[80%] rounded-[16px] px-3.5 py-2.5 text-[14px]', mio ? 'bg-primary text-white' : 'bg-surface text-ink shadow-neu-sm')}>
                      {!mio && (
                        <div className="mb-0.5 flex items-center gap-1 text-[11px] font-bold opacity-70">
                          {m.de_gestion && <ShieldCheck size={12} />}{m.de_gestion ? (hilo ? CANAL_LABEL[hilo.canal] : 'Administración') : (m.autor_nombre ?? 'Vecino')}
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

      {!cerrado && (
        <div className="shrink-0 border-t border-border bg-surface/95 p-3 backdrop-blur safe-bottom">
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

      {convertir && (
        <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setConvertir(null)}>
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
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
