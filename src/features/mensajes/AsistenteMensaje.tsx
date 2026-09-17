// Asistente ÚNICO de alta de mensajes (v1.54.0).
// ---------------------------------------------------------------------------
// Antes había TRES formularios distintos para crear lo mismo: el modal de una
// pantalla de Buzón → Publicar, el asistente por pasos de Gestión → Mensajes y
// el mini-modal de Servicios → Sugerencias. Ahora los tres abren ESTE wizard.
//
// Lo que cambia según el ORIGEN (decisión del usuario: la publicación NO se
// toca, sigue comportándose como antes):
//   · 'buzon'   → crearPublicacion(): va a APROBACIÓN (o privado a administración).
//                 Tiene paso «¿Dónde lo publicas?» y botón Borrador.
//   · 'gestion' → crearMensaje(): publica DIRECTO. Tiene firma, caducidad y
//                 prioridad invisible del tablón.
//
// Lo que cambia según el TIPO (ver ASPECTO_FIJO en postit.ts):
//   · incidencia → estilo «Problem» + papel rosa, FIJOS y sin preguntar.
//   · sugerencia → estilo «Idea» (foco) + papel lila, FIJOS; tampoco elige
//                  importancia (siempre normal).
//   · aviso y anuncio → sí eligen estilo y color.
//
// Los textos son los del buzón, por tipo («¿Qué quieres reportar?» …), que son
// más claros que los genéricos que tenía gestión.
import { useEffect, useState } from 'react'
import { X, Send, ChevronLeft, ArrowRight, ImagePlus, Trash2, FileEdit } from 'lucide-react'
import { Button, Field, Textarea, SelectField, cx } from '@/components/ui'
import { useApp } from '@/store'
import { crearMensaje, editarMensaje, crearPublicacion } from '@/lib/api'
import { comprimirImagen, type FotoComprimida } from '@/lib/imagen'
import type { Mensaje, MensajeTipo, MensajeDestino, EstiloTemporada, ImportanciaMensaje } from '@/types'
import { TIPO_META } from './MensajeCard'
import { TEMPORADAS, TEMPORADAS_ORDEN, IMPORTANCIA_COLOR, PASTELES, PASTELES_ORDEN, ASPECTO_FIJO, eligeAspecto } from './postit'
import { MotivoTemporada } from './MotivoTemporada'
import { PISOS } from '@/lib/parking'

export const MAX_FOTOS = 2
const FIRMAS = ['Administrador', 'Conserje', 'la Junta', 'Vecinos', 'Developer', ...PISOS]

const pad = (n: number) => String(n).padStart(2, '0')
const claveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hoyStr = () => claveDia(new Date())
const masMeses = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() + n); return claveDia(d) }

/** Textos por tipo: los del buzón, que hablan el idioma del vecino. */
const COPY: Record<MensajeTipo, { titulo: string; labelTitulo: string; phTitulo: string; labelCuerpo: string }> = {
  incidencia: { titulo: 'Reportar incidencia', labelTitulo: '¿Qué quieres reportar?', phTitulo: 'Ej. Luz fundida en el portal 2', labelCuerpo: 'Describe el problema' },
  anuncio: { titulo: 'Publicar anuncio', labelTitulo: '¿Qué quieres anunciar?', phTitulo: 'Ej. Vendo bicicleta de niño', labelCuerpo: 'Describe tu anuncio' },
  sugerencia: { titulo: 'Nueva sugerencia', labelTitulo: '¿Qué quieres sugerir?', phTitulo: 'Ej. Pedir 3 presupuestos antes de contratar', labelCuerpo: 'Explica tu sugerencia' },
  aviso: { titulo: 'Nuevo aviso', labelTitulo: '¿Qué quieres avisar?', phTitulo: 'Ej. Corte de agua el martes', labelCuerpo: 'Escribe el aviso para la comunidad' },
}

const IMPORTANCIAS: { valor: ImportanciaMensaje | ''; label: string; color?: string }[] = [
  { valor: '', label: 'Normal' },
  { valor: 'media', label: 'Importante', color: IMPORTANCIA_COLOR.media },
  { valor: 'alta', label: 'Urgente', color: IMPORTANCIA_COLOR.alta },
]

type Paso = 'tipo' | 'titulo' | 'cuerpo' | 'importancia' | 'destino' | 'firma' | 'opciones' | 'resumen'
const TITULO_PASO: Record<Paso, string> = {
  tipo: '¿Qué quieres publicar?', titulo: 'Título', cuerpo: 'El mensaje', importancia: '¿Qué importancia tiene?',
  destino: '¿Dónde lo publicas?', firma: '¿De parte de quién?', opciones: 'Opciones (opcional)', resumen: 'Revisa y publica',
}

export type OrigenAsistente = 'buzon' | 'gestion'

type FormState = {
  id?: string; tipo: MensajeTipo; titulo: string; cuerpo: string
  expira: string; publica: string; firma: string
  estilo: EstiloTemporada | ''; importancia: ImportanciaMensaje | ''; grado: '' | 1 | 2 | 3; color: string
  destino: MensajeDestino
}

export interface AsistenteMensajeProps {
  origen: OrigenAsistente
  /** Tipos que se pueden crear desde aquí (ya filtrados por permiso). */
  tipos: MensajeTipo[]
  /** Si viene, el paso 1 se SALTA y arranca con ese tipo ya elegido. */
  tipoInicial?: MensajeTipo
  /** Mensaje a editar (solo gestión). */
  edicion?: Mensaje
  onCerrar: () => void
  onHecho: () => void
}

export function AsistenteMensaje({ origen, tipos, tipoInicial, edicion, onCerrar, onHecho }: AsistenteMensajeProps) {
  const { toast } = useApp()
  const tipoArranque = edicion?.tipo ?? tipoInicial ?? tipos[0] ?? 'aviso'
  const [form, setForm] = useState<FormState>(() => ({
    id: edicion?.id,
    tipo: tipoArranque,
    titulo: edicion?.titulo ?? '',
    cuerpo: edicion?.cuerpo ?? '',
    expira: edicion?.expira_at ? edicion.expira_at.slice(0, 10) : '',
    publica: hoyStr(),
    firma: edicion?.firma || 'Administrador',
    estilo: (edicion?.estilo as EstiloTemporada | null) ?? '',
    importancia: edicion?.importancia ?? '',
    grado: (edicion?.grado as 1 | 2 | 3 | null | undefined) ?? '',
    color: edicion?.color ?? '',
    destino: 'todos',
  }))
  const [saving, setSaving] = useState(false)
  const [fotos, setFotos] = useState<FotoComprimida[]>([])
  const [procesando, setProcesando] = useState(false)

  // El paso 1 solo aparece si hay algo que elegir y no nos dieron el tipo hecho.
  const eligeTipo = !edicion && !tipoInicial && tipos.length > 1
  const c = COPY[form.tipo]
  const aspectoLibre = eligeAspecto(form.tipo)

  const pasos: Paso[] = [
    ...(eligeTipo ? ['tipo' as const] : []),
    'titulo', 'cuerpo',
    // Sugerencia nunca elige importancia (siempre normal). En el buzón tampoco
    // se ofrece: marcar algo como «Urgente» es cosa de quien publica directo.
    ...(origen === 'gestion' && (form.tipo === 'aviso' || form.tipo === 'incidencia') ? ['importancia' as const] : []),
    ...(origen === 'buzon' && !edicion ? ['destino' as const] : []),
    // La sugerencia lleva AUTOR visible (nombre + piso), no firma.
    ...(origen === 'gestion' && form.tipo !== 'sugerencia' ? ['firma' as const] : []),
    ...(origen === 'gestion' || aspectoLibre ? ['opciones' as const] : []),
    'resumen',
  ]
  const [paso, setPaso] = useState<Paso>(pasos[0])
  const idx = Math.max(0, pasos.indexOf(paso))
  useEffect(() => { if (!pasos.includes(paso)) setPaso(pasos[0]) }, [pasos, paso])

  const pasoOk = paso === 'titulo' ? form.titulo.trim().length > 0
    : paso === 'cuerpo' ? form.cuerpo.trim().length > 0
    : true
  const atras = () => { if (idx === 0) onCerrar(); else setPaso(pasos[idx - 1]) }
  const siguiente = () => { if (pasoOk && idx < pasos.length - 1) setPaso(pasos[idx + 1]) }

  const limpiarFotos = () => fotos.forEach((f) => URL.revokeObjectURL(f.url))
  const anadirFotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setProcesando(true)
    try {
      for (const file of Array.from(files).slice(0, MAX_FOTOS - fotos.length)) {
        try { const f = await comprimirImagen(file); setFotos((prev) => [...prev, f]) }
        catch (e) { toast(e instanceof Error ? e.message : 'No se pudo añadir la foto', 'error') }
      }
    } finally { setProcesando(false) }
  }
  const quitarFoto = (i: number) => setFotos((prev) => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, j) => j !== i) })

  /** Aspecto final: el fijo del tipo manda sobre lo elegido. */
  const aspectoFinal = () => {
    const fijo = ASPECTO_FIJO[form.tipo]
    if (fijo) return { estilo: fijo.estilo as string, color: fijo.color }
    return { estilo: form.estilo || null, color: form.color || null }
  }

  const guardar = async (borrador = false) => {
    if (!form.titulo.trim() || !form.cuerpo.trim()) return
    setSaving(true)
    try {
      const { estilo, color } = aspectoFinal()
      const blobs = fotos.length ? fotos.map((f) => f.blob) : undefined
      if (origen === 'buzon') {
        await crearPublicacion({
          tipo: form.tipo as 'incidencia' | 'anuncio' | 'sugerencia',
          titulo: form.titulo.trim(), cuerpo: form.cuerpo.trim(),
          destino: form.destino, borrador,
          publica_at: form.tipo === 'anuncio' && form.publica ? new Date(`${form.publica}T00:00:00`).toISOString() : undefined,
          expira_at: form.expira ? new Date(`${form.expira}T23:59:59`).toISOString() : null,
          fotos: blobs,
        })
        toast(borrador ? 'Guardado como borrador' : form.destino === 'administracion' ? 'Enviado a administración' : 'Enviado a aprobación', 'ok')
      } else {
        const admiteImportancia = form.tipo === 'aviso' || form.tipo === 'incidencia'
        const payload = {
          tipo: form.tipo, titulo: form.titulo.trim(), cuerpo: form.cuerpo.trim(),
          expira_at: form.expira ? new Date(`${form.expira}T23:59:59`).toISOString() : null,
          firma: form.firma,
          estilo,
          importancia: admiteImportancia ? (form.importancia || null) : null,
          grado: form.grado === '' ? null : form.grado,
          color,
        }
        if (form.id) { await editarMensaje(form.id, payload); toast('Mensaje actualizado') }
        else { await crearMensaje({ ...payload, fotos: blobs }); toast('Mensaje publicado y notificado', 'ok') }
      }
      limpiarFotos()
      onHecho(); onCerrar()
    } catch { toast('No se pudo guardar el mensaje', 'error') } finally { setSaving(false) }
  }

  const cerrar = () => { limpiarFotos(); onCerrar() }
  const valido = form.titulo.trim().length > 0 && form.cuerpo.trim().length > 0

  return (
    <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={cerrar}>
      <div className="flex max-h-full w-full max-w-[520px] flex-col rounded-t-[20px] bg-surface shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <h3 className="font-display text-[18px] font-bold text-ink">{form.id ? 'Editar mensaje' : c.titulo}</h3>
            <p className="text-[12.5px] font-semibold text-muted">Paso {idx + 1} de {pasos.length} · {TITULO_PASO[paso]}</p>
          </div>
          <button onClick={cerrar} aria-label="Cerrar" className="shrink-0 rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          {/* 1 · Tipo, con botones grandes (nada de desplegable) */}
          {paso === 'tipo' && (
            <div className="grid grid-cols-3 gap-2.5">
              {tipos.map((t) => {
                const { label, Icon } = TIPO_META[t]
                const sel = form.tipo === t
                return (
                  <button key={t} type="button" onClick={() => setForm({ ...form, tipo: t })}
                    className={cx('flex flex-col items-center justify-center gap-1.5 rounded-[14px] border px-2 py-4 transition-colors',
                      sel ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-2')}>
                    <Icon size={22} className={sel ? 'text-primary' : 'text-muted'} />
                    <span className={cx('text-[13px] font-bold', sel ? 'text-primary' : 'text-ink')}>{label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {paso === 'titulo' && (
            <Field label={c.labelTitulo} value={form.titulo} maxLength={140} autoFocus
              onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder={c.phTitulo} />
          )}

          {paso === 'cuerpo' && (
            <div className="flex flex-col gap-3">
              <Textarea label={c.labelCuerpo} value={form.cuerpo} maxLength={4000} rows={7}
                onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} placeholder="Cuéntanos los detalles…" />
              {/* Al EDITAR no se tocan las fotos que ya tiene el mensaje. */}
              {!form.id && form.tipo !== 'sugerencia' && (
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-muted">Fotos (opcional, máx. {MAX_FOTOS})</div>
                  <div className="flex flex-wrap gap-2">
                    {fotos.map((f, i) => (
                      <div key={f.url} className="relative h-20 w-20 overflow-hidden rounded-[12px] border border-border">
                        <img src={f.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => quitarFoto(i)} aria-label="Quitar foto"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {fotos.length < MAX_FOTOS && (
                      <label className={cx('flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-border text-faint hover:bg-surface-2', procesando && 'pointer-events-none opacity-60')}>
                        <ImagePlus size={20} />
                        <span className="text-[10.5px] font-semibold">{procesando ? 'Procesando…' : 'Añadir'}</span>
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={(e) => { void anadirFotos(e.target.files); e.target.value = '' }} />
                      </label>
                    )}
                  </div>
                  <p className="mt-1 text-[11.5px] text-faint">Se optimizan antes de subir y se elimina la ubicación de la foto.</p>
                </div>
              )}
            </div>
          )}

          {paso === 'importancia' && (
            <div className="flex flex-col gap-2">
              {IMPORTANCIAS.map((i) => (
                <button key={i.label} type="button" onClick={() => setForm({ ...form, importancia: i.valor })}
                  className={cx('flex items-center justify-between rounded-[14px] border px-4 py-3 text-left',
                    form.importancia === i.valor ? 'border-primary bg-primary-soft' : 'border-border bg-surface')}>
                  <span className="text-[15px] font-semibold text-ink">{i.label}</span>
                  {i.color && <span className="h-3.5 w-3.5 rounded-full" style={{ background: i.color }} />}
                </button>
              ))}
            </div>
          )}

          {/* Paso del buzón: ¿para todos (con aprobación) o privado a administración? */}
          {paso === 'destino' && (
            <div className="flex flex-col gap-2">
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
              {form.destino === 'todos' && (
                <p className="rounded-[12px] bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink">
                  Al enviarlo se manda a <b>aprobación</b>. Se publicará en cuanto lo apruebe la administración.
                </p>
              )}
            </div>
          )}

          {paso === 'firma' && (
            <SelectField label="Firma (aparece en el post-it)" value={form.firma} onChange={(e) => setForm({ ...form, firma: e.target.value })}>
              {FIRMAS.map((f) => <option key={f} value={f}>{f}</option>)}
            </SelectField>
          )}

          {paso === 'opciones' && (
            <div className="flex flex-col gap-4">
              {/* Fechas del anuncio (las que tenía el buzón) */}
              {origen === 'buzon' && form.tipo === 'anuncio' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Se publica el" type="date" value={form.publica} min={hoyStr()} max={masMeses(2)}
                    onChange={(e) => setForm({ ...form, publica: e.target.value })} />
                  <Field label="Hasta (máx. 2 meses)" type="date" value={form.expira} min={form.publica || hoyStr()} max={masMeses(2)}
                    onChange={(e) => setForm({ ...form, expira: e.target.value })} />
                </div>
              )}

              {origen === 'gestion' && (
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
                </div>
              )}

              {/* Estilo y color: SOLO para los tipos que los eligen (aviso, anuncio).
                  Incidencia y sugerencia se pintan solas, así que aquí no aparecen. */}
              {aspectoLibre && (
                <>
                  <div>
                    <div className="mb-1.5 text-[13px] font-semibold text-muted">Estilo del post-it (opcional)</div>
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => setForm({ ...form, estilo: '' })}
                        className={cx('flex flex-col items-center gap-1 rounded-[12px] border px-2 py-2.5 text-[12px] font-semibold',
                          form.estilo === '' ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink')}>
                        <span className="h-[18px] w-[18px] rounded-[4px] border border-border bg-surface-2" /> Ninguno
                      </button>
                      {TEMPORADAS_ORDEN.filter((t) => t !== 'problem' && t !== 'idea').map((t) => (
                        <button key={t} type="button" onClick={() => setForm({ ...form, estilo: t })}
                          className={cx('flex flex-col items-center gap-1 rounded-[12px] border px-2 py-2.5 text-[12px] font-semibold',
                            form.estilo === t ? 'border-primary' : 'border-border')}
                          style={{ background: TEMPORADAS[t].paper, color: TEMPORADAS[t].tint }}>
                          <MotivoTemporada estilo={t} size={18} />{TEMPORADAS[t].etiqueta}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-[12px] text-faint">El estilo solo decora el post-it. No cambia el tipo ni las notificaciones.</p>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[13px] font-semibold text-muted">Color del post-it (opcional)</div>
                    <div className="grid grid-cols-4 gap-2">
                      <button type="button" onClick={() => setForm({ ...form, color: '' })}
                        className={cx('min-h-[44px] rounded-[12px] border text-[12px] font-semibold',
                          form.color === '' ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink')}>Ninguno</button>
                      {PASTELES_ORDEN.map((k) => (
                        <button key={k} type="button" onClick={() => setForm({ ...form, color: k })} aria-label={PASTELES[k].etiqueta}
                          className={cx('min-h-[44px] rounded-[12px] border', form.color === k ? 'border-primary ring-2 ring-primary/40' : 'border-border')}
                          style={{ background: PASTELES[k].hex }} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {origen === 'gestion' && (
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-muted">Prioridad en el tablón</div>
                  <div className="grid grid-cols-4 gap-2">
                    {([['', 'Según tipo'], [1, 'Baja'], [2, 'Media'], [3, 'Alta']] as ['' | 1 | 2 | 3, string][]).map(([v, lab]) => (
                      <button key={lab} type="button" onClick={() => setForm({ ...form, grado: v })}
                        className={cx('min-h-[44px] rounded-[12px] border text-[12.5px] font-bold',
                          form.grado === v ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-ink')}>{lab}</button>
                    ))}
                  </div>
                  <p className="mt-1 text-[12px] text-faint">Orden <b>invisible</b> del tablón de Inicio: Alta sale arriba.</p>
                </div>
              )}
            </div>
          )}

          {paso === 'resumen' && (
            <div className="flex flex-col gap-2 text-[14px] text-ink">
              <div><span className="text-muted">Tipo:</span> <b>{TIPO_META[form.tipo].label}</b></div>
              <div><span className="text-muted">Título:</span> <b>{form.titulo || '—'}</b></div>
              <div className="rounded-[12px] bg-surface-2 px-3 py-2 text-[13px] text-muted">{form.cuerpo || '—'}</div>
              {fotos.length > 0 && <div><span className="text-muted">Fotos:</span> {fotos.length}</div>}
              {origen === 'buzon' && (
                <div><span className="text-muted">Se publica:</span> {form.destino === 'administracion' ? 'solo a administración (privado)' : 'para todos, tras aprobación'}</div>
              )}
              {origen === 'gestion' && (form.tipo === 'aviso' || form.tipo === 'incidencia') && (
                <div><span className="text-muted">Importancia:</span> {IMPORTANCIAS.find((i) => i.valor === form.importancia)?.label ?? 'Normal'}</div>
              )}
              {origen === 'gestion' && <div><span className="text-muted">De parte de:</span> {form.firma}</div>}
              <div><span className="text-muted">Caduca:</span> {form.expira || 'sin caducidad'}</div>
              {!aspectoLibre && (
                <div><span className="text-muted">Aspecto:</span> {TEMPORADAS[ASPECTO_FIJO[form.tipo]!.estilo].etiqueta} · {PASTELES[ASPECTO_FIJO[form.tipo]!.color]?.etiqueta} <span className="text-faint">(fijo para este tipo)</span></div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <Button variant="secondary" onClick={atras}><ChevronLeft size={18} /> Atrás</Button>
          {paso === 'resumen' ? (
            <>
              {origen === 'buzon' && !form.id && (
                <Button variant="secondary" disabled={saving || !valido} onClick={() => void guardar(true)}><FileEdit size={17} /> Borrador</Button>
              )}
              <Button block size="lg" disabled={saving || !valido} onClick={() => void guardar(false)}>
                <Send size={18} /> {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : origen === 'buzon' ? 'Enviar' : 'Publicar y notificar'}
              </Button>
            </>
          ) : (
            <Button block size="lg" disabled={!pasoOk} onClick={siguiente}>Siguiente <ArrowRight size={18} /></Button>
          )}
        </div>
      </div>
    </div>
  )
}
