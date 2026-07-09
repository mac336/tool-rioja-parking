import { useState } from 'react'
import { Plus, X, Send } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, Field, Textarea, SelectField, EmptyState, ErrorState, SkeletonList } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { useApp } from '@/store'
import { puedePublicarMensajes } from '@/lib/roles'
import { listMensajes, crearMensaje, editarMensaje, borrarMensaje } from '@/lib/api'
import type { Mensaje, MensajeTipo } from '@/types'
import { MensajeCard, TIPO_META } from './MensajeCard'

const ORDEN: MensajeTipo[] = ['aviso', 'anuncio', 'incidencia']
const SECCION: Record<MensajeTipo, string> = { aviso: 'Avisos', anuncio: 'Anuncios', incidencia: 'Incidencias' }

export function MensajesPage() {
  const { user, msgColors, toast } = useApp()
  const puede = puedePublicarMensajes(user.rol)
  const { data, state, refetch } = useAsync(listMensajes, [])

  const [form, setForm] = useState<null | { id?: string; tipo: MensajeTipo; titulo: string; cuerpo: string }>(null)
  const [saving, setSaving] = useState(false)

  const abrirNuevo = () => setForm({ tipo: 'aviso', titulo: '', cuerpo: '' })
  const abrirEditar = (m: Mensaje) => setForm({ id: m.id, tipo: m.tipo, titulo: m.titulo, cuerpo: m.cuerpo })

  const guardar = async () => {
    if (!form || form.titulo.trim().length < 1 || form.cuerpo.trim().length < 1) return
    setSaving(true)
    try {
      const payload = { tipo: form.tipo, titulo: form.titulo.trim(), cuerpo: form.cuerpo.trim() }
      if (form.id) { await editarMensaje(form.id, payload); toast('Mensaje actualizado') }
      else { await crearMensaje(payload); toast('Mensaje publicado y notificado', 'ok') }
      setForm(null); refetch()
    } catch { toast('No se pudo guardar el mensaje', 'error') } finally { setSaving(false) }
  }

  const borrar = async (m: Mensaje) => {
    if (!window.confirm(`¿Borrar "${m.titulo}"?`)) return
    await borrarMensaje(m.id); toast('Mensaje borrado', 'info'); refetch()
  }

  const porTipo = (t: MensajeTipo) => (data ?? []).filter((m) => m.tipo === t)

  return (
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo="Mensajes" right={puede ? (
        <button onClick={abrirNuevo} className="flex h-10 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary">
          <Plus size={18} /> Nuevo
        </button>
      ) : undefined} />
      <Page className="flex flex-col gap-5">
        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {(state === 'empty' || (state === 'ready' && (data ?? []).length === 0)) && (
          <EmptyState titulo="Sin mensajes" texto={puede ? 'Aún no has publicado ningún mensaje. Pulsa “Nuevo”.' : 'No hay avisos, anuncios ni incidencias por ahora.'} />
        )}

        {state === 'ready' && ORDEN.map((t) => {
          const items = porTipo(t)
          if (items.length === 0) return null
          return (
            <section key={t}>
              <h2 className="overline mb-2">{SECCION[t]}</h2>
              <div className="flex flex-col gap-2.5">
                {items.map((m) => (
                  <MensajeCard key={m.id} m={m} color={msgColors[t]}
                    onEdit={puede ? abrirEditar : undefined} onDelete={puede ? borrar : undefined} />
                ))}
              </div>
            </section>
          )
        })}
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
