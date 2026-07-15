import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Wallet, PiggyBank, Landmark, ClipboardList, CheckCircle2, XCircle, CircleDashed, Info, Droplets } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, SectionTitle, EmptyState, SkeletonList, ErrorState, Alert, ProgressBar } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { getComunidadDatos } from '@/lib/api'
import type { Acuerdo, ComunidadDatos, Derrama } from '@/lib/db/comunidad'

// Formateadores (Europe/Madrid, es-ES).
const eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pctFmt = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const mesAnno = (ym: string) => {
  const [y, m] = ym.split('-')
  const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return m ? `${M[Number(m) - 1]}-${y.slice(2)}` : ym
}

// Paleta para las barras de "¿en qué se gasta?".
const PALETA = ['#5B7FD4', '#2E8E79', '#8A6FD1', '#D98A3D', '#C879A9', '#E0A22E', '#4C9BD6', '#6BA84F', '#B5695E', '#7A8CA3', '#9C8BD1']

export function MiComunidadPage() {
  const datos = useAsync(getComunidadDatos, [])

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Mi Comunidad" />
      <Page>
        <p className="mb-3 text-[14px] text-muted">
          Las cuentas de la comunidad, claras: en qué se gasta el dinero, si sube o baja, las derramas y las decisiones de las juntas.
        </p>

        <div className="mb-4">
          <Alert tipo="info">
            Este panel es <b>solo informativo</b> y podría contener algún error de cálculo. Ante cualquier duda sobre las cifras, consulta las <b>actas en PDF</b> que envía la administración y revísalas allí.
          </Alert>
        </div>

        {datos.state === 'loading' && <SkeletonList n={5} />}
        {datos.state === 'error' && <ErrorState onRetry={datos.refetch} />}
        {datos.state !== 'loading' && datos.state !== 'error' && !datos.data?.comparativa && !datos.data?.finanzas && (
          <EmptyState titulo="Sin datos" texto="Los datos económicos se cargan desde el servidor (protegidos por permiso). En modo demo no hay datos." />
        )}

        {datos.state !== 'loading' && datos.data && (datos.data.comparativa || datos.data.finanzas) && (
          <div className="flex flex-col gap-6">
            <Cabecera d={datos.data} />
            <EnQueSeGasta d={datos.data} />
            <SubeOBaja d={datos.data} />
            <Derramas d={datos.data} />
            <CuentasClaras d={datos.data} />
            <Decisiones d={datos.data} />
            <DatosSueltos d={datos.data} />
            <DerramasFinalizadas d={datos.data} />
          </div>
        )}
      </Page>
    </div>
  )
}

type D = ComunidadDatos

// 🅐 Cabecera — el presupuesto de este año + variación.
function Cabecera({ d }: { d: D }) {
  const p = d.finanzas?.presupuestos.vigente_2026
  const r = d.comparativa?.resumen
  if (!p) return null
  const sube = (p.pct_aumento ?? 0) >= 0
  return (
    <div className="rounded-[20px] p-5 text-white" style={{ background: 'var(--grad-hero)' }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">Presupuesto de este año</div>
      <div className="mt-1 font-display text-[34px] font-extrabold leading-none">{eur0.format(p.total)}</div>
      <div className="mt-2.5 flex items-center gap-2 text-[13.5px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 font-bold">
          {sube ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {pctFmt(p.pct_aumento)} vs. año pasado
        </span>
        {r && <span className="text-white/80">{sube ? '+' : ''}{eur0.format(p.diferencia_vs_anterior)}</span>}
      </div>
    </div>
  )
}

// 🅑 ¿En qué se gasta? — ranking por destino con barras.
function EnQueSeGasta({ d }: { d: D }) {
  const partidas = d.comparativa?.donde_se_va_el_dinero_2026?.partidas
  if (!partidas?.length) return null
  const max = Math.max(...partidas.map((p) => p.pct))
  return (
    <section>
      <SectionTitle icon={<Wallet size={16} />}>¿En qué se gasta?</SectionTitle>
      <Card className="flex flex-col gap-3">
        {partidas.map((p, i) => (
          <div key={p.destino}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[13.5px] font-semibold text-ink">{p.destino.split(' (')[0]}</span>
              <span className="shrink-0 text-[12.5px] text-muted"><b className="text-ink">{p.pct.toLocaleString('es-ES')}%</b> · {eur0.format(p.importe)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${(p.pct / max) * 100}%`, background: PALETA[i % PALETA.length] }} />
            </div>
          </div>
        ))}
      </Card>
    </section>
  )
}

// 🅒 ¿Sube o baja? — variación por capítulo, con "i" que despliega el motivo.
function SubeOBaja({ d }: { d: D }) {
  const caps = d.comparativa?.por_capitulo
  const [abierto, setAbierto] = useState<string | null>(null)
  if (!caps?.length) return null
  const orden = [...caps].sort((a, b) => b.pct - a.pct)
  return (
    <section>
      <SectionTitle icon={<TrendingUp size={16} />}>¿Sube o baja cada cosa?</SectionTitle>
      <Card className="flex flex-col divide-y divide-border">
        {orden.map((c) => {
          const sube = c.tendencia === 'sube'
          const baja = c.tendencia === 'baja'
          const color = sube ? '#C2663B' : baja ? '#2E8E79' : '#7A8CA3'
          const open = abierto === c.capitulo
          return (
            <div key={c.capitulo} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{c.capitulo.replace(/^[IVX]+\.\s*/, '')}</div>
                  <div className="text-[12px] text-muted">{eur0.format(c.p2025)} → {eur0.format(c.p2026)}</div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold" style={{ color }}>
                  {sube ? <TrendingUp size={14} /> : baja ? <TrendingDown size={14} /> : <Minus size={14} />}
                  {pctFmt(c.pct)}
                </span>
                {c.motivo && (
                  <button type="button" onClick={() => setAbierto(open ? null : c.capitulo)}
                    aria-expanded={open} aria-label={`Por qué ${open ? '(ocultar)' : ''}`}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${open ? 'border-primary bg-primary-soft text-primary-700' : 'border-border text-muted'}`}>
                    <Info size={15} strokeWidth={2} />
                  </button>
                )}
              </div>
              {open && c.motivo && (
                <p className="mt-2 rounded-[12px] bg-surface-2 px-3 py-2.5 text-[12.5px] leading-snug text-muted">{c.motivo}</p>
              )}
            </div>
          )
        })}
      </Card>
      <p className="mt-2 px-1 text-[12px] text-faint">Pulsa la <span className="inline-flex h-4 w-4 translate-y-0.5 items-center justify-center rounded-full border border-border"><Info size={11} /></span> de cada fila para ver por qué cambió.</p>
    </section>
  )
}

// --- Derramas: cálculo de vigencia y progreso (según la fecha de hoy) ---------
const ymToNum = (ym: string) => { const [y, m] = ym.split('-').map(Number); return y * 12 + (m - 1) }
const numToYm = (n: number) => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`
const finDerramaYM = (x: Derrama) => (x.fin ? ymToNum(x.fin) : ymToNum(x.inicio) + x.mensualidades - 1)
function mesActualYM(): number {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const y = Number(p.find((x) => x.type === 'year')?.value)
  const m = Number(p.find((x) => x.type === 'month')?.value)
  return y * 12 + (m - 1)
}
function clasificarDerramas(ds: Derrama[]) {
  const hoy = mesActualYM()
  const activas: Derrama[] = [], finalizadas: Derrama[] = []
  for (const x of ds) {
    const fin = finDerramaYM(x)
    if (hoy <= fin) activas.push(x)          // en curso (o por empezar)
    else if (hoy - fin <= 12) finalizadas.push(x) // terminó hace ≤ 1 año
    // terminó hace más de 1 año → no se muestra
  }
  return { activas, finalizadas }
}
function progresoDerrama(x: Derrama) {
  const hoy = mesActualYM()
  const transcurridos = Math.max(0, Math.min(x.mensualidades, hoy - ymToNum(x.inicio) + 1))
  const restantes = Math.max(0, x.mensualidades - transcurridos)
  const queda = Math.round(restantes * x.cuota_mensual_total * 100) / 100
  const pagado = Math.round((x.importe_total - queda) * 100) / 100
  return { transcurridos, restantes, queda, pagado }
}
const periodoDerrama = (x: Derrama) => `${mesAnno(x.inicio)} a ${mesAnno(x.fin ?? numToYm(finDerramaYM(x)))}`

// 🅓 Derramas ACTIVAS — con progreso (pagado / pendiente).
function Derramas({ d }: { d: D }) {
  const ds = d.finanzas?.derramas
  if (!ds?.length) return null
  const { activas } = clasificarDerramas(ds)
  return (
    <section>
      <SectionTitle icon={<Landmark size={16} />}>Derramas activas</SectionTitle>
      {activas.length === 0 ? (
        <Card><p className="text-[13px] text-muted">No hay derramas activas ahora mismo.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {activas.map((x) => {
            const p = progresoDerrama(x)
            return (
              <Card key={x.concepto}>
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-ink">{x.concepto}</div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-[18px] font-extrabold text-ink">{eur0.format(x.importe_total)}</div>
                    <div className="text-[11.5px] text-muted">{eur2.format(x.cuota_mensual_total)}/mes</div>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted">
                  <span>{periodoDerrama(x)}</span>
                  {x.empresa && <span>· {x.empresa}</span>}
                </div>
                <div className="mt-2.5">
                  <ProgressBar value={p.transcurridos} max={x.mensualidades} />
                  <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12px]">
                    <span className="text-muted">Cuota {p.transcurridos} de {x.mensualidades}</span>
                    <span className="text-ink">Pagado <b>{eur0.format(p.pagado)}</b> · queda <b>{eur0.format(p.queda)}</b></span>
                  </div>
                </div>
                {x.motivo && <p className="mt-2.5 text-[12.5px] leading-snug text-muted">{x.motivo}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}

// Derramas finalizadas hace ≤ 1 año — al final de todo, en formato compacto.
function DerramasFinalizadas({ d }: { d: D }) {
  const ds = d.finanzas?.derramas
  if (!ds?.length) return null
  const { finalizadas } = clasificarDerramas(ds)
  if (finalizadas.length === 0) return null
  return (
    <section>
      <SectionTitle icon={<Landmark size={16} />}>Derramas finalizadas recientemente</SectionTitle>
      <div className="flex flex-col gap-2">
        {finalizadas.map((x) => (
          <Card key={x.concepto} className="!py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-muted">{x.concepto}</div>
                <div className="text-[11.5px] text-faint">{periodoDerrama(x)} · pagada íntegra</div>
              </div>
              <div className="shrink-0 text-[13px] font-bold text-muted">{eur0.format(x.importe_total)}</div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

// 🅔 Las cuentas, claras — último ejercicio cerrado.
function CuentasClaras({ d }: { d: D }) {
  const ej = d.finanzas?.ejercicios_cerrados?.slice(-1)[0]
  const r = d.comparativa?.resumen
  if (!ej) return null
  const banco = ej.caja?.caixabank
  const cobro = ej.pendiente_cobro ? Object.values(ej.pendiente_cobro).reduce((a, b) => a + b, 0) : undefined
  const items: { label: string; valor: string; sub?: string }[] = [
    { label: 'Saldo de cierre', valor: eur0.format(ej.saldo_final), sub: r ? `${r.variacion_saldo >= 0 ? '+' : ''}${eur0.format(r.variacion_saldo)} vs. año anterior` : undefined },
  ]
  if (banco != null) items.push({ label: 'En el banco', valor: eur0.format(banco) })
  if (cobro != null) items.push({ label: 'Pendiente de cobro', valor: eur0.format(cobro) })
  if (ej.impagados) items.push({ label: 'Impagados', valor: eur0.format(ej.impagados.total), sub: ej.impagados.num_viviendas ? `${ej.impagados.num_viviendas} viviendas` : undefined })
  return (
    <section>
      <SectionTitle icon={<PiggyBank size={16} />}>Las cuentas, claras <span className="font-normal text-muted">· ejercicio {ej.ejercicio}</span></SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <Card key={it.label} className="!p-3.5">
            <div className="text-[12px] text-muted">{it.label}</div>
            <div className="mt-0.5 font-display text-[19px] font-extrabold text-ink">{it.valor}</div>
            {it.sub && <div className="mt-0.5 text-[11.5px] text-faint">{it.sub}</div>}
          </Card>
        ))}
      </div>
    </section>
  )
}

const RES_META: Record<Acuerdo['resultado'], { Icon: typeof CheckCircle2; color: string; label: string }> = {
  aprobado: { Icon: CheckCircle2, color: '#2E8E79', label: 'Aprobado' },
  rechazado: { Icon: XCircle, color: '#C2663B', label: 'Rechazado' },
  condicionado: { Icon: CircleDashed, color: '#E0A22E', label: 'Condicionado' },
  pendiente: { Icon: CircleDashed, color: '#7A8CA3', label: 'Pendiente' },
  informativo: { Icon: Info, color: '#5B7FD4', label: 'Informativo' },
}

// 🅕 Decisiones de la junta — última junta, aprobado/rechazado con votación.
function Decisiones({ d }: { d: D }) {
  const juntas = d.acuerdos?.juntas
  if (!juntas?.length) return null
  const junta = [...juntas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  const jr = junta.junta_rectora_resultante
  const anno = junta.fecha.slice(0, 4)
  // No mostramos "informativo" (son notas, no decisiones votadas).
  const acuerdos = junta.acuerdos.filter((a) => a.resultado !== 'informativo')
  return (
    <section>
      <SectionTitle icon={<ClipboardList size={16} />}>Decisiones de la junta <span className="font-normal text-muted">· {anno}</span></SectionTitle>
      <Card className="flex flex-col divide-y divide-border">
        {acuerdos.map((a, i) => {
          const m = RES_META[a.resultado]
          return (
            <div key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <m.Icon size={17} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color: m.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] leading-snug text-ink">{a.titulo}</div>
                {(a.votacion || a.importe != null) && (
                  <div className="mt-0.5 text-[12px] text-muted">
                    {a.importe != null && <span className="font-semibold">{eur0.format(a.importe)}</span>}
                    {a.importe != null && a.votacion && ' · '}
                    {a.votacion}
                  </div>
                )}
              </div>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: m.color, background: `${m.color}1a` }}>{m.label}</span>
            </div>
          )
        })}
      </Card>
      {jr && (jr.presidente || jr.secretario_administrador) && (
        <p className="mt-2 px-1 text-[12px] text-faint">
          Junta rectora: Presidente, Vicepresidente y Administrador (Ortega &amp; Delgado). Asistencia: {junta.asistencia_coeficiente}% del coeficiente.
        </p>
      )}
    </section>
  )
}

// 🅖 Datos sueltos — precio del agua caliente.
function DatosSueltos({ d }: { d: D }) {
  const agua = d.finanzas?.agua_caliente_precio_m3
  if (!agua?.length) return null
  const ultimo = agua[agua.length - 1]
  const previo = agua.length > 1 ? agua[agua.length - 2] : undefined
  const delta = previo ? ((ultimo.precio - previo.precio) / previo.precio) * 100 : undefined
  return (
    <section>
      <Card className="flex items-center gap-3 !py-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ background: '#DFEDFC', color: '#2F76C9' }}>
          <Droplets size={20} strokeWidth={1.9} />
        </span>
        <div className="flex-1">
          <div className="text-[12px] text-muted">Agua caliente</div>
          <div className="text-[15px] font-semibold text-ink">{ultimo.precio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/m³</div>
        </div>
        {delta != null && (
          <span className="text-[12.5px] font-bold" style={{ color: delta >= 0 ? '#C2663B' : '#2E8E79' }}>{pctFmt(delta)}</span>
        )}
      </Card>
    </section>
  )
}
