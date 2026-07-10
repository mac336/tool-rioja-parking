import { useState } from 'react'
import { Phone, Mail, MapPin, Plus, Pencil, Trash2 } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Button, Card, Field, SelectField, EmptyState, ErrorState, SkeletonList, ScreenHeader } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { useApp } from '@/store'
import { listContactos, crearContacto, editarContacto, borrarContacto } from '@/lib/api'
import type { Contact, ContactCategory } from '@/types'

const GRUPOS: { categoria: ContactCategory; titulo: string }[] = [
  { categoria: 'administrador', titulo: 'Administración' },
  { categoria: 'conserje', titulo: 'Conserjería' },
  { categoria: 'junta', titulo: 'Junta' },
  { categoria: 'proveedor', titulo: 'Proveedores' },
  { categoria: 'seguro', titulo: 'Seguro' },
]

const CATEGORIAS: { value: ContactCategory; label: string }[] = [
  { value: 'administrador', label: 'Administración' },
  { value: 'conserje', label: 'Conserjería' },
  { value: 'junta', label: 'Junta' },
  { value: 'proveedor', label: 'Proveedores' },
  { value: 'seguro', label: 'Seguro' },
]

/** Enlace para web_o_email: mailto: si contiene '@', si no https://. */
function enlaceWeb(valor: string): { href: string; texto: string } {
  if (valor.includes('@')) return { href: `mailto:${valor}`, texto: valor }
  return { href: /^https?:\/\//.test(valor) ? valor : `https://${valor}`, texto: valor.replace(/^https?:\/\//, '') }
}

/** telefonos array → cadena separada por comas para el formulario. */
function telsToStr(tels: string[]): string {
  return tels.join(', ')
}
/** cadena separada por comas → array de teléfonos (sin vacíos). */
function strToTels(s: string): string[] {
  return s.split(',').map((t) => t.trim()).filter(Boolean)
}

// ---- Estado del formulario ---------------------------------------------------
interface FormState {
  funcion: string
  nombre: string
  categoria: ContactCategory
  direccion: string
  telefonos: string
  web_o_email: string
  orden: string
}

function contactToForm(c: Contact): FormState {
  return {
    funcion: c.funcion,
    nombre: c.nombre,
    categoria: c.categoria,
    direccion: c.direccion ?? '',
    telefonos: telsToStr(c.telefonos),
    web_o_email: c.web_o_email ?? '',
    orden: String(c.orden),
  }
}

const FORM_VACIO: FormState = {
  funcion: '',
  nombre: '',
  categoria: 'administrador',
  direccion: '',
  telefonos: '',
  web_o_email: '',
  orden: '0',
}

function formToInput(f: FormState): Omit<Contact, 'id'> {
  return {
    funcion: f.funcion.trim(),
    nombre: f.nombre.trim(),
    categoria: f.categoria,
    direccion: f.direccion.trim() || undefined,
    telefonos: strToTels(f.telefonos),
    web_o_email: f.web_o_email.trim() || undefined,
    orden: Number.parseInt(f.orden, 10) || 0,
  }
}

// ---- Formulario de alta/edición ----------------------------------------------
function ContactForm({
  inicial,
  titulo,
  onGuardar,
  onCancelar,
}: {
  inicial: FormState
  titulo: string
  onGuardar: (input: Omit<Contact, 'id'>) => Promise<void>
  onCancelar: () => void
}) {
  const [f, setF] = useState<FormState>(inicial)
  const [guardando, setGuardando] = useState(false)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((prev) => ({ ...prev, [k]: v }))

  const valido = f.funcion.trim().length > 0 && f.nombre.trim().length > 0

  const guardar = async () => {
    if (!valido || guardando) return
    setGuardando(true)
    try {
      await onGuardar(formToInput(f))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3.5">
      <h3 className="font-display text-[17px] font-bold text-ink">{titulo}</h3>

      <Field
        label="Función"
        value={f.funcion}
        onChange={(e) => set('funcion', e.target.value)}
        placeholder="Ej. Administrador de fincas"
      />
      <Field
        label="Nombre"
        value={f.nombre}
        onChange={(e) => set('nombre', e.target.value)}
        placeholder="Ej. Fincas García S.L."
      />
      <SelectField
        label="Categoría"
        value={f.categoria}
        onChange={(e) => set('categoria', e.target.value as ContactCategory)}
      >
        {CATEGORIAS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </SelectField>
      <Field
        label="Dirección (opcional)"
        value={f.direccion}
        onChange={(e) => set('direccion', e.target.value)}
        placeholder="Ej. C/ Mayor 3, Logroño"
      />
      <Field
        label="Teléfonos"
        value={f.telefonos}
        onChange={(e) => set('telefonos', e.target.value)}
        placeholder="Ej. 941 123 456, 600 111 222"
        hint="Separa varios teléfonos con comas."
      />
      <Field
        label="Web o email (opcional)"
        value={f.web_o_email}
        onChange={(e) => set('web_o_email', e.target.value)}
        placeholder="Ej. info@fincas.es o www.fincas.es"
      />
      <Field
        label="Orden"
        type="number"
        value={f.orden}
        onChange={(e) => set('orden', e.target.value)}
        hint="Los valores más bajos aparecen primero."
      />

      <div className="mt-1 flex gap-2">
        <Button block disabled={!valido || guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}

// ---- Tarjeta de contacto -----------------------------------------------------
function ContactCard({
  c,
  puedeEditar,
  onEditar,
  onBorrar,
}: {
  c: Contact
  puedeEditar: boolean
  onEditar: () => void
  onBorrar: () => void
}) {
  return (
    <Card className="flex flex-col gap-2.5">
      <div>
        <div className="overline">{c.funcion}</div>
        <div className="mt-0.5 font-semibold text-ink">{c.nombre}</div>
        {c.direccion && (
          <div className="mt-1 flex items-start gap-1.5 text-[13px] text-muted">
            <MapPin size={14} className="mt-0.5 shrink-0 text-faint" />
            <span>{c.direccion}</span>
          </div>
        )}
      </div>
      {(c.telefonos.length > 0 || c.web_o_email) && (
        <div className="flex flex-wrap items-center gap-2">
          {c.telefonos.map((tel) => (
            <a key={tel} href={`tel:${tel.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 rounded-pill bg-primary-soft py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-primary-700 hover:bg-primary-soft/70">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                <Phone size={16} />
              </span>
              {tel}
            </a>
          ))}
          {c.web_o_email && (() => {
            const { href, texto } = enlaceWeb(c.web_o_email)
            return (
              <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-pill bg-surface-2 py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-ink hover:bg-surface-2/70">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted">
                  <Mail size={16} />
                </span>
                {texto}
              </a>
            )
          })()}
        </div>
      )}
      {puedeEditar && (
        <div className="flex gap-2 border-t border-border pt-2.5">
          <Button variant="secondary" size="md" onClick={onEditar} className="flex-1">
            <Pencil size={16} /> Editar
          </Button>
          <Button variant="danger-outline" size="md" onClick={onBorrar} className="flex-1">
            <Trash2 size={16} /> Borrar
          </Button>
        </div>
      )}
    </Card>
  )
}

export function ContactsPage() {
  const { user, toast } = useApp()
  const { data, state, refetch } = useAsync(listContactos, [])
  const items = data ?? []

  const puedeEditar = user.rol === 'administrador_finca' || user.rol === 'app_admin'

  // null = cerrado; 'nuevo' = alta; string = id del contacto en edición.
  const [editando, setEditando] = useState<'nuevo' | string | null>(null)

  const contactoEnEdicion = typeof editando === 'string' && editando !== 'nuevo'
    ? items.find((c) => c.id === editando) ?? null
    : null

  const crear = async (input: Omit<Contact, 'id'>) => {
    await crearContacto(input)
    setEditando(null)
    refetch()
    toast('Contacto añadido')
  }

  const editar = async (id: string, input: Omit<Contact, 'id'>) => {
    await editarContacto(id, input)
    setEditando(null)
    refetch()
    toast('Contacto actualizado')
  }

  const borrar = async (c: Contact) => {
    if (!window.confirm(`¿Borrar el contacto "${c.nombre}"?`)) return
    await borrarContacto(c.id)
    if (editando === c.id) setEditando(null)
    refetch()
    toast('Contacto borrado')
  }

  return (
    <div>
      <ScreenHeader title="Contactos" right={puedeEditar && editando === null ? (
        <Button size="md" onClick={() => setEditando('nuevo')}><Plus size={18} /> Añadir contacto</Button>
      ) : undefined} />

      <Page>
        {puedeEditar && editando === 'nuevo' && (
          <div className="mb-6">
            <ContactForm
              titulo="Nuevo contacto"
              inicial={FORM_VACIO}
              onGuardar={crear}
              onCancelar={() => setEditando(null)}
            />
          </div>
        )}

        {state === 'loading' && <SkeletonList />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state === 'empty' && editando !== 'nuevo' && (
          <EmptyState titulo="Sin contactos" texto="Aún no hay contactos publicados." />
        )}
        {(state === 'ready' || (state === 'empty' && editando === 'nuevo')) && (
          <div className="flex flex-col gap-6">
            {GRUPOS.map(({ categoria, titulo }) => {
              const delGrupo = items.filter((c) => c.categoria === categoria)
              if (delGrupo.length === 0) return null
              return (
                <section key={categoria}>
                  <h2 className="section-title mb-2">{titulo}</h2>
                  <div className="flex flex-col gap-3">
                    {delGrupo.map((c) =>
                      puedeEditar && contactoEnEdicion?.id === c.id ? (
                        <ContactForm
                          key={c.id}
                          titulo="Editar contacto"
                          inicial={contactToForm(c)}
                          onGuardar={(input) => editar(c.id, input)}
                          onCancelar={() => setEditando(null)}
                        />
                      ) : (
                        <ContactCard
                          key={c.id}
                          c={c}
                          puedeEditar={puedeEditar}
                          onEditar={() => setEditando(c.id)}
                          onBorrar={() => borrar(c)}
                        />
                      ),
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </Page>
    </div>
  )
}
