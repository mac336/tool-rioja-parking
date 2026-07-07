import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Check, X, Megaphone, CalendarDays, Settings, ChevronRight } from 'lucide-react'
import { Avatar, Button, Card, SelectField, Alert, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaCorta, iniciales } from '@/lib/format'
import { ROLE_LABEL, puedeAprobarAltas } from '@/lib/roles'
import type { Role } from '@/types'
import { PISOS } from '@/lib/parking'
import { useApp } from '@/store'
import { listAccessRequests, resolverSolicitud } from '@/lib/api'

type TabKey = 'solicitudes' | 'info'
type Seleccion = { vivienda: string; rol: Role }

const ROLES = Object.keys(ROLE_LABEL) as Role[]

export function AdminPage() {
  const { user, toast } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('solicitudes')

  return (
    <div>
      {/* Cabecera oscura — zona de gestión */}
      <header className="px-4 pb-5 pt-6 text-white" style={{ background: '#132520' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/10">
            <Shield size={20} className="text-accent" />
          </span>
          <span className="rounded-pill bg-accent px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-accent-ink">
            Gestión
          </span>
        </div>
        <h1 className="mt-3 font-display text-[26px] font-extrabold">Panel de gestión</h1>
        <p className="mt-1 text-[13px] text-white/70">Altas de vecinos y accesos a la moderación de la comunidad.</p>

        {/* Control segmentado */}
        <div className="mt-4 inline-flex rounded-pill bg-white/10 p-1">
          {([['solicitudes', 'Solicitudes'], ['info', 'Info']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cx(
                'rounded-pill px-4 py-1.5 text-[13px] font-bold transition-colors',
                tab === key ? 'bg-white text-[#132520]' : 'text-white/70 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        {tab === 'solicitudes'
          ? <SolicitudesTab canApprove={puedeAprobarAltas(user.rol)} onToast={toast} />
          : <InfoTab onNavigate={navigate} />}
      </div>
    </div>
  )
}

// ---- Pestaña Solicitudes -----------------------------------------------------
function SolicitudesTab({ canApprove, onToast }: { canApprove: boolean; onToast: (t: string, tipo?: 'ok' | 'error' | 'info') => void }) {
  const { data, state, refetch } = useAsync(listAccessRequests, [])
  const [sel, setSel] = useState<Record<string, Seleccion>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (state === 'loading') return <SkeletonList n={3} />
  if (state === 'error') return <ErrorState onRetry={refetch} />
  if (state === 'empty' || !data || data.length === 0) {
    return <EmptyState titulo="Sin solicitudes" texto="No hay altas pendientes de revisar por ahora." />
  }

  async function resolver(id: string, aprobar: boolean) {
    setPendingId(id)
    try {
      await resolverSolicitud(id, aprobar)
      onToast(aprobar ? 'Solicitud aprobada' : 'Solicitud rechazada', aprobar ? 'ok' : 'info')
      refetch()
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
        const setField = (patch: Partial<Seleccion>) =>
          setSel((s) => ({ ...s, [req.id]: { ...seleccion, ...patch } }))
        const busy = pendingId === req.id

        return (
          <Card key={req.id}>
            <div className="flex items-start gap-3">
              <Avatar text={iniciales(req.nombre)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-ink">{req.nombre}</span>
                  <span className="shrink-0 rounded-pill bg-warn-soft px-2 py-0.5 text-[11.5px] font-bold text-[#8a5a0f]">Pendiente</span>
                </div>
                <div className="truncate text-[13px] text-muted">{req.email}</div>
                <div className="mt-0.5 text-[12px] text-faint">Solicitó el {fechaCorta(req.created_at)}</div>
              </div>
            </div>

            {req.comentario && (
              <blockquote className="mt-3 border-l-2 border-border-strong pl-3 text-[13px] italic text-muted">
                “{req.comentario}”
              </blockquote>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField
                label="Vivienda"
                value={seleccion.vivienda}
                onChange={(e) => setField({ vivienda: e.target.value })}
                disabled={!canApprove || busy}
              >
                {PISOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </SelectField>
              <SelectField
                label="Rol"
                value={seleccion.rol}
                onChange={(e) => setField({ rol: e.target.value as Role })}
                disabled={!canApprove || busy}
              >
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </SelectField>
            </div>

            {canApprove ? (
              <div className="mt-3 flex gap-2">
                <Button block variant="primary" disabled={busy} onClick={() => resolver(req.id, true)}>
                  <Check size={18} /> Aprobar
                </Button>
                <Button block variant="danger-outline" disabled={busy} onClick={() => resolver(req.id, false)}>
                  <X size={18} /> Rechazar
                </Button>
              </div>
            ) : (
              <div className="mt-3">
                <Alert tipo="warn">No tienes permiso para aprobar altas.</Alert>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ---- Pestaña Info ------------------------------------------------------------
function InfoTab({ onNavigate }: { onNavigate: (to: string) => void }) {
  const items: { titulo: string; texto: string; Icon: typeof Megaphone; to?: string }[] = [
    {
      titulo: 'Moderación de anuncios',
      texto: 'Revisa y publica anuncios del tablón desde la sección Anuncios.',
      Icon: Megaphone,
      to: '/anuncios',
    },
    {
      titulo: 'Aprobación de reservas',
      texto: 'La presidencia aprueba o rechaza reservas de zonas comunes desde Reservas.',
      Icon: CalendarDays,
      to: '/reservas',
    },
    {
      titulo: 'Zonas comunes y bloqueos',
      texto: 'Configurables por el administrador de la app. Próximamente en este panel.',
      Icon: Settings,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      {items.map(({ titulo, texto, Icon, to }) => {
        const clickable = Boolean(to)
        return (
          <Card
            key={titulo}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onNavigate(to as string) : undefined}
            className={cx('flex items-center gap-3', clickable && 'cursor-pointer hover:bg-surface-2')}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary-700">
              <Icon size={22} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">{titulo}</div>
              <div className="text-[13px] text-muted">{texto}</div>
            </div>
            {clickable && <ChevronRight size={20} className="shrink-0 text-faint" />}
          </Card>
        )
      })}
    </div>
  )
}
