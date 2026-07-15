import { useLayoutEffect, useRef, useState } from 'react'
import { Adjuntos } from '@/components/Adjuntos'
import { useNavigate } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, TriangleAlert, Megaphone, Lightbulb, Heart } from 'lucide-react'
import type { Mensaje, MensajeTipo, ImportanciaMensaje } from '@/types'
import { POSTIT, TEMPORADAS, fechaMano, caducaTexto, paperDegradado, cintaWashi, CINTA_URGENTE, IMPORTANCIA_COLOR } from './postit'
import { MotivoTemporada } from './MotivoTemporada'
import { alternarLike } from '@/lib/api'
import { cx } from '@/components/ui'

// Color del icono/tinte según importancia (solo avisos): media=ámbar, alta=rojo.
const colorImportancia = (imp: ImportanciaMensaje | null | undefined): string | null =>
  imp === 'alta' ? IMPORTANCIA_COLOR.alta : imp === 'media' ? IMPORTANCIA_COLOR.media : null
/** Importancia efectiva: solo aplica a avisos e incidencias. */
const importanciaDe = (m: Mensaje): ImportanciaMensaje | null =>
  (m.tipo === 'aviso' || m.tipo === 'incidencia') ? (m.importancia ?? null) : null

// Tablón "gadget" de la Home (rediseño aprobado por mockup):
//  - UNA línea: se ve un post-it grande (con asomo del siguiente) y se desliza.
//  - Altura ELÁSTICA: el gadget ocupa el hueco libre de la Home (flex-1) y el
//    texto muestra tantas líneas como quepan (clamp dinámico por medición).
//  - Al tocar un post-it (o "Ver todo") se abre un VISOR a pantalla completa
//    que se pasa con el dedo (izquierda/derecha o hacia arriba = siguiente).
//  - Orden: incidencias → avisos → anuncios (recientes primero dentro de cada tipo).

const ORDEN_HOME: MensajeTipo[] = ['incidencia', 'aviso', 'anuncio', 'sugerencia']

/** Icono del tipo (mismos que el resto de la app). */
function TipoIcono({ tipo, color, size = 18 }: { tipo: MensajeTipo; color: string; size?: number }) {
  if (tipo === 'aviso') return <TriangleAlert size={size} style={{ color }} />
  if (tipo === 'anuncio') return <Megaphone size={size} style={{ color }} />
  if (tipo === 'sugerencia') return <Lightbulb size={size} style={{ color }} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Incidencia">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="m9.8 12.6 4.4 4.4" />
      <path d="m14.2 12.6-4.4 4.4" />
    </svg>
  )
}

/** Cabecera izquierda: icono del tipo (color según importancia) + motivo(s) de
 *  temporada. Anuncio con estilo = guirnalda de 3 motivos (sin megáfono). */
function CabeceraIcono({ m, tint, size }: { m: Mensaje; tint: string; size: number }) {
  const imp = importanciaDe(m)
  const iconColor = m.tipo === 'incidencia' ? '#A3341F' : (colorImportancia(imp) ?? tint)
  if (m.estilo && m.tipo === 'anuncio') {
    return (
      <span className="flex items-center gap-1">
        <MotivoTemporada estilo={m.estilo} size={size} color={tint} />
        <MotivoTemporada estilo={m.estilo} size={size - 5} color={TEMPORADAS[m.estilo].deco} />
        <MotivoTemporada estilo={m.estilo} size={size - 5} color={tint} />
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5">
      <TipoIcono tipo={m.tipo} color={iconColor} size={size} />
      {m.estilo && <MotivoTemporada estilo={m.estilo} size={size} color={tint} />}
    </span>
  )
}

/** Sello del pie derecho: URGENTE / IMPORTANTE, o el nombre de temporada. */
function SelloPie({ m, tint, lg }: { m: Mensaje; tint: string; lg?: boolean }) {
  const imp = importanciaDe(m)
  const base: React.CSSProperties = {
    display: 'inline-block', fontSize: lg ? '10.5px' : '9.5px', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.09em',
  }
  if (imp === 'alta') return <span style={{ ...base, color: IMPORTANCIA_COLOR.alta, border: `1.5px solid ${IMPORTANCIA_COLOR.alta}`, borderRadius: '3px', padding: lg ? '3px 8px' : '2px 7px', transform: 'rotate(-2deg)' }}>Urgente</span>
  if (imp === 'media') return <span style={{ ...base, color: IMPORTANCIA_COLOR.media, border: `1.5px dashed ${IMPORTANCIA_COLOR.media}`, borderRadius: '3px', padding: lg ? '3px 8px' : '2px 7px', transform: 'rotate(-2deg)' }}>Importante</span>
  if (m.estilo) return <span style={{ ...base, color: tint }}>{TEMPORADAS[m.estilo].etiqueta}</span>
  return null
}

/** Ordena para la Home: incidencia → aviso → anuncio; recientes primero. */
export function ordenarTablon(mensajes: Mensaje[]): Mensaje[] {
  return [...mensajes].sort((a, b) => {
    const t = ORDEN_HOME.indexOf(a.tipo) - ORDEN_HOME.indexOf(b.tipo)
    return t !== 0 ? t : b.created_at.localeCompare(a.created_at)
  })
}

/** Clamp dinámico: nº de líneas que caben en el hueco medido. */
function useLineasQueCaben(lineaPx: number, minimo = 2) {
  const ref = useRef<HTMLDivElement>(null)
  const [lineas, setLineas] = useState(3)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setLineas(Math.max(minimo, Math.floor(el.clientHeight / lineaPx)))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [lineaPx, minimo])
  return { ref, lineas }
}

function PostItHome({ m, rot, onClick }: { m: Mensaje; rot: string; onClick: () => void }) {
  const e = POSTIT[m.tipo]
  const t = m.estilo ? TEMPORADAS[m.estilo] : null
  const tint = t ? t.tint : e.tint
  const urgente = importanciaDe(m) === 'alta'
  const { ref, lineas } = useLineasQueCaben(19.5)
  return (
    <div role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onClick() } }}
      className="relative flex h-full w-[84%] shrink-0 cursor-pointer snap-center flex-col rounded-[8px] px-4 pb-3 pt-4"
      style={{
        background: t ? paperDegradado(t.paper, t.tint) : e.paper, transform: `rotate(${rot})`,
        boxShadow: '0 8px 18px -8px rgba(30,50,60,.5), 0 1px 0 rgba(255,255,255,.8) inset',
      }}>
      {/* Marca de agua (solo con estilo): en wrapper con overflow para no recortar cinta/chincheta */}
      {t && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[8px]">
          <div className="absolute" style={{ right: -16, bottom: -18, opacity: 0.17, transform: 'rotate(-12deg)' }}>
            <MotivoTemporada estilo={m.estilo!} size={104} color={t.tint} />
          </div>
        </div>
      )}
      {/* Marco punteado interior (solo con estilo) */}
      {t && (
        <span className="pointer-events-none absolute rounded-[6px]"
          style={{ inset: 7, border: `1.5px dashed ${urgente ? IMPORTANCIA_COLOR.alta : tint}`, opacity: urgente ? 0.45 : 0.3 }} />
      )}
      {/* Cinta washi (con estilo) o chincheta (sin estilo) */}
      {t ? (
        <span className="absolute left-1/2 top-[-10px]"
          style={{ width: 92, height: 22, marginLeft: -46, transform: 'rotate(-3deg)', background: urgente ? CINTA_URGENTE : cintaWashi(t.pin, t.deco), opacity: 0.9, boxShadow: '0 2px 4px rgba(0,0,0,.18)', borderLeft: '1px dashed rgba(255,255,255,.6)', borderRight: '1px dashed rgba(255,255,255,.6)' }} />
      ) : (
        <span className="absolute left-1/2 top-[-7px] h-3.5 w-3.5 -translate-x-1/2 rounded-full"
          style={{ background: `radial-gradient(circle at 35% 30%, ${e.pinHi}, ${e.pin})`, boxShadow: '0 3px 4px rgba(0,0,0,.3)' }} />
      )}

      <div className="relative flex shrink-0 items-center justify-between gap-2">
        <CabeceraIcono m={m} tint={tint} size={18} />
        <span className="px-2.5" style={{
          fontFamily: 'var(--font-hand)', fontSize: '16px', fontWeight: 600, color: tint, opacity: 0.85,
          transform: 'rotate(-2deg)', border: `1.5px solid ${tint}`, borderRadius: '55% 45% 50% 60% / 65% 55% 60% 50%',
        }}>{fechaMano(m.created_at)}</span>
      </div>

      <div className="relative mt-1 shrink-0 font-display text-[17px] font-extrabold leading-[1.22]"
        style={{ color: '#26363F', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {m.titulo}
      </div>

      {/* Cuerpo elástico: tantas líneas como quepan */}
      <div ref={ref} className="relative mt-1 min-h-0 flex-1 overflow-hidden">
        <p className="text-[13px] leading-[1.5]"
          style={{ color: '#5C7180', display: '-webkit-box', WebkitLineClamp: lineas, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {m.cuerpo}
        </p>
      </div>

      <div className="relative mt-1 flex shrink-0 items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold" style={{ color: '#8B9DAA' }}>
          {m.tipo === 'sugerencia'
            ? `— ${m.autor_nombre ?? 'Vecino'}${m.autor_vivienda ? ` · ${m.autor_vivienda}` : ''}`
            : (m.firma ? `— ${m.firma}` : '')}
        </span>
        {m.tipo === 'sugerencia' ? (
          <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold" style={{ color: tint }}>
            <Heart size={13} fill={m.yo_like ? tint : 'none'} /> {m.likes ?? 0}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5">
            {m.tipo === 'aviso' && m.expira_at && (
              <span className="inline-block px-[7px] py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em]"
                style={{ color: tint, border: `1px dashed ${tint}`, borderRadius: '3px', transform: 'rotate(-1.5deg)', opacity: 0.75 }}>
                {caducaTexto(m.expira_at)}
              </span>
            )}
            <SelloPie m={m} tint={tint} />
          </span>
        )}
      </div>
    </div>
  )
}

export function TablonGadget({ mensajes, className }: { mensajes: Mensaje[]; className?: string }) {
  const nav = useNavigate()
  const lista = ordenarTablon(mensajes)
  const railRef = useRef<HTMLDivElement>(null)
  const [idxRail, setIdxRail] = useState(0)
  const [visor, setVisor] = useState<number | null>(null)

  const onScroll = () => {
    const el = railRef.current
    if (!el || lista.length === 0) return
    const i = Math.round(el.scrollLeft / (el.scrollWidth / lista.length))
    setIdxRail(Math.min(i, lista.length - 1))
  }

  return (
    <section className={cx('flex min-h-0 flex-col', className)}>
      <div className="flex shrink-0 items-center justify-between px-0.5 pb-1.5">
        <h2 className="section-title">Tablón de la comunidad</h2>
        {lista.length > 0
          ? <button type="button" onClick={() => setVisor(0)} className="text-[12.5px] font-bold text-primary">Ver todo ›</button>
          : <button type="button" onClick={() => nav('/mensajes')} className="text-[12.5px] font-bold text-primary">Mensajes ›</button>}
      </div>

      {lista.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-[14px] border border-dashed border-border bg-surface/50 px-6 text-center">
          <p className="text-[13.5px] text-muted">No hay novedades en el tablón. 🌿<br />Aquí verás las incidencias, avisos y anuncios de la comunidad.</p>
        </div>
      ) : (
        <>
          {/* Carrusel de una línea (un post-it visible, asomo del siguiente) */}
          <div ref={railRef} onScroll={onScroll}
            className="no-scrollbar -mx-4 flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-1.5">
            {lista.map((m, i) => (
              <PostItHome key={m.id} m={m} rot={i % 2 ? '0.7deg' : '-0.7deg'} onClick={() => setVisor(i)} />
            ))}
            <span className="w-1 shrink-0" />
          </div>
          {lista.length > 1 && (
            <div className="flex shrink-0 items-center justify-center gap-1.5 pt-1">
              {lista.map((_, i) => (
                <span key={i} className={cx('h-1.5 rounded-full transition-all',
                  i === idxRail ? 'w-4 bg-primary' : 'w-1.5 bg-border')} />
              ))}
            </div>
          )}
        </>
      )}

      {visor !== null && <PostItVisor lista={lista} inicial={visor} onClose={() => setVisor(null)} />}
    </section>
  )
}

// ---- Visor a pantalla completa -------------------------------------------------
const TIPO_LABEL: Record<MensajeTipo, string> = { incidencia: 'Incidencia', aviso: 'Aviso', anuncio: 'Anuncio', sugerencia: 'Sugerencia' }

function PostItVisor({ lista, inicial, onClose }: { lista: Mensaje[]; inicial: number; onClose: () => void }) {
  const [idx, setIdx] = useState(inicial)
  const toque = useRef<{ x: number; y: number } | null>(null)
  const m = lista[idx]

  const ir = (n: number) => setIdx((i) => Math.max(0, Math.min(lista.length - 1, i + n)))

  // Likes (optimista): estado local por sugerencia; se persiste con alternarLike.
  const [likes, setLikes] = useState<Record<string, { n: number; yo: boolean }>>(() => {
    const o: Record<string, { n: number; yo: boolean }> = {}
    for (const msg of lista) if (msg.tipo === 'sugerencia') o[msg.id] = { n: msg.likes ?? 0, yo: !!msg.yo_like }
    return o
  })
  const toggleLike = async (id: string) => {
    const cur = likes[id] ?? { n: 0, yo: false }
    const yo = !cur.yo
    setLikes((s) => ({ ...s, [id]: { n: Math.max(0, cur.n + (yo ? 1 : -1)), yo } }))
    try { await alternarLike(id, yo) } catch { setLikes((s) => ({ ...s, [id]: cur })) }
  }

  return (
    <div className="app-viewport z-[60] flex flex-col" style={{ background: 'rgba(9,13,17,.94)' }} onClick={onClose}>
      <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3 safe-top" onClick={(ev) => ev.stopPropagation()}>
        <div className="text-[14px] font-bold text-white/90">{TIPO_LABEL[m.tipo]} · {idx + 1} de {lista.length}</div>
        <button onClick={onClose} aria-label="Cerrar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"><X size={19} /></button>
      </div>

      {/* Escenario: pasar con el dedo (izq/dcha, o hacia arriba = siguiente) */}
      <div className="relative min-h-0 flex-1 overflow-hidden" onClick={(ev) => ev.stopPropagation()}
        onPointerDown={(ev) => { toque.current = { x: ev.clientX, y: ev.clientY } }}
        onPointerUp={(ev) => {
          const t = toque.current; toque.current = null
          if (!t) return
          const dx = ev.clientX - t.x, dy = ev.clientY - t.y
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1)
          else if (dy < -50 && Math.abs(dy) > Math.abs(dx)) ir(1)
        }}>
        {idx > 0 && (
          <button onClick={() => ir(-1)} aria-label="Anterior"
            className="absolute left-1.5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"><ChevronLeft size={22} /></button>
        )}
        {idx < lista.length - 1 && (
          <button onClick={() => ir(1)} aria-label="Siguiente"
            className="absolute right-1.5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"><ChevronRight size={22} /></button>
        )}

        <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {lista.map((msg, i) => {
            const pe = POSTIT[msg.tipo]
            const t = msg.estilo ? TEMPORADAS[msg.estilo] : null
            const tint = t ? t.tint : pe.tint
            const urgente = importanciaDe(msg) === 'alta'
            return (
              <div key={msg.id} className="flex h-full w-full shrink-0 items-center justify-center px-7 py-3">
                <div className="relative flex max-h-full w-full max-w-[330px] flex-col rounded-[10px] px-6 pb-6 pt-6"
                  style={{
                    background: t ? paperDegradado(t.paper, t.tint) : pe.paper, transform: `rotate(${i % 2 ? '0.8deg' : '-0.8deg'})`,
                    boxShadow: '0 20px 50px -18px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.7) inset', minHeight: '55%',
                  }}>
                  {t && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[10px]">
                      <div className="absolute" style={{ right: -20, bottom: -22, opacity: 0.17, transform: 'rotate(-12deg)' }}>
                        <MotivoTemporada estilo={msg.estilo!} size={150} color={t.tint} />
                      </div>
                    </div>
                  )}
                  {t && (
                    <span className="pointer-events-none absolute rounded-[8px]"
                      style={{ inset: 7, border: `1.5px dashed ${urgente ? IMPORTANCIA_COLOR.alta : tint}`, opacity: urgente ? 0.45 : 0.3 }} />
                  )}
                  {t ? (
                    <span className="absolute left-1/2 top-[-11px]"
                      style={{ width: 110, height: 26, marginLeft: -55, transform: 'rotate(-3deg)', background: urgente ? CINTA_URGENTE : cintaWashi(t.pin, t.deco), opacity: 0.9, boxShadow: '0 2px 5px rgba(0,0,0,.22)', borderLeft: '1px dashed rgba(255,255,255,.6)', borderRight: '1px dashed rgba(255,255,255,.6)' }} />
                  ) : (
                    <span className="absolute left-1/2 top-[-9px] h-[18px] w-[18px] -translate-x-1/2 rounded-full"
                      style={{ background: `radial-gradient(circle at 35% 30%, ${pe.pinHi}, ${pe.pin})`, boxShadow: '0 3px 5px rgba(0,0,0,.35)' }} />
                  )}
                  <div className="relative flex shrink-0 items-center justify-between gap-2">
                    <CabeceraIcono m={msg} tint={tint} size={20} />
                    <span className="px-3" style={{
                      fontFamily: 'var(--font-hand)', fontSize: '19px', fontWeight: 600, color: tint, opacity: 0.85,
                      transform: 'rotate(-2deg)', border: `1.5px solid ${tint}`, borderRadius: '55% 45% 50% 60% / 65% 55% 60% 50%',
                    }}>{fechaMano(msg.created_at)}</span>
                  </div>
                  <h3 className="relative mt-3 shrink-0 font-display text-[22px] font-extrabold leading-[1.2]" style={{ color: '#26363F' }}>{msg.titulo}</h3>
                  <div className="relative mt-3 min-h-0 flex-1 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-[15px] leading-[1.55]" style={{ color: '#4A5B66' }}>{msg.cuerpo}</p>
                    <Adjuntos urls={msg.adjuntos} />
                  </div>
                  <div className="relative mt-4 flex shrink-0 items-end justify-between gap-2">
                    <span style={{ fontFamily: 'var(--font-hand)', fontSize: '18px', color: '#5C7180', opacity: 0.9 }}>
                      {msg.tipo === 'sugerencia'
                        ? `— ${msg.autor_nombre ?? 'Vecino'}${msg.autor_vivienda ? ` · ${msg.autor_vivienda}` : ''}`
                        : (msg.firma ? `— ${msg.firma}` : '')}
                    </span>
                    {msg.tipo === 'sugerencia' ? (
                      <button type="button" onClick={() => toggleLike(msg.id)}
                        className="flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-[14px] font-extrabold active:scale-95"
                        style={{ color: tint, background: `${tint}1a` }}>
                        <Heart size={17} fill={likes[msg.id]?.yo ? tint : 'none'} /> {likes[msg.id]?.n ?? 0}
                      </button>
                    ) : (
                      <span className="flex shrink-0 items-center gap-2">
                        {msg.tipo === 'aviso' && msg.expira_at && (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em]"
                            style={{ color: tint, border: `1px dashed ${tint}`, borderRadius: '3px', transform: 'rotate(-1.5deg)', opacity: 0.75 }}>
                            {caducaTexto(msg.expira_at)}
                          </span>
                        )}
                        <SelloPie m={msg} tint={tint} lg />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 pb-1 pt-1" onClick={(ev) => ev.stopPropagation()}>
        {lista.map((msg, i) => (
          <button key={msg.id} onClick={() => setIdx(i)} aria-label={`Ver ${i + 1}`}
            className="h-2 rounded-full transition-all"
            style={{ width: i === idx ? 22 : 8, background: i === idx ? (msg.estilo ? TEMPORADAS[msg.estilo].pin : POSTIT[msg.tipo].pin) : 'rgba(255,255,255,.28)' }} />
        ))}
      </div>
      <div className="shrink-0 pb-4 text-center text-[12px] text-white/60 safe-bottom">Desliza con el dedo para pasar · toca fuera para cerrar</div>
    </div>
  )
}
