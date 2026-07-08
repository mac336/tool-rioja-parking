import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Check, X, Clock, Users, MapPin, AlertTriangle, ChevronRight,
  UserX, UserCheck, UserMinus, Pencil,
} from 'lucide-react'
import {
  Avatar, Button, Card, Field, RoleBadge, SelectField, Alert,
  EmptyState, ErrorState, SkeletonList, cx,
} from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaCorta, fechaHora, hora, iniciales } from '@/lib/format'
import {
  ROLE_LABEL, roleBadgeKind, esGestion, esAppAdmin,
  puedeAprobarAltas, puedeAprobarAnuncios, puedeAprobarReservas,
} from '@/lib/roles'
import type { Profile, Role, Incident, Anuncio, ReservaGrupo } from '@/types'
import { PISOS } from '@/lib/parking'
import { useApp } from '@/store'
import {
  listAccessRequests, resolverSolicitud, listVecinos, suspenderVecino, cambiarRolVecino,
  editarVecino, darDeBajaVecino,
  incidenciasPendientesGestion, aprobarIncidencia,
  anunciosPendientesGestion, resolverAnuncio,
  reservasPendientesGestion, resolverReserva,
} from '@/lib/api'

type TabKey = 'cuentas' | 'incidencias' | 'anuncios' | 'reservas' | 'vecinos' | 'permisos'
type Seleccion = { vivienda: string; rol: Role }
type Toast = (t: string, tipo?: 'ok' | 'error' | 'info') => void

const ROLES = Object.keys(ROLE_LABEL) as Role[]

export function AdminPage() {
  const { user, toast } = useApp()
  const rol = user.rol

  // Conteos de cada cola (para las pastillas del selector). Se recalcula tras cada acción.
  const conteos = useAsync(async () => {
    const [c, i, a, r] = await Promise.all([
      puedeAprobarAltas(rol) ? listAccessRequests() : Promise.resolve([]),
      esGestion(rol) ? incidenciasPendientesGestion() : Promise.resolve([]),
      puedeAprobarAnuncios(rol) ? anunciosPendientesGestion() : Promise.resolve([]),
      puedeAprobarReservas(rol) ? reservasPendientesGestion() : Promise.resolve([]),
    ])
    return { cuentas: c.length, incidencias: i.length, anuncios: a.length, reservas: r.length }
  }, [])
  const n = conteos.data ?? { cuentas: 0, incidencias: 0, anuncios: 0, reservas: 0 }
  const refrescar = () => conteos.refetch()

  const tabs = ([
    { key: 'cuentas', label: 'Cuentas', show: puedeAprobarAltas(rol), count: n.cuentas },
    { key: 'incidencias', label: 'Incidencias', show: esGestion(rol), count: n.incidencias },
    { key: 'anuncios', label: 'Anuncios', show: puedeAprobarAnuncios(rol), count: n.anuncios },
    { key: 'reservas', label: 'Reservas', show: puedeAprobarReservas(rol), count: n.reservas },
    { key: 'vecinos', label: 'Vecinos', show: puedeAprobarAltas(rol), count: 0 },
    { key: 'permisos', label: 'Permisos', show: true, count: 0 },
  ] as { key: TabKey; label: string; show: boolean; count: number }[]).filter((t) => t.show)

  const [tab, setTab] = useState<TabKey>(tabs[0]?.key ?? 'permisos')

  return (
    <div>
      <header className="px-4 pb-4 pt-6 text-white" style={{ background: '#14262B' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/10">
            <Shield size={20} className="text-accent" />
          </span>
          <span className="rounded-pill bg-accent px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-accent-ink">
            {esAppAdmin(rol) ? 'Administración' : 'Gestión'}
          </span>
        </div>
        <h1 className="mt-3 font-display text-[26px] font-extrabold">Panel de gestión</h1>
        <p className="mt-1 text-[13px] text-white/70">Aprueba cuentas, incidencias, anuncios y reservas, y gestiona roles.</p>

        {/* Selector de secciones (scroll horizontal en móvil) */}
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-pill px-4 py-1.5 text-[13px] font-bold transition-colors',
                tab === t.key ? 'bg-white text-[#14262B]' : 'bg-white/10 text-white/70 hover:text-white')}>
              {t.label}
              {t.count > 0 && (
                <span className={cx('inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-extrabold',
                  tab === t.key ? 'bg-accent text-accent-ink' : 'bg-accent text-accent-ink')}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        {tab === 'cuentas' && <CuentasTab canApprove={puedeAprobarAltas(rol)} onToast={toast} onChanged={refrescar} />}
        {tab === 'incidencias' && <IncidenciasTab onToast={toast} onChanged={refrescar} />}
        {tab === 'anuncios' && <AnunciosTab onToast={toast} onChanged={refrescar} />}
        {tab === 'reservas' && <ReservasTab onToast={toast} onChanged={refrescar} />}
        {tab === 'vecinos' && <VecinosTab canManage={puedeAprobarAltas(rol)} currentUserId={user.id} onToast={toast} />}
        {tab === 'permisos' && <PermisosTab />}
      </div>
    </div>
  )
}

// ---- Cuentas (altas de acceso) -----------------------------------------------
function CuentasTab({ canApprove, onToast, onChanged }: { canApprove: boolean; onToast: Toast; onChanged: () => void }) {
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

// ---- Incidencias (aprobación previa) -----------------------------------------
function IncidenciasTab({ onToast, onChanged }: { onToast: Toast; onChanged: () => void }) {
  const { data, state, refetch } = useAsync(incidenciasPendientesGestion, [])
  const [busy, setBusy] = useState<string | null>(null)

  if (state === 'loading') return <SkeletonList n={3} />
  if (state === 'error') return <ErrorState onRetry={refetch} />
  if (state === 'empty' || !data || data.length === 0) {
    return <EmptyState titulo="Nada pendiente" texto="No hay incidencias esperando aprobación." />
  }

  async function resolver(inc: Incident, aprobar: boolean) {
    setBusy(inc.id)
    try {
      await aprobarIncidencia(inc.id, aprobar)
      onToast(aprobar ? 'Incidencia publicada' : 'Incidencia rechazada', aprobar ? 'ok' : 'info')
      refetch(); onChanged()
    } catch {
      onToast('No se ha podido completar la acción', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">Los vecinos no ven estas incidencias hasta que las apruebas.</p>
      {data.map((inc: Incident) => {
        const b = busy === inc.id
        return (
          <Card key={inc.id}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-warn-soft text-warn-ink"><AlertTriangle size={18} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[16px] font-bold text-ink">{inc.titulo}</h3>
                <p className="mt-0.5 text-[13px] text-muted">{inc.autor_nombre}</p>
                <p className="mt-1 line-clamp-3 text-[13px] text-muted">{inc.descripcion}</p>
                <Link to={`/incidencias/${inc.id}`} className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-primary">Ver ficha <ChevronRight size={15} /></Link>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button block disabled={b} onClick={() => resolver(inc, true)}><Check size={17} /> Aprobar</Button>
              <Button block variant="danger-outline" disabled={b} onClick={() => resolver(inc, false)}><X size={17} /> Rechazar</Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ---- Anuncios (moderación) ---------------------------------------------------
function AnunciosTab({ onToast, onChanged }: { onToast: Toast; onChanged: () => void }) {
  const { data, state, refetch } = useAsync(anunciosPendientesGestion, [])
  const [busy, setBusy] = useState<string | null>(null)

  if (state === 'loading') return <SkeletonList n={3} />
  if (state === 'error') return <ErrorState onRetry={refetch} />
  if (state === 'empty' || !data || data.length === 0) {
    return <EmptyState titulo="Nada pendiente" texto="No hay anuncios esperando revisión." />
  }

  async function resolver(a: Anuncio, accion: 'publicar' | 'rechazar', nivel?: 'principal' | 'secundario') {
    setBusy(a.id)
    try {
      await resolverAnuncio(a.id, accion, nivel)
      onToast(accion === 'publicar' ? 'Anuncio publicado' : 'Anuncio rechazado', accion === 'publicar' ? 'ok' : 'info')
      refetch(); onChanged()
    } catch {
      onToast('No se ha podido completar la acción', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((a: Anuncio) => {
        const b = busy === a.id
        return (
          <Card key={a.id}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-[16px] font-bold text-ink">{a.titulo}</h3>
              <span className="shrink-0 rounded-pill bg-warn-soft px-2 py-0.5 text-[11.5px] font-bold text-warn-ink">Pendiente</span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted">{a.autor_nombre} · {a.vivienda}</p>
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[13px] text-muted">{a.cuerpo}</p>
            <p className="mt-2 text-[12px] text-faint">Pide: {a.nivel_solicitado === 'principal' ? 'Tablón principal' : 'Listado'} · {fechaCorta(a.fecha_inicio)}–{fechaCorta(a.fecha_fin)}</p>
            <div className="mt-3 flex flex-col gap-2">
              <Button block disabled={b} onClick={() => resolver(a, 'publicar', 'principal')}>Publicar en principal</Button>
              <Button block variant="secondary" disabled={b} onClick={() => resolver(a, 'publicar', 'secundario')}>Publicar en listado</Button>
              <Button block variant="danger-outline" disabled={b} onClick={() => resolver(a, 'rechazar')}><X size={17} /> Rechazar</Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ---- Reservas (aprobación) ---------------------------------------------------
function ReservasTab({ onToast, onChanged }: { onToast: Toast; onChanged: () => void }) {
  const { data, state, refetch } = useAsync(reservasPendientesGestion, [])
  const [busy, setBusy] = useState<string | null>(null)

  if (state === 'loading') return <SkeletonList n={2} />
  if (state === 'error') return <ErrorState onRetry={refetch} />
  if (state === 'empty' || !data || data.length === 0) {
    return <EmptyState titulo="Nada pendiente" texto="No hay reservas esperando aprobación." />
  }

  async function resolver(g: ReservaGrupo, aprobar: boolean) {
    setBusy(g.grupo_id)
    try {
      await resolverReserva(g.grupo_id, aprobar)
      onToast(aprobar ? 'Reserva aprobada' : 'Reserva rechazada', aprobar ? 'ok' : 'info')
      refetch(); onChanged()
    } catch {
      onToast('No se ha podido completar la acción', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((g: ReservaGrupo) => {
        const b = busy === g.grupo_id
        return (
          <Card key={g.grupo_id}>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              <div className="font-display text-[16px] font-bold text-ink">{g.zonas.map((z) => z.nombre).join(' + ')}</div>
            </div>
            <p className="mt-1 text-[13px] text-muted">{g.nombre ? `${g.nombre} · ` : ''}Vivienda {g.vivienda}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Clock size={14} /> {fechaHora(g.inicio)}–{hora(g.fin)}</p>
            {g.num_invitados > 0 && <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Users size={14} /> {g.num_invitados} invitados</p>}
            <div className="mt-3 flex gap-2">
              <Button block disabled={b} onClick={() => resolver(g, true)}><Check size={17} /> Aprobar</Button>
              <Button block variant="danger-outline" disabled={b} onClick={() => resolver(g, false)}><X size={17} /> Rechazar</Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ---- Vecinos (editar, roles, suspensión y baja) ------------------------------
function VecinosTab({ canManage, currentUserId, onToast }: { canManage: boolean; currentUserId: string; onToast: Toast }) {
  const { data, state, refetch } = useAsync(listVecinos, [])
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<{ nombre: string; vivienda: string }>({ nombre: '', vivienda: '' })

  if (state === 'loading') return <SkeletonList n={4} />
  if (state === 'error') return <ErrorState onRetry={refetch} />
  if (state === 'empty' || !data || data.length === 0) {
    return <EmptyState titulo="Sin vecinos" texto="Todavía no hay vecinos dados de alta." />
  }

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
      {data.map((vecino) => {
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
                <div className="flex flex-wrap gap-2">
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
                    <Button variant="danger-outline" className="flex-1" disabled={busy} onClick={() => accionEstado(vecino, 'baja')}><UserMinus size={16} /> Dar de baja</Button>
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

// ---- Permisos (qué puede hacer cada rol) -------------------------------------
const CAPS: { label: string; can: (r: Role) => boolean }[] = [
  { label: 'Ver la comunidad y participar', can: () => true },
  { label: 'Abrir incidencias y comentar', can: () => true },
  { label: 'Solicitar publicar anuncios', can: () => true },
  { label: 'Reservar zonas comunes', can: () => true },
  { label: 'Aprobar y moderar incidencias', can: esGestion },
  { label: 'Aprobar y publicar anuncios', can: puedeAprobarAnuncios },
  { label: 'Aprobar reservas de zonas comunes', can: puedeAprobarReservas },
  { label: 'Aprobar altas de nuevos vecinos', can: puedeAprobarAltas },
  { label: 'Gestionar roles y suspender cuentas', can: puedeAprobarAltas },
  { label: 'Configurar la app (zonas, ajustes)', can: esAppAdmin },
]

function PermisosTab() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted">Qué puede hacer cada rol. Los permisos son fijos por rol; cambiar el rol de un vecino cambia lo que puede hacer.</p>
      {ROLES.map((r) => {
        const caps = CAPS.filter((c) => c.can(r))
        return (
          <Card key={r}>
            <div className="flex items-center gap-2">
              <RoleBadge kind={roleBadgeKind(r)} />
              <span className="font-display text-[16px] font-bold text-ink">{ROLE_LABEL[r]}</span>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {CAPS.map((c) => {
                const ok = c.can(r)
                return (
                  <li key={c.label} className={cx('flex items-center gap-2 text-[13px]', ok ? 'text-ink' : 'text-faint')}>
                    {ok ? <Check size={15} className="shrink-0 text-success" /> : <X size={15} className="shrink-0 text-faint" />}
                    {c.label}
                  </li>
                )
              })}
            </ul>
            {caps.length === 0 && <p className="mt-2 text-[13px] text-faint">Sin permisos de gestión.</p>}
          </Card>
        )
      })}
    </div>
  )
}
