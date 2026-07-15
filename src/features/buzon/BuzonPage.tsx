import { useState } from 'react'
import { Send, X, ChevronLeft, Megaphone, ShieldCheck, Trash2, Code2, Building2, BellRing, Lock, PenSquare, Search } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, Field, Textarea, SelectField, Avatar, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { useApp } from '@/store'
import { puedePublicarAlgo, puedeEscribirVecinos, canalDeRol } from '@/lib/roles'
import { fechaHora, iniciales } from '@/lib/format'
import { listHilos, getHilo, crearHilo, crearHiloComoGestion, listDirectorio, responderHilo, cerrarHilo, borrarHilo, convertirEnMensaje } from '@/lib/api'
import type { Hilo, HiloCanal, MensajeTipo } from '@/types'
import { TIPO_META } from '@/features/mensajes/MensajeCard'
import { PublicarPanel } from './PublicarPanel'

const CANAL_LABEL: Record<HiloCanal, string> = { administrador: 'Administración', presidencia: 'Presidencia', conserje: 'Conserje', desarrollador: 'Desarrollador de la app' }
const CANAL_ICON: Record<HiloCanal, typeof Code2> = { administrador: Building2, presidencia: Building2, conserje: BellRing, desarrollador: Code2 }
// Contactos activos (se puede escribir). Por ahora solo el Desarrollador.
const CANALES: HiloCanal[] = ['desarrollador']
// Contactos VISIBLES pero PAUSADOS (solo lectura): se muestran, pero al tocarlos
// avisan de que están pausados hasta que se apruebe el uso de la app.
const CANALES_PAUSADOS: HiloCanal[] = ['administrador', 'conserje']

// Chat abierto: hilo existente (id), conversación nueva con un canal (vecino →
// gestión) o chat dirigido a un vecino (gestión → vecino, requiere permiso).
type ChatSel = { id?: string; canal: HiloCanal; titulo: string; vecinoId?: string }

export function BuzonPage() {
  const [chat, setChat] = useState<ChatSel | null>(null)
  if (chat) return <ChatVista sel={chat} onBack={() => setChat(null)} />
  return <Bandeja onOpen={setChat} />
}

// ---- Bandeja estilo WhatsApp: contactos + conversaciones ----------------------
function Bandeja({ onOpen }: { onOpen: (c: ChatSel) => void }) {
  const { user } = useApp()
  const { data, state, refetch } = useAsync(listHilos, [])
  const [pausado, setPausado] = useState<HiloCanal | null>(null)
  const [eligiendo, setEligiendo] = useState(false)
  const hilos = data ?? []
  // Gestión: puede iniciar chat con cualquier vecino (permiso escribir_vecinos).
  const miCanal = canalDeRol(user.rol)
  const puedoEscribir = puedeEscribirVecinos(user.rol) && !!miCanal

  // Mis chats como vecino: 1 conversación por canal (el hilo más reciente).
  const mioPorCanal = new Map<HiloCanal, Hilo>()
  for (const h of hilos) {
    if (h.vecino_id === user.id && !mioPorCanal.has(h.canal)) mioPorCanal.set(h.canal, h)
  }
  // Chats que atiendo como staff de mi canal (un chat por vecino/hilo).
  const deMiCanal = hilos.filter((h) => h.vecino_id !== user.id)

  return (
    <div className="flex h-full flex-col bg-bg">
      <SubHeader titulo="Buzón" />
      <Page className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}

        {state !== 'loading' && state !== 'error' && (
          <>
            {/* Qué es el buzón */}
            <div className="rounded-[14px] bg-primary-soft px-4 py-3 text-[13px] leading-snug text-primary-700">
              El buzón es tu <b>chat privado</b> para contactar con la comunidad. Toca un contacto y escríbele
              directamente: dudas, incidencias o cualquier gestión. <b>Solo lo veis tú y el destinatario</b>.
            </div>

            {/* Contactos: toca y escribe (directo al chat) */}
            <section className="flex flex-col gap-2">
              <h2 className="section-title">Contactar con</h2>
              {CANALES.map((c) => {
                const h = mioPorCanal.get(c)
                const sinLeer = !!h?.no_leido_vecino
                const Icon = CANAL_ICON[c]
                return (
                  <Card key={c} role="button" onClick={() => onOpen({ id: h?.id, canal: c, titulo: CANAL_LABEL[c] })}
                    className="flex cursor-pointer items-center gap-3 hover:bg-surface-2">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-700">
                      <Icon size={21} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink">{CANAL_LABEL[c]}</div>
                      <div className="truncate text-[12.5px] text-muted">
                        {h ? fechaHora(h.updated_at) : 'Toca para escribirle · solo lo veréis vosotros'}
                      </div>
                    </div>
                    {sinLeer && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                  </Card>
                )
              })}

              {/* Contactos pausados (solo lectura): visibles pero no disponibles aún */}
              {CANALES_PAUSADOS.map((c) => {
                const Icon = CANAL_ICON[c]
                return (
                  <Card key={c} role="button" onClick={() => setPausado(c)}
                    className="flex cursor-pointer items-center gap-3 opacity-70 hover:bg-surface-2">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <Icon size={21} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink">{CANAL_LABEL[c]}</div>
                      <div className="truncate text-[12.5px] text-muted">Disponible próximamente</div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
                      <Lock size={12} /> Pausado
                    </span>
                  </Card>
                )
              })}
            </section>

            {/* Publicar: reportar incidencia / publicar anuncio (con moderación) */}
            <PublicarPanel />

            {/* Gestión: iniciar chat con cualquier vecino */}
            {puedoEscribir && (
              <button type="button" onClick={() => setEligiendo(true)}
                className="flex items-center justify-center gap-2 rounded-pill border-[1.5px] border-primary bg-primary-soft px-4 py-2.5 text-[14px] font-bold text-primary-700">
                <PenSquare size={17} /> Escribir a un vecino
              </button>
            )}

            {/* Conversaciones que atiendo (staff del canal) */}
            {deMiCanal.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="section-title">Vecinos</h2>
                {deMiCanal.map((h) => (
                  <Card key={h.id} role="button"
                    onClick={() => onOpen({ id: h.id, canal: h.canal, titulo: h.vecino_nombre ?? 'Vecino' })}
                    className="flex cursor-pointer items-center gap-3 hover:bg-surface-2">
                    <Avatar text={iniciales(h.vecino_nombre ?? 'V')} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">{h.vecino_nombre ?? 'Vecino'} <span className="font-normal text-muted">· {h.vecino_vivienda}</span></div>
                      <div className="truncate text-[12.5px] text-muted">{fechaHora(h.updated_at)}{h.estado === 'cerrado' && ' · cerrado'}</div>
                    </div>
                    {h.no_leido_gestion && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                  </Card>
                ))}
              </section>
            )}
          </>
        )}
      </Page>

      {/* Selector de vecino (gestión → vecino) */}
      {eligiendo && miCanal && (
        <SelectorVecino
          onClose={() => setEligiendo(false)}
          onPick={(v) => {
            setEligiendo(false)
            // Si ya hay conversación con ese vecino en mi canal, se retoma.
            const existente = hilos.find((h) => h.vecino_id === v.id && h.canal === miCanal)
            onOpen({ id: existente?.id, canal: miCanal, titulo: `${v.nombre}${v.vivienda ? ` · ${v.vivienda}` : ''}`, vecinoId: v.id })
          }}
        />
      )}

      {/* Aviso: contacto pausado hasta que se apruebe el uso de la app */}
      {pausado && (
        <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setPausado(null)}>
          <div className="w-full max-w-[460px] rounded-t-[20px] bg-surface p-5 text-center shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-warn-soft text-warn-ink">
              <Lock size={26} strokeWidth={1.9} />
            </span>
            <h3 className="mt-3 font-display text-[19px] font-bold text-ink">{CANAL_LABEL[pausado]} · pausado</h3>
            <p className="mx-auto mt-2 max-w-xs text-[14px] text-muted">
              Esta función está <b>temporalmente pausada</b> hasta que se apruebe el uso completo de la app en la comunidad.
              Mientras tanto, para cualquier duda escribe al <b>Desarrollador de la app</b>.
            </p>
            <Button block size="lg" className="mt-5" onClick={() => setPausado(null)}>Entendido</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Chat (estilo WhatsApp) ----------------------------------------------------
function ChatVista({ sel, onBack }: { sel: ChatSel; onBack: () => void }) {
  const { user, toast } = useApp()
  const [hiloId, setHiloId] = useState<string | undefined>(sel.id)
  const { data, state, refetch } = useAsync(
    () => (hiloId ? getHilo(hiloId) : Promise.resolve(null)),
    [hiloId],
  )
  const [texto, setTexto] = useState('')
  const [saving, setSaving] = useState(false)
  const [convertir, setConvertir] = useState<null | { tipo: MensajeTipo; titulo: string; cuerpo: string }>(null)

  const hilo = data?.hilo
  const soyDueño = hilo ? hilo.vecino_id === user.id : !sel.vecinoId
  const staff = !soyDueño
  const cerrado = hilo?.estado === 'cerrado'

  // Enviar: si aún no existe conversación, se crea con este primer mensaje.
  const enviar = async () => {
    const t = texto.trim()
    if (t.length < 1) return
    setSaving(true)
    try {
      if (hiloId) {
        await responderHilo(hiloId, t)
        refetch()
      } else if (sel.vecinoId) {
        // Gestión → vecino (permiso escribir_vecinos, en mi canal).
        const id = await crearHiloComoGestion({ vecinoId: sel.vecinoId, texto: t, canal: sel.canal })
        setHiloId(id)
      } else {
        const id = await crearHilo({ asunto: sel.titulo, texto: t, canal: sel.canal })
        setHiloId(id) // el useAsync recarga con el hilo nuevo
      }
      setTexto('')
    } catch { toast('No se pudo enviar', 'error') } finally { setSaving(false) }
  }

  const alternarCierre = async () => {
    if (!hiloId) return
    await cerrarHilo(hiloId, !cerrado); refetch(); toast(cerrado ? 'Conversación reabierta' : 'Conversación cerrada', 'info')
  }
  const borrar = async () => {
    if (!hiloId) { onBack(); return }
    if (!window.confirm('¿Borrar esta conversación? Se eliminará para siempre, junto con todos sus mensajes.')) return
    try { await borrarHilo(hiloId); toast('Conversación borrada', 'info'); onBack() }
    catch { toast('No se pudo borrar', 'error') }
  }
  const abrirConvertir = () => {
    const primer = data?.mensajes.find((m) => !m.de_gestion)
    setConvertir({ tipo: 'incidencia', titulo: hilo?.asunto ?? '', cuerpo: primer?.texto ?? '' })
  }
  const publicar = async () => {
    if (!hiloId || !convertir || !convertir.titulo.trim() || !convertir.cuerpo.trim()) return
    setSaving(true)
    try { await convertirEnMensaje(hiloId, { ...convertir, titulo: convertir.titulo.trim(), cuerpo: convertir.cuerpo.trim() }); setConvertir(null); toast('Publicado como mensaje y notificado', 'ok') }
    catch { toast('No se pudo publicar', 'error') } finally { setSaving(false) }
  }

  return (
    // Chat fijado al viewport visible (.app-viewport): cabecera y barra de
    // escribir fijas, SOLO scrollean los mensajes (input siempre sobre el teclado).
    <div className="app-viewport z-50 flex flex-col bg-bg">
      <header className="z-10 flex shrink-0 items-center gap-1.5 border-b border-border bg-surface/95 px-2 py-2.5 backdrop-blur safe-top">
        <button onClick={onBack} aria-label="Atrás" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"><ChevronLeft size={24} /></button>
        {staff
          ? <Avatar text={iniciales(sel.titulo)} size={38} />
          : <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-700"><Code2 size={19} /></span>}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[16.5px] font-bold leading-tight text-ink">{sel.titulo}</h1>
          <div className="text-[11.5px] text-faint">
            {staff ? `${hilo?.vecino_vivienda ? hilo.vecino_vivienda + ' · ' : ''}${CANAL_LABEL[sel.canal]}` : 'Chat privado · solo lo veis vosotros'}
          </div>
        </div>
        {staff && <button onClick={alternarCierre} className="shrink-0 rounded-pill px-2.5 py-1.5 text-[12px] font-bold text-muted hover:bg-surface-2">{cerrado ? 'Reabrir' : 'Cerrar'}</button>}
        {hiloId && <button onClick={borrar} aria-label="Borrar conversación" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-soft"><Trash2 size={19} /></button>}
      </header>

      <div className="mx-auto w-full min-h-0 max-w-[720px] flex-1 overflow-y-auto px-4 py-4">
        {hiloId && state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {!hiloId && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            {sel.vecinoId
              ? <Avatar text={iniciales(sel.titulo)} size={64} />
              : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary-700"><Code2 size={30} /></span>}
            <p className="max-w-[280px] text-[14px] text-muted">
              {sel.vecinoId
                ? <>Escríbele a <b>{sel.titulo}</b>. Le llegará por notificación y también a su correo.</>
                : <>Escríbele al <b>{sel.titulo}</b>. Es un chat privado: solo lo veréis vosotros.</>}
            </p>
          </div>
        )}
        {hiloId && state === 'ready' && data && (
          <>
            {staff && puedePublicarAlgo(user.rol) && (
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
            <button onClick={enviar} disabled={saving || !texto.trim()} aria-label="Enviar"
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

// ---- Selector de vecino (gestión → vecino) -------------------------------------
function SelectorVecino({ onClose, onPick }: {
  onClose: () => void
  onPick: (v: { id: string; nombre: string; vivienda: string | null }) => void
}) {
  const { user } = useApp()
  const { data, state, refetch } = useAsync(listDirectorio, [])
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const lista = (data ?? [])
    .filter((v) => v.id !== user.id)
    .filter((v) => !s || (v.nombre ?? '').toLowerCase().includes(s) || (v.vivienda ?? '').toLowerCase().includes(s))

  return (
    <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="flex max-h-[80%] w-full max-w-[520px] flex-col rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h3 className="font-display text-[18px] font-bold text-ink">Escribir a un vecino</h3>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
        </div>
        <div className="relative shrink-0">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} inputMode="search" autoFocus
            placeholder="Buscar por nombre o piso"
            className="min-h-[46px] w-full rounded-[14px] border border-border bg-surface pl-10 pr-3 text-[15px] text-ink placeholder:text-faint shadow-neu-inset focus:border-primary focus:outline-none" />
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {state === 'loading' && <SkeletonList n={4} />}
          {state === 'error' && <ErrorState onRetry={refetch} />}
          {state !== 'loading' && lista.length === 0 && (
            <p className="rounded-[14px] bg-surface-2 px-4 py-6 text-center text-[13px] text-muted">Ningún vecino coincide.</p>
          )}
          <div className="flex flex-col divide-y divide-border">
            {lista.map((v) => (
              <button key={v.id} type="button" onClick={() => onPick(v)}
                className="flex items-center gap-3 px-1 py-2.5 text-left hover:bg-surface-2">
                <Avatar text={iniciales(v.nombre ?? 'V')} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold text-ink">{v.nombre}</div>
                  <div className="text-[12px] text-muted">{v.vivienda || 'Sin vivienda'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 shrink-0 text-center text-[11.5px] text-faint">El vecino recibirá tu mensaje por push y también en su correo.</p>
      </div>
    </div>
  )
}
