import { Apple, Recycle, Newspaper, Wine, Truck, Phone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SubHeader, Page } from '@/components/layout/AppShell'
import { Card, Alert } from '@/components/ui'

interface Residuo {
  titulo: string
  Icon: LucideIcon
  bg: string
  fg: string
  ejemplos: string
}

const RESIDUOS: Residuo[] = [
  { titulo: 'Orgánico', Icon: Apple, bg: '#E5F4D9', fg: '#58991F', ejemplos: 'Restos de comida, pieles de fruta, posos de café, servilletas usadas. Contenedor marrón.' },
  { titulo: 'Envases', Icon: Recycle, bg: '#FFF0D0', fg: '#A87414', ejemplos: 'Plásticos, latas, briks y tapones. Contenedor amarillo.' },
  { titulo: 'Papel y cartón', Icon: Newspaper, bg: '#DFEDFC', fg: '#2F76C9', ejemplos: 'Cajas plegadas, periódicos, revistas y papel. Contenedor azul.' },
  { titulo: 'Vidrio', Icon: Wine, bg: '#DCF5E8', fg: '#0B7E52', ejemplos: 'Botellas y tarros de vidrio, sin tapas ni corchos. Contenedor verde.' },
  { titulo: 'Punto limpio', Icon: Truck, bg: '#EAE5FA', fg: '#7059C9', ejemplos: 'Muebles, electrodomésticos, pilas, aceite, pintura, escombros y voluminosos.' },
]

export function ReciclajePage() {
  return (
    <div className="min-h-dvh bg-bg">
      <SubHeader titulo="Reciclaje" />
      <Page>
        <p className="mb-4 text-[14px] text-muted">
          Separar bien los residuos ayuda a que la comunidad esté más limpia y a reciclar más. Estos son los tipos y dónde va cada cosa.
        </p>

        <div className="flex flex-col gap-3">
          {RESIDUOS.map(({ titulo, Icon, bg, fg, ejemplos }) => (
            <Card key={titulo} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]" style={{ background: bg, color: fg }}>
                <Icon size={22} strokeWidth={1.9} />
              </span>
              <div>
                <div className="font-semibold text-ink">{titulo}</div>
                <div className="mt-0.5 text-[13px] text-muted">{ejemplos}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4">
          <Alert tipo="info">
            <div className="flex flex-col gap-2">
              <span>Punto limpio y citas: 010 · Línea Madrid.</span>
              <a href="tel:010" className="inline-flex w-fit items-center gap-2 rounded-pill bg-white/70 px-3 py-1.5 text-[13px] font-bold text-[#1f5aa3]">
                <Phone size={15} /> Llamar al 010
              </a>
            </div>
          </Alert>
        </div>
      </Page>
    </div>
  )
}
