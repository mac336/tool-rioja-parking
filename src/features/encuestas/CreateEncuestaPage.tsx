import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, X, Gavel } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Button, Card, Field, Textarea, Alert, cx } from '@/components/ui'
import { useApp } from '@/store'
import { esGestion } from '@/lib/roles'
import { crearEncuesta, crearEncuestaJunta } from '@/lib/api'
import type { EncuestaTipo } from '@/types'

type Modo = 'unica' | 'multi' | 'junta'
interface PreguntaDraft { texto: string; tipo: EncuestaTipo; opciones: string[] }
const nuevaPregunta = (): PreguntaDraft => ({ texto: '', tipo: 'opcion_unica', opciones: ['', ''] })

export function CreateEncuestaPage() {
  const { user, toast } = useApp()
  const nav = useNavigate()

  const [modo, setModo] = useState<Modo>('unica')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cierre, setCierre] = useState('')
  const [preguntas, setPreguntas] = useState<PreguntaDraft[]>([nuevaPregunta()])
  const [puntos, setPuntos] = useState<string[]>(['', ''])
  const [enviando, setEnviando] = useState(false)

  if (!esGestion(user.rol)) {
    return (
      <div className="min-h-full bg-bg">
        <SubHeader titulo="Crear votación" />
        <Page className="mx-auto max-w-[560px]">
          <Alert tipo="warn">Solo la gestión (presidente, junta o administración) puede crear votaciones.</Alert>
        </Page>
      </div>
    )
  }

  const setPregunta = (i: number, patch: Partial<PreguntaDraft>) =>
    setPreguntas((qs) => qs.map((q, k) => (k === i ? { ...q, ...patch } : q)))
  const setOpcion = (qi: number, oi: number, val: string) =>
    setPregunta(qi, { opciones: preguntas[qi].opciones.map((o, k) => (k === oi ? val : o)) })
  const addOpcion = (qi: number) =>
    preguntas[qi].opciones.length < 5 && setPregunta(qi, { opciones: [...preguntas[qi].opciones, ''] })
  const delOpcion = (qi: number, oi: number) =>
    preguntas[qi].opciones.length > 2 && setPregunta(qi, { opciones: preguntas[qi].opciones.filter((_, k) => k !== oi) })
  const addPregunta = () => setPreguntas((qs) => [...qs, nuevaPregunta()])
  const delPregunta = (i: number) => setPreguntas((qs) => qs.filter((_, k) => k !== i))

  const setPunto = (i: number, val: string) => setPuntos((ps) => ps.map((p, k) => (k === i ? val : p)))
  const addPunto = () => setPuntos((ps) => [...ps, ''])
  const delPunto = (i: number) => setPuntos((ps) => (ps.length > 1 ? ps.filter((_, k) => k !== i) : ps))

  // Validación
  const preguntasVal = modo === 'unica' ? preguntas.slice(0, 1) : preguntas
  const preguntaOk = (q: PreguntaDraft, exigeTexto: boolean) => {
    const ops = q.opciones.map((o) => o.trim()).filter(Boolean)
    return (!exigeTexto || q.texto.trim().length > 1) && ops.length >= 2 && ops.length <= 5
  }
  const puntosVal = puntos.map((p) => p.trim()).filter(Boolean)
  const valido =
    titulo.trim().length > 2 && !!cierre && (
      modo === 'junta' ? puntosVal.length >= 1 : preguntasVal.every((q) => preguntaOk(q, modo === 'multi'))
    )

  const enviar = async () => {
    setEnviando(true)
    try {
      const cierreISO = new Date(cierre + 'T23:59:00').toISOString()
      if (modo === 'junta') {
        await crearEncuestaJunta({ titulo: titulo.trim(), descripcion: descripcion.trim() || undefined, cierre: cierreISO, puntos: puntosVal })
      } else {
        await crearEncuesta({
          titulo: titulo.trim(), descripcion: descripcion.trim() || undefined, cierre: cierreISO, formato: modo,
          preguntas: preguntasVal.map((q) => ({
            texto: modo === 'unica' ? titulo.trim() : q.texto.trim(),
            tipo: q.tipo,
            opciones: q.opciones.map((o) => o.trim()).filter(Boolean),
          })),
        })
      }
      toast('Votación creada')
      nav('/votaciones')
    } catch { toast('No se pudo crear la votación', 'error'); setEnviando(false) }
  }

  return (
    <div className="min-h-full bg-bg">
      <SubHeader titulo="Crear votación" />
      <Page className="mx-auto flex max-w-[640px] flex-col gap-4">
        {/* Modo */}
        <div className="flex gap-2">
          {([['unica', 'Una pregunta'], ['multi', 'Varias preguntas'], ['junta', 'Junta']] as const).map(([val, lbl]) => (
            <button key={val} onClick={() => setModo(val)} aria-pressed={modo === val}
              className={cx('flex-1 rounded-pill py-2.5 text-[13px] font-semibold transition-shadow',
                modo === val ? 'bg-primary text-white shadow-primary' : 'bg-surface text-muted shadow-neu-sm')}>
              {lbl}
            </button>
          ))}
        </div>

        <Card className="flex flex-col gap-3">
          <Field label={modo === 'unica' ? 'Pregunta / título de la votación' : 'Título de la votación'}
            value={titulo} onChange={(e) => setTitulo(e.target.value)}
            placeholder={modo === 'junta' ? 'Ej. Junta ordinaria de julio' : modo === 'unica' ? 'Ej. ¿Nuevo horario de la piscina?' : 'Ej. Mejoras para la comunidad'} />
          <Textarea label="Descripción (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} />
          <Field label="Fecha de cierre" type="date" value={cierre} onChange={(e) => setCierre(e.target.value)} />
        </Card>

        {modo === 'junta' ? (
          <>
            <Alert tipo="info">
              Votación de <b>junta</b>: cada punto se <b>aprueba o rechaza</b>. Al abrirla, cada vecino dirá si asiste
              y si quiere votar por la app; solo los que <b>no asisten y votan por la app</b> cuentan como votos reales
              (los demás son sondeo). El detalle por piso lo verá solo la administración.
            </Alert>
            <Card className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-ink"><Gavel size={16} /> <span className="overline">Puntos del orden del día</span></div>
              {puntos.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-[13px] font-bold text-muted">{i + 1}</span>
                  <input value={p} onChange={(e) => setPunto(i, e.target.value)} placeholder={`Punto ${i + 1} (Ej. Aprobar la derrama del ascensor)`}
                    className="min-h-[44px] flex-1 rounded-[14px] border border-border bg-surface px-3.5 text-[15px] text-ink shadow-neu-inset focus:border-primary focus:outline-none" />
                  {puntos.length > 1 && (
                    <button onClick={() => delPunto(i)} className="text-faint hover:text-danger" aria-label="Quitar punto"><X size={18} /></button>
                  )}
                </div>
              ))}
              <button onClick={addPunto} className="flex items-center gap-1.5 self-start text-[13px] font-semibold text-primary">
                <Plus size={16} /> Añadir punto
              </button>
              <p className="text-[12px] text-faint">Cada punto se vota <b>Aprobar</b> o <b>Rechazar</b> (se añaden solas).</p>
            </Card>
          </>
        ) : (
          <>
            <Alert tipo="info">Sondeo informal, sin valor oficial · un voto por vivienda en cada pregunta.</Alert>
            {preguntasVal.map((q, qi) => (
              <Card key={qi} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="overline">{modo === 'multi' ? `Pregunta ${qi + 1}` : 'Opciones'}</span>
                  {modo === 'multi' && preguntas.length > 1 && (
                    <button onClick={() => delPregunta(qi)} className="text-danger" aria-label="Eliminar pregunta"><Trash2 size={18} /></button>
                  )}
                </div>
                {modo === 'multi' && (
                  <Field label="Enunciado de la pregunta" value={q.texto} onChange={(e) => setPregunta(qi, { texto: e.target.value })}
                    placeholder="Ej. ¿Qué zona mejoramos primero?" />
                )}
                <div className="flex flex-col gap-2">
                  {q.opciones.map((op, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input value={op} onChange={(e) => setOpcion(qi, oi, e.target.value)} placeholder={`Opción ${oi + 1}`}
                        className="min-h-[44px] flex-1 rounded-[14px] border border-border bg-surface px-3.5 text-[15px] text-ink shadow-neu-inset focus:border-primary focus:outline-none" />
                      {q.opciones.length > 2 && (
                        <button onClick={() => delOpcion(qi, oi)} className="text-faint hover:text-danger" aria-label="Quitar opción"><X size={18} /></button>
                      )}
                    </div>
                  ))}
                  {q.opciones.length < 5 && (
                    <button onClick={() => addOpcion(qi)} className="flex items-center gap-1.5 self-start text-[13px] font-semibold text-primary">
                      <Plus size={16} /> Añadir opción
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-[13px] text-muted">
                  <input type="checkbox" checked={q.tipo === 'opcion_multiple'}
                    onChange={(e) => setPregunta(qi, { tipo: e.target.checked ? 'opcion_multiple' : 'opcion_unica' })} />
                  Permitir marcar varias opciones
                </label>
              </Card>
            ))}
            {modo === 'multi' && (
              <Button variant="secondary" onClick={addPregunta}><Plus size={18} /> Añadir pregunta</Button>
            )}
          </>
        )}

        <Button block size="lg" disabled={!valido || enviando} onClick={enviar}>
          {enviando ? 'Creando…' : 'Crear votación'}
        </Button>
      </Page>
    </div>
  )
}
