import { useApp } from '@/store'
import { cx } from '@/components/ui'

export function Toaster() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-40 flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} onClick={() => dismissToast(t.id)}
          className={cx('pointer-events-auto flex max-w-sm items-center gap-2 rounded-[14px] px-4 py-3 text-[14px] font-medium text-white shadow-lg',
            t.tipo === 'error' ? 'bg-danger' : t.tipo === 'info' ? 'bg-info' : 'bg-[#132520]')}>
          <span>{t.tipo === 'error' ? '⚠️' : t.tipo === 'info' ? 'ℹ️' : '✓'}</span>
          {t.texto}
        </button>
      ))}
    </div>
  )
}
