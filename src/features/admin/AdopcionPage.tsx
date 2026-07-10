import { useMemo } from 'react'
import { Check, Minus } from 'lucide-react'
import { Card, SectionTitle, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { listViviendas, listVecinos, statsAcceso } from '@/lib/api'

// Un piso "está dentro" si tiene al menos una cuenta ACTIVA. El cómputo es por
// vivienda (piso), no por vecino: dos cuentas del mismo piso cuentan como 1 piso.
async function cargar() {
  const [viviendas, vecinos, acceso] = await Promise.all([listViviendas(), listVecinos(), statsAcceso()])
  const activosPorPiso = new Map<string, number>()
  for (const v of vecinos) {
    if (v.estado !== 'activo') continue
    activosPorPiso.set(v.vivienda, (activosPorPiso.get(v.vivienda) ?? 0) + 1)
  }
  const filas = viviendas.map((codigo) => ({
    codigo,
    cuentas: activosPorPiso.get(codigo) ?? 0,
    dentro: (activosPorPiso.get(codigo) ?? 0) > 0,
  }))
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
                  <div className="mt-1 text-[12.5px] font-semibold text-primary-700">
                    {acceso.entrados} de {acceso.creados} {acceso.creados === 1 ? 'cuenta ha entrado' : 'cuentas han entrado'} alguna vez
                  </div>
                )}
              </div>
            </Card>

            {/* Tabla por piso: dentro */}
            <section>
              <SectionTitle icon={<Check size={15} />}>Dentro ({dentro.length})</SectionTitle>
              {dentro.length === 0 ? (
                <p className="rounded-[14px] bg-surface-2 px-4 py-4 text-center text-[13px] text-muted">Todavía no se ha inscrito ningún piso.</p>
              ) : (
                <Card className="divide-y divide-border p-0">
                  {dentro.map((f) => <FilaPiso key={f.codigo} codigo={f.codigo} cuentas={f.cuentas} dentro />)}
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
                  {faltan.map((f) => <FilaPiso key={f.codigo} codigo={f.codigo} cuentas={0} dentro={false} />)}
                </Card>
              )}
          </section>
        </>
      )}
    </div>
  )
}

function FilaPiso({ codigo, cuentas, dentro }: { codigo: string; cuentas: number; dentro: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <span className={cx('text-[14px]', dentro ? 'font-semibold text-ink' : 'text-muted')}>{codigo}</span>
      {dentro ? (
        <span className="flex items-center gap-1.5 rounded-pill bg-success-soft px-2.5 py-0.5 text-[11.5px] font-bold text-success-ink">
          <Check size={13} /> Dentro{cuentas > 1 ? ` · ${cuentas}` : ''}
        </span>
      ) : (
        <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-[11.5px] font-bold text-muted">Sin inscribir</span>
      )}
    </div>
  )
}
