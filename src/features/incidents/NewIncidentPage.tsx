import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Field, Textarea, Button, CategoryChip, SkeletonList, ErrorState } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { useApp } from '@/store'
import { crearIncidencia, editarIncidencia, getIncidencia } from '@/lib/api'
import type { IncidentCategory } from '@/types'

const CATEGORIAS: { key: IncidentCategory; label: string }[] = [
  { key: 'limpieza', label: 'Limpieza' },
  { key: 'ascensor', label: 'Ascensor' },
  { key: 'garaje', label: 'Garaje' },
  { key: 'jardin', label: 'Jardín' },
  { key: 'piscina', label: 'Piscina' },
  { key: 'ruido', label: 'Ruido' },
  { key: 'otros', label: 'Otros' },
]

export function NewIncidentPage() {
  const nav = useNavigate()
  const { id } = useParams()
  const modoEdicion = Boolean(id)
  const { toast } = useApp()

  // En modo edición cargamos la incidencia para precargar el formulario.
  const { data: inc, state } = useAsync(
    () => (id ? getIncidencia(id) : Promise.resolve(null)),
    [id],
  )

  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState<IncidentCategory>('otros')
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Precarga de campos cuando llega la incidencia a editar.
  useEffect(() => {
    if (!inc) return
    setTitulo(inc.titulo)
    setCategoria(inc.categoria)
    setDescripcion(inc.descripcion)
    setUbicacion(inc.ubicacion ?? '')
    setFoto(inc.fotos[0] ?? null)
  }, [inc])

  const valido = titulo.trim().length > 0 && descripcion.trim().length > 0

  const onFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFoto(URL.createObjectURL(file))
  }

  const guardar = async () => {
    if (!valido) return
    setEnviando(true)
    try {
      if (id) {
        await editarIncidencia(id, {
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          categoria,
          ubicacion: ubicacion.trim() || undefined,
        })
        toast('Incidencia actualizada')
        nav(`/incidencias/${id}`)
      } else {
        const creada = await crearIncidencia({
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          categoria,
          ubicacion: ubicacion.trim() || undefined,
          fotos: foto ? [foto] : undefined,
        })
        toast('Incidencia creada')
        nav(`/incidencias/${creada.id}`)
      }
    } finally {
      setEnviando(false)
    }
  }

  const cargando = modoEdicion && state === 'loading'
  const noEncontrada = modoEdicion && (state === 'error' || (state === 'ready' && !inc))

  return (
    <div>
      <SubHeader titulo={modoEdicion ? 'Editar incidencia' : 'Nueva incidencia'} />

      {cargando && <Page><SkeletonList n={3} /></Page>}
      {noEncontrada && <Page><ErrorState /></Page>}

      {!cargando && !noEncontrada && (
        <>
          <Page className="pb-28">
            <div className="flex flex-col gap-4">
              <Field
                label="Título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Bombilla fundida en el portal"
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-muted">Categoría</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map((c) => (
                    <CategoryChip key={c.key} active={categoria === c.key} onClick={() => setCategoria(c.key)}>
                      {c.label}
                    </CategoryChip>
                  ))}
                </div>
              </div>

              <Textarea
                label="Descripción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe qué ocurre y desde cuándo…"
              />

              <Field
                label="Ubicación (opcional)"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej. Portal, ascensor, garaje…"
              />

              {/* Añadir foto (solo visual) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-muted">Foto (opcional)</span>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-border-strong bg-surface-2 px-4 py-6 text-center text-muted hover:border-primary">
                  {foto ? (
                    <img src={foto} alt="Vista previa" className="h-32 w-full rounded-[10px] object-cover" />
                  ) : (
                    <>
                      <ImagePlus size={26} className="text-faint" />
                      <span className="text-[13px] font-semibold">Añadir foto</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={onFoto} />
                </label>
              </div>
            </div>
          </Page>

          {/* CTA fija */}
          <div className="sticky bottom-[90px] z-20 mx-auto w-full max-w-[720px] border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0">
            <Button block size="lg" disabled={!valido || enviando} onClick={guardar}>
              {modoEdicion
                ? (enviando ? 'Guardando…' : 'Guardar cambios')
                : (enviando ? 'Creando…' : 'Crear incidencia')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
