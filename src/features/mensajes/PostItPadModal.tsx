import { useRef, useState, useEffect } from 'react'
import type { Mensaje, MensajeTipo } from '@/types'
import { POSTIT, PLURAL, fechaMano, caducaTexto } from './postit'

/** Bloc de post-its a pantalla completa. La hoja superior se despega arrastrando
 *  hacia arriba (o con un toque). Réplica del diseño 2a del handoff. */
export function PostItPadModal({ tipo, grupo, onClose }: { tipo: MensajeTipo; grupo: Mensaje[]; onClose: () => void }) {
  const e = POSTIT[tipo]
  const n = grupo.length
  const [idx, setIdx] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [peeling, setPeeling] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const startY = useRef(0)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const lift = Math.max(0, -dragY)

  const avanzar = () => {
    if (peeling) return
    setPeeling(true)
    timers.current.push(window.setTimeout(() => {
      setIdx((i) => i + 1); setPeeling(false); setDragY(0); setDragging(false)
    }, 300))
  }
  const peelUp = () => {
    if (!dragging || peeling) return
    if (-dragY > 90) avanzar()
    else if (-dragY < 6) { setDragging(false); setDragY(0); avanzar() }
    else { setDragging(false); setDragY(0); setSnapping(true); timers.current.push(window.setTimeout(() => setSnapping(false), 320)) }
  }
  const peelMove = (ev: React.PointerEvent) => {
    if (!dragging || peeling) return
    setDragY(Math.min(0, ev.clientY - startY.current))
  }

  const vacio = idx >= n
  const deck = grupo.slice(idx, idx + 3)

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'rgba(19,37,32,.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
      onClick={onClose}>
      <div className="flex items-center justify-between px-5 pb-2 pt-5 safe-top">
        <div>
          <div className="font-display text-[20px] font-extrabold text-white">{PLURAL[tipo]} ({n})</div>
          <div className="text-[12.5px] text-white/70">{n > 1 ? 'Levanta el post-it para ver el siguiente' : 'No hay más notas en este bloc'}</div>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full text-[20px] text-white" style={{ background: 'rgba(255,255,255,.18)' }}>✕</button>
      </div>

      <div className="flex flex-1 items-center justify-center px-7 py-3" style={{ perspective: '1000px' }}>
        <div className="relative w-full" style={{ height: 340 }}>
          {vacio && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-center text-white">
              <div className="text-[40px]">✓</div>
              <div className="font-display text-[19px] font-extrabold">Estás al día</div>
              <button onClick={(e) => { e.stopPropagation(); setIdx(0); setDragY(0); setDragging(false); setPeeling(false) }}
                className="rounded-full bg-white px-[18px] py-2.5 text-[13px] font-bold" style={{ color: '#132520' }}>Volver a empezar</button>
            </div>
          )}
          {deck.map((m, pos) => {
            const top = pos === 0
            let transform: string, transition: string, opacity = 1
            let shadow = '0 24px 50px -18px rgba(0,0,0,.55)'
            if (top && peeling) {
              transform = 'perspective(900px) translateY(-460px) rotateX(58deg) rotate(-7deg)'
              transition = 'transform .3s ease-in, opacity .3s ease-in'; opacity = 0
            } else if (top && dragging) {
              transform = `perspective(900px) translateY(${dragY * 0.45}px) rotateX(${Math.min(52, lift * 0.16)}deg)`
              transition = 'none'; shadow = `0 ${24 + lift * 0.3}px 60px -18px rgba(0,0,0,.6)`
            } else if (top) {
              transform = 'perspective(900px) rotate(-0.8deg)'
              transition = snapping ? 'transform .3s ease' : 'none'
            } else {
              transform = `scale(${1 - pos * 0.04}) translateY(${pos * 12}px) rotate(${pos % 2 === 0 ? -1 : 1.2}deg)`
              transition = 'none'; shadow = '0 12px 26px -14px rgba(0,0,0,.45)'
            }
            return (
              <div key={m.id}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={top ? (ev) => { if (peeling) return; (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId); startY.current = ev.clientY; setDragging(true); setDragY(0) } : undefined}
                onPointerMove={peelMove} onPointerUp={peelUp} onPointerCancel={peelUp}
                className="absolute inset-0 select-none"
                style={{ zIndex: 10 - pos, transform, transformOrigin: '50% 0%', transition, opacity, cursor: top ? 'grab' : 'default', touchAction: 'none' }}>
                <div className="relative flex h-full flex-col rounded-[4px] px-[22px] pb-4 pt-[26px]" style={{ background: e.paper, boxShadow: shadow }}>
                  <span className="absolute inset-x-0 top-0 h-4 rounded-t-[4px]" style={{ background: 'rgba(0,0,0,.05)', borderBottom: '1px dashed rgba(0,0,0,.1)' }} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ color: e.tint }}>{e.etiqueta}</span>
                    <span className="px-3 py-px" style={{ fontFamily: 'var(--font-hand)', fontSize: '21px', fontWeight: 600, color: e.tint, opacity: 0.85, transform: 'rotate(-2.5deg)', border: `1.7px solid ${e.tint}`, borderRadius: '55% 45% 50% 60% / 65% 55% 60% 50%' }}>{fechaMano(m.created_at)}</span>
                  </div>
                  <div className="mt-2 font-display text-[22px] font-extrabold leading-[1.2]" style={{ color: '#26363F' }}>{m.titulo}</div>
                  <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-[1.6]" style={{ color: '#4A5B66' }}>{m.cuerpo}</p>
                  {m.tipo === 'aviso' && m.expira_at && (
                    <div className="mt-2.5"><span className="inline-block px-[9px] py-[3px] text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: e.tint, border: `1.5px dashed ${e.tint}`, borderRadius: '3px', transform: 'rotate(-1.5deg)', opacity: 0.75 }}>⏱ {caducaTexto(m.expira_at)}</span></div>
                  )}
                  <div className="mt-auto flex items-end justify-between">
                    <span className="text-[11px] font-bold" style={{ color: '#8B9DAA' }}>Hoja {idx + pos + 1} de {n}</span>
                    <span style={{ fontFamily: 'var(--font-hand)', fontSize: '19px', color: e.tint }}>— {m.firma || e.autor}</span>
                  </div>
                  <span className="absolute bottom-0 right-0" style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 22px 22px', borderColor: 'transparent transparent rgba(0,0,0,.12) transparent', borderRadius: '0 0 4px 0' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-center gap-[7px] pb-[18px] pt-3 safe-bottom">
        {grupo.map((_, i) => {
          const activo = i === Math.min(idx, n - 1)
          return <span key={i} className="h-2 rounded-full transition-all duration-200" style={{ width: activo ? 22 : 8, background: activo ? '#fff' : (i < idx ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.35)') }} />
        })}
      </div>
    </div>
  )
}
