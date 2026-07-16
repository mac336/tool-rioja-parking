import { useMemo } from 'react'
import { Check, Minus, Clock } from 'lucide-react'
import { Card, SectionTitle, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { listViviendas, statsAcceso, statsAccesoPorVivienda, viviendasInquilino } from '@/lib/api'

// Un piso "está dentro" si tiene al menos una cuenta ACTIVA (aprobada). Además
// se marca si esa cuenta ya ha ENTRADO (iniciado sesión) alguna vez. Los pisos
// ocupados por INQUILINOS quedan FUERA de la adopción (no son objetivo).
async function cargar() {
  const [viviendas, porViv, acceso, inquilinos] = await Promise.all([
    listViviendas(), statsAccesoPorVivienda(), statsAcceso(), viviendasInquilino(),
  ])
  const inq = new Set(inquilinos)
  const m = new Map(porViv.map((x) => [x.vivienda, x]))
  const filas = viviendas
    .filter((codigo) => !inq.has(codigo))
    .map((codigo) => {
      const x = m.get(codigo)
      return { codigo, cuentas: x?.cuentas ?? 0, entrados: x?.entrados ?? 0, dentro: (x?.cuentas ?? 0) > 0 }
    })
  return { filas, acceso }
}

function Donut({ dentro, total }: { dentro: number; total: number }) {
  const R = 56
  const C = 2 * Math.PI * R
  const frac = total > 0 ? dentro / total : 0
  const pct = Math.round(frac * 100)
  return (
    <div className="relative h-[150px] w-[150px] shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--primary)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${frac * C} ${C}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[30px] font-extrabold leading-none text-ink">{pct}%</span>
        <span className="mt-0.5 text-[12px] font-semibold text-muted">{dentro}/{total} pisos</span>
      </div>
    </div>
  )
}

/** Contenido de "Adopción de la app" (sin cabecera; va dentro del Dashboard). */
export function AdopcionView() {
  const { data, state, refetch } = useAsync(cargar, [])

  const { dentro, faltan, total, cuentas } = useMemo(() => {
    const filas = data?.filas ?? []
    const dentro = filas.filter((f) => f.dentro)
    const faltan = filas.filter((f) => !f.dentro)
    const cuentas = filas.reduce((n, f) => n + f.cuentas, 0)
    return { dentro, faltan, total: filas.length, cuentas }
  }, [data])
  const acceso = data?.acceso

  return (
    <div className="flex flex-col gap-4">
      {state === 'loading' && <SkeletonList n={4} />}
      {state === 'error' && <ErrorState onRetry={refetch} />}
      {state !== 'loading' && state !== 'error' && data && (
        <>
            {/* Resumen + gráfico */}
            <Card className="flex items-center gap-4">
              <Donut dentro={dentro.length} total={total} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[14px]">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: 'var(--primary)' }} />
                  <span className="font-bold text-ink">{dentro.length}</span>
                  <span className="text-muted">pisos dentro</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[14px]">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
                  <span className="font-bold text-ink">{faltan.length}</span>
                  <span className="text-muted">pisos por inscribir</span>
                </div>
                <div className="mt-3 border-t border-border pt-2 text-[12.5px] text-faint">
                  {total} viviendas en total · {cuentas} {cuentas === 1 ? 'cuenta activa' : 'cuentas activas'}
                </div>
                {acceso && (
                  <>
                    <div className="mt-1 text-[12.5px] font-semibold text-primary-700">
                      {acceso.entrados} de {acceso.creados} {acceso.creados === 1 ? 'cuenta ha entrado' : 'cuentas han entrado'} desde el enlace
                    </div>
                    <div className="mt-0.5 text-[12.5px] font-semibold text-primary-700">
                      {acceso.instalados} {acceso.instalados === 1 ? 'tiene' : 'tienen'} la app instalada en el móvil
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Tabla por piso: dentro (con marca de si han entrado) */}
            <section>
              <SectionTitle icon={<Check size={15} />}>Con cuenta ({dentro.length})</SectionTitle>
              <p className="mb-2 text-[12px] text-faint">
                Tiene cuenta aprobada. <span className="font-semibold text-success-ink">Ha entrado</span> = ya inició sesión;
                <span className="font-semibold text-warn-ink"> Sin entrar</span> = aún no ha logrado acceder.
              </p>
              {dentro.length === 0 ? (
                <p className="rounded-[14px] bg-surface-2 px-4 py-4 text-center text-[13px] text-muted">Todavía no se ha inscrito ningún piso.</p>
              ) : (
                <Card className="divide-y divide-border p-0">
                  {dentro.map((f) => <FilaPiso key={f.codigo} codigo={f.codigo} cuentas={f.cuentas} entrados={f.entrados} dentro />)}
                </Card>
              )}
            </section>

            {/* Tabla por piso: faltan */}
            <section>
              <SectionTitle icon={<Minus size={15} />}>Por inscribir ({faltan.length})</SectionTitle>
              {faltan.length === 0 ? (
                <p className="rounded-[14px] bg-success-soft px-4 py-4 text-center text-[13px] font-semibold text-success-ink">¡Todos los pisos están dentro! 🎉</p>
              ) : (
                <Card className="divide-y divide-border p-0">
                  {faltan.map((f) => <FilaPiso key={f.codigo} codigo={f.codigo} cuentas={0} entrados={0} dentro={false} />)}
                </Card>
              )}
          </section>
        </>
      )}
    </div>
  )
}

function FilaPiso({ codigo, cuentas, entrados, dentro }: { codigo: string; cuentas: number; entrados: number; dentro: boolean }) {
  const suf = cuentas > 1 ? ` · ${entrados}/${cuentas}` : ''
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <span className={cx('text-[14px]', dentro ? 'font-semibold text-ink' : 'text-muted')}>{codigo}</span>
      {!dentro ? (
        <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-[11.5px] font-bold text-muted">Sin inscribir</span>
      ) : entrados > 0 ? (
        <span className="flex items-center gap-1.5 rounded-pill bg-success-soft px-2.5 py-0.5 text-[11.5px] font-bold text-success-ink">
          <Check size={13} /> Ha entrado{suf}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 rounded-pill bg-warn-soft px-2.5 py-0.5 text-[11.5px] font-bold text-warn-ink">
          <Clock size={13} /> Sin entrar
        </span>
      )}
    </div>
  )
}
