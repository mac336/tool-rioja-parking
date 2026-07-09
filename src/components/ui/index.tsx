// Primitivos del design system Rioja 25. Basados en design_handoff (tokens.css).
// Todos usan variables CSS de tokens.css → modo claro/oscuro automático.
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import type { RoleBadgeKind } from '@/types'
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
    primary: 'bg-primary text-white shadow-primary hover:bg-primary-700 active:shadow-neu-inset',
    secondary: 'bg-surface text-ink shadow-neu-sm hover:brightness-[0.98] active:shadow-neu-inset',
    ghost: 'bg-transparent text-primary hover:bg-primary-soft',
    danger: 'bg-danger text-white shadow-neu-sm hover:brightness-95 active:shadow-neu-inset',
    'danger-outline': 'bg-surface text-danger shadow-neu-sm hover:bg-danger-soft active:shadow-neu-inset',
  }
  return (
    <button className={cx(base, sizes, variants[variant], block && 'w-full', className)} {...rest}>
      {children}
    </button>
  )
}

// ---- Card --------------------------------------------------------------------
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-[18px] bg-surface p-4 shadow-neu', className)} {...rest}>{children}</div>
}

// ---- Field / Input -----------------------------------------------------------
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, id, className, ...rest }, ref) {
  const fid = id || `f_${(label ?? 'campo').replace(/\s+/g, '_')}`
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={fid} className="text-[13px] font-semibold text-muted">{label}</label>}
      <input ref={ref} id={fid}
        className={cx('min-h-[48px] rounded-[14px] border bg-surface px-3.5 text-[15px] text-ink placeholder:text-faint shadow-neu-inset focus:outline-none',
          error ? 'border-danger' : 'border-border focus:border-primary', className)}
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
        className={cx('rounded-[14px] border bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-faint shadow-neu-inset focus:outline-none',
          error ? 'border-danger' : 'border-border focus:border-primary', className)}
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
          className={cx('min-h-[48px] w-full appearance-none rounded-[14px] border bg-surface px-3.5 pr-10 text-[15px] text-ink shadow-neu-inset focus:outline-none',
            error ? 'border-danger' : 'border-border focus:border-primary', className)}
          {...rest}>
          {children}
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint">▾</span>
      </div>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </div>
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
    info: 'bg-info-soft text-info-ink',
    warn: 'bg-warn-soft text-warn-ink',
    success: 'bg-success-soft text-success-ink',
    danger: 'bg-danger-soft text-danger-ink',
  }[tipo]
  return <div className={cx('rounded-[14px] px-3.5 py-3 text-[14px]', cls)}>{children}</div>
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
