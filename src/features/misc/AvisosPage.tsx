import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { listAvisos } from '@/lib/api'
import { marcarAvisosVistos } from '@/lib/avisosVistos'
import { useApp } from '@/store'

export function AvisosPage() {
  const { data, state, refetch } = useAsync(listAvisos, [], { key: 'avisos', ttlMs: TTL.avisos })
  const user = useApp((s) => s.user)
  const refreshAuth = useApp((s) => s.refreshAuth)
  // Umbral de "nuevo" = última visita ANTES de entrar (capturado una vez). Así,
  // en ESTA visita, lo posterior se resalta y el resto se ve como leído.
  const [umbral] = useState(() => user.avisos_vistos_at ?? '')
  // Al abrir, todo queda "visto": se guarda la fecha en el perfil (BD, válido en
  // todos los dispositivos) y se refresca para que el contador de la campana se borre.
  useEffect(() => { void marcarAvisosVistos().then(() => refreshAuth()) }, [refreshAuth])

  const esNuevo = (ts: string) => !umbral || ts > umbral

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Notificaciones" />
      <Page>
        {state === 'loading' && <SkeletonList n={4} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {(state === 'empty' || (state === 'ready' && (!data || data.length === 0))) && (
          <EmptyState titulo="Sin notificaciones" texto="No tienes notificaciones nuevas por ahora." />
        )}
        {state === 'ready' && data && data.length > 0 && (
          <div className="flex flex-col gap-3">
            {data.map((aviso) => {
              const nuevo = esNuevo(aviso.ts)
              return (
                <Link key={aviso.id} to={aviso.to} className="block">
                  <Card className={cx('flex items-center gap-3 transition-colors',
                    nuevo
                      ? 'border-l-[3px] border-primary bg-primary-soft/60 hover:bg-primary-soft'
                      : 'opacity-70 hover:bg-surface-2')}>
                    <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]',
                      nuevo ? 'bg-primary text-white' : 'bg-surface-2 text-muted')}>
                      <Bell size={22} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cx('text-[14px]', nuevo ? 'font-bold text-ink' : 'font-medium text-muted')}>{aviso.texto}</span>
                        {nuevo && <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-white">Nuevo</span>}
                      </div>
                      <div className="mt-0.5 text-[12px] text-faint">{aviso.cuando}</div>
                    </div>
                    <ChevronRight size={20} className="shrink-0 text-faint" />
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </Page>
    </div>
  )
}
