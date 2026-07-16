import { useState } from 'react'
import { Lightbulb, Heart, Plus, Send, X } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, Field, Textarea, Button, Alert, EmptyState, ErrorState, SkeletonList, cx } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { TTL } from '@/lib/cache'
import { useApp } from '@/store'
import { puedePublicarTipo, esTester } from '@/lib/roles'
import { fechaCorta } from '@/lib/format'
import { listMensajes, alternarLike, crearMensaje } from '@/lib/api'
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

  // Alta directa (solo administración con permiso).
  const [form, setForm] = useState<{ titulo: string; cuerpo: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const valido = !!form && form.titulo.trim().length >= 3 && form.cuerpo.trim().length >= 3

  const publicar = async () => {
    if (!form || !valido) return
    setSaving(true)
    try {
      await crearMensaje({ tipo: 'sugerencia', titulo: form.titulo.trim(), cuerpo: form.cuerpo.trim() })
      toast('Sugerencia publicada', 'ok')
      setForm(null); refetch()
    } catch {
      toast('No se pudo publicar', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Sugerencias" right={puede && (
        <button onClick={() => setForm({ titulo: '', cuerpo: '' })} disabled={tester}
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
      {form && (
        <div className="app-viewport z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setForm(null)}>
          <div className="max-h-full w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-surface p-5 shadow-xl sm:rounded-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-ink">Nueva sugerencia</h3>
              <button onClick={() => setForm(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-faint hover:bg-surface-2"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Título" value={form.titulo} maxLength={140}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej. Pedir 3 presupuestos antes de contratar" />
              <Textarea label="Sugerencia" value={form.cuerpo} maxLength={4000} rows={5}
                onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
                placeholder="Explica la propuesta para la comunidad…" />
              {tester && <Alert tipo="info">Cuenta de pruebas (Tester): solo lectura.</Alert>}
              <Button block size="lg" disabled={saving || !valido || tester} onClick={publicar}>
                <Send size={18} /> {saving ? 'Publicando…' : 'Publicar sugerencia'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
