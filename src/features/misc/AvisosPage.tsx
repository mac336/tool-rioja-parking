import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, EmptyState, ErrorState, SkeletonList } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { listAvisos } from '@/lib/api'
import { marcarAvisosVistos } from '@/lib/avisosVistos'

export function AvisosPage() {
  const { data, state, refetch } = useAsync(listAvisos, [])
  // Al abrir la campana, lo actual queda como "visto" (se borra el contador).
  useEffect(() => { marcarAvisosVistos() }, [])

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Avisos" />
      <Page>
        {state === 'loading' && <SkeletonList n={4} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {(state === 'empty' || (state === 'ready' && (!data || data.length === 0))) && (
          <EmptyState titulo="Sin avisos" texto="No tienes notificaciones nuevas por ahora." />
        )}
        {state === 'ready' && data && data.length > 0 && (
          <div className="flex flex-col gap-3">
            {data.map((aviso) => (
              <Link key={aviso.id} to={aviso.to} className="block">
                <Card className="flex items-center gap-3 hover:bg-surface-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary-700">
                    <Bell size={22} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-ink">{aviso.texto}</div>
                    <div className="mt-0.5 text-[12px] text-faint">{aviso.cuando}</div>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-faint" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Page>
    </div>
  )
}
