import { useState } from 'react'
import { Lightbulb, Heart, Plus } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { useApp } from '@/store'
import { puedePublicarTipo, esTester } from '@/lib/roles'
import { fechaCorta } from '@/lib/format'
import { listMensajes, alternarLike } from '@/lib/api'
import { AsistenteMensaje } from '@/features/mensajes/AsistenteMensaje'
import type { Mensaje } from '@/types'

const LILA = '#6D4AA3'

/** Tablón de SUGERENCIAS de la comunidad: ideas que un vecino quiere mostrar al
 *  resto (con su nombre) y a las que los demás dan "me gusta" (uno por vivienda).
 *  - El vecino las envía desde el buzón (Publicar → Sugerencia) y se moderan.
 *  - Quien pueda publicar sugerencias (permiso `publicar_sugerencias`) puede
 *    añadir una directamente desde aquí, ya publicada.
 *  El feedback privado al desarrollador ya NO está aquí: va por el chat del buzón. */
export function SugerenciasPage() {
  const { user, toast } = useApp()
  const puede = puedePublicarTipo(user.rol, 'sugerencia')
  const tester = esTester(user.rol)
  const { data, state, refetch } = useAsync(listMensajes, [], { key: 'mensajes', ttlMs: TTL.mensajes })

  const sugerencias = (data ?? []).filter((m) => m.tipo === 'sugerencia')

  // Estado optimista de likes (id → {yo, n}); si no hay override, se usa el dato del servidor.
  const [ov, setOv] = useState<Record<string, { yo: boolean; n: number }>>({})
  const likeDe = (m: Mensaje) => ov[m.id] ?? { yo: !!m.yo_like, n: m.likes ?? 0 }

  const toggleLike = async (m: Mensaje) => {
    if (tester) return
    const cur = likeDe(m)
    const next = { yo: !cur.yo, n: cur.n + (cur.yo ? -1 : 1) }
    setOv((s) => ({ ...s, [m.id]: next }))
    try {
      await alternarLike(m.id, next.yo)
    } catch {
      setOv((s) => ({ ...s, [m.id]: cur })) // revierte
      toast('No se pudo registrar tu me gusta', 'error')
    }
  }

  // Alta directa (solo con permiso): usa el ASISTENTE ÚNICO (v1.54.0), el mismo
  // de Gestión → Mensajes y del buzón, abierto ya en tipo sugerencia (salta el
  // paso 1). Publica directo, igual que antes.
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Sugerencias" right={puede && (
        <button onClick={() => setAbierto(true)} disabled={tester}
          className="flex h-10 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[14px] font-bold text-white shadow-primary disabled:opacity-50">
          <Plus size={18} /> Nueva
        </button>
      )} />
      <Page className="flex flex-col gap-3">
        <p className="px-1 text-[12.5px] leading-snug text-faint">
          Ideas que los vecinos proponen para mejorar la comunidad. Dale a <b className="text-muted">me gusta</b> (uno por vivienda) a las que te convenzan.
          {' '}¿La tuya? Ve al <b className="text-muted">buzón → Publicar → Sugerencia</b>; la revisa la administración antes de verse aquí.
        </p>

        {state === 'loading' && <SkeletonList n={3} />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state !== 'loading' && state !== 'error' && sugerencias.length === 0 && (
          <EmptyState titulo="Aún no hay sugerencias" texto="Cuando se apruebe la primera, aparecerá aquí." />
        )}

        {sugerencias.map((m) => {
          const lk = likeDe(m)
          return (
            <Card key={m.id} className="flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: '#F1ECFB', color: LILA }}>
                  <Lightbulb size={17} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold leading-tight text-ink">{m.titulo}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-snug text-muted">{m.cuerpo}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                <span className="truncate text-[12px] text-faint">
                  {m.autor_nombre ? <>Propuesta por <b className="text-muted">{m.autor_nombre}</b>{m.autor_vivienda ? ` · ${m.autor_vivienda}` : ''}</> : fechaCorta(m.created_at)}
                </span>
                <button type="button" onClick={() => toggleLike(m)} disabled={tester}
                  aria-label={lk.yo ? 'Quitar me gusta' : 'Me gusta'}
                  className={cx('flex shrink-0 items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[13px] font-bold transition-colors',
                    lk.yo ? 'border-transparent text-white' : 'border-border bg-surface text-muted')}
                  style={lk.yo ? { background: '#E0466B' } : undefined}>
                  <Heart size={15} fill={lk.yo ? 'currentColor' : 'none'} /> {lk.n}
                </button>
              </div>
            </Card>
          )
        })}
      </Page>

      {/* Alta directa (administración) */}
      {abierto && (
        <AsistenteMensaje
          origen="gestion"
          tipos={['sugerencia']}
          tipoInicial="sugerencia"
          onCerrar={() => setAbierto(false)}
          onHecho={refetch} />
      )}
    </div>
  )
}
