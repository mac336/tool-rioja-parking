import { useState } from 'react'
import { TriangleAlert, Megaphone, X, Send, FileEdit, Clock, Check, Ban } from 'lucide-react'
import { Card, Field, Textarea, Button, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { useApp } from '@/store'
import { fechaHora } from '@/lib/format'
import { crearPublicacion, misPublicaciones } from '@/lib/api'
import type { Mensaje, MensajeEstado, MensajeDestino } from '@/types'

const hoyStr = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10) }
const masMeses = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10) }

const ESTADO_META: Record<MensajeEstado, { label: string; cls: string; Icon: typeof Clock }> = {
  borrador: { label: 'Borrador', cls: 'bg-surface-2 text-muted', Icon: FileEdit },
  pendiente: { label: 'Pendiente de aprobar', cls: 'bg-warn-soft text-warn-ink', Icon: Clock },
  publicado: { label: 'Publicado', cls: 'bg-success-soft text-success-ink', Icon: Check },
  rechazado: { label: 'No publicado', cls: 'bg-danger-soft text-danger-ink', Icon: Ban },
}

type FormState = {
  tipo: 'incidencia' | 'anuncio'
  titulo: string
  cuerpo: string
  destino: MensajeDestino
  publica: string
  expira: string
}

/** Panel "Publicar" del buzón: el vecino reporta una incidencia o publica un
 *  anuncio; se guarda en `mensajes` (pendiente de aprobar / privado a admin). */
export function PublicarPanel() {
  const { toast } = useApp()
  const mias = useAsync(misPublicaciones, [])
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const abrir = (tipo: 'incidencia' | 'anuncio') =>
    setForm({ tipo, titulo: '', cuerpo: '', destino: 'todos', publica: hoyStr(), expira: '' })

  const valido = !!form && form.titulo.trim().length >= 3 && form.cuerpo.trim().length >= 3

  const enviar = async (borrador: boolean) => {
    if (!form || !valido) return
    setBusy(true)
    try {
      await crearPublicacion({
        tipo: form.tipo,
        titulo: form.titulo.trim(),
        cuerpo: form.cuerpo.trim(),
        destino: form.destino,
        publica_at: form.tipo === 'anuncio' && form.publica ? new Date(form.publica).toISOString() : undefined,
        expira_at: form.tipo === 'anuncio' && form.expira ? new Date(form.expira).toISOString() : undefined,
        borrador,
      })
      const queTipo = form.tipo === 'incidencia' ? 'incidencia' : 'anuncio'
      if (borrador) toast('Guardado como borrador', 'info')
      else if (form.destino === 'administracion') toast('Enviado a administración', 'ok')
      else toast(`Se ha levantado tu ${queTipo}. Se publicará en cuanto la apruebe la administración.`, 'ok')
      setForm(null)
      mias.refetch()
    } catch {
      toast('No se pudo enviar. Inténtalo de nuevo.', 'error')
    } finally { setBusy(false) }
  }

  const lista = mias.data ?? []

  return (
    <section className="flex flex-col gap-2">
      <h2 className="section-title">Publicar</h2>
      <p className="-mt-1 text-[12.5px] text-muted">Reporta una incidencia o publica un anuncio. Antes de verse en la app lo revisa la administración.</p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => abrir('incidencia')}
          className="flex items-center justify-center gap-2 rounded-[14px] border border-border bg-surface px-3 py-3 text-[14px] font-bold text-ink hover:bg-surface-2">
          <TriangleAlert size={18} className="text-danger" /> Incidencia
        </button>
        <button type="button" onClick={() => abrir('anuncio')}
          className="flex items-center justify-center gap-2 rounded-[14px] border border-border bg-surface px-3 py-3 text-[14px] font-bold text-ink hover:bg-surface-2">
          <Megaphone size={18} className="text-primary" /> Anuncio
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

      {/* Formulario */}
      {form && (
        <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setForm(null)}>
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">
                {form.tipo === 'incidencia' ? 'Reportar incidencia' : 'Publicar anuncio'}
              </h3>
              <button onClick={() => setForm(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>

            <div className="flex flex-col gap-3">
              <Field label={form.tipo === 'incidencia' ? '¿Qué quieres reportar?' : '¿Qué quieres anunciar?'}
                value={form.titulo} maxLength={140}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder={form.tipo === 'incidencia' ? 'Ej. Luz fundida en el portal 2' : 'Ej. Vendo bicicleta de niño'} />
              <Textarea label={form.tipo === 'incidencia' ? 'Describe el problema' : 'Describe tu anuncio'}
                value={form.cuerpo} maxLength={4000} rows={5}
                onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
                placeholder="Cuéntanos los detalles…" />

              {form.tipo === 'anuncio' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Se publica el" type="date" value={form.publica} min={hoyStr()} max={masMeses(2)}
                    onChange={(e) => setForm({ ...form, publica: e.target.value })} />
                  <Field label="Hasta (máx. 2 meses)" type="date" value={form.expira} min={form.publica || hoyStr()} max={masMeses(2)}
                    onChange={(e) => setForm({ ...form, expira: e.target.value })} />
                </div>
              )}

              {/* Destino */}
              <div>
                <div className="mb-1.5 text-[13px] font-semibold text-muted">¿Dónde lo publicas?</div>
                <div className="grid grid-cols-1 gap-2">
                  {([['todos', 'Para todos los vecinos', 'Se verá en el tablón (tras aprobación).'],
                     ['administracion', 'Solo a administración', 'Privado: solo lo ve la gestión.']] as [MensajeDestino, string, string][]).map(([val, tit, sub]) => (
                    <button key={val} type="button" onClick={() => setForm({ ...form, destino: val })}
                      className={cx('flex items-start gap-2.5 rounded-[14px] border p-3 text-left transition-colors',
                        form.destino === val ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-2')}>
                      <span className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                        form.destino === val ? 'border-primary' : 'border-border')}>
                        {form.destino === val && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <span>
                        <span className="block text-[14px] font-semibold text-ink">{tit}</span>
                        <span className="block text-[12px] text-muted">{sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {form.destino === 'todos' && (
                <p className="rounded-[12px] bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink">
                  Al enviarlo se <b>levanta</b> y se manda a <b>aprobación</b>. Se publicará en cuanto lo apruebe la administración.
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="secondary" disabled={busy || !valido} onClick={() => enviar(true)}><FileEdit size={17} /> Borrador</Button>
                <Button block disabled={busy || !valido} onClick={() => enviar(false)}><Send size={17} /> {busy ? 'Enviando…' : 'Enviar'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
