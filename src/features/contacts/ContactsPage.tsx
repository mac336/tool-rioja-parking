import { Phone, Mail, MapPin } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Card, EmptyState, ErrorState, SkeletonList } from '@/components/ui'
import { useAsync } from '@/lib/useAsync'
import { listContactos } from '@/lib/api'
import type { Contact, ContactCategory } from '@/types'

const GRUPOS: { categoria: ContactCategory; titulo: string }[] = [
  { categoria: 'administrador', titulo: 'Administración' },
  { categoria: 'conserje', titulo: 'Conserjería' },
  { categoria: 'junta', titulo: 'Junta' },
  { categoria: 'proveedor', titulo: 'Proveedores' },
  { categoria: 'seguro', titulo: 'Seguro' },
]

/** Enlace para web_o_email: mailto: si contiene '@', si no https://. */
function enlaceWeb(valor: string): { href: string; texto: string } {
  if (valor.includes('@')) return { href: `mailto:${valor}`, texto: valor }
  return { href: /^https?:\/\//.test(valor) ? valor : `https://${valor}`, texto: valor.replace(/^https?:\/\//, '') }
}

function ContactCard({ c }: { c: Contact }) {
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
    </Card>
  )
}

export function ContactsPage() {
  const { data, state, refetch } = useAsync(listContactos, [])
  const items = data ?? []

  return (
    <div>
      <header className="border-b border-border bg-surface px-4 pb-3 pt-5">
        <h1 className="font-display text-[26px] font-extrabold text-ink">Contactos</h1>
      </header>

      <Page>
        {state === 'loading' && <SkeletonList />}
        {state === 'error' && <ErrorState onRetry={refetch} />}
        {state === 'empty' && <EmptyState titulo="Sin contactos" texto="Aún no hay contactos publicados." />}
        {state === 'ready' && (
          <div className="flex flex-col gap-6">
            {GRUPOS.map(({ categoria, titulo }) => {
              const delGrupo = items.filter((c) => c.categoria === categoria)
              if (delGrupo.length === 0) return null
              return (
                <section key={categoria}>
                  <h2 className="overline mb-2">{titulo}</h2>
                  <div className="flex flex-col gap-3">
                    {delGrupo.map((c) => <ContactCard key={c.id} c={c} />)}
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
