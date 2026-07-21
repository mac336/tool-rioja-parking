import { useState } from 'react'
import { Adjuntos } from '@/components/Adjuntos'
import {
  Shield, Check, X, Clock, Users,
  UserX, UserCheck, Pencil, Trash2, Search, UserPlus,
  CalendarDays, Megaphone, TriangleAlert, Inbox, Lightbulb,
} from 'lucide-react'
import {
  Avatar, Button, Card, Field, RoleBadge, SelectField, Alert,
  EmptyState, ErrorState, SkeletonList, SectionTitle, cx,
} from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaCorta, fechaHora, iniciales } from '@/lib/format'
import {
  ROLE_LABEL, roleBadgeKind, esAppAdmin, GRUPOS_PERMISOS,
  puedeAprobarAltas, puedeAdmin, puedeModerarPublicaciones,
} from '@/lib/roles'
import type { Profile, Role, Mensaje } from '@/types'
import { PISOS, VIVIENDAS_ESPECIALES } from '@/lib/parking'
import { useApp } from '@/store'
import { AgendaMensual, ReservaCard } from '@/features/bookings/AgendaMensual'
import {
  listAccessRequests, resolverSolicitud, listVecinos, suspenderVecino, cambiarRolVecino,
  editarVecino, darDeBajaVecino, eliminarVecinoDefinitivo, crearVecinoDirecto,
  reservasPendientesGestion, resolverReserva,
  publicacionesGestion, moderarPublicacion,
  listRolePermisos, setRolePermiso,
  getConfig, setConfig,
} from '@/lib/api'

type TabKey = 'vecinos' | 'publicaciones' | 'reservas' | 'permisos' | 'config'
type Seleccion = { vivienda: string; rol: Role }
type Toast = (t: string, tipo?: 'ok' | 'error' | 'info') => void

const ROLES = Object.keys(ROLE_LABEL) as Role[]

export function AdminPage() {
  const { user, toast } = useApp()
  const rol = user.rol

  // Conteos de cada cola (para las pastillas del selector). Se recalcula tras cada acción.
  const conteos = useAsync(async () => {
    const [c, pub] = await Promise.all([
      puedeAprobarAltas(rol) ? listAccessRequests() : Promise.resolve([]),
      puedeModerarPublicaciones(rol) ? publicacionesGestion() : Promise.resolve({ pendientes: [], reportes: [] }),
    ])
    return { acceso: c.length, publicaciones: pub.pendientes.length }
  }, [])
  const n = conteos.data ?? { acceso: 0, publicaciones: 0 }
  const refrescar = () => conteos.refetch()

  const tabs = ([
    // Vecinos unifica las altas de acceso (arriba) con la gestión de vecinos.
    { key: 'vecinos', label: 'Vecinos', show: puedeAprobarAltas(rol), count: n.acceso },
    { key: 'publicaciones', label: 'Publicaciones', show: puedeModerarPublicaciones(rol), count: n.publicaciones },
    { key: 'reservas', label: 'Reservas', show: puedeAdmin(rol), count: 0 },
    { key: 'permisos', label: 'Permisos', show: true, count: 0 },
    { key: 'config', label: 'Configuración', show: esAppAdmin(rol), count: 0 },
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
        {tab === 'publicaciones' && <PublicacionesTab onToast={toast} onChanged={refrescar} />}
        {tab === 'reservas' && <ReservasTab onToast={toast} />}
        {tab === 'vecinos' && <VecinosTab canManage={puedeAprobarAltas(rol)} currentUserId={user.id} onToast={toast} onChanged={refrescar} />}
        {tab === 'permisos' && <PermisosTab canEdit={esAppAdmin(rol)} onToast={toast} />}
        {tab === 'config' && <ConfiguracionTab onToast={toast} />}
      </div>
    </div>
  )
}

// ---- Solicitudes de acceso pendientes (arriba del todo en Vecinos) ------------
function SolicitudesPendientes({ canApprove, onToast, onChanged }: { canApprove: boolean; onToast: Toast; onChanged: () => void }) {
  const { data, state, refetch } = useAsync(listAccessRequests, [])
  const [sel, setSel] = useState<Record<string, Seleccion>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)

  // Sin solicitudes (o cargando): no ocupa sitio — la lista de vecinos manda.
  if (state !== 'ready' || !data || data.length === 0) return null

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
    <section className="mb-5">
      <SectionTitle icon={<Clock size={15} />}>Solicitudes de acceso ({data.length})</SectionTitle>
      <div className="flex flex-col gap-3">
      {data.map((req) => {
        const seleccion = sel[req.id] ?? { vivienda: req.vivienda, rol: (req.es_inquilino ? 'inquilino' : 'vecino') as Role }
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
                  {req.es_inquilino && (
                    <span className="shrink-0 rounded-pill bg-surface-2 px-2 py-0.5 text-[11.5px] font-bold text-muted">Solicita: Inquilino</span>
                  )}
                </div>
                <div className="truncate text-[13px] text-muted">{req.email}</div>
                <div className="mt-0.5 text-[12px] text-faint">Solicitó el {fechaCorta(req.created_at)} · {req.vivienda}</div>
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
    </section>
  )
}

// ---- Reservas (cola de aprobación si está activa + agenda mensual) ----------
function ReservasTab({ onToast }: { onToast: Toast }) {
  const pend = useAsync(reservasPendientesGestion, [])
  const [busy, setBusy] = useState<string | null>(null)
  const [agendaKey, setAgendaKey] = useState(0)
  const pendientes = pend.data ?? []

  async function resolver(g: { grupo_id: string }, aprobar: boolean) {
    setBusy(g.grupo_id)
    try {
      await resolverReserva(g.grupo_id, aprobar)
      onToast(aprobar ? 'Reserva aprobada' : 'Reserva rechazada', aprobar ? 'ok' : 'info')
      pend.refetch(); setAgendaKey((k) => k + 1)
    } catch {
      onToast('No se ha podido completar la acción', 'error')
    } finally { setBusy(null) }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cola de aprobación: solo si hay pendientes (aprobación activa). */}
      {pendientes.length > 0 && (
        <section>
          <SectionTitle icon={<Clock size={15} />}>Pendientes de aprobar ({pendientes.length})</SectionTitle>
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
      <section>
        <SectionTitle icon={<CalendarDays size={15} />}>Agenda del mes</SectionTitle>
        <AgendaMensual key={agendaKey} />
      </section>
    </div>
  )
}

// ---- Vecinos (solicitudes + alta directa + buscar/editar/roles/baja) ----------
function VecinosTab({ canManage, currentUserId, onToast, onChanged }: { canManage: boolean; currentUserId: string; onToast: Toast; onChanged: () => void }) {
  const { data, state, refetch } = useAsync(listVecinos, [])
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<{ nombre: string; vivienda: string }>({ nombre: '', vivienda: '' })
  const [q, setQ] = useState('')
  // Alta directa: el admin crea la cuenta sin proceso de registro (p. ej. un TESTER).
  const [alta, setAlta] = useState<null | { nombre: string; email: string; vivienda: string; rol: Role }>(null)
  const [altaBusy, setAltaBusy] = useState(false)

  const crearDirecto = async () => {
    if (!alta || !alta.nombre.trim() || !/.+@.+\..+/.test(alta.email.trim())) {
      onToast('Nombre y correo válidos son obligatorios', 'error'); return
    }
    setAltaBusy(true)
    try {
      await crearVecinoDirecto({ ...alta, nombre: alta.nombre.trim(), email: alta.email.trim().toLowerCase() })
      onToast(`${alta.nombre.trim()} dado de alta · invitación enviada a su correo`, 'ok')
      setAlta(null); refetch()
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'No se pudo crear el usuario', 'error')
    } finally { setAltaBusy(false) }
  }

  if (state === 'loading') return <SkeletonList n={4} />
  if (state === 'error') return <ErrorState onRetry={refetch} />
  if (state === 'empty' || !data || data.length === 0) {
    return <EmptyState titulo="Sin vecinos" texto="Todavía no hay vecinos dados de alta." />
  }

  const s = q.trim().toLowerCase()
  const coincide = (v: Profile) =>
    [v.vivienda, v.nombre, v.email].some((campo) => (campo ?? '').toLowerCase().includes(s))
  const filtrados = s ? data.filter(coincide) : data

  function abrirEdicion(v: Profile) {
    setEditId(v.id); setForm({ nombre: v.nombre ?? '', vivienda: v.vivienda ?? '' })
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

  async function eliminarDefinitivo(vecino: Profile) {
    if (!window.confirm(`Esto BORRARÁ PERMANENTEMENTE la cuenta de ${vecino.nombre} (${vecino.email}). No se puede deshacer. ¿Seguro?`)) return
    setPendingId(vecino.id)
    try {
      await eliminarVecinoDefinitivo(vecino.id)
      onToast(`${vecino.nombre} eliminado definitivamente`, 'ok')
      refetch()
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'No se ha podido eliminar la cuenta', 'error')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Altas de acceso pendientes: SIEMPRE arriba del todo, para aprobar primero */}
      {canManage && <SolicitudesPendientes canApprove={canManage} onToast={onToast} onChanged={() => { refetch(); onChanged() }} />}

      {/* Alta directa (sin registro) — útil para cuentas de prueba (rol Tester) */}
      {canManage && !alta && (
        <Button variant="secondary" block onClick={() => setAlta({ nombre: '', email: '', vivienda: PISOS[0], rol: 'vecino' })}>
          <UserPlus size={17} /> Añadir vecino
        </Button>
      )}
      {canManage && alta && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionTitle icon={<UserPlus size={15} />} className="mb-0">Añadir vecino (alta directa)</SectionTitle>
            <button onClick={() => setAlta(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={18} /></button>
          </div>
          <p className="text-[12.5px] text-muted">Crea la cuenta sin proceso de registro y le envía una <b>invitación por correo</b> con un enlace que abre la app. Para cuentas de prueba usa el rol <b>Tester</b> (solo lectura + chat).</p>
          <Field label="Nombre o alias" value={alta.nombre} maxLength={80} placeholder="Ej. Nico"
            onChange={(e) => setAlta({ ...alta, nombre: e.target.value })} />
          <Field label="Correo" type="email" value={alta.email} placeholder="correo@ejemplo.com"
            onChange={(e) => setAlta({ ...alta, email: e.target.value })} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField label="Vivienda" value={alta.vivienda} onChange={(e) => setAlta({ ...alta, vivienda: e.target.value })}>
              <optgroup label="Viviendas">
                {PISOS.map((pi) => <option key={pi} value={pi}>{pi}</option>)}
              </optgroup>
              <optgroup label="Especiales (no cuentan como vivienda)">
                <option value="">Sin vivienda (p. ej. tester)</option>
                {VIVIENDAS_ESPECIALES.map((v) => <option key={v} value={v}>{v}</option>)}
              </optgroup>
            </SelectField>
            <SelectField label="Rol" value={alta.rol} onChange={(e) => setAlta({ ...alta, rol: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </SelectField>
          </div>
          <Button block disabled={altaBusy} onClick={crearDirecto}><Check size={17} /> {altaBusy ? 'Creando…' : 'Crear cuenta'}</Button>
        </Card>
      )}

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
                <div className="truncate text-[13px] text-muted">{vecino.vivienda || 'Sin vivienda'}</div>
                <div className="truncate text-[12px] text-faint">{vecino.email}</div>
              </div>
            </div>

            {canManage && editando && (
              <div className="mt-3 flex flex-col gap-3 rounded-[14px] bg-surface-2 p-3">
                <Field label="Nombre o alias" value={form.nombre} maxLength={80}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Nico" />
                <SelectField label="Vivienda" value={form.vivienda} onChange={(e) => setForm((f) => ({ ...f, vivienda: e.target.value }))} disabled={busy}>
                  <optgroup label="Viviendas">
                    {PISOS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="Especiales (no cuentan como vivienda)">
                    <option value="">Sin vivienda (p. ej. tester)</option>
                    {VIVIENDAS_ESPECIALES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </optgroup>
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
                {/* Borrado definitivo: solo para cuentas ya inactivas (baja/suspendido). Irreversible. */}
                {!esYo && (baja || suspendido) && (
                  <Button variant="danger" block disabled={busy} onClick={() => eliminarDefinitivo(vecino)}>
                    <Trash2 size={16} /> Eliminar definitivamente
                  </Button>
                )}
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
          <div className="mt-2 flex flex-col gap-3">
            {GRUPOS_PERMISOS.map((g) => (
              <div key={g.grupo}>
                <div className="section-title mb-0.5">{g.grupo}</div>
                <ul className="flex flex-col divide-y divide-border">
                  {g.permisos.map((c) => {
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
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ---- Publicaciones (moderación de incidencias/anuncios de vecinos) ------------
const PUB_ICON = (t: string) => t === 'incidencia'
  ? <TriangleAlert size={16} className="shrink-0 text-danger" />
  : t === 'sugerencia' ? <Lightbulb size={16} className="shrink-0" style={{ color: '#6D4AA3' }} />
  : <Megaphone size={16} className="shrink-0 text-primary" />

function PublicacionCard({ m, children }: { m: Mensaje; children?: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        {PUB_ICON(m.tipo)}
        <span className="text-[11px] font-bold uppercase tracking-wide text-faint">{m.tipo}</span>
        <span className="ml-auto text-[12px] text-faint">{fechaHora(m.created_at)}</span>
      </div>
      <h3 className="mt-1 font-display text-[16px] font-bold text-ink">{m.titulo}</h3>
      <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-muted">{m.cuerpo}</p>
      <Adjuntos urls={m.adjuntos} />
      <div className="mt-1.5 text-[12px] text-faint">
        Por {m.autor_nombre ?? 'Vecino'}{m.autor_vivienda ? ` · ${m.autor_vivienda}` : ''}
        {m.tipo === 'anuncio' && m.expira_at ? ` · hasta ${fechaCorta(m.expira_at)}` : ''}
      </div>
      {children}
    </Card>
  )
}

function PublicacionesTab({ onToast, onChanged }: { onToast: Toast; onChanged: () => void }) {
  const { data, state, refetch } = useAsync(publicacionesGestion, [])
  const [busy, setBusy] = useState<string | null>(null)

  if (state === 'loading') return <SkeletonList n={3} />
  if (state === 'error' || !data) return <ErrorState onRetry={refetch} />

  async function moderar(id: string, aprobar: boolean) {
    setBusy(id)
    try {
      await moderarPublicacion(id, aprobar)
      onToast(aprobar ? 'Publicado y notificado a los vecinos' : 'Rechazado (no se publica)', aprobar ? 'ok' : 'info')
      refetch(); onChanged()
    } catch {
      onToast('No se ha podido completar la acción', 'error')
    } finally { setBusy(null) }
  }

  const { pendientes, reportes } = data
  if (pendientes.length === 0 && reportes.length === 0) {
    return <EmptyState titulo="Nada pendiente" texto="No hay incidencias ni anuncios de vecinos por revisar." />
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <SectionTitle icon={<Inbox size={15} />}>Por aprobar ({pendientes.length})</SectionTitle>
        {pendientes.length === 0 ? (
          <p className="rounded-[14px] bg-surface-2 px-4 py-4 text-center text-[13px] text-muted">Nada pendiente de aprobar.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pendientes.map((m) => (
              <PublicacionCard key={m.id} m={m}>
                <div className="mt-3 flex gap-2">
                  <Button block disabled={busy === m.id} onClick={() => moderar(m.id, true)}><Check size={17} /> Aprobar y publicar</Button>
                  <Button block variant="danger-outline" disabled={busy === m.id} onClick={() => moderar(m.id, false)}><X size={17} /> Rechazar</Button>
                </div>
              </PublicacionCard>
            ))}
          </div>
        )}
      </section>

      {reportes.length > 0 && (
        <section>
          <SectionTitle icon={<Shield size={15} />}>Reportes privados a administración ({reportes.length})</SectionTitle>
          <div className="flex flex-col gap-3">
            {reportes.map((m) => <PublicacionCard key={m.id} m={m} />)}
          </div>
        </section>
      )}
    </div>
  )
}

// ---- Configuración general (feature flags; solo app_admin) -------------------
function ConfiguracionTab({ onToast }: { onToast: Toast }) {
  const refreshConfig = useApp((s) => s.refreshConfig)
  const { data, state, refetch } = useAsync(getConfig, [])
  const [cfg, setCfg] = useState<{ acceso_directo: boolean; reservas_requieren_aprobacion: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const efectivo = cfg ?? data

  if (state === 'loading') return <SkeletonList n={2} />
  if (state === 'error' || !efectivo) return <ErrorState onRetry={refetch} />

  async function cambiar(clave: 'acceso_directo' | 'reservas_requieren_aprobacion', valor: boolean) {
    const next = { ...efectivo!, [clave]: valor }
    setCfg(next); setBusy(clave)
    try {
      await setConfig(clave, valor)
      await refreshConfig() // el login y las reservas leen el flag del store
      onToast('Configuración actualizada', 'ok')
    } catch {
      onToast('No se pudo guardar', 'error'); setCfg({ ...efectivo!, [clave]: !valor })
    } finally { setBusy(null) }
  }

  const Toggle = ({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) => (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={onClick}
      className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-primary' : 'border border-border bg-surface-2', disabled && 'opacity-60')}>
      <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )

  // "Pedir código al entrar" = inverso de acceso_directo.
  const pedirCodigo = !efectivo.acceso_directo
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">Ajustes generales de la app. Los cambios se aplican <b>en vivo</b>, sin desplegar.</p>

      <Card className="flex flex-col divide-y divide-border">
        <div className="flex items-center justify-between gap-3 py-2 first:pt-0">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink">Pedir código al entrar</div>
            <div className="text-[12px] text-muted">Si está activo, los vecinos deben introducir un código que reciben por correo (OTP). Si no, entran solo con su correo. Actívalo cuando todos tengan la app instalada.</div>
          </div>
          <Toggle on={pedirCodigo} disabled={busy === 'acceso_directo'} onClick={() => cambiar('acceso_directo', pedirCodigo /* pasa a acceso_directo=true (sin código) al desactivar */)} />
        </div>
        <div className="flex items-center justify-between gap-3 py-2 last:pb-0">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink">Aprobación de reservas</div>
            <div className="text-[12px] text-muted">Si está activo, cada reserva queda pendiente hasta que la gestión la apruebe (aparece una cola en “Reservas”). Si no, la reserva se confirma al instante.</div>
          </div>
          <Toggle on={efectivo.reservas_requieren_aprobacion} disabled={busy === 'reservas_requieren_aprobacion'}
            onClick={() => cambiar('reservas_requieren_aprobacion', !efectivo.reservas_requieren_aprobacion)} />
        </div>
      </Card>
    </div>
  )
}
