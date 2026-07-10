import { useMemo, useState } from 'react'
import {
  Shield, Check, X, Clock, Users, MapPin,
  UserX, UserCheck, Pencil, Trash2, Search,
  ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react'
import {
  Avatar, Button, Card, Field, RoleBadge, SelectField, Alert,
  EmptyState, ErrorState, SkeletonList, SectionTitle, cx,
} from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaCorta, fechaHora, hora, claveDia, iniciales } from '@/lib/format'
import {
  ROLE_LABEL, roleBadgeKind, esAppAdmin, CATALOGO_PERMISOS,
  puedeAprobarAltas, puedeAprobarReservas,
} from '@/lib/roles'
import type { Profile, Role, ReservaGrupo } from '@/types'
import { PISOS } from '@/lib/parking'
import { reservaCelebrada } from '@/lib/reglas'
import { useApp } from '@/store'
import {
  listAccessRequests, resolverSolicitud, listVecinos, suspenderVecino, cambiarRolVecino,
  editarVecino, darDeBajaVecino,
  reservasPendientesGestion, reservasGestion, resolverReserva,
  listRolePermisos, setRolePermiso,
} from '@/lib/api'

type TabKey = 'acceso' | 'reservas' | 'vecinos' | 'permisos'
type Seleccion = { vivienda: string; rol: Role }
type Toast = (t: string, tipo?: 'ok' | 'error' | 'info') => void

const ROLES = Object.keys(ROLE_LABEL) as Role[]

export function AdminPage() {
  const { user, toast } = useApp()
  const rol = user.rol

  // Conteos de cada cola (para las pastillas del selector). Se recalcula tras cada acción.
  const conteos = useAsync(async () => {
    const [c, r] = await Promise.all([
      puedeAprobarAltas(rol) ? listAccessRequests() : Promise.resolve([]),
      puedeAprobarReservas(rol) ? reservasPendientesGestion() : Promise.resolve([]),
    ])
    return { acceso: c.length, reservas: r.length }
  }, [])
  const n = conteos.data ?? { acceso: 0, reservas: 0 }
  const refrescar = () => conteos.refetch()

  const tabs = ([
    { key: 'acceso', label: 'Acceso', show: puedeAprobarAltas(rol), count: n.acceso },
    { key: 'reservas', label: 'Reservas', show: puedeAprobarReservas(rol), count: n.reservas },
    { key: 'vecinos', label: 'Vecinos', show: puedeAprobarAltas(rol), count: 0 },
    { key: 'permisos', label: 'Permisos', show: true, count: 0 },
  ] as { key: TabKey; label: string; show: boolean; count: number }[]).filter((t) => t.show)

  const [tab, setTab] = useState<TabKey>(tabs[0]?.key ?? 'permisos')

  return (
    <div>
      {/* Cabecera fija: icono + título + pestañas. Solo el contenido scrollea. */}
      <header className="sticky top-0 z-20 text-white safe-top" style={{ background: '#14262B' }}>
        <div className="px-4 pb-2.5 pt-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/10">
              <Shield size={20} className="text-accent" />
            </span>
            <h1 className="font-display text-[22px] font-extrabold">Panel de gestión</h1>
          </div>

          {/* Selector de secciones (scroll horizontal en móvil) */}
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-pill px-4 py-1.5 text-[13px] font-bold transition-colors',
                  tab === t.key ? 'bg-white text-[#14262B]' : 'bg-white/10 text-white/70 hover:text-white')}>
                {t.label}
                {t.count > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-accent-ink">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {tab === 'acceso' && <AccesoTab canApprove={puedeAprobarAltas(rol)} onToast={toast} onChanged={refrescar} />}
        {tab === 'reservas' && <ReservasTab onToast={toast} onChanged={refrescar} />}
        {tab === 'vecinos' && <VecinosTab canManage={puedeAprobarAltas(rol)} currentUserId={user.id} onToast={toast} />}
        {tab === 'permisos' && <PermisosTab canEdit={esAppAdmin(rol)} onToast={toast} />}
      </div>
    </div>
  )
}

// ---- Acceso (altas de acceso) ------------------------------------------------
function AccesoTab({ canApprove, onToast, onChanged }: { canApprove: boolean; onToast: Toast; onChanged: () => void }) {
  const { data, state, refetch } = useAsync(listAccessRequests, [])
  const [sel, setSel] = useState<Record<string, Seleccion>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (state === 'loading') return <SkeletonList n={3} />
  if (state === 'error') return <ErrorState onRetry={refetch} />
  if (state === 'empty' || !data || data.length === 0) {
    return <EmptyState titulo="Sin solicitudes" texto="No hay altas pendientes de revisar por ahora." />
  }

  async function resolver(id: string, aprobar: boolean, s?: Seleccion) {
    setPendingId(id)
    try {
      await resolverSolicitud(id, aprobar, s?.vivienda, s?.rol)
      onToast(aprobar ? 'Solicitud aprobada' : 'Solicitud rechazada', aprobar ? 'ok' : 'info')
      refetch(); onChanged()
    } catch {
      onToast('No se ha podido completar la acción', 'error')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((req) => {
        const seleccion = sel[req.id] ?? { vivienda: req.vivienda, rol: 'vecino' as Role }
        const setField = (patch: Partial<Seleccion>) => setSel((s) => ({ ...s, [req.id]: { ...seleccion, ...patch } }))
        const busy = pendingId === req.id
        return (
          <Card key={req.id}>
            <div className="flex items-start gap-3">
              <Avatar text={iniciales(req.nombre)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-ink">{req.nombre}</span>
                  <span className="shrink-0 rounded-pill bg-warn-soft px-2 py-0.5 text-[11.5px] font-bold text-warn-ink">Pendiente</span>
                </div>
                <div className="truncate text-[13px] text-muted">{req.email}</div>
                <div className="mt-0.5 text-[12px] text-faint">Solicitó el {fechaCorta(req.created_at)}</div>
              </div>
            </div>
            {req.comentario && (
              <blockquote className="mt-3 border-l-2 border-border-strong pl-3 text-[13px] italic text-muted">“{req.comentario}”</blockquote>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField label="Vivienda" value={seleccion.vivienda} onChange={(e) => setField({ vivienda: e.target.value })} disabled={!canApprove || busy}>
                {PISOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </SelectField>
              <SelectField label="Rol" value={seleccion.rol} onChange={(e) => setField({ rol: e.target.value as Role })} disabled={!canApprove || busy}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </SelectField>
            </div>
            {canApprove ? (
              <div className="mt-3 flex gap-2">
                <Button block variant="primary" disabled={busy} onClick={() => resolver(req.id, true, seleccion)}><Check size={18} /> Aprobar</Button>
                <Button block variant="danger-outline" disabled={busy} onClick={() => resolver(req.id, false, seleccion)}><X size={18} /> Rechazar</Button>
              </div>
            ) : (
              <div className="mt-3"><Alert tipo="warn">No tienes permiso para aprobar altas.</Alert></div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ---- Reservas (aprobación + agenda mensual) ----------------------------------
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function ReservaCard({ g, children }: { g: ReservaGrupo; children?: React.ReactNode }) {
  const aprobada = g.estado === 'aprobada'
  // Celebrada = aprobada y ya terminada → queda archivada (quién usó la zona y cuándo).
  const celebrada = reservaCelebrada(g.estado, g.fin)
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin size={16} className="shrink-0 text-primary" />
          <div className="truncate font-display text-[16px] font-bold text-ink">{g.zonas.map((z) => z.nombre).join(' + ')}</div>
        </div>
        <span className={cx('shrink-0 rounded-pill px-2 py-0.5 text-[11.5px] font-bold',
          celebrada ? 'bg-info-soft text-info-ink' : aprobada ? 'bg-success-soft text-success-ink' : 'bg-warn-soft text-warn-ink')}>
          {celebrada ? 'Celebrada' : aprobada ? 'Aprobada' : 'Pendiente'}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-muted">{g.nombre ? `${g.nombre} · ` : ''}Vivienda {g.vivienda}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Clock size={14} /> {fechaHora(g.inicio)}–{hora(g.fin)}</p>
      {g.num_invitados > 0 && <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Users size={14} /> {g.num_invitados} invitados</p>}
      {children}
    </Card>
  )
}

function ReservasTab({ onToast, onChanged }: { onToast: Toast; onChanged: () => void }) {
  const pend = useAsync(reservasPendientesGestion, [])
  const [busy, setBusy] = useState<string | null>(null)

  // Agenda mensual: `cursor` = primer día del mes mostrado; `sel` = día YYYY-MM-DD elegido.
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [sel, setSel] = useState<string>(() => claveDia(new Date().toISOString()))

  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const desdeISO = new Date(y, m, 1).toISOString()
  const hastaISO = new Date(y, m + 1, 1).toISOString()
  const mes = useAsync(() => reservasGestion(desdeISO, hastaISO), [desdeISO])

  // Reservas del mes agrupadas por día (YYYY-MM-DD).
  const porDia = useMemo(() => {
    const map = new Map<string, ReservaGrupo[]>()
    for (const g of mes.data ?? []) {
      const k = claveDia(g.inicio)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(g)
    }
    return map
  }, [mes.data])

  const diasEnMes = new Date(y, m + 1, 0).getDate()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7 // 0 = lunes
  const celdas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]
  const claveCelda = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const hoyKey = claveDia(new Date().toISOString())
  const mesLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }).format(cursor)

  const cambiarMes = (delta: number) => setCursor(new Date(y, m + delta, 1))
  const delDia = porDia.get(sel) ?? []

  async function resolver(g: ReservaGrupo, aprobar: boolean) {
    setBusy(g.grupo_id)
    try {
      await resolverReserva(g.grupo_id, aprobar)
      onToast(aprobar ? 'Reserva aprobada' : 'Reserva rechazada', aprobar ? 'ok' : 'info')
      pend.refetch(); mes.refetch(); onChanged()
    } catch {
      onToast('No se ha podido completar la acción', 'error')
    } finally {
      setBusy(null)
    }
  }

  const pendientes = pend.data ?? []

  return (
    <div className="flex flex-col gap-5">
      {/* Cola de aprobación */}
      {pendientes.length > 0 && (
        <section>
          <SectionTitle icon={<Clock size={15} />}>Pendientes de aprobar</SectionTitle>
          <div className="flex flex-col gap-3">
            {pendientes.map((g) => (
              <ReservaCard key={g.grupo_id} g={g}>
                <div className="mt-3 flex gap-2">
                  <Button block disabled={busy === g.grupo_id} onClick={() => resolver(g, true)}><Check size={17} /> Aprobar</Button>
                  <Button block variant="danger-outline" disabled={busy === g.grupo_id} onClick={() => resolver(g, false)}><X size={17} /> Rechazar</Button>
                </div>
              </ReservaCard>
            ))}
          </div>
        </section>
      )}

      {/* Agenda mensual */}
      <section>
        <SectionTitle icon={<CalendarDays size={15} />}>Agenda del mes</SectionTitle>

        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Mes anterior" onClick={() => cambiarMes(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2">
              <ChevronLeft size={20} />
            </button>
            <span className="font-display text-[15px] font-bold capitalize text-ink">{mesLabel}</span>
            <button type="button" aria-label="Mes siguiente" onClick={() => cambiarMes(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DIAS_SEMANA.map((d) => <div key={d} className="pb-1 text-[11px] font-bold text-faint">{d}</div>)}
            {celdas.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />
              const k = claveCelda(d)
              const items = porDia.get(k)
              const seleccionado = k === sel
              const esHoy = k === hoyKey
              return (
                <button key={k} type="button" onClick={() => setSel(k)}
                  className={cx('relative flex aspect-square flex-col items-center justify-center rounded-[12px] text-[14px] font-semibold transition-colors',
                    seleccionado ? 'bg-primary text-white'
                      : esHoy ? 'bg-primary-soft text-primary-700'
                      : 'text-ink hover:bg-surface-2')}>
                  {d}
                  {items && (
                    <span className={cx('absolute bottom-1 h-1.5 w-1.5 rounded-full',
                      seleccionado ? 'bg-white' : 'bg-primary')} />
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Reservas del día elegido */}
        <div className="mt-3">
          {mes.state === 'loading' && <SkeletonList n={2} />}
          {mes.state === 'error' && <ErrorState onRetry={mes.refetch} />}
          {mes.state !== 'loading' && mes.state !== 'error' && (
            delDia.length === 0 ? (
              <p className="rounded-[14px] bg-surface-2 px-4 py-6 text-center text-[13px] text-muted">
                Sin reservas el {fechaCorta(sel)}.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] font-semibold text-muted">{fechaCorta(sel)} · {delDia.length} {delDia.length === 1 ? 'reserva' : 'reservas'}</p>
                {delDia.map((g) => <ReservaCard key={g.grupo_id} g={g} />)}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  )
}

// ---- Vecinos (buscar, editar, roles, suspensión y baja) ----------------------
function VecinosTab({ canManage, currentUserId, onToast }: { canManage: boolean; currentUserId: string; onToast: Toast }) {
  const { data, state, refetch } = useAsync(listVecinos, [])
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<{ nombre: string; vivienda: string }>({ nombre: '', vivienda: '' })
  const [q, setQ] = useState('')

  if (state === 'loading') return <SkeletonList n={4} />
  if (state === 'error') return <ErrorState onRetry={refetch} />
  if (state === 'empty' || !data || data.length === 0) {
    return <EmptyState titulo="Sin vecinos" texto="Todavía no hay vecinos dados de alta." />
  }

  const s = q.trim().toLowerCase()
  const filtrados = s
    ? data.filter((v) => v.vivienda.toLowerCase().includes(s) || v.nombre.toLowerCase().includes(s))
    : data

  function abrirEdicion(v: Profile) {
    setEditId(v.id); setForm({ nombre: v.nombre, vivienda: v.vivienda })
  }

  async function guardarEdicion(v: Profile) {
    const nombre = form.nombre.trim()
    if (nombre.length < 1) { onToast('El nombre no puede estar vacío', 'error'); return }
    setPendingId(v.id)
    try {
      await editarVecino(v.id, { nombre, vivienda: form.vivienda })
      onToast('Datos del vecino actualizados', 'ok')
      setEditId(null); refetch()
    } catch {
      onToast('No se han podido guardar los cambios', 'error')
    } finally {
      setPendingId(null)
    }
  }

  async function cambiarRol(vecino: Profile, rol: Role) {
    if (rol === vecino.rol) return
    setPendingId(vecino.id)
    try {
      await cambiarRolVecino(vecino.id, rol)
      onToast(`Rol de ${vecino.nombre} actualizado a ${ROLE_LABEL[rol]}`, 'ok')
      refetch()
    } catch {
      onToast('No se ha podido cambiar el rol', 'error')
    } finally {
      setPendingId(null)
    }
  }

  async function accionEstado(vecino: Profile, accion: 'suspender' | 'reactivar' | 'baja') {
    if (accion === 'baja' && !window.confirm(`¿Dar de baja a ${vecino.nombre}? No podrá acceder y saldrá del directorio. Podrás reactivarlo más adelante.`)) return
    setPendingId(vecino.id)
    try {
      if (accion === 'suspender') await suspenderVecino(vecino.id, true)
      else if (accion === 'reactivar') await suspenderVecino(vecino.id, false)
      else await darDeBajaVecino(vecino.id)
      const msg = accion === 'suspender' ? `${vecino.nombre} suspendido`
        : accion === 'baja' ? `${vecino.nombre} dado de baja` : `${vecino.nombre} reactivado`
      onToast(msg, accion === 'reactivar' ? 'ok' : 'info')
      refetch()
    } catch {
      onToast('No se ha podido completar la acción', 'error')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Buscador por piso (o nombre) */}
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} inputMode="search"
          placeholder="Buscar por piso (ej. Bajo C)"
          className="min-h-[46px] w-full rounded-[14px] border border-border bg-surface pl-10 pr-3 text-[15px] text-ink placeholder:text-faint shadow-neu-inset focus:border-primary focus:outline-none" />
      </div>

      {filtrados.length === 0 && (
        <p className="rounded-[14px] bg-surface-2 px-4 py-6 text-center text-[13px] text-muted">Ningún vecino coincide con «{q}».</p>
      )}

      {filtrados.map((vecino) => {
        const busy = pendingId === vecino.id
        const suspendido = vecino.estado === 'suspendido'
        const baja = vecino.estado === 'baja'
        const esYo = vecino.id === currentUserId
        const editando = editId === vecino.id
        return (
          <Card key={vecino.id} className={cx((suspendido || baja) && 'opacity-60')}>
            <div className="flex items-start gap-3">
              <Avatar text={vecino.iniciales || iniciales(vecino.nombre)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-ink">{vecino.nombre}</span>
                  <RoleBadge kind={roleBadgeKind(vecino.rol)} />
                  {suspendido && <span className="shrink-0 rounded-pill bg-danger-soft px-2 py-0.5 text-[11.5px] font-bold text-danger-ink">Suspendido</span>}
                  {baja && <span className="shrink-0 rounded-pill bg-surface-2 px-2 py-0.5 text-[11.5px] font-bold text-muted">De baja</span>}
                </div>
                <div className="truncate text-[13px] text-muted">{vecino.vivienda}</div>
                <div className="truncate text-[12px] text-faint">{vecino.email}</div>
              </div>
            </div>

            {canManage && editando && (
              <div className="mt-3 flex flex-col gap-3 rounded-[14px] bg-surface-2 p-3">
                <Field label="Nombre o alias" value={form.nombre} maxLength={80}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Nico" />
                <SelectField label="Vivienda" value={form.vivienda} onChange={(e) => setForm((f) => ({ ...f, vivienda: e.target.value }))} disabled={busy}>
                  {PISOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </SelectField>
                <div className="flex gap-2">
                  <Button block disabled={busy} onClick={() => guardarEdicion(vecino)}><Check size={17} /> Guardar</Button>
                  <Button block variant="ghost" disabled={busy} onClick={() => setEditId(null)}>Cancelar</Button>
                </div>
              </div>
            )}

            {canManage && !editando && (
              <div className="mt-3 flex flex-col gap-3">
                <SelectField label="Rol" value={vecino.rol} onChange={(e) => cambiarRol(vecino, e.target.value as Role)} disabled={busy || baja}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </SelectField>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => abrirEdicion(vecino)}><Pencil size={16} /> Editar</Button>
                  {!esYo && !baja && !suspendido && (
                    <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => accionEstado(vecino, 'suspender')}><UserX size={16} /> Suspender</Button>
                  )}
                  {!esYo && suspendido && (
                    <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => accionEstado(vecino, 'reactivar')}><UserCheck size={16} /> Reactivar</Button>
                  )}
                  {!esYo && baja ? (
                    <Button variant="primary" className="flex-1" disabled={busy} onClick={() => accionEstado(vecino, 'reactivar')}><UserCheck size={16} /> Reactivar</Button>
                  ) : !esYo && (
                    <Button variant="danger-outline" disabled={busy} aria-label="Dar de baja" onClick={() => accionEstado(vecino, 'baja')}><Trash2 size={17} /></Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ---- Permisos (editor: qué puede hacer cada rol) -----------------------------
// El app_admin (SUPERADMIN) puede activar/desactivar permisos por rol. app_admin
// siempre los tiene todos y no es editable. El vecino base no tiene gestión.
function PermisosTab({ canEdit, onToast }: { canEdit: boolean; onToast: Toast }) {
  const { data, state, refetch } = useAsync(listRolePermisos, [])
  const [set, setSet] = useState<Set<string> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const efectivo = set ?? new Set((data ?? []).map((x) => `${x.rol}|${x.permiso}`))
  // Roles configurables (app_admin va aparte, siempre todo).
  const rolesEditables = ROLES.filter((r) => r !== 'app_admin')

  if (state === 'loading') return <SkeletonList n={4} />
  if (state === 'error') return <ErrorState onRetry={refetch} />

  async function toggle(rol: Role, permiso: string, on: boolean) {
    const key = `${rol}|${permiso}`
    const next = new Set(efectivo); on ? next.add(key) : next.delete(key)
    setSet(next); setBusy(key)
    try {
      await setRolePermiso(rol, permiso, on)
    } catch {
      onToast('No se pudo cambiar el permiso', 'error')
      const revert = new Set(efectivo); on ? revert.delete(key) : revert.add(key); setSet(revert)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">
        {canEdit
          ? 'Activa o desactiva lo que puede hacer cada rol. Los cambios se aplican de inmediato (también en la seguridad del servidor).'
          : 'Qué puede hacer cada rol. Solo el administrador de la app puede modificarlo.'}
      </p>

      <Card>
        <div className="flex items-center gap-2">
          <RoleBadge kind="admin" />
          <span className="font-display text-[16px] font-bold text-ink">{ROLE_LABEL.app_admin}</span>
          <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-[11px] font-extrabold uppercase text-primary-700">Superadmin</span>
        </div>
        <p className="mt-1 text-[13px] text-muted">Tiene todos los permisos siempre. No se puede limitar.</p>
      </Card>

      {rolesEditables.map((r) => (
        <Card key={r}>
          <div className="flex items-center gap-2">
            <RoleBadge kind={roleBadgeKind(r)} />
            <span className="font-display text-[16px] font-bold text-ink">{ROLE_LABEL[r]}</span>
          </div>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {CATALOGO_PERMISOS.map((c) => {
              const key = `${r}|${c.key}`
              const on = efectivo.has(key)
              return (
                <li key={c.key} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-ink">{c.label}</div>
                    <div className="text-[12px] text-muted">{c.desc}</div>
                  </div>
                  <button type="button" role="switch" aria-checked={on} disabled={!canEdit || busy === key}
                    onClick={() => toggle(r, c.key, !on)}
                    className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors',
                      on ? 'bg-primary' : 'bg-surface-2 border border-border',
                      (!canEdit || busy === key) && 'opacity-60')}>
                    <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      ))}
    </div>
  )
}
