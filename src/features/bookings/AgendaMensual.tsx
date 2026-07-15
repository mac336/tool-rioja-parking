import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Clock, Users } from 'lucide-react'
import { Card, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { fechaCorta, fechaHora, hora, claveDia } from '@/lib/format'
import { reservaCelebrada } from '@/lib/reglas'
import { reservasGestion, listZonas } from '@/lib/api'
import type { ReservaGrupo } from '@/types'

// Agenda mensual de reservas: calendario con un PUNTO DE COLOR POR ZONA en cada
// día que tiene alguna reserva (varias zonas reservadas el mismo día = varios
// puntos), y la lista de reservas del día elegido. Componente compartido entre
// el panel de gestión (AdminPage → Reservas) y el propio servicio de Reservas
// (para quien tenga el permiso `ver_agenda_reservas`, p. ej. el conserje).

export const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Paleta fija por posición de zona (orden de `listZonas()`). Con más zonas de
// las que hay colores, se repite el ciclo.
const ZONA_COLORES = ['#5B7FD4', '#2E8E79', '#C97E2F', '#8A6FD1', '#D65D5D', '#2BA6A0', '#B5578E', '#7A8C3F']

export function ReservaCard({ g, dot, children }: { g: ReservaGrupo; dot?: (zonaId: string) => string; children?: React.ReactNode }) {
  const aprobada = g.estado === 'aprobada'
  const celebrada = reservaCelebrada(g.estado, g.fin)
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {dot && (
            <span className="flex shrink-0 -space-x-1">
              {g.zonas.map((z) => <span key={z.id} className="h-2.5 w-2.5 rounded-full ring-2 ring-surface" style={{ background: dot(z.id) }} />)}
            </span>
          )}
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

export function AgendaMensual() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [sel, setSel] = useState<string>(() => claveDia(new Date().toISOString()))

  const zonas = useAsync(listZonas, [])
  const zonaColor = useMemo(() => {
    const map = new Map<string, string>()
    ;(zonas.data ?? []).forEach((z, i) => map.set(z.id, ZONA_COLORES[i % ZONA_COLORES.length]))
    return (zonaId: string) => map.get(zonaId) ?? '#7A8CA3'
  }, [zonas.data])

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

  // Zonas distintas reservadas en un día (para los puntos de color de la celda).
  const zonasDelDia = (grupos: ReservaGrupo[] | undefined): string[] => {
    if (!grupos) return []
    const set = new Set<string>()
    for (const g of grupos) for (const z of g.zonas) set.add(z.id)
    return [...set]
  }

  return (
    <div className="flex flex-col gap-3">
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
            const zonasDia = zonasDelDia(porDia.get(k))
            const seleccionado = k === sel
            const esHoy = k === hoyKey
            return (
              <button key={k} type="button" onClick={() => setSel(k)}
                className={cx('relative flex aspect-square flex-col items-center justify-center rounded-[12px] text-[14px] font-semibold transition-colors',
                  seleccionado ? 'bg-primary text-white'
                    : esHoy ? 'bg-primary-soft text-primary-700'
                    : 'text-ink hover:bg-surface-2')}>
                {d}
                {zonasDia.length > 0 && (
                  <span className="absolute bottom-1 flex items-center gap-[3px]">
                    {zonasDia.slice(0, 3).map((zid) => (
                      <span key={zid} className="h-1.5 w-1.5 rounded-full" style={{ background: seleccionado ? '#fff' : zonaColor(zid) }} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Leyenda de zonas */}
        {(zonas.data ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border pt-2.5">
            {(zonas.data ?? []).map((z) => (
              <span key={z.id} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: zonaColor(z.id) }} /> {z.nombre}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Reservas del día elegido */}
      <div>
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
              {delDia.map((g) => <ReservaCard key={g.grupo_id} g={g} dot={zonaColor} />)}
            </div>
          )
        )}
      </div>
    </div>
  )
}
