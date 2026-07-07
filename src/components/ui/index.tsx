// Primitivos del design system Rioja 25. Basados en design_handoff (tokens.css).
// Todos usan variables CSS de tokens.css → modo claro/oscuro automático.
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import type { IncidentStatus, RoleBadgeKind } from '@/types'
import { BADGE_LABEL } from '@/lib/roles'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

// ---- Button ------------------------------------------------------------------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  block?: boolean
  size?: 'md' | 'lg'
}
export function Button({ variant = 'primary', block, size = 'md', className, children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-pill font-bold transition-colors disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint disabled:shadow-none'
  const sizes = size === 'lg' ? 'min-h-[52px] px-6 text-[16px]' : 'min-h-[46px] px-5 text-[15px]'
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-primary text-white shadow-primary hover:bg-primary-700',
    secondary: 'bg-surface text-ink border-[1.5px] border-border-strong hover:bg-surface-2',
    ghost: 'bg-transparent text-primary hover:bg-primary-soft',
    danger: 'bg-danger text-white hover:brightness-95',
    'danger-outline': 'bg-surface text-danger border-[1.5px] border-danger hover:bg-danger-soft',
  }
  return (
    <button className={cx(base, sizes, variants[variant], block && 'w-full', className)} {...rest}>
      {children}
    </button>
  )
}

// ---- Card --------------------------------------------------------------------
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-[16px] border border-border bg-surface p-4', className)} {...rest}>{children}</div>
}

// ---- Field / Input -----------------------------------------------------------
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, id, className, ...rest }, ref) {
  const fid = id || `f_${label.replace(/\s+/g, '_')}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-[13px] font-semibold text-muted">{label}</label>
      <input ref={ref} id={fid}
        className={cx('min-h-[48px] rounded-[12px] border-[1.5px] bg-surface px-3.5 text-[15px] text-ink placeholder:text-faint',
          error ? 'border-danger bg-danger-soft' : 'border-border-strong', className)}
        {...rest} />
      {error && <span className="text-[12px] text-danger">{error}</span>}
      {hint && !error && <span className="text-[12px] text-faint">{hint}</span>}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}
export function Textarea({ label, error, hint, id, className, ...rest }: TextareaProps) {
  const fid = id || `t_${label.replace(/\s+/g, '_')}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-[13px] font-semibold text-muted">{label}</label>
      <textarea ref={undefined} id={fid} rows={4}
        className={cx('rounded-[12px] border-[1.5px] bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-faint',
          error ? 'border-danger bg-danger-soft' : 'border-border-strong', className)}
        {...rest} />
      {error && <span className="text-[12px] text-danger">{error}</span>}
      {hint && !error && <span className="text-[12px] text-faint">{hint}</span>}
    </div>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  children: ReactNode
}
export function SelectField({ label, error, id, className, children, ...rest }: SelectFieldProps) {
  const fid = id || `s_${label.replace(/\s+/g, '_')}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-[13px] font-semibold text-muted">{label}</label>
      <div className="relative">
        <select ref={undefined} id={fid}
          className={cx('min-h-[48px] w-full appearance-none rounded-[12px] border-[1.5px] bg-surface px-3.5 pr-10 text-[15px] text-ink',
            error ? 'border-danger' : 'border-border-strong', className)}
          {...rest}>
          {children}
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint">▾</span>
      </div>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </div>
  )
}

// ---- StatusChip (incidencias) ------------------------------------------------
const STATUS: Record<IncidentStatus, { label: string; dot: string; cls: string }> = {
  abierta: { label: 'Abierta', dot: 'var(--danger)', cls: 'bg-danger-soft text-[#a3341f]' },
  en_curso: { label: 'En curso', dot: 'var(--info)', cls: 'bg-info-soft text-[#1f5aa3]' },
  resuelta: { label: 'Resuelta', dot: 'var(--success)', cls: 'bg-success-soft text-[#0f6b3f]' },
  cerrada: { label: 'Cerrada', dot: 'var(--faint)', cls: 'bg-surface-2 text-muted' },
}
export function StatusChip({ status }: { status: IncidentStatus }) {
  const s = STATUS[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-bold', s.cls)}>
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

// ---- RoleBadge ---------------------------------------------------------------
export function RoleBadge({ kind }: { kind: RoleBadgeKind }) {
  const cls: Record<RoleBadgeKind, string> = {
    vecino: 'bg-surface-2 text-muted',
    junta: 'bg-accent-soft text-accent-ink',
    admin: 'bg-primary text-white',
  }
  return <span className={cx('rounded-[8px] px-2 py-0.5 text-[11.5px] font-bold', cls[kind])}>{BADGE_LABEL[kind]}</span>
}

// ---- CategoryChip ------------------------------------------------------------
export function CategoryChip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cx('rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors',
        active ? 'border-primary bg-primary text-white' : 'border-border bg-surface-2 text-muted hover:border-border-strong')}>
      {children}
    </button>
  )
}

// ---- Avatar ------------------------------------------------------------------
export function Avatar({ text, size = 40, className }: { text: string; size?: number; className?: string }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-700', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {text}
    </span>
  )
}

// ---- Alert -------------------------------------------------------------------
export function Alert({ tipo = 'info', children }: { tipo?: 'info' | 'warn' | 'success' | 'danger'; children: ReactNode }) {
  const cls = {
    info: 'bg-info-soft border-info/30 text-[#1f5aa3]',
    warn: 'bg-warn-soft border-warn/30 text-[#8a5a0f]',
    success: 'bg-success-soft border-success/30 text-[#0f6b3f]',
    danger: 'bg-danger-soft border-danger/30 text-[#a3341f]',
  }[tipo]
  return <div className={cx('rounded-[12px] border px-3.5 py-3 text-[14px]', cls)}>{children}</div>
}

// ---- ProgressBar -------------------------------------------------------------
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-pill bg-surface-2" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ---- EmptyState / ErrorState / Skeleton --------------------------------------
export function EmptyState({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-surface-2 text-2xl">🌿</div>
      <h3 className="font-display text-[22px] font-bold text-ink">{titulo}</h3>
      {texto && <p className="max-w-xs text-[14px] text-muted">{texto}</p>}
      {children}
    </div>
  )
}
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-danger-soft text-2xl">⚠️</div>
      <h3 className="font-display text-[22px] font-bold text-ink">No hemos podido cargar</h3>
      <p className="max-w-xs text-[14px] text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Reintentar</Button>}
    </div>
  )
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-[12px] bg-surface-2', className)} />
}
export function SkeletonList({ n = 4 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-[16px] border border-border bg-surface p-4">
          <Skeleton className="mb-2 h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

// ---- Stepper (detalle incidencia) -------------------------------------------
export function Stepper({ actual }: { actual: IncidentStatus }) {
  const pasos: { key: IncidentStatus; label: string }[] = [
    { key: 'abierta', label: 'Abierta' },
    { key: 'en_curso', label: 'En curso' },
    { key: 'resuelta', label: 'Resuelta' },
    { key: 'cerrada', label: 'Cerrada' },
  ]
  const idx = pasos.findIndex((p) => p.key === actual)
  return (
    <ol className="flex items-center gap-1">
      {pasos.map((p, i) => {
        const done = i <= idx
        return (
          <li key={p.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center gap-1">
              <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                done ? 'bg-primary text-white' : 'border border-dashed border-border-strong text-faint')}>
                {done ? '✓' : i + 1}
              </span>
              {i < pasos.length - 1 && <span className={cx('h-0.5 flex-1', i < idx ? 'bg-primary' : 'bg-border')} />}
            </div>
            <span className={cx('text-[11px]', done ? 'font-semibold text-ink' : 'text-faint')}>{p.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

// ---- Fab ---------------------------------------------------------------------
export function Fab({ onClick, label = 'Nuevo' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="fixed bottom-[92px] right-4 z-30 flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-primary text-3xl text-white shadow-primary md:bottom-8">
      +
    </button>
  )
}

export { cx }
