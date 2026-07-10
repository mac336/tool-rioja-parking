import { TriangleAlert, Megaphone } from 'lucide-react'
import type { Mensaje, MensajeTipo } from '@/types'
import { POSTIT, PLURAL, fechaMano, caducaTexto } from './postit'

/** Icono del tipo de mensaje (sustituye a la etiqueta de texto en el tablón). */
function TipoIcono({ tipo, color, label }: { tipo: MensajeTipo; color: string; label: string }) {
  if (tipo === 'aviso') return <TriangleAlert size={19} style={{ color }} aria-label={label} />
  if (tipo === 'anuncio') return <Megaphone size={19} style={{ color }} aria-label={label} />
  // Incidencia: triángulo (rojo) con una X dentro.
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="m9.8 12.6 4.4 4.4" />
      <path d="m14.2 12.6-4.4 4.4" />
    </svg>
  )
}

/** Nota de papel pinchada con chincheta. Si el grupo tiene varias, se ve apilada
 *  con contador. `rot` = rotación de la nota en el tablón. */
export function PostItNote({ grupo, rot, onClick }: { grupo: Mensaje[]; rot: string; onClick: () => void }) {
  const m = grupo[0]
  const e = POSTIT[m.tipo]
  const n = grupo.length
  const esPila = n > 1

  return (
    <div onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onClick() } }}
      className="relative cursor-pointer" style={{ transform: `rotate(${rot})` }}>
      {esPila && (
        <>
          <span className="absolute inset-0 rounded-[4px]" style={{ background: e.paperBajo, transform: 'rotate(2.4deg) translate(4px,2px)', boxShadow: '0 5px 10px -6px rgba(30,50,60,.4)' }} />
          <span className="absolute inset-0 rounded-[4px]" style={{ background: e.paperBajo, transform: 'rotate(-1.6deg) translate(-3px,3px)', boxShadow: '0 5px 10px -6px rgba(30,50,60,.4)' }} />
        </>
      )}
      <div className="relative rounded-[4px] px-3.5 pb-2.5 pt-3.5"
        style={{ background: e.paper, boxShadow: '0 6px 14px -6px rgba(30,50,60,.35), 0 1px 0 rgba(255,255,255,.8) inset' }}>
        {/* chincheta */}
        <span className="absolute left-1/2 top-[-7px] h-3.5 w-3.5 -translate-x-1/2 rounded-full"
          style={{ background: `radial-gradient(circle at 35% 30%, ${e.pinHi}, ${e.pin})`, boxShadow: '0 3px 4px rgba(0,0,0,.3)' }} />
        {/* contador */}
        {esPila && (
          <span className="absolute right-[-7px] top-[-9px] flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-white px-1.5 text-[11.5px] font-extrabold text-white"
            style={{ background: '#177E8B', boxShadow: '0 3px 6px rgba(0,0,0,.25)' }}>{n}</span>
        )}

        <div className="flex items-center justify-between gap-2">
          <TipoIcono tipo={m.tipo} color={e.tint} label={esPila ? PLURAL[m.tipo] : e.etiqueta} />
          <span className="px-2.5" style={{
            fontFamily: 'var(--font-hand)', fontSize: '17px', fontWeight: 600, color: e.tint, opacity: 0.85,
            transform: 'rotate(-2deg)', border: `1.5px solid ${e.tint}`, borderRadius: '55% 45% 50% 60% / 65% 55% 60% 50%',
          }}>{fechaMano(m.created_at)}</span>
        </div>

        <div className="mt-1 font-display text-[16px] font-extrabold leading-[1.25]" style={{ color: '#26363F' }}>{m.titulo}</div>
        <p className="mt-1 line-clamp-2 text-[13px] leading-[1.5]" style={{ color: '#5C7180' }}>{m.cuerpo}</p>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          {esPila && <div className="text-[11.5px] font-bold" style={{ color: '#177E8B' }}>+{n - 1} {e.etiqueta.toLowerCase()} más · toca para ver</div>}
          {m.tipo === 'aviso' && m.expira_at && (
            <span className="ml-auto inline-block px-[7px] py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em]"
              style={{ color: e.tint, border: `1px dashed ${e.tint}`, borderRadius: '3px', transform: 'rotate(-1.5deg)', opacity: 0.75 }}>{caducaTexto(m.expira_at)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
