// Gestión de los consejos de convivencia del hueco de la Home (mig. 0064).
// Editables aquí para no tener que desplegar por cambiar una coma: son normas
// de la comunidad y cambian con las juntas.
import { useState } from 'react'
import { Plus, Trash2, Pencil, X, Eye, EyeOff } from 'lucide-react'
import { Button, Field, Textarea, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { listConsejosGestion, crearConsejo, editarConsejo, borrarConsejo } from '@/lib/api'
import { cacheBust } from '@/lib/cache'
import type { Consejo } from '@/types'

type Form = { id?: string; texto_corto: string; texto_largo: string; icono: string; orden: number; visible_desde: string; visible_hasta: string }
const vacio: Form = { texto_corto: '', texto_largo: '', icono: '', orden: 100, visible_desde: '', visible_hasta: '' }

export function ConsejosTab({ canEdit, onToast }: { canEdit: boolean; onToast: (t: string, k?: 'ok' | 'error' | 'info') => void }) {
  const { data, state, refetch } = useAsync(listConsejosGestion, [])
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)

  const recargar = () => { cacheBust('consejos'); refetch() }

  const guardar = async () => {
    if (!form || form.texto_corto.trim().length < 3) return
    setSaving(true)
    try {
      const payload = {
        texto_corto: form.texto_corto.trim(),
        texto_largo: form.texto_largo.trim() || null,
        icono: form.icono.trim() || null,
        orden: form.orden,
        activo: true,
        visible_desde: form.visible_desde.trim() || null,
        visible_hasta: form.visible_hasta.trim() || null,
      }
      if (form.id) { await editarConsejo(form.id, payload); onToast('Consejo actualizado', 'ok') }
      else { await crearConsejo(payload); onToast('Consejo añadido', 'ok') }
      setForm(null); recargar()
    } catch { onToast('No se pudo guardar', 'error') } finally { setSaving(false) }
  }

  const alternar = async (c: Consejo) => {
    try { await editarConsejo(c.id, { activo: !c.activo }); recargar() }
    catch { onToast('No se pudo cambiar', 'error') }
  }

  const borrar = async (c: Consejo) => {
    if (!window.confirm(`¿Borrar "${c.texto_corto}"?`)) return
    try { await borrarConsejo(c.id); onToast('Consejo borrado', 'info'); recargar() }
    catch { onToast('No se pudo borrar', 'error') }
  }

  const lista = data ?? []

  return (
    <div className="flex flex-col gap-2.5">
      <p className="rounded-[12px] bg-surface-2 px-3 py-2 text-[12.5px] text-muted">
        Se muestran en el hueco de la <b>portada</b>, uno por apertura y por orden, <b>solo</b> cuando el
        vecino no tiene nada que mirar (ni parking, ni reserva, ni recordatorio) y queda sitio.
        La versión larga se usa si caben 2 líneas.
      </p>

      {canEdit && (
        <button onClick={() => setForm({ ...vacio, orden: (lista.at(-1)?.orden ?? 0) + 10 })}
          className="flex h-10 items-center justify-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary">
          <Plus size={18} /> Nuevo consejo
        </button>
      )}

      {state === 'loading' && <SkeletonList n={3} />}
      {state === 'error' && <ErrorState onRetry={refetch} />}
      {state !== 'loading' && state !== 'error' && lista.length === 0 && (
        <EmptyState titulo="Sin consejos" texto="Añade el primero con el botón de arriba." />
      )}

      {lista.map((c) => (
        <div key={c.id} className={cx('rounded-[14px] border border-border bg-surface p-3', !c.activo && 'opacity-55')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-ink">{c.texto_corto}</div>
              {c.texto_largo && <div className="mt-0.5 text-[12.5px] text-muted">{c.texto_largo}</div>}
              <div className="mt-1 text-[11.5px] text-faint">
                orden {c.orden}
                {c.visible_desde && c.visible_hasta && ` · solo del ${c.visible_desde} al ${c.visible_hasta}`}
                {!c.activo && ' · apagado'}
              </div>
            </div>
            {canEdit && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button onClick={() => void alternar(c)} aria-label={c.activo ? 'Apagar' : 'Encender'}
                  className="rounded-full p-1.5 text-faint hover:bg-surface-2">
                  {c.activo ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => setForm({
                  id: c.id, texto_corto: c.texto_corto, texto_largo: c.texto_largo ?? '',
                  icono: c.icono ?? '', orden: c.orden,
                  visible_desde: c.visible_desde ?? '', visible_hasta: c.visible_hasta ?? '',
                })} aria-label="Editar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><Pencil size={16} /></button>
                <button onClick={() => void borrar(c)} aria-label="Borrar"
                  className="rounded-full p-1.5 text-danger hover:bg-surface-2"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        </div>
      ))}

      {form && (
        <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setForm(null)}>
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">{form.id ? 'Editar consejo' : 'Nuevo consejo'}</h3>
              <button onClick={() => setForm(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Texto corto (1 línea)" value={form.texto_corto} maxLength={120}
                onChange={(e) => setForm({ ...form, texto_corto: e.target.value })}
                placeholder="Ej. Respeta aparcamiento en las plazas exteriores." />
              <Textarea label="Texto largo (opcional, para cuando caben 2 líneas)" value={form.texto_largo} maxLength={240} rows={3}
                onChange={(e) => setForm({ ...form, texto_largo: e.target.value })}
                placeholder="Se usa solo si hay hueco suficiente." />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Icono (lucide)" value={form.icono} onChange={(e) => setForm({ ...form, icono: e.target.value })} placeholder="Car" />
                <Field label="Orden" type="number" value={String(form.orden)}
                  onChange={(e) => setForm({ ...form, orden: Number(e.target.value) || 0 })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Solo desde (MM-DD)" value={form.visible_desde}
                  onChange={(e) => setForm({ ...form, visible_desde: e.target.value })} placeholder="06-01" />
                <Field label="Solo hasta (MM-DD)" value={form.visible_hasta}
                  onChange={(e) => setForm({ ...form, visible_hasta: e.target.value })} placeholder="09-20" />
              </div>
              <p className="text-[11.5px] text-faint">Deja las fechas vacías para que se vea todo el año.</p>
              <Button block size="lg" disabled={saving || form.texto_corto.trim().length < 3} onClick={() => void guardar()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
