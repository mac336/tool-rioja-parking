import { useState } from 'react'
import { TrendingUp, CalendarCheck, XCircle, CalendarRange, Trophy } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { ScreenHeader, Card, SectionTitle, Avatar, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { iniciales } from '@/lib/format'
import { estadisticasReservas } from '@/lib/api'
import { AdopcionView } from './AdopcionPage'

type Seccion = 'adopcion' | 'reservas'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function DashboardPage() {
  const [sec, setSec] = useState<Seccion>('adopcion')
  return (
    <div>
      <ScreenHeader title="Dashboard" />
      <Page className="flex flex-col gap-4">
        {/* Selector de sección */}
        <div className="flex gap-2 rounded-pill bg-surface-2 p-1">
          {([['adopcion', 'Adopción'], ['reservas', 'Reservas']] as [Seccion, string][]).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setSec(key)}
              className={cx('flex-1 rounded-pill py-2 text-[13.5px] font-bold transition-colors',
                sec === key ? 'bg-surface text-ink shadow-neu-sm' : 'text-muted')}>
              {label}
            </button>
          ))}
        </div>

        {sec === 'adopcion' ? <AdopcionView /> : <ReservasStats />}
      </Page>
    </div>
  )
}

// ---- Estadísticas de reservas (panel de gestión) -----------------------------
function Metrica({ icon, valor, label, tono }: { icon: React.ReactNode; valor: number; label: string; tono: string }) {
  return (
    <Card className="flex flex-col gap-1 p-3.5">
      <span className={cx('flex h-9 w-9 items-center justify-center rounded-[12px]', tono)}>{icon}</span>
      <span className="mt-1 font-display text-[26px] font-extrabold leading-none text-ink">{valor}</span>
      <span className="text-[12.5px] text-muted">{label}</span>
    </Card>
  )
}

function ReservasStats() {
  const { data, state, refetch } = useAsync(estadisticasReservas, [])
  const anio = new Date().getFullYear()
  const mes = MESES[new Date().getMonth()]

  if (state === 'loading') return <SkeletonList n={4} />
  if (state === 'error' || !data) return <ErrorState onRetry={refetch} />

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle icon={<CalendarRange size={15} />}>Reservas de {anio}</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Metrica icon={<CalendarCheck size={18} className="text-success-ink" />} tono="bg-success-soft"
          valor={data.aprobadasMes} label={`Aprobadas en ${mes}`} />
        <Metrica icon={<CalendarCheck size={18} className="text-success-ink" />} tono="bg-success-soft"
          valor={data.aprobadasAnio} label="Aprobadas este año" />
        <Metrica icon={<XCircle size={18} className="text-danger" />} tono="bg-danger-soft"
          valor={data.canceladasAnio} label="Canceladas este año" />
        <Metrica icon={<CalendarRange size={18} className="text-primary" />} tono="bg-primary-soft"
          valor={data.totalAnio} label="Reservas este año" />
      </div>

      <section>
        <SectionTitle icon={<Trophy size={15} />}>Quién ha reservado ({anio})</SectionTitle>
        {data.ranking.length === 0 ? (
          <p className="rounded-[14px] bg-surface-2 px-4 py-6 text-center text-[13px] text-muted">Todavía no hay reservas este año.</p>
        ) : (
          <Card className="divide-y divide-border p-0">
            {data.ranking.map((r, i) => (
              <div key={`${r.nombre}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 shrink-0 text-center text-[13px] font-bold text-faint">{i + 1}</span>
                <Avatar text={iniciales(r.nombre)} size={34} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{r.nombre}</span>
                <span className="shrink-0 rounded-pill bg-primary-soft px-2.5 py-0.5 text-[12px] font-bold text-primary-700">
                  {r.veces} {r.veces === 1 ? 'reserva' : 'reservas'}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
