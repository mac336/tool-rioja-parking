import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Field, Textarea, SelectField, Button, Alert, SkeletonList } from '@/components/ui'
import { crearAnuncio, editarAnuncio, misAnuncios, viviendaPuedePublicar } from '@/lib/api'
import { useApp } from '@/store'
import type { AnuncioNivel } from '@/types'

const MAX_TITULO = 80
const MAX_CUERPO = 1500

// ---- Render seguro de markdown restringido -----------------------------------
// Solo **negrita**, _cursiva_, listas con "- " y saltos de línea. Parseado a
// mano a JSX (<strong>/<em>/<ul>): NO usamos dangerouslySetInnerHTML ni HTML.

/** Convierte el texto inline (**negrita**, _cursiva_) a nodos React. */
function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /\*\*([^*]+)\*\*|_([^_]+)_/g
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) nodes.push(<strong key={`${keyPrefix}-b${k}`}>{m[1]}</strong>)
    else if (m[2] !== undefined) nodes.push(<em key={`${keyPrefix}-i${k}`}>{m[2]}</em>)
    last = regex.lastIndex
    k++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Convierte el cuerpo completo a bloques (<p> y <ul>). */
function renderMarkdown(src: string): ReactNode {
  const lines = src.split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  let n = 0

  const flushList = () => {
    if (list.length === 0) return
    const items = list.slice()
    const key = `ul${n++}`
    blocks.push(
      <ul key={key} className="list-disc pl-5 text-[14px] text-ink">
        {items.map((it, i) => <li key={i}>{parseInline(it, `${key}-${i}`)}</li>)}
      </ul>,
    )
    list = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const li = line.match(/^\s*[-*]\s+(.*)$/)
    if (li) { list.push(li[1]); continue }
    flushList()
    if (line.trim() === '') continue
    const key = `p${n++}`
    blocks.push(<p key={key} className="text-[14px] leading-relaxed text-ink">{parseInline(line, key)}</p>)
  }
  flushList()
  return blocks
}

export function NewAnuncioPage() {
  const nav = useNavigate()
  const { toast } = useApp()
  const { id } = useParams<{ id: string }>()
  const editando = Boolean(id)

  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [nivel, setNivel] = useState<AnuncioNivel>('secundario')
  const [enviando, setEnviando] = useState(false)

  // Precarga (edición) + comprobación de vivienda bloqueada (creación).
  const [cargando, setCargando] = useState(editando)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [puedePublicar, setPuedePublicar] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    if (editando && id) {
      misAnuncios()
        .then((lista) => {
          if (!alive) return
          const a = lista.find((x) => x.id === id)
          if (!a) { setNoEncontrado(true); setCargando(false); return }
          setTitulo(a.titulo)
          setCuerpo(a.cuerpo)
          setFechaInicio(a.fecha_inicio)
          setFechaFin(a.fecha_fin)
          setNivel(a.nivel_solicitado)
          setCargando(false)
        })
        .catch(() => { if (alive) { setNoEncontrado(true); setCargando(false) } })
    } else {
      viviendaPuedePublicar().then((ok) => { if (alive) setPuedePublicar(ok) }).catch(() => {})
    }
    return () => { alive = false }
  }, [editando, id])

  const bloqueada = !editando && puedePublicar === false

  const rangoInvalido = Boolean(fechaInicio && fechaFin && fechaFin < fechaInicio)
  const valido =
    !bloqueada &&
    titulo.trim().length > 0 && titulo.length <= MAX_TITULO &&
    cuerpo.trim().length > 0 && cuerpo.length <= MAX_CUERPO &&
    Boolean(fechaInicio) && Boolean(fechaFin) && !rangoInvalido

  const preview = useMemo(() => renderMarkdown(cuerpo), [cuerpo])

  const enviar = async () => {
    if (!valido) return
    setEnviando(true)
    try {
      const datos = { titulo: titulo.trim(), cuerpo: cuerpo.trim(), fechaInicio, fechaFin, nivelSolicitado: nivel }
      if (editando && id) {
        await editarAnuncio(id, datos)
        toast('Cambios guardados')
      } else {
        await crearAnuncio(datos)
        toast('Anuncio enviado a revisión')
      }
      nav('/anuncios')
    } catch {
      setEnviando(false)
      toast(editando ? 'No hemos podido guardar los cambios' : 'No hemos podido enviar el anuncio', 'error')
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo={editando ? 'Editar anuncio' : 'Nuevo anuncio'} />
      <Page className="mx-auto max-w-[560px]">
        {cargando ? (
          <SkeletonList n={3} />
        ) : noEncontrado ? (
          <Alert tipo="danger">No hemos encontrado este anuncio. Puede que ya no exista.</Alert>
        ) : (
          <>
            {bloqueada ? (
              <Alert tipo="danger">Tu vivienda está bloqueada para publicar anuncios. Contacta con la gestión de la comunidad.</Alert>
            ) : (
              <Alert tipo="info">Solo puedes tener 1 anuncio pendiente. Lo revisará la gestión antes de publicarse.</Alert>
            )}

            <div className="mt-4 flex flex-col gap-4">
              <Field label="Título" value={titulo} maxLength={MAX_TITULO}
                onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Vendo bici de niño"
                hint={`${titulo.length}/${MAX_TITULO}`} />

              <Textarea label="Cuerpo" value={cuerpo} maxLength={MAX_CUERPO} rows={6}
                onChange={(e) => setCuerpo(e.target.value)}
                placeholder="Usa **negrita**, _cursiva_ y listas con «- »."
                hint={`${cuerpo.length}/${MAX_CUERPO} · Formato: **negrita**, _cursiva_, listas con «- »`} />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Desde" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                <Field label="Hasta" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                  error={rangoInvalido ? 'Debe ser posterior a «Desde»' : undefined} />
              </div>

              <SelectField label="¿Dónde quieres que salga?" value={nivel}
                onChange={(e) => setNivel(e.target.value as AnuncioNivel)}>
                <option value="principal">Tablón principal (destacado)</option>
                <option value="secundario">Listado de anuncios</option>
              </SelectField>

              {/* Vista previa */}
              <div>
                <h2 className="overline mb-2">Vista previa</h2>
                <div className="rounded-[16px] border border-border bg-surface p-4">
                  {titulo.trim()
                    ? <h3 className="font-display text-[18px] font-bold text-ink">{titulo}</h3>
                    : <h3 className="font-display text-[18px] font-bold text-faint">Título del anuncio</h3>}
                  <div className="mt-2 flex flex-col gap-2">
                    {cuerpo.trim()
                      ? preview
                      : <p className="text-[14px] text-faint">Aquí verás tu anuncio con el formato aplicado.</p>}
                  </div>
                </div>
              </div>

              <Button block size="lg" disabled={!valido || enviando} onClick={enviar}>
                {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Enviar a revisión'}
              </Button>
            </div>
          </>
        )}
      </Page>
    </div>
  )
}
