import { useState } from 'react'
import { Plus, X, Pencil, Trash2, PartyPopper, CalendarRange } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, SectionTitle, Field, Textarea, SelectField, Button, Alert, EmptyState, ErrorState, SkeletonList } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { useApp } from '@/store'
import { puedeGestionarCalendario } from '@/lib/roles'
import { claveDia } from '@/lib/format'
import { diasEntre, textoDia, esPasado } from '@/features/home/gadgetsHome'
import { listEventos, crearEvento, editarEvento, borrarEvento } from '@/lib/api'
import type { EventoCalendario, TipoEvento } from '@/types'

// Pantalla /calendario — festivos de Madrid + fechas de la comunidad, en modo
// lista (specs/21). Ve cualquier cuenta activa; solo quien tiene el permiso
// `gestionar_calendario` ve "Nueva" y las acciones Editar/Borrar por fila.

const MIN_FECHA = '2020-01-01'

// ---- Helpers de presentación (sin red; puros, de uso solo en esta pantalla) --

function numeroDia(ymd: string): number {
  return Number(ymd.split('-')[2])
}

function diaSemanaAbrev(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const fecha = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' }).format(fecha)
}

function mesTitulo(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number)
  const fecha = new Date(Date.UTC(y, m - 1, 1))
  const mes = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' }).format(fecha)
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${y}`
}

/** "del 15 al 22 de septiembre" (mismo mes) o "del 15 de septiembre al 2 de
 *  octubre" (cruza de mes), a partir de dos 'YYYY-MM-DD'. */
function rangoLista(fecha: string, fin: string): string {
  if (fecha.slice(0, 7) === fin.slice(0, 7)) return `del ${numeroDia(fecha)} al ${textoDia(fin)}`
  return `del ${textoDia(fecha)} al ${textoDia(fin)}`
}

function ordenProximos(a: EventoCalendario, b: EventoCalendario): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
  if (a.tipo !== b.tipo) return a.tipo === 'comunidad' ? -1 : 1
  return a.titulo.localeCompare(b.titulo, 'es')
}

function ordenPasados(a: EventoCalendario, b: EventoCalendario): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1
  return a.titulo.localeCompare(b.titulo, 'es')
}

// ---- Formulario (hoja modal) --------------------------------------------------

interface FormState {
  titulo: string
  fecha: string
  fecha_fin: string
  nota: string
  tipo: TipoEvento
  fuente: string
}

const FORM_VACIO: FormState = { titulo: '', fecha: '', fecha_fin: '', nota: '', tipo: 'comunidad', fuente: '' }

function eventoAForm(e: EventoCalendario): FormState {
  return {
    titulo: e.titulo,
    fecha: e.fecha,
    fecha_fin: e.fecha_fin ?? '',
    nota: e.nota ?? '',
    tipo: e.tipo,
    fuente: e.fuente ?? '',
  }
}

function validar(f: FormState): boolean {
  const titulo = f.titulo.trim()
  if (titulo.length < 1 || titulo.length > 100) return false
  if (!f.fecha || f.fecha < MIN_FECHA) return false
  if (f.fecha_fin) {
    if (f.fecha_fin < f.fecha) return false
    if (diasEntre(f.fecha, f.fecha_fin) > 366) return false
  }
  if (f.nota.length > 500) return false
  return true
}

export function CalendarioPage() {
  const { user, toast } = useApp()
  const puede = puedeGestionarCalendario(user.rol)
  const { data, state, refetch } = useAsync(listEventos, [], { key: 'calendario', ttlMs: TTL.calendario })
  const eventos = data ?? []
  const hoy = claveDia(new Date().toISOString())

  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarPasados, setMostrarPasados] = useState(false)

  const abrirNuevo = () => { setEditId(null); setForm(FORM_VACIO); setError(null) }
  const abrirEditar = (e: EventoCalendario) => { setEditId(e.id); setForm(eventoAForm(e)); setError(null) }
  const cerrar = () => { setForm(null); setEditId(null); setError(null) }

  const guardar = async () => {
    if (!form || !validar(form) || guardando) return
    setGuardando(true); setError(null)
    const input = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      fecha: form.fecha,
      fecha_fin: form.fecha_fin || null,
      nota: form.nota.trim() || null,
      fuente: form.tipo === 'festivo' ? (form.fuente.trim() || null) : null,
    }
    try {
      if (editId) await editarEvento(editId, input)
      else await crearEvento(input)
      toast(editId ? 'Evento actualizado' : 'Evento creado')
      cerrar()
      refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar. Revisa los datos e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (e: EventoCalendario) => {
    if (!window.confirm(`¿Borrar "${e.titulo}"? Esta acción no se puede deshacer.`)) return
    try {
      await borrarEvento(e.id)
      toast('Evento borrado')
      if (editId === e.id) cerrar()
      refetch()
    } catch {
      toast('No se pudo borrar', 'error')
    }
  }

  // ---- Próximos: coalesce(fecha_fin, fecha) >= hoy, agrupados por mes de inicio.
  const proximos = eventos.filter((e) => !esPasado(e, hoy)).sort(ordenProximos)
  const gruposProximos: { mes: string; eventos: EventoCalendario[] }[] = []
  for (const e of proximos) {
    const clave = mesTitulo(e.fecha)
    const ultimo = gruposProximos[gruposProximos.length - 1]
    if (ultimo && ultimo.mes === clave) ultimo.eventos.push(e)
    else gruposProximos.push({ mes: clave, eventos: [e] })
  }

  // ---- Pasados (este año): del más reciente al más antiguo.
  const anioHoy = hoy.slice(0, 4)
  const pasados = eventos.filter((e) => esPasado(e, hoy) && e.fecha.slice(0, 4) === anioHoy).sort(ordenPasados)

  // ---- Festivos pendientes de publicación (años a la vista sin ninguna fila
  // 'festivo'): año en curso, año siguiente si hoy ≥ 1-oct, y cualquier año con
  // eventos de comunidad ya listados en "Próximos".
  const aniosAVista = new Set<number>([Number(anioHoy)])
  if (Number(hoy.slice(5, 7)) >= 10) aniosAVista.add(Number(anioHoy) + 1)
  for (const e of proximos) {
    if (e.tipo !== 'comunidad') continue
    aniosAVista.add(Number(e.fecha.slice(0, 4)))
    if (e.fecha_fin) aniosAVista.add(Number(e.fecha_fin.slice(0, 4)))
  }
  const aniosFestivo = new Set(eventos.filter((e) => e.tipo === 'festivo').map((e) => Number(e.fecha.slice(0, 4))))
  const aniosPendientes = [...aniosAVista].filter((a) => !aniosFestivo.has(a)).sort((a, b) => a - b)

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Calendario" right={puede && (
        <Button size="md" onClick={abrirNuevo}><Plus size={18} /> Nueva</Button>
      )} />
      <Page className="flex flex-col gap-4">
        {state === 'loading' && <SkeletonList n={4} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state === 'empty' && <EmptyState titulo="Sin eventos próximos" texto="Aún no hay festivos ni fechas de la comunidad." />}

        {(state === 'ready') && (
          <>
            {gruposProximos.length === 0 && (
              <EmptyState titulo="Sin eventos próximos" />
            )}
            {gruposProximos.map((g) => (
              <section key={g.mes} className="flex flex-col gap-2.5">
                <SectionTitle>{g.mes}</SectionTitle>
                <div className="flex flex-col gap-2.5">
                  {g.eventos.map((e) => (
                    <FilaEvento key={e.id} e={e} puede={puede} onEditar={() => abrirEditar(e)} onBorrar={() => borrar(e)} />
                  ))}
                </div>
              </section>
            ))}

            {aniosPendientes.length > 0 && (
              <div className="flex flex-col gap-1 px-1">
                {aniosPendientes.map((a) => (
                  <p key={a} className="text-[12px] text-faint">Festivos de {a}: pendientes de publicación oficial</p>
                ))}
              </div>
            )}

            {pasados.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <button type="button" onClick={() => setMostrarPasados((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 text-left">
                  <SectionTitle>Pasados (este año)</SectionTitle>
                  <span className="text-[12px] text-faint">{mostrarPasados ? 'Ocultar' : 'Mostrar'}</span>
                </button>
                {mostrarPasados && (
                  <div className="flex flex-col gap-2.5">
                    {pasados.map((e) => (
                      <FilaEvento key={e.id} e={e} puede={puede} onEditar={() => abrirEditar(e)} onBorrar={() => borrar(e)} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </Page>

      {/* Hoja modal crear/editar (patrón SugerenciasPage). */}
      {form && (
        <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={cerrar}>
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">{editId ? 'Editar evento' : 'Nuevo evento'}</h3>
              <button onClick={cerrar} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Título" value={form.titulo} maxLength={100}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                hint={`${form.titulo.length}/100`}
                placeholder="Ej. Cierre de la piscina" />
              <Field label="Fecha" type="date" value={form.fecha} min={MIN_FECHA}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              <Field label="Fecha fin" type="date" value={form.fecha_fin} min={form.fecha || MIN_FECHA}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                hint="Opcional: solo si el evento dura varios días." />
              <Textarea label="Nota" value={form.nota} maxLength={500} rows={3}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
                placeholder="Detalles opcionales…" />
              <SelectField label="Tipo" value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEvento })}>
                <option value="comunidad">Comunidad</option>
                <option value="festivo">Festivo</option>
              </SelectField>
              {form.tipo === 'festivo' && (
                <Field label="Fuente" value={form.fuente}
                  onChange={(e) => setForm({ ...form, fuente: e.target.value })}
                  placeholder="Ej. Decreto…, BOCM nº…, consultado AAAA-MM-DD" />
              )}
              {error && <Alert tipo="danger">{error}</Alert>}
              <div className="mt-1 flex gap-2">
                <Button block disabled={!validar(form) || guardando} onClick={guardar}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </Button>
                <Button variant="secondary" disabled={guardando} onClick={cerrar}>Cancelar</Button>
              </div>
              {editId && (
                <Button variant="danger-outline" disabled={guardando}
                  onClick={() => { const e = eventos.find((x) => x.id === editId); if (e) borrar(e) }}>
                  <Trash2 size={16} /> Borrar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Fila de la lista ---------------------------------------------------------

function FilaEvento({ e, puede, onEditar, onBorrar }: { e: EventoCalendario; puede: boolean; onEditar: () => void; onBorrar: () => void }) {
  const tieneRango = !!e.fecha_fin && e.fecha_fin > e.fecha
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="flex w-11 shrink-0 flex-col items-center rounded-[12px] bg-surface-2 py-1.5">
          <span className="text-[18px] font-extrabold leading-none text-ink">{numeroDia(e.fecha)}</span>
          <span className="mt-0.5 text-[10.5px] font-semibold uppercase text-faint">{diaSemanaAbrev(e.fecha)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[15px] font-bold leading-tight text-ink">{e.titulo}</h3>
            {e.tipo === 'festivo' ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn-ink">
                <PartyPopper size={12} /> Festivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-pill bg-info-soft px-2 py-0.5 text-[11px] font-bold text-info-ink">
                <CalendarRange size={12} /> Comunidad
              </span>
            )}
          </div>
          {tieneRango && <p className="mt-0.5 text-[12.5px] text-muted">{rangoLista(e.fecha, e.fecha_fin as string)}</p>}
          {e.nota && <p className="mt-1 text-[13px] leading-snug text-muted">{e.nota}</p>}
          {e.tipo === 'festivo' && e.fuente && <p className="mt-1 text-[11px] leading-snug text-faint">{e.fuente}</p>}
        </div>
      </div>
      {puede && (
        <div className="flex gap-2 border-t border-border pt-2">
          <Button variant="secondary" size="md" onClick={onEditar} className="flex-1"><Pencil size={16} /> Editar</Button>
          <Button variant="danger-outline" size="md" onClick={onBorrar} className="flex-1"><Trash2 size={16} /> Borrar</Button>
        </div>
      )}
    </Card>
  )
}
