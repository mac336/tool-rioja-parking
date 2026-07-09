import { useState } from 'react'
import { Plus, X, Send } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Button, Field, Textarea, SelectField, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { useApp } from '@/store'
import { puedePublicarMensajes } from '@/lib/roles'
import { listMensajes, crearMensaje, editarMensaje, borrarMensaje } from '@/lib/api'
import type { Mensaje, MensajeTipo } from '@/types'
import { MensajeCard, TIPO_META } from './MensajeCard'

const ORDEN: MensajeTipo[] = ['aviso', 'anuncio', 'incidencia']
const SECCION: Record<MensajeTipo, string> = { aviso: 'Avisos', anuncio: 'Anuncios', incidencia: 'Incidencias' }

type FormState = { id?: string; tipo: MensajeTipo; titulo: string; cuerpo: string; expira: string }

export function MensajesPage() {
  const { user, msgColors, toast } = useApp()
  const puede = puedePublicarMensajes(user.rol)
  const { data, state, refetch } = useAsync(listMensajes, [])

  const [tab, setTab] = useState<MensajeTipo>('aviso')
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  const abrirNuevo = () => setForm({ tipo: tab, titulo: '', cuerpo: '', expira: '' })
  const abrirEditar = (m: Mensaje) => setForm({ id: m.id, tipo: m.tipo, titulo: m.titulo, cuerpo: m.cuerpo, expira: m.expira_at ? m.expira_at.slice(0, 10) : '' })

  const guardar = async () => {
    if (!form || form.titulo.trim().length < 1 || form.cuerpo.trim().length < 1) return
    setSaving(true)
    try {
      const payload = {
        tipo: form.tipo, titulo: form.titulo.trim(), cuerpo: form.cuerpo.trim(),
        expira_at: form.expira ? new Date(`${form.expira}T23:59:59`).toISOString() : null,
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
          {puede && (
            <button onClick={abrirNuevo} className="flex h-10 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary">
              <Plus size={18} /> Nuevo
            </button>
          )}
        </div>
        {/* Pestañas por tipo con contador */}
        <div className="flex gap-2 px-4 pb-2.5">
          {ORDEN.map((t) => (
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
        {state !== 'loading' && state !== 'error' && items.length === 0 && (
          <EmptyState titulo={`Sin ${SECCION[tab].toLowerCase()}`} texto={puede ? 'Pulsa “Nuevo” para publicar uno.' : 'No hay nada por ahora.'} />
        )}
        {items.map((m) => (
          <MensajeCard key={m.id} m={m} color={msgColors[m.tipo]}
            onEdit={puede ? abrirEditar : undefined} onDelete={puede ? borrar : undefined} />
        ))}
      </Page>

      {/* Formulario de alta/edición (solo gestión) */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setForm(null)}>
          <div className="w-full max-w-[520px] rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">{form.id ? 'Editar mensaje' : 'Nuevo mensaje'}</h3>
              <button onClick={() => setForm(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <SelectField label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as MensajeTipo })}>
                {ORDEN.map((t) => <option key={t} value={t}>{TIPO_META[t].label}</option>)}
              </SelectField>
              <Field label="Título" value={form.titulo} maxLength={140} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Corte de agua el martes" />
              <Textarea label="Mensaje" value={form.cuerpo} maxLength={4000} rows={5} onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} placeholder="Escribe el mensaje para la comunidad…" />
              <Field label="Caduca el (opcional)" type="date" value={form.expira} onChange={(e) => setForm({ ...form, expira: e.target.value })}
                hint="Los avisos con fecha de caducidad aparecen en “Actividad reciente” de Inicio hasta ese día." />
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
