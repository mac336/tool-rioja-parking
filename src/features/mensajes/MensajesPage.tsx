import { useState } from 'react'
import { Plus, X, Send, Trash2 } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Button, Field, Textarea, SelectField, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { useApp } from '@/store'
import { puedePublicarTipo, tiposQueVe } from '@/lib/roles'
import { PISOS } from '@/lib/parking'
import { listMensajes, crearMensaje, editarMensaje, borrarMensaje } from '@/lib/api'
import type { Mensaje, MensajeTipo, EstiloTemporada, ImportanciaMensaje } from '@/types'
import { MensajeCard, TIPO_META } from './MensajeCard'
import { TEMPORADAS, TEMPORADAS_ORDEN, IMPORTANCIA_COLOR } from './postit'
import { MotivoTemporada } from './MotivoTemporada'

// Orden fijo de las pestañas. Las visibles y las creables dependen de los
// PERMISOS POR TIPO del rol. Las sugerencias las publican los vecinos (buzón) y
// se aprueban en Gestión → Publicaciones, no se escriben aquí.
const ORDEN: MensajeTipo[] = ['aviso', 'anuncio', 'incidencia', 'sugerencia']
const SECCION: Record<MensajeTipo, string> = { aviso: 'Avisos', anuncio: 'Anuncios', incidencia: 'Incidencias', sugerencia: 'Sugerencias' }
const FIRMAS = ['Administrador', 'Conserje', 'la Junta', 'Vecinos', 'Developer', ...PISOS]

const pad = (n: number) => String(n).padStart(2, '0')
const claveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hoyStr = () => claveDia(new Date())
const mananaStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return claveDia(d) }

type FormState = { id?: string; tipo: MensajeTipo; titulo: string; cuerpo: string; expira: string; firma: string; estilo: EstiloTemporada | ''; importancia: ImportanciaMensaje | '' }

const IMPORTANCIAS: { valor: ImportanciaMensaje | ''; label: string; color?: string }[] = [
  { valor: '', label: 'Normal' },
  { valor: 'media', label: 'Importante', color: IMPORTANCIA_COLOR.media },
  { valor: 'alta', label: 'Urgente', color: IMPORTANCIA_COLOR.alta },
]

export function MensajesPage() {
  const { user, msgColors, toast } = useApp()
  // Pestañas visibles y tipos creables según los permisos por tipo del rol.
  const tabsVisibles = ORDEN.filter((t) => tiposQueVe(user.rol).includes(t))
  const creables = ORDEN.filter((t) => t !== 'sugerencia' && puedePublicarTipo(user.rol, t))
  const { data, state, refetch } = useAsync(listMensajes, [], { key: 'mensajes', ttlMs: TTL.mensajes })

  const [tab, setTab] = useState<MensajeTipo>(tabsVisibles[0] ?? 'aviso')
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  const nuevoTipo = creables.includes(tab) ? tab : (creables[0] ?? 'aviso')
  const abrirNuevo = () => setForm({ tipo: nuevoTipo, titulo: '', cuerpo: '', expira: mananaStr(), firma: 'Administrador', estilo: '', importancia: '' })
  const abrirEditar = (m: Mensaje) => setForm({ id: m.id, tipo: m.tipo, titulo: m.titulo, cuerpo: m.cuerpo, expira: m.expira_at ? m.expira_at.slice(0, 10) : '', firma: m.firma || 'Administrador', estilo: m.estilo ?? '', importancia: m.importancia ?? '' })

  const guardar = async () => {
    if (!form || form.titulo.trim().length < 1 || form.cuerpo.trim().length < 1) return
    setSaving(true)
    try {
      const admiteImportancia = form.tipo === 'aviso' || form.tipo === 'incidencia'
      const payload = {
        tipo: form.tipo, titulo: form.titulo.trim(), cuerpo: form.cuerpo.trim(),
        expira_at: form.expira ? new Date(`${form.expira}T23:59:59`).toISOString() : null,
        firma: form.firma,
        estilo: form.estilo || null,
        importancia: admiteImportancia ? (form.importancia || null) : null,
      }
      if (form.id) { await editarMensaje(form.id, payload); toast('Mensaje actualizado') }
      else { await crearMensaje(payload); toast('Mensaje publicado y notificado', 'ok') }
      setForm(null); refetch()
    } catch { toast('No se pudo guardar el mensaje', 'error') } finally { setSaving(false) }
  }

  const borrar = async (m: Mensaje) => {
    if (!window.confirm(`¿Borrar "${m.titulo}"?`)) return
    await borrarMensaje(m.id); toast('Mensaje borrado', 'info'); refetch()
  }

  const conteo = (t: MensajeTipo) => (data ?? []).filter((m) => m.tipo === t).length
  const items = (data ?? []).filter((m) => m.tipo === tab)

  return (
    <div className="min-h-full bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur safe-top">
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
          <h1 className="font-display text-[22px] font-extrabold text-ink">Mensajes</h1>
          {creables.includes(tab) && (
            <button onClick={abrirNuevo} className="flex h-10 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary">
              <Plus size={18} /> Nuevo
            </button>
          )}
        </div>
        {/* Pestañas por tipo con contador */}
        <div className="flex gap-2 px-4 pb-2.5">
          {tabsVisibles.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cx('inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[13px] font-bold transition-colors',
                tab === t ? 'bg-primary text-white' : 'bg-surface-2 text-muted')}>
              {SECCION[t]}
              <span className={cx('inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-extrabold',
                tab === t ? 'bg-white/25 text-white' : 'bg-black/10 text-muted')}>{conteo(t)}</span>
            </button>
          ))}
        </div>
      </header>

      <Page className="flex flex-col gap-2.5">
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {tab === 'sugerencia' && items.length > 0 && (
          <p className="rounded-[12px] bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
            Las sugerencias las publican los vecinos desde el buzón. Para aprobarlas o rechazarlas ve a <b>Gestión → Publicaciones</b>.
          </p>
        )}
        {state !== 'loading' && state !== 'error' && items.length === 0 && (
          <EmptyState titulo={`Sin ${SECCION[tab].toLowerCase()}`}
            texto={tab === 'sugerencia' ? 'Las sugerencias las envían los vecinos desde el buzón y se aprueban en Publicaciones.' : creables.includes(tab) ? 'Pulsa “Nuevo” para publicar uno.' : 'No hay nada por ahora.'} />
        )}
        {items.map((m) => (
          <MensajeCard key={m.id} m={m} color={msgColors[m.tipo]}
            onEdit={puedePublicarTipo(user.rol, m.tipo) && m.tipo !== 'sugerencia' ? abrirEditar : undefined}
            onDelete={puedePublicarTipo(user.rol, m.tipo) ? borrar : undefined} />
        ))}
      </Page>

      {/* Formulario de alta/edición (solo gestión) */}
      {form && (
        <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setForm(null)}>
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">{form.id ? 'Editar mensaje' : 'Nuevo mensaje'}</h3>
              <button onClick={() => setForm(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <SelectField label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as MensajeTipo })}>
                {creables.map((t) => <option key={t} value={t}>{TIPO_META[t].label}</option>)}
              </SelectField>
              <Field label="Título" value={form.titulo} maxLength={140} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Corte de agua el martes" />
              <Textarea label="Mensaje" value={form.cuerpo} maxLength={4000} rows={5} onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} placeholder="Escribe el mensaje para la comunidad…" />
              <SelectField label="Firma (aparece en el post-it)" value={form.firma} onChange={(e) => setForm({ ...form, firma: e.target.value })}>
                {FIRMAS.map((f) => <option key={f} value={f}>{f}</option>)}
              </SelectField>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="caduca" className="text-[13px] font-semibold text-muted">Caduca el (opcional)</label>
                <div className="flex items-center gap-2">
                  <input id="caduca" type="date" min={hoyStr()} value={form.expira} onChange={(e) => setForm({ ...form, expira: e.target.value })}
                    className="min-h-[48px] flex-1 rounded-[14px] border border-border bg-surface px-3.5 text-[15px] text-ink shadow-neu-inset focus:border-primary focus:outline-none" />
                  {form.expira && (
                    <button type="button" onClick={() => setForm({ ...form, expira: '' })} aria-label="Quitar caducidad"
                      className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] border border-border bg-surface text-danger active:shadow-neu-inset">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <span className="text-[12px] text-faint">Los avisos con caducidad aparecen en “Actividad reciente” hasta ese día. Bórrala (🗑) para que no caduque.</span>
              </div>

              {/* Importancia: solo avisos e incidencias */}
              {(form.tipo === 'aviso' || form.tipo === 'incidencia') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-muted">Importancia</label>
                  <div className="grid grid-cols-3 gap-2">
                    {IMPORTANCIAS.map((op) => {
                      const on = form.importancia === op.valor
                      return (
                        <button key={op.label} type="button" onClick={() => setForm({ ...form, importancia: op.valor })}
                          className={cx('min-h-[44px] rounded-[12px] border text-[13px] font-bold transition-colors',
                            on ? 'text-white' : 'border-border bg-surface-2 text-muted')}
                          style={on ? { background: op.color ?? 'var(--primary)', borderColor: op.color ?? 'var(--primary)' } : undefined}>
                          {op.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Estilo de temporada (opcional) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-muted">Estilo de temporada (opcional)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setForm({ ...form, estilo: '' })}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[12px] border-[1.5px] bg-surface text-[11px] font-bold text-muted"
                    style={form.estilo === '' ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent)' } : { borderColor: '#D2DBE4' }}>
                    <span className="h-5 w-5 rounded border bg-white" style={{ borderColor: '#D2DBE4' }} />
                    Ninguno
                  </button>
                  {TEMPORADAS_ORDEN.map((key) => {
                    const t = TEMPORADAS[key]; const on = form.estilo === key
                    return (
                      <button key={key} type="button" onClick={() => setForm({ ...form, estilo: key })}
                        className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[12px] border-[1.5px] px-1 pb-1.5 pt-2 text-[11px] font-bold"
                        style={{ background: t.paper, color: t.tint, borderColor: on ? t.tint : '#D2DBE4', boxShadow: on ? `0 0 0 3px color-mix(in srgb, ${t.tint} 22%, transparent)` : undefined }}>
                        <MotivoTemporada estilo={key} size={14} color={t.tint} />
                        {t.etiqueta}
                      </button>
                    )
                  })}
                </div>
                <span className="text-[12px] text-faint">El estilo solo decora este post-it en el tablón. No cambia el tipo ni las notificaciones.</span>
              </div>
              <Button block size="lg" disabled={saving || !form.titulo.trim() || !form.cuerpo.trim()} onClick={guardar}>
                <Send size={18} /> {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Publicar y notificar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
